import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, where, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { addDoc, deleteDoc, updateDoc, setDoc } from '../../firebase';;
import { CalendarCheck, UserX, Clock, CheckCircle2, Search, ArrowRight, BookOpen, AlertCircle, Calendar as CalendarIcon, CheckCircle, BarChart2, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { format, parseISO } from 'date-fns';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const PIE_COLORS = ['#66BB6A', '#EF5350', '#FFA726']; // Present (Green), Absent (Red), Late (Orange)

const Attendance = () => {
  const { user } = useAuth();
  
  // Student View States
  const [studentRecords, setStudentRecords] = useState([]);
  const [studentStats, setStudentStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  
  // Faculty/Admin View States
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Basic+AI (Prompt Engn)');
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceStatusMap, setAttendanceStatusMap] = useState({}); // studentId -> status

  // Student Today's Schedules & Calendar
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [todayCalendarEvents, setTodayCalendarEvents] = useState([]);
  
  // Loading and alerts
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const canManage = user?.role?.toLowerCase() === 'admin';

  // 1. FETCH STUDENTS (for marking) AND GLOBAL ATTENDANCE (for dashboard)
  useEffect(() => {
    if (!user) return;

    if (!db) {
      console.error("Attendance: Firestore not initialized");
      setLoading(false);
      return;
    }

    let unsubStudents = () => {};
    let unsubAttendance = () => {};
    let unsubTodaySched = () => {};
    let unsubTodayCal = () => {};

    if (canManage) {
      // Load all students to mark attendance
      try {
        const studentsQuery = query(collection(db, 'users'), where('role', 'in', ['student', 'Student']));
        unsubStudents = onSnapshot(studentsQuery, (snap) => {
          const list = [];
          snap.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          setStudents(list);
          setLoading(false);
        }, (err) => {
          console.error("Attendance: students listener error:", err);
          setLoading(false);
        });
      } catch (err) {
        console.error("Attendance: students listener creation failed", err);
        setLoading(false);
      }

      // Load today's marked attendance status to pre-populate map
      const dateStr = format(parseISO(attendanceDate), 'dd MMM yyyy');
      const attTodayQuery = query(
        collection(db, 'attendance'),
        where('date', '==', dateStr),
        where('subject', '==', selectedSubject)
      );

      getDocs(attTodayQuery).then(snap => {
        const statuses = {};
        snap.forEach(doc => {
          const data = doc.data();
          statuses[data.studentId] = data.status;
        });
        setAttendanceStatusMap(statuses);
      }).catch(err => {
        console.error("Attendance: failed to load today's marked attendance", err);
      });

    } else {
      // Load student's own attendance from top-level attendance collection
      try {
        const attQuery = query(
          collection(db, 'attendance'),
          where('studentId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );

        unsubAttendance = onSnapshot(attQuery, (snap) => {
          const records = [];
          let p = 0, a = 0, l = 0, t = 0;
          
          snap.forEach(doc => {
            const d = { id: doc.id, ...doc.data() };
            records.push(d);
            t++;
            if (d.status === 'present') p++;
            else if (d.status === 'absent') a++;
            else if (d.status === 'late') { l++; p++; } // Late present still increments attendance count
          });

          setStudentRecords(records);
          setStudentStats({
            total: t, present: p, absent: a, late: l,
            percentage: t === 0 ? 0 : Math.round((p / t) * 100)
          });
          setLoading(false);
        }, (err) => {
          console.error("Attendance: student attendance listener error:", err);
          setLoading(false);
        });
      } catch (err) {
        console.error("Attendance: student attendance listener creation failed", err);
        setLoading(false);
      }

      // Load today's schedule for student check-in
      try {
        const todayDateStr = format(new Date(), 'yyyy-MM-dd');
        const schedTodayQuery = query(
          collection(db, 'studentSchedules'),
          where('studentId', '==', user.uid),
          where('date', '==', todayDateStr)
        );
        unsubTodaySched = onSnapshot(schedTodayQuery, (snap) => {
          const list = [];
          snap.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          setTodaySchedules(list);
        }, (err) => {
          console.error("Attendance: student schedules listener error:", err);
        });
      } catch (err) {
        console.error("Attendance: student schedules listener creation failed", err);
      }

      // Load today's calendar events for student check-in
      try {
        const todayDateStr = format(new Date(), 'yyyy-MM-dd');
        const calTodayQuery = query(
          collection(db, 'studentCalendar'),
          where('studentId', '==', user.uid),
          where('date', '==', todayDateStr),
          where('type', '==', 'class')
        );
        unsubTodayCal = onSnapshot(calTodayQuery, (snap) => {
          const list = [];
          snap.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          setTodayCalendarEvents(list);
        }, (err) => {
          console.error("Attendance: student calendar events listener error:", err);
        });
      } catch (err) {
        console.error("Attendance: student calendar events listener creation failed", err);
      }
    }

    return () => {
      unsubStudents();
      unsubAttendance();
      unsubTodaySched();
      unsubTodayCal();
    };
  }, [user?.uid, canManage, attendanceDate, selectedSubject]);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const triggerAbsentNotification = async (studentId, studentName, dateStr, subjectName) => {
    const docId = `${studentId}_${dateStr.replace(/\s+/g, '_')}_${subjectName.replace(/\s+/g, '_')}`;
    const notifRef = doc(db, 'attendanceNotifications', docId);

    try {
      const notifSnap = await getDocs(query(
        collection(db, 'attendanceNotifications'),
        where('studentId', '==', studentId),
        where('date', '==', dateStr),
        where('subject', '==', subjectName)
      ));

      if (!notifSnap.empty) {
        console.log(`Alert already logged for ${studentName} today`);
        return;
      }

      let parentPhone = '';
      let parentName = '';
      let parentEmail = '';
      let absentAlertPref = true;

      // Query parentContacts first
      const parentContactsQuery = query(collection(db, 'parentContacts'), where('studentId', '==', studentId));
      const parentSnap = await getDocs(parentContactsQuery);

      if (!parentSnap.empty) {
        const pDoc = parentSnap.docs[0];
        const pData = pDoc.data();
        parentPhone = pData.parentPhone || '';
        parentName = pData.parentName || 'Parent';
        parentEmail = pData.parentEmail || '';
        absentAlertPref = pData.notificationPreferences?.absentAlert !== false;
      } else {
        // Fallback: Fetch parent info from user profile
        const userRef = doc(db, 'users', studentId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const sData = userSnap.data();
          parentPhone = sData.guardianPhone || sData.phone || '';
          parentName = sData.guardianName || 'Parent';
          parentEmail = sData.guardianEmail || '';

          // Sync parent contacts
          await setDoc(doc(db, 'parentContacts', `parent_${studentId}`), {
            studentId,
            parentName,
            parentPhone,
            parentEmail,
            notificationPreferences: {
              absentAlert: true,
              feeDueReminder: true,
              classCancellation: true
            },
            createdAt: serverTimestamp()
          });
        }
      }

      if (!absentAlertPref) {
        console.log(`Parent for ${studentName} disabled absent alerts.`);
        return;
      }

      const notifData = {
        studentId,
        studentName,
        parentName,
        parentPhone,
        date: dateStr,
        subject: subjectName,
        status: 'pending',
        message: `Dear Parent, your child ${studentName} was marked absent today at Compution for ${subjectName}. Please contact the institute if needed.`,
        timestamp: serverTimestamp()
      };

      await setDoc(notifRef, notifData);

      // Simulate sending SMS transition: pending -> sent_sms after 2 seconds
      setTimeout(async () => {
        try {
          await updateDoc(notifRef, {
            status: 'sent_sms',
            sentTimestamp: serverTimestamp()
          });
          console.log(`Simulated SMS sent for student ${studentName}`);
        } catch (e) {
          console.error("Failed to update SMS delivery status:", e);
        }
      }, 2500);

    } catch (err) {
      console.error("Error triggering absent notification:", err);
    }
  };

  // ── FACULTY: MARK ATTENDANCE FOR INDIVIDUAL STUDENT ──
  const handleMarkStatus = async (studentId, studentName, status) => {
    const dateStr = format(parseISO(attendanceDate), 'dd MMM yyyy');
    const docId = `${studentId}_${dateStr.replace(/\s+/g, '_')}_${selectedSubject.replace(/\s+/g, '_')}`;
    
    try {
      // 1. Write attendance record deterministically (idempotent write)
      await setDoc(doc(db, 'attendance', docId), {
        studentId,
        studentName,
        date: dateStr,
        status,
        subject: selectedSubject,
        faculty: user.displayName || 'Faculty Mentor',
        timestamp: serverTimestamp()
      }, { merge: true });

      // Update local state map
      setAttendanceStatusMap(prev => ({ ...prev, [studentId]: status }));
      triggerToast(`Marked ${studentName} as ${status}`);

      // 2. Client-side fallback trigger: Create absent notification if status is absent
      if (status === 'absent') {
        triggerAbsentNotification(studentId, studentName, dateStr, selectedSubject);
      }
    } catch (err) {
      console.error("Error logging attendance:", err);
      triggerToast('Failed to log attendance');
    }
  };

  // ── FACULTY: BULK MARK ATTENDANCE ──
  const handleBulkMark = async (status) => {
    const dateStr = format(parseISO(attendanceDate), 'dd MMM yyyy');
    
    try {
      const promises = students.map(async (student) => {
        // Skip if already marked to prevent overriding custom marks
        if (attendanceStatusMap[student.id]) return;

        const docId = `${student.id}_${dateStr.replace(/\s+/g, '_')}_${selectedSubject.replace(/\s+/g, '_')}`;
        await setDoc(doc(db, 'attendance', docId), {
          studentId: student.id,
          studentName: student.displayName,
          date: dateStr,
          status: status,
          subject: selectedSubject,
          faculty: user.displayName || 'Faculty Mentor',
          timestamp: serverTimestamp()
        }, { merge: true });

        // Update local map state
        setAttendanceStatusMap(prev => ({ ...prev, [student.id]: status }));

        // Handle absent notifications for bulk absents
        if (status === 'absent') {
          triggerAbsentNotification(student.id, student.displayName, dateStr, selectedSubject);
        }
      });

      await Promise.all(promises);
      triggerToast(`All unmarked students marked as ${status}`);
    } catch (err) {
      console.error("Error in bulk marking attendance:", err);
      triggerToast('Bulk marking failed');
    }
  };

  // Student analytics charts compilation
  const todayClasses = [
    ...todaySchedules.map(s => ({
      id: s.id,
      source: 'studentSchedules',
      title: s.subject || 'Class',
      time: s.time || '',
      facultyId: s.facultyId || '',
      faculty: s.faculty || 'Faculty Mentor'
    })),
    ...todayCalendarEvents.map(c => ({
      id: c.id,
      source: 'studentCalendar',
      title: c.title || 'Class',
      time: c.time || '',
      facultyId: c.facultyId || '',
      faculty: c.faculty || 'Faculty Mentor'
    }))
  ];

  const getCheckInStatus = (classTimeStr) => {
    try {
      const [hours, minutes] = classTimeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return { allowed: false, reason: 'Invalid timing format' };

      const now = new Date();
      const classTime = new Date();
      classTime.setHours(hours, minutes, 0, 0);

      const windowStart = new Date(classTime.getTime() - 15 * 60 * 1000);
      const windowEnd = new Date(classTime.getTime() + 60 * 60 * 1000);

      if (now < windowStart) {
        return {
          allowed: false,
          status: 'pending',
          reason: `Opens at ${format(windowStart, 'hh:mm a')}`
        };
      }

      if (now > windowEnd) {
        return {
          allowed: false,
          status: 'absent',
          reason: 'Check-in expired (closes 60m after starts)'
        };
      }

      const lateCutoff = new Date(classTime.getTime() + 15 * 60 * 1000);
      if (now <= lateCutoff) {
        return {
          allowed: true,
          status: 'present',
          reason: 'On-time (Present)'
        };
      } else {
        return {
          allowed: true,
          status: 'late',
          reason: 'Late presence'
        };
      }
    } catch (e) {
      return { allowed: false, reason: 'Error parsing time' };
    }
  };

  const todayDateStrFormatted = format(new Date(), 'dd MMM yyyy');
  const getMarkedStatus = (classTitle) => {
    const record = studentRecords.find(r => r.date === todayDateStrFormatted && r.subject === classTitle);
    return record ? record.status : null;
  };

  const handleStudentSubmitAttendance = async (classItem, status) => {
    const dateStr = format(new Date(), 'dd MMM yyyy');
    const docId = `${user.uid}_${dateStr.replace(/\s+/g, '_')}_${classItem.title.replace(/\s+/g, '_')}`;

    try {
      await setDoc(doc(db, 'attendance', docId), {
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        date: dateStr,
        status: status,
        subject: classItem.title,
        faculty: classItem.faculty,
        timestamp: serverTimestamp()
      }, { merge: true });

      const personalAttRef = doc(collection(db, `users/${user.uid}/attendance`));
      await setDoc(personalAttRef, {
        date: format(new Date(), 'yyyy-MM-dd'),
        status: status,
        subject: classItem.title,
        faculty: classItem.faculty,
        timestamp: serverTimestamp()
      });

      triggerToast(`Attendance marked as ${status}! 🎉`);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to mark attendance');
    }
  };

  const chartTimeline = [...studentRecords].reverse().slice(-10).map((r, i) => ({
    name: `L${i+1}`,
    date: r.date,
    status: r.status,
    val: 1
  }));

  const pieData = [
    { name: 'Present', value: studentStats.present },
    { name: 'Absent', value: studentStats.absent },
    { name: 'Late', value: studentStats.late }
  ].filter(d => d.value > 0);

  // Filter student lists (Faculty search)
  const filteredStudents = students.filter(s =>
    s.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.course?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} style={{ position: 'fixed', top: 32, left: '50%', zIndex: 9999, background: 'var(--surface-elevated)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', fontWeight: 600, fontSize: '0.9rem' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== 1. FACULTY / ADMIN VIEW ==================== */}
      {canManage && (
        <>
          <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>Online Attendance Sheet</h1>
              <p style={{ color: 'var(--text-muted)' }}>Select date and subject track to log student classroom attendance roster</p>
            </div>
          </motion.div>

          {/* Config card */}
          <motion.div variants={item} className="card card-p" style={{ padding: '20px 24px', background: 'var(--white)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Class Date:</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="custom-date-picker"
                style={{ maxWidth: '160px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '260px', flex: 1 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Subject:</span>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--white)', outline: 'none', fontSize: '0.88rem' }}
              >
                <option value="Basic+AI (Prompt Engn)">Basic+AI (Prompt Engn)</option>
                <option value="School Syllabus (Classes 2 to 5)">School Syllabus (Classes 2 to 5)</option>
                <option value="School Syllabus (Classes 6 to 10)">School Syllabus (Classes 6 to 10)</option>
                <option value="Class XI & XII Computer Science">Class XI & XII Computer Science</option>
                <option value="Class XI & XII Computer Application">Class XI & XII Computer Application</option>
                <option value="Basic Coding">Basic Coding</option>
                <option value="Advance Coding">Advance Coding</option>
                <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
              </select>
            </div>

            {/* Bulk actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleBulkMark('present')} style={{ background: 'rgba(102,187,106,0.1)', color: 'var(--success)', border: '1px solid rgba(102,187,106,0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                All Present
              </button>
              <button onClick={() => handleBulkMark('absent')} style={{ background: 'rgba(239,83,80,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,83,80,0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                All Absent
              </button>
            </div>
          </motion.div>

          {/* Search roster and grid */}
          <motion.div variants={item}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Student Roster</h3>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 12px 6px 36px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="spinning" size={24} /></div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: '40px', background: 'var(--white)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-light)' }}>No matching students.</div>
            ) : (
              <div className="grid-auto-cards-sm" style={{ gap: '20px' }}>
                {filteredStudents.map(student => {
                  const status = attendanceStatusMap[student.id] || '';
                  const initials = student.displayName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'ST';
                  
                  return (
                    <div key={student.id} className="card card-p" style={{ background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: '14px', border: status === 'present' ? '1.5px solid var(--success)' : status === 'absent' ? '1.5px solid var(--danger)' : status === 'late' ? '1.5px solid var(--warning)' : '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>{initials}</div>
                        <div>
                          <h4 style={{ fontWeight: 700, fontSize: '0.92rem' }}>{student.displayName}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.course || 'Unassigned'}</p>
                        </div>
                      </div>

                      {/* Marking controls */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={() => handleMarkStatus(student.id, student.displayName, 'present')}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                            background: status === 'present' ? 'var(--success)' : 'var(--surface)',
                            color: status === 'present' ? 'white' : 'var(--text-muted)'
                          }}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkStatus(student.id, student.displayName, 'absent')}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                            background: status === 'absent' ? 'var(--danger)' : 'var(--surface)',
                            color: status === 'absent' ? 'white' : 'var(--text-muted)'
                          }}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleMarkStatus(student.id, student.displayName, 'late')}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                            background: status === 'late' ? 'var(--warning)' : 'var(--surface)',
                            color: status === 'late' ? 'white' : 'var(--text-muted)'
                          }}
                        >
                          Late
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ==================== 2. STUDENT / PARENT VIEW ==================== */}
      {user?.role?.toLowerCase() === 'student' && (
        <>
          <motion.div variants={item}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>My Attendance</h1>
            <p style={{ color: 'var(--text-muted)' }}>Realtime class presence analysis and logs for student & parent review</p>
          </motion.div>

          {/* Today's Class Check-In Card */}
          <motion.div variants={item} className="card card-p" style={{ background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Today's Class Attendance Check-In</h3>
            {todayClasses.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1.5px dashed var(--border)', borderRadius: '12px', fontSize: '0.88rem' }}>
                <CalendarIcon size={28} style={{ margin: '0 auto 8px', color: 'var(--text-light)', opacity: 0.6 }} />
                <span>No classes scheduled for today. Attendance check-in is active only on class days.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {todayClasses.map(classItem => {
                  const checkIn = getCheckInStatus(classItem.time);
                  const markedStatus = getMarkedStatus(classItem.title);

                  return (
                    <div key={classItem.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>{classItem.title}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <div>🕒 Time: {classItem.time}</div>
                          <div>👨‍🏫 Faculty: {classItem.faculty}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {markedStatus ? (
                          <span style={{
                            padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase',
                            background: markedStatus === 'present' ? 'rgba(102,187,106,0.1)' : markedStatus === 'late' ? 'rgba(255,167,38,0.1)' : 'rgba(239,83,80,0.1)',
                            color: markedStatus === 'present' ? 'var(--success)' : markedStatus === 'late' ? '#FFA726' : 'var(--danger)'
                          }}>
                            {markedStatus} (Marked)
                          </span>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {checkIn.reason}
                            </span>
                            <button
                              disabled={!checkIn.allowed}
                              onClick={() => handleStudentSubmitAttendance(classItem, checkIn.status)}
                              className="btn btn-primary"
                              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700 }}
                            >
                              Check In
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Metric Stats Cards */}
          <div className="grid-stats-dashboard">
            {[
              { label: 'Total Classes Checked', value: studentStats.total, icon: <BarChart2 size={24} />, color: 'var(--primary)', bg: 'rgba(83,109,254,0.08)' },
              { label: 'Classes Present', value: studentStats.present, icon: <CheckCircle size={24} />, color: 'var(--success)', bg: 'rgba(102,187,106,0.08)' },
              { label: 'Classes Absent', value: studentStats.absent, icon: <UserX size={24} />, color: 'var(--danger)', bg: 'rgba(239,83,80,0.08)' },
              { label: 'Attendance Score', value: `${studentStats.percentage}%`, icon: <CalendarCheck size={24} />, color: studentStats.percentage >= 80 ? 'var(--success)' : 'var(--primary)', bg: 'rgba(83,109,254,0.08)' },
            ].map((stat, i) => (
              <motion.div key={i} variants={item} className="card card-p" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--white)' }}>
                <div style={{ width: 52, height: 52, borderRadius: '16px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {stat.icon}
                </div>
                <div>
                  {loading ? <div style={{ height: 28, width: 48, background: 'var(--surface)', borderRadius: 6 }} /> : 
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>{stat.value}</div>}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Chart Insights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }} className="grid-2-col-mobile">
            
            {/* Timeline Bar Chart */}
            <motion.div variants={item} className="card card-p" style={{ background: 'var(--white)', height: '320px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>Recent Attendance Activity Timeline</h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                {loading ? <div style={{ height: '100%', background: 'var(--surface)', borderRadius: 12, animation: 'pulse 1.5s infinite' }} /> :
                chartTimeline.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>No attendance record history logged yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartTimeline} barSize={26}>
                      <XAxis dataKey="name" hide />
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const itemData = payload[0].payload;
                          return (
                            <div style={{ background: 'var(--surface-elevated)', color: 'var(--text-primary)', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                              <div style={{ fontWeight: 700 }}>{itemData.date}</div>
                              <div style={{ textTransform: 'capitalize', color: itemData.status === 'present' ? 'var(--success)' : itemData.status === 'absent' ? 'var(--danger)' : 'var(--warning)', marginTop: '2px', fontWeight: 700 }}>{itemData.status}</div>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Bar dataKey="val" radius={[4, 4, 4, 4]}>
                        {chartTimeline.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.status === 'present' ? 'var(--success)' : entry.status === 'absent' ? 'var(--danger)' : 'var(--warning)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            {/* Distribution Pie Chart */}
            <motion.div variants={item} className="card card-p" style={{ background: 'var(--white)', height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', alignSelf: 'flex-start' }}>Status Share</h3>
              <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loading ? <div style={{ width: 140, height: 140, borderRadius: '50%', background: 'var(--surface)', animation: 'pulse 1.5s infinite' }} /> :
                pieData.length === 0 ? <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>No distribution data</span> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => {
                          const colorMap = { 'Present': '#66BB6A', 'Absent': '#EF5350', 'Late': '#FFA726' };
                          return <Cell key={`cell-${index}`} fill={colorMap[entry.name]} />;
                        })}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              {/* Legends */}
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#66BB6A' }} /> Present</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF5350' }} /> Absent</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFA726' }} /> Late</div>
              </div>
            </motion.div>
          </div>

          {/* Logs table list */}
          <motion.div variants={item} className="card" style={{ background: 'var(--white)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Detailed Attendance Logs</h3>
            </div>
            
            <div style={{ padding: '0 24px' }}>
              {loading ? (
                <div style={{ padding: '24px 0', textAlign: 'center' }}><Loader2 className="spinning" /></div>
              ) : studentRecords.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-light)' }}>No class logs mapped yet.</div>
              ) : (
                studentRecords.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < studentRecords.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)' }}>{r.date}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{r.subject} · Verified by {r.faculty}</div>
                    </div>
                    <div style={{
                      padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                      background: r.status === 'present' ? 'rgba(102,187,106,0.1)' : r.status === 'absent' ? 'rgba(239,83,80,0.1)' : 'rgba(255,167,38,0.1)',
                      color: r.status === 'present' ? 'var(--success)' : r.status === 'absent' ? 'var(--danger)' : '#E65100'
                    }}>{r.status}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* ==================== 3. RESTRICTED VIEW FOR FACULTY/MEMBERS ==================== */}
      {user?.role?.toLowerCase() !== 'admin' && user?.role?.toLowerCase() !== 'student' && (
        <motion.div variants={item} className="card card-p" style={{ padding: '48px', textAlign: 'center', background: 'var(--white)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <AlertCircle size={48} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '400px', margin: '0 auto' }}>
            Student attendance logs and marking operations are restricted to administrators only.
          </p>
        </motion.div>
      )}

      {/* Spinner stylesheet */}
      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
      
    </motion.div>
  );
};

export default Attendance;
