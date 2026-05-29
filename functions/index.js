const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Twilio Config (To be filled in Firebase Config)
// firebase functions:config:set twilio.sid="YOUR_SID" twilio.token="YOUR_TOKEN" twilio.phone="YOUR_PHONE"
const twilioSid = functions.config().twilio ? functions.config().twilio.sid : '';
const twilioToken = functions.config().twilio ? functions.config().twilio.token : '';
const twilioPhone = functions.config().twilio ? functions.config().twilio.phone : '';

let twilioClient;
if (twilioSid && twilioToken) {
  twilioClient = require('twilio')(twilioSid, twilioToken);
}

exports.sendAbsentAlert = functions.firestore
  .document('attendance/{attendanceId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (data.status !== 'absent') return null;

    const { studentId, studentName, subject, date } = data;

    // 1. Fetch student's profile to get parent's details
    const studentDoc = await db.collection('users').doc(studentId).get();
    if (!studentDoc.exists) {
      console.log(`Student ${studentId} not found`);
      return null;
    }

    const studentData = studentDoc.data();
    const parentPhone = studentData.guardianPhone || studentData.phone || '';
    const parentName = studentData.guardianName || 'Parent';

    if (!parentPhone) {
      console.log(`No contact phone for student ${studentName}`);
      return null;
    }

    // 2. Prevent duplicate notifications for the same day & subject
    const dateStr = date;
    const notificationId = `${studentId}_${dateStr.replace(/\s+/g, '_')}_${subject.replace(/\s+/g, '_')}`;
    const notificationRef = db.collection('attendanceNotifications').doc(notificationId);
    
    const notificationSnap = await notificationRef.get();
    if (notificationSnap.exists) {
      console.log(`Alert already sent to parent of ${studentName} for ${subject} on ${dateStr}`);
      return null;
    }

    const alertMessage = `Dear Parent, your child ${studentName} was marked absent today at Compution for ${subject}. Please contact the institute if needed.`;

    const notificationLog = {
      studentId,
      studentName,
      parentName,
      parentPhone,
      date: dateStr,
      subject,
      message: alertMessage,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };

    try {
      if (twilioClient && twilioPhone) {
        // Send SMS via Twilio
        await twilioClient.messages.create({
          body: alertMessage,
          to: parentPhone.startsWith('+') ? parentPhone : `+91${parentPhone}`,
          from: twilioPhone
        });
        notificationLog.status = 'sent_sms';
        notificationLog.provider = 'twilio';
        console.log(`SMS Alert sent successfully to parent of ${studentName}`);
      } else {
        // Fallback simulated success logs
        notificationLog.status = 'simulated';
        notificationLog.provider = 'mock_api';
        console.log(`Twilio config missing. Simulated alert logged: "${alertMessage}"`);
      }
    } catch (err) {
      console.error('Error sending alert notification:', err);
      notificationLog.status = 'failed';
      notificationLog.error = err.message;
    }

    // Record history
    await notificationRef.set(notificationLog);
    return null;
  });

exports.onCalendarEventChange = functions.firestore
  .document('calendarEvents/{eventId}')
  .onWrite(async (change, context) => {
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;
    
    let changeType = '';
    let data = null;
    if (!beforeData && afterData) {
      changeType = 'created';
      data = afterData;
    } else if (beforeData && afterData) {
      // Check if dates, times, title, or assignments changed
      const isChanged = beforeData.startDate !== afterData.startDate ||
                        beforeData.startTime !== afterData.startTime ||
                        beforeData.endDate !== afterData.endDate ||
                        beforeData.endTime !== afterData.endTime ||
                        beforeData.title !== afterData.title ||
                        JSON.stringify(beforeData.assignedStudents) !== JSON.stringify(afterData.assignedStudents) ||
                        JSON.stringify(beforeData.assignedGroups) !== JSON.stringify(afterData.assignedGroups);
      if (isChanged) {
        changeType = 'updated';
        data = afterData;
      }
    } else if (beforeData && !afterData) {
      changeType = 'deleted';
      data = beforeData;
    }

    if (!changeType) return null;

    const title = data.title || 'Class';
    const dateStr = data.startDate || data.date || '';
    const timeStr = data.startTime || data.time || '';
    const venue = data.venue || 'Compution Campus';
    const faculty = data.assignedFacultyName || 'Faculty Mentor';
    const meetLink = data.meetLink || '';
    const eventType = data.eventType || 'Regular Class';

    // Fetch all student users to match assignments in memory
    const studentsSnap = await db.collection('users').where('role', '==', 'student').get();
    const promises = [];

    studentsSnap.forEach(docSnap => {
      const student = docSnap.data();
      const studentId = docSnap.id;
      const studentGroup = student.studentGroup || '';

      const isDirectlyAssigned = data.assignedStudents && data.assignedStudents.includes(studentId);
      const isGroupAssigned = data.assignedGroups && data.assignedGroups.includes(studentGroup);

      if (isDirectlyAssigned || isGroupAssigned) {
        promises.push((async () => {
          const contactPhone = student.guardianPhone || student.phone || '';
          const studentEmail = student.email || '';

          let alertMessage = '';
          if (changeType === 'created') {
            alertMessage = `Class Scheduled: Dear Parent, a new ${eventType} has been scheduled for ${student.name || 'your child'} on ${dateStr} at ${timeStr} for ${title} with ${faculty}. Venue: ${venue}.`;
          } else if (changeType === 'updated') {
            alertMessage = `Schedule Rescheduled: Dear Parent, ${eventType} for ${student.name || 'your child'} on ${dateStr} has been rescheduled to ${timeStr} for ${title} with ${faculty}. Venue: ${venue}.`;
          } else if (changeType === 'deleted') {
            alertMessage = `Class Cancelled: Dear Parent, the ${eventType} scheduled for ${student.name || 'your child'} on ${dateStr} at ${timeStr} for ${title} has been cancelled.`;
          }

          const logId = `sched_${context.eventId}_${studentId}_${changeType}`;
          const notificationRef = db.collection('notificationHistory').doc(logId);

          const logSnap = await notificationRef.get();
          if (logSnap.exists) return;

          const notificationLog = {
            studentId,
            studentName: student.name || 'Student',
            phone: contactPhone,
            email: studentEmail,
            type: `schedule_${changeType}`,
            message: alertMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            metadata: {
              eventId: context.params.eventId,
              classTitle: title,
              timing: `${dateStr} ${timeStr}`,
              facultyName: faculty,
              meetLink,
              venue,
              eventType
            }
          };

          if (contactPhone) {
            try {
              if (twilioClient && twilioPhone) {
                await twilioClient.messages.create({
                  body: alertMessage,
                  to: contactPhone.startsWith('+') ? contactPhone : `+91${contactPhone}`,
                  from: twilioPhone
                });
                notificationLog.status = 'sent_sms';
                notificationLog.provider = 'twilio';
              } else {
                notificationLog.status = 'simulated';
                notificationLog.provider = 'mock_api';
                console.log(`Twilio config missing. Simulated alert logged: "${alertMessage}"`);
              }
            } catch (err) {
              console.error(`Error sending alert:`, err);
              notificationLog.status = 'failed';
              notificationLog.error = err.message;
            }
          } else {
            notificationLog.status = 'no_phone';
          }

          await notificationRef.set(notificationLog);
        })());
      }
    });

    await Promise.all(promises);
    return null;
  });

exports.checkUpcomingClasses = functions.pubsub
  .schedule('*/5 * * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(now.getTime() + istOffset);
    const todayStr = nowIst.toISOString().split('T')[0];
    const tomorrowIst = new Date(nowIst.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrowIst.toISOString().split('T')[0];

    // Query events for today and tomorrow to handle class times near transitions
    const [todaySnap, tomorrowSnap] = await Promise.all([
      db.collection('calendarEvents').where('startDate', '==', todayStr).get(),
      db.collection('calendarEvents').where('startDate', '==', tomorrowStr).get()
    ]);

    const eventsMap = new Map();
    todaySnap.forEach(doc => eventsMap.set(doc.id, doc.data()));
    tomorrowSnap.forEach(doc => eventsMap.set(doc.id, doc.data()));

    if (eventsMap.size === 0) return null;

    const currentEpochMinutes = Math.floor(now.getTime() / (60 * 1000));
    
    // Fetch all student users to map assignments in memory
    const studentsSnap = await db.collection('users').where('role', '==', 'student').get();
    const allStudents = [];
    studentsSnap.forEach(doc => allStudents.push({ id: doc.id, ...doc.data() }));

    const promises = [];

    eventsMap.forEach((event, eventId) => {
      if (!event.startDate || !event.startTime) return;

      const [ey, em, ed] = event.startDate.split('-').map(Number);
      const [eh, emin] = event.startTime.split(':').map(Number);
      const eventDateUtc = Date.UTC(ey, em - 1, ed, eh, emin, 0);
      const eventEpochMinutes = Math.floor((eventDateUtc - 5.5 * 60 * 60 * 1000) / (60 * 1000));
      const diffMinutes = eventEpochMinutes - currentEpochMinutes;

      let alertType = '';
      if (diffMinutes >= 1438 && diffMinutes <= 1442) {
        alertType = '24h';
      } else if (diffMinutes >= 58 && diffMinutes <= 62) {
        alertType = '1h';
      } else if (diffMinutes >= 8 && diffMinutes <= 12) {
        alertType = '10m';
      }

      if (alertType) {
        // Filter students assigned to this event
        const eventStudents = allStudents.filter(student => {
          const studentGroup = student.studentGroup || '';
          const isDirectlyAssigned = event.assignedStudents && event.assignedStudents.includes(student.id);
          const isGroupAssigned = event.assignedGroups && event.assignedGroups.includes(studentGroup);
          return isDirectlyAssigned || isGroupAssigned;
        });

        eventStudents.forEach(student => {
          promises.push((async () => {
            const reminderId = `reminder_${eventId}_${student.id}_${alertType}`;
            const reminderRef = db.collection('notificationHistory').doc(reminderId);
            const reminderSnap = await reminderRef.get();
            if (reminderSnap.exists) return;

            const contactPhone = student.guardianPhone || student.phone || '';
            const studentEmail = student.email || '';
            const title = event.title || 'Class';
            const timeStr = event.startTime || '';
            const venue = event.venue || 'Compution Campus';
            const faculty = event.assignedFacultyName || 'Faculty Mentor';
            const meetLink = event.meetLink || '';

            let alertMessage = '';
            if (alertType === '24h') {
              alertMessage = `Upcoming Class Reminder: Dear Parent, class "${title}" is scheduled for ${student.name || 'your child'} tomorrow at ${timeStr}. Please make sure they are prepared.`;
            } else if (alertType === '1h') {
              alertMessage = `Class Reminder: Dear Parent, class "${title}" for ${student.name || 'your child'} starts in 1 hour at ${timeStr}. Venue: ${venue}.`;
            } else if (alertType === '10m') {
              alertMessage = `Urgent Class Reminder: Dear Parent, class "${title}" for ${student.name || 'your child'} starts in 10 minutes. Google Meet: ${meetLink || 'N/A'}. Join live now.`;
            }

            const notificationLog = {
              studentId: student.id,
              studentName: student.name || 'Student',
              phone: contactPhone,
              email: studentEmail,
              type: `reminder_${alertType}`,
              message: alertMessage,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              status: 'pending',
              metadata: {
                eventId,
                classTitle: title,
                timing: `${event.startDate} ${timeStr}`,
                facultyName: faculty,
                meetLink,
                venue,
                eventType: event.eventType || 'Regular Class',
                alertType,
                ctaButton: event.eventType === 'Google Meet Session' ? 'Join Google Meet' : 'View Schedule'
              }
            };

            if (contactPhone) {
              try {
                if (twilioClient && twilioPhone) {
                  await twilioClient.messages.create({
                    body: alertMessage,
                    to: contactPhone.startsWith('+') ? contactPhone : `+91${contactPhone}`,
                    from: twilioPhone
                  });
                  notificationLog.status = 'sent_sms';
                  notificationLog.provider = 'twilio';
                } else {
                  notificationLog.status = 'simulated';
                  notificationLog.provider = 'mock_api';
                  console.log(`Twilio config missing. Simulated reminder alert: "${alertMessage}"`);
                }
              } catch (err) {
                console.error(`Error sending reminder:`, err);
                notificationLog.status = 'failed';
                notificationLog.error = err.message;
              }
            } else {
              notificationLog.status = 'no_phone';
            }

            await reminderRef.set(notificationLog);
          })());
        });
      }
    });

    await Promise.all(promises);
    return null;
  });
