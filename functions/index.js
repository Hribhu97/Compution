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

exports.onScheduleChange = functions.firestore
  .document('studentSchedules/{scheduleId}')
  .onWrite(async (change, context) => {
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;
    
    let changeType = '';
    let data = null;
    if (!beforeData && afterData) {
      changeType = 'created';
      data = afterData;
    } else if (beforeData && afterData) {
      if (beforeData.date !== afterData.date || beforeData.time !== afterData.time || beforeData.faculty !== afterData.faculty || beforeData.notes !== afterData.notes) {
        changeType = 'updated';
        data = afterData;
      }
    } else if (beforeData && !afterData) {
      changeType = 'deleted';
      data = beforeData;
    }

    if (!changeType) return null;

    const studentId = data.studentId;
    const studentName = data.studentName;
    const subject = data.subject;
    const dateStr = data.date;
    const timeStr = data.time;
    const faculty = data.faculty;

    const studentDoc = await db.collection('users').doc(studentId).get();
    let contactPhone = '';
    let studentEmail = '';
    if (studentDoc.exists) {
      const studentData = studentDoc.data();
      contactPhone = studentData.guardianPhone || studentData.phone || '';
      studentEmail = studentData.email || '';
    }

    if (!contactPhone) {
      console.log(`No phone contact found for student ID: ${studentId}`);
      return null;
    }

    let alertMessage = '';
    if (changeType === 'created') {
      alertMessage = `Class Scheduled: Dear Parent, a new class has been scheduled for ${studentName} on ${dateStr} at ${timeStr} for ${subject} with ${faculty || 'Faculty'}.`;
    } else if (changeType === 'updated') {
      alertMessage = `Schedule Rescheduled: Dear Parent, class for ${studentName} on ${dateStr} has been rescheduled to ${timeStr} for ${subject} with ${faculty || 'Faculty'}.`;
    } else if (changeType === 'deleted') {
      alertMessage = `Class Cancelled: Dear Parent, class scheduled for ${studentName} on ${dateStr} at ${timeStr} for ${subject} has been cancelled.`;
    }

    const logId = `sched_${context.eventId}_${studentId}_${changeType}`;
    const notificationRef = db.collection('notificationHistory').doc(logId);
    
    const logSnap = await notificationRef.get();
    if (logSnap.exists) {
      return null;
    }

    const notificationLog = {
      studentId,
      studentName,
      phone: contactPhone,
      email: studentEmail,
      type: `schedule_${changeType}`,
      message: alertMessage,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };

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

    await notificationRef.set(notificationLog);
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
    
    const schedulesSnap = await db.collection('studentSchedules').where('date', '==', todayStr).get();
    if (schedulesSnap.empty) return null;

    const currentMinutes = nowIst.getUTCHours() * 60 + nowIst.getUTCMinutes();
    const promises = [];

    schedulesSnap.forEach(doc => {
      const schedule = doc.data();
      const timeStr = schedule.time;
      if (!timeStr) return;

      const [hours, minutes] = timeStr.split(':').map(Number);
      const classMinutes = hours * 60 + minutes;
      const diff = classMinutes - currentMinutes;

      let alertType = '';
      if (diff >= 27 && diff <= 33) {
        alertType = '30m';
      } else if (diff >= 3 && diff <= 7) {
        alertType = '5m';
      }

      if (alertType) {
        promises.push((async () => {
          const studentId = schedule.studentId;
          const studentName = schedule.studentName;
          const subject = schedule.subject;
          
          const reminderId = `reminder_${doc.id}_${alertType}_${todayStr}`;
          const reminderRef = db.collection('notificationHistory').doc(reminderId);
          const reminderSnap = await reminderRef.get();
          if (reminderSnap.exists) return;

          const studentDoc = await db.collection('users').doc(studentId).get();
          let contactPhone = '';
          if (studentDoc.exists) {
            contactPhone = studentDoc.data().guardianPhone || studentDoc.data().phone || '';
          }

          if (!contactPhone) return;

          const alertMessage = alertType === '30m'
            ? `Reminder: Class for ${studentName} on ${subject} starts in 30 minutes at ${timeStr}. Please prepare.`
            : `Urgent Reminder: Class for ${studentName} on ${subject} starts in 5 minutes at ${timeStr}. Join live now.`;

          const notificationLog = {
            studentId,
            studentName,
            phone: contactPhone,
            type: `reminder_${alertType}`,
            message: alertMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
          };

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

          await reminderRef.set(notificationLog);
        })());
      }
    });

    await Promise.all(promises);
    return null;
  });
