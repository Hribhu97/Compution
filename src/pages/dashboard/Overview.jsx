import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, doc, updateDoc, addDoc, serverTimestamp, where, setDoc, increment } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Users, Send, Clock, UserMinus, ChevronDown, Share2,
  Sparkles, ShieldCheck, Download, ExternalLink, Calendar,
  ChevronRight, BookOpen, Clock3, CheckCircle, Info, Play, MessageSquare, ShieldAlert,
  FileEdit, Trash2, Pencil, Plus, FileText, GraduationCap, Globe, Megaphone, ClipboardList, UserCheck, ArrowUpRight
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import AdminDashboard from '../../components/AdminDashboard';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.06 } } };
const fadeItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
};

/* ── TOAST NOTIFICATION ────────────────────────────── */
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
      animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
      exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      style={{
        position: 'fixed',
        top: '32px',
        left: '50%',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)',
        color: 'var(--dark)',
        fontFamily: 'var(--font-support)',
        fontWeight: 600,
        fontSize: '0.95rem',
      }}
    >
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: 'var(--success)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}>
        <ShieldCheck size={14} />
      </div>
      <span>{message}</span>
    </motion.div>
  );
};

const StudentOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0 });
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [calendarEventsRaw, setCalendarEventsRaw] = useState({ calendar: [], schedules: [] });
  const [activeChatRooms, setActiveChatRooms] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [assignedFacultyList, setAssignedFacultyList] = useState([]);
  const [globalCourses, setGlobalCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [editingCourseName, setEditingCourseName] = useState(null);
  const [customAttended, setCustomAttended] = useState(0);
  const [customTotal, setCustomTotal] = useState(0);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedEventToReschedule, setSelectedEventToReschedule] = useState(null);
  const [proposedRescheduleDate, setProposedRescheduleDate] = useState('');
  const [proposedRescheduleTime, setProposedRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleFacultyId, setRescheduleFacultyId] = useState('');
  const [rescheduleIsSubmitting, setRescheduleIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const attRef = collection(db, `users/${user.uid}/attendance`);
    const unsubAtt = onSnapshot(attRef, (snap) => {
      let present = 0, absent = 0, late = 0;
      const logs = [];
      snap.forEach(doc => {
        const data = doc.data();
        logs.push({ id: doc.id, ...data });
        if (data.status === 'present') present++;
        else if (data.status === 'absent') absent++;
        else if (data.status === 'late') late++;
      });
      setAttendanceLogs(logs);
      setAttendanceStats({ present, absent, late });
      setLoading(false);
    });

    const facAssRef = query(collection(db, 'assignedFaculty'), where('studentId', '==', user.uid));
    const unsubAssignedFac = onSnapshot(facAssRef, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setAssignedFacultyList(data);
    });

    const usersRef = collection(db, 'users');
    const unsubFaculty = onSnapshot(usersRef, (snap) => {
      const facs = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.role?.toLowerCase() === 'faculty') facs.push({ id: doc.id, ...d });
      });
      setAllFaculty(facs);
    });

    const calendarRef = query(collection(db, 'studentCalendar'), where('studentId', '==', user.uid));
    const unsubCalendar = onSnapshot(calendarRef, (snap) => {
      const data = [];
      snap.forEach(doc => {
        const ev = doc.data();
        data.push({ id: doc.id, source: 'studentCalendar', title: ev.title || 'Event', date: ev.date || '', time: ev.time || '', type: ev.type || 'class', facultyId: ev.facultyId || '', meetingLink: ev.meetingLink || '' });
      });
      setCalendarEventsRaw(prev => ({ ...prev, calendar: data }));
    });

    const schedulesRef = query(collection(db, 'studentSchedules'), where('studentId', '==', user.uid));
    const unsubSchedules = onSnapshot(schedulesRef, (snap) => {
      const data = [];
      snap.forEach(doc => {
        const ev = doc.data();
        data.push({ id: doc.id, source: 'studentSchedules', title: ev.subject || 'Class Slot', date: ev.date || '', time: ev.time || '', type: 'class', facultyId: ev.facultyId || '' });
      });
      setCalendarEventsRaw(prev => ({ ...prev, schedules: data }));
    });

    const roomsQuery = query(collection(db, 'chatRooms'), where('participants', 'array-contains', user.uid));
    const unsubRooms = onSnapshot(roomsQuery, (snap) => {
      const roomList = [];
      snap.forEach(doc => roomList.push({ id: doc.id, ...doc.data() }));
      roomList.sort((a, b) => (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));
      setActiveChatRooms(roomList);
    });

    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setGlobalCourses(list);
    });

    return () => {
      unsubAtt(); unsubAssignedFac(); unsubFaculty(); unsubCalendar(); unsubSchedules(); unsubRooms(); unsubCourses();
    };
  }, [user]);

  const displayName = user?.displayName || 'Student';
  const studentCourses = user?.enrolledCourses || (user?.course && user.course !== 'Not specified' ? [user.course] : ['Python Mastery']);
  
  const totalAttCount = attendanceStats.present + attendanceStats.absent + attendanceStats.late;
  const attPct = totalAttCount > 0 ? Math.round(((attendanceStats.present + attendanceStats.late * 0.5) / totalAttCount) * 100) : 85;
  const studentStats = { percentage: attPct };

  const enrichedFacultyList = assignedFacultyList.map(af => {
    const profile = allFaculty.find(f => f.id === af.facultyId || f.email === af.facultyId);
    return {
      ...af,
      displayName: profile?.displayName || af.studentName || 'Faculty Mentor',
      photoURL: profile?.photoURL || '',
      availability: profile?.availability || 'Available',
      subject: af.subject || profile?.subjects?.[0] || 'Python Mastery'
    };
  });
  let mentorList = enrichedFacultyList;

  if (mentorList.length === 0 && allFaculty.length > 0) {
    const activeCourse = user?.course || 'Python Mastery';
    const fallbackFac = allFaculty.find(f => f.email === (activeCourse.toLowerCase().includes('python') ? 'sharmisthaghosh855@gmail.com' : 'tapadarhribhu350@gmail.com'));
    if (fallbackFac) {
      mentorList = [{ id: 'fallback', facultyId: fallbackFac.id, displayName: fallbackFac.displayName, photoURL: fallbackFac.photoURL, subject: activeCourse, availability: fallbackFac.availability || 'Available' }];
    }
  }

  const calendarEvents = [...calendarEventsRaw.calendar, ...calendarEventsRaw.schedules];
  calendarEvents.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));

  const sendAutomatedChatMessage = async (targetFacultyId, targetFacultyName, classTitle, proposedDate, proposedTime, reason) => {
    if (!targetFacultyId || targetFacultyId === 'fallback') return;
    const roomId = user.uid < targetFacultyId ? `${user.uid}_${targetFacultyId}` : `${targetFacultyId}_${user.uid}`;
    const roomRef = doc(db, 'chatRooms', roomId);
    await setDoc(roomRef, {
      id: roomId, participants: [user.uid, targetFacultyId], lastMessage: `Rescheduling: ${classTitle}`, lastMessageTime: serverTimestamp(),
      studentUnreadCount: 0, facultyUnreadCount: increment(1)
    }, { merge: true });
    await addDoc(collection(db, `chatRooms/${roomId}/messages`), {
      senderId: user.uid, text: `🚨 Rescheduling Request:\nClass: ${classTitle}\nProposed: ${proposedDate} at ${proposedTime}\nReason: ${reason}`,
      createdAt: serverTimestamp()
    });
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const hasMarkedToday = attendanceLogs.some(log => log.date === todayStr);

  const handleMarkAttendance = async () => {
    try {
      await addDoc(collection(db, 'attendance'), { studentId: user.uid, studentName: displayName, date: todayStr, status: 'present', timestamp: serverTimestamp() });
      await setDoc(doc(collection(db, `users/${user.uid}/attendance`)), { date: todayStr, status: 'present', timestamp: serverTimestamp() });
      setToast('Attendance marked successfully! 🎉');
    } catch (err) {
      console.error(err);
      setToast('Failed to mark attendance.');
    }
  };

  const handleAddCourse = async (courseTitle) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const currentEnrolled = user?.enrolledCourses || (user?.course && user.course !== 'Not specified' ? [user.course] : ['Python Mastery']);
      if (!currentEnrolled.includes(courseTitle)) {
        await updateDoc(userRef, { enrolledCourses: [...currentEnrolled, courseTitle] });
        setToast(`Enrolled in ${courseTitle}! 📚`);
      }
    } catch (err) { setToast("Failed to enroll."); }
  };

  const handleRemoveCourse = async (courseTitle) => {
    if (window.confirm(`Are you sure you want to remove ${courseTitle} from your courses?`)) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const currentEnrolled = user?.enrolledCourses || (user?.course && user.course !== 'Not specified' ? [user.course] : ['Python Mastery']);
        const updatedEnrolled = currentEnrolled.filter(c => c !== courseTitle);
        
        const updatedOverrides = { ...(user?.courseOverrides || {}) };
        delete updatedOverrides[courseTitle];

        await updateDoc(userRef, { 
          enrolledCourses: updatedEnrolled,
          courseOverrides: updatedOverrides
        });
        setToast(`Removed ${courseTitle}.`);
      } catch (err) {
        console.error(err);
        setToast("Failed to remove course.");
      }
    }
  };

  const handleSaveCourseEdit = async (e) => {
    e.preventDefault();
    if (!editingCourseName) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedOverrides = { 
        ...(user?.courseOverrides || {}),
        [editingCourseName]: { attended: customAttended, total: customTotal }
      };
      await updateDoc(userRef, { courseOverrides: updatedOverrides });
      setToast(`Updated attendance details for ${editingCourseName}!`);
      setIsEditCourseModalOpen(false);
      setEditingCourseName(null);
    } catch (err) {
      console.error(err);
      setToast("Failed to update course.");
    }
  };

  const studentCoursesList = studentCourses.map((courseName, index) => {
    const override = user?.courseOverrides?.[courseName];
    const attended = override !== undefined && override.attended !== undefined
      ? override.attended
      : attendanceLogs.filter(log => log.subject === courseName && (log.status === 'present' || log.status === 'late')).length;
    const total = override !== undefined && override.total !== undefined
      ? override.total
      : attendanceLogs.filter(log => log.subject === courseName).length;
    const meta = globalCourses.find(c => c.title === courseName) || { subject: courseName };
    
    const themes = [
      { bg: '#EEF2FF', iconColor: '#4F46E5', badgeBg: '#E0E7FF', icon: <ClipboardList size={22} style={{ color: '#4F46E5' }} /> }, // Purple/Indigo
      { bg: '#FFF7ED', iconColor: '#EA580C', badgeBg: '#FFEDD5', icon: <Globe size={22} style={{ color: '#EA580C' }} /> }, // Orange
      { bg: '#FFF1F2', iconColor: '#E11D48', badgeBg: '#FFE4E6', icon: <Megaphone size={22} style={{ color: '#E11D48' }} /> }, // Rose/pink
      { bg: '#F0FDF4', iconColor: '#16A34A', badgeBg: '#DCFCE7', icon: <BookOpen size={22} style={{ color: '#16A34A' }} /> }  // Green
    ];
    const theme = themes[index % themes.length];

    return {
      title: courseName,
      mentor: meta.mentor || 'Faculty Mentor',
      progress: total > 0 ? Math.round((attended / total) * 100) : 0,
      attended,
      total,
      theme,
      icon: theme.icon
    };
  });

  const availableToAddCourses = globalCourses.filter(c => !studentCourses.includes(c.title));

  const renderMonthCalendarView = () => {
    const monthStart = startOfMonth(selectedCalendarDate);
    const monthEnd = endOfMonth(monthStart);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const emptySlots = (monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1);
    const filteredEvents = calendarEvents.filter(ev => isSameDay(parseISO(ev.date), selectedCalendarDate));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
          <button type="button" onClick={() => setSelectedCalendarDate(addMonths(selectedCalendarDate, -1))} style={{ padding: '6px 12px', color: 'var(--primary)', fontWeight: 800 }}>&lt;</button>
          <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--dark)' }}>{format(selectedCalendarDate, 'MMMM yyyy')}</span>
          <button type="button" onClick={() => setSelectedCalendarDate(addMonths(selectedCalendarDate, 1))} style={{ padding: '6px 12px', color: 'var(--primary)', fontWeight: 800 }}>&gt;</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontSize: '0.75rem' }}>
          {['M','T','W','T','F','S','S'].map((day, i) => <div key={i} style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{day}</div>)}
          {Array.from({ length: emptySlots }).map((_, i) => <div key={`empty-${i}`} />)}
          {monthDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedCalendarDate);
            const hasEvent = calendarEvents.some(ev => isSameDay(parseISO(ev.date), day));
            return (
              <div
                key={i}
                onClick={() => setSelectedCalendarDate(day)}
                style={{
                  padding: '8px 0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  color: isSelected ? 'white' : 'var(--dark)',
                  fontWeight: (isSelected || hasEvent) ? 800 : 500,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {format(day, 'd')}
                {hasEvent && !isSelected && (
                  <span style={{ position: 'absolute', bottom: '3px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--dark)' }}>
            Schedule for {format(selectedCalendarDate, 'MMMM d')}
          </h4>
          {filteredEvents.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontStyle: 'italic', padding: '8px 0' }}>
              No classes scheduled.
            </div>
          ) : (
            filteredEvents.map(ev => (
              <div key={ev.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ color: 'var(--dark)' }}>{ev.title}</strong>
                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                    {ev.type || 'class'}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>🕒 {ev.time}</div>
                {ev.meetingLink && (
                  <a href={ev.meetingLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem' }}>
                    Join Meeting <ArrowUpRight size={12} />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setRescheduleIsSubmitting(true);
    try {
      await addDoc(collection(db, 'rescheduleRequests'), {
        studentId: user.uid, studentName: displayName, facultyId: rescheduleFacultyId,
        classTitle: selectedEventToReschedule?.title, requestedDate: proposedRescheduleDate, requestedTime: proposedRescheduleTime, reason: rescheduleReason, status: 'pending', createdAt: serverTimestamp()
      });
      await sendAutomatedChatMessage(rescheduleFacultyId, 'Mentor', selectedEventToReschedule?.title, proposedRescheduleDate, proposedRescheduleTime, rescheduleReason);
      setToast('Request submitted! 🔄');
      setRescheduleModalOpen(false);
    } finally { setRescheduleIsSubmitting(false); }
  };

  if (loading) return null;

  const todayFormatted = format(new Date(), 'MMMM d, EEEE');

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      <AnimatePresence>{toast && <Toast message={toast} onClose={() => setToast(null)} />}</AnimatePresence>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 0.9fr', gap: '28px' }} className="grid-2-col-mobile">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Welcome Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1e70e7 0%, #0052cc 100%)',
            color: 'white',
            borderRadius: '24px',
            padding: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              position: 'absolute', top: '-30%', right: '-10%', width: '300px', height: '300px',
              borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 2, flex: 1 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.8)' }}>
                {todayFormatted}
              </span>
              <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
                Welcome back, {displayName.split(' ')[0]}!
              </h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.92rem' }}>
                You've finished {studentStats.percentage}% of your weekly goal!
              </p>
              
              <div style={{ marginTop: '8px' }}>
                {hasMarkedToday ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '100px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}>
                    <CheckCircle size={14} /> Checked in for Today
                  </div>
                ) : (
                  <button
                    onClick={handleMarkAttendance}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      background: 'white',
                      color: '#0052cc',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'; }}
                  >
                    Mark Present for Today
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hide-mobile">
              <GraduationCap size={96} strokeWidth={1.2} style={{ color: 'white', opacity: 0.85, transform: 'rotate(10deg)' }} />
            </div>
          </div>

          {/* My Courses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)' }}>My Courses</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {studentCoursesList.map((c, index) => {
                // Highlight second card to match reference mockup
                const isHighlighted = index === 1;
                return (
                  <div
                    key={c.title}
                    style={{
                      padding: '24px',
                      background: 'white',
                      borderRadius: '24px',
                      border: isHighlighted ? '2.5px solid var(--primary)' : '1px solid var(--border)',
                      boxShadow: isHighlighted ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      position: 'relative',
                      transition: 'all 0.25s ease-in-out',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {/* Action buttons */}
                    <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '6px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const override = user?.courseOverrides?.[c.title];
                          setEditingCourseName(c.title);
                          setCustomAttended(override !== undefined ? override.attended : c.attended);
                          setCustomTotal(override !== undefined ? override.total : c.total);
                          setIsEditCourseModalOpen(true);
                        }}
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer',
                          padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.2s, background-color 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'var(--primary-light)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-light)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                        title="Edit Course Attendance"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCourse(c.title);
                        }}
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer',
                          padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.2s, background-color 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.backgroundColor = 'rgba(239, 83, 80, 0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-light)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                        title="Remove Course"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: c.theme.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {c.icon}
                    </div>
                    
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3 }}>{c.title}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{c.mentor}</span>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                        <span>Attended: {c.attended}/{c.total}</span>
                        <span>{c.progress}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{ width: `${c.progress}%`, height: '100%', background: 'var(--primary)', borderRadius: '100px' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Add Course dashed card */}
              <div
                onClick={() => setIsAddCourseModalOpen(true)}
                style={{
                  border: '2px dashed rgba(0, 0, 0, 0.15)',
                  borderRadius: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '24px',
                  cursor: 'pointer',
                  minHeight: '170px',
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  background: 'rgba(0, 0, 0, 0.01)'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'rgba(83, 109, 254, 0.01)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(0, 0, 0, 0.01)'; }}
              >
                <Plus size={24} />
                <span>Add Course</span>
              </div>
            </div>
          </div>

          {/* Mentors Panel (Replacing Achievements) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)' }}>My Mentors</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {mentorList.map((mentor, index) => {
                const borderColors = ['#FFA726', '#AB47BC', '#536DFE'];
                const bColor = borderColors[index % borderColors.length];
                const bgColors = ['rgba(255, 167, 38, 0.02)', 'rgba(171, 71, 188, 0.02)', 'rgba(83, 109, 254, 0.02)'];
                const bgColor = bgColors[index % bgColors.length];
                const buttonColors = ['#FFA726', '#AB47BC', 'var(--primary)'];
                const btnColor = buttonColors[index % buttonColors.length];

                return (
                  <div
                    key={mentor.id}
                    style={{
                      padding: '24px',
                      background: bgColor,
                      borderRadius: '24px',
                      border: `2px solid ${bColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      position: 'relative',
                      transition: 'all 0.25s ease-in-out'
                    }}
                  >
                    <img
                      src={mentor.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'}
                      alt={mentor.displayName}
                      style={{ width: '56px', height: '56px', borderRadius: '16px', objectFit: 'cover', border: `2px solid ${bColor}` }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--dark)' }}>{mentor.displayName}</h4>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{mentor.subject || 'Faculty Mentor'}</p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: mentor.availability === 'Busy' ? 'rgba(239,83,80,0.1)' : 'rgba(102,187,106,0.1)',
                          color: mentor.availability === 'Busy' ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {mentor.availability || 'Available'}
                        </span>
                        <button
                          onClick={() => navigate('/dashboard/community', { state: { startChatWith: mentor.facultyId } })}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '8px',
                            background: btnColor,
                            color: 'white',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          Chat
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {mentorList.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1', border: '1px dashed var(--border)', borderRadius: '24px' }}>
                  No mentors assigned yet.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Calendar Widget */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)' }}>My Schedule</h3>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '24px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {renderMonthCalendarView()}
            </div>
          </div>

          {/* Upcoming Tasks Section (Kept Blank for Now) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)' }}>Upcoming Tasks</h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', cursor: 'pointer' }}>See All</span>
            </div>
            <div style={{
              background: 'white',
              minHeight: '140px',
              borderRadius: '24px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              color: 'var(--text-light)',
              fontSize: '0.82rem',
              fontStyle: 'italic'
            }}>
              All caught up! No upcoming tasks.
            </div>
          </div>

        </div>
      </div>

      {/* ENROLL COURSE MODAL */}
      <Modal isOpen={isAddCourseModalOpen} onClose={() => setIsAddCourseModalOpen(false)} title="Enroll in a New Course">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select from our premium programs to add to your workspace.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
            {availableToAddCourses.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                You have enrolled in all available programs!
              </div>
            ) : (
              availableToAddCourses.map(course => (
                <div
                  key={course.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: 'var(--bg)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--dark)' }}>{course.title}</h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Instructor: {course.mentor || 'Faculty Mentor'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleAddCourse(course.title);
                      setIsAddCourseModalOpen(false);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '8px' }}
                  >
                    Enroll
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* REQUEST RESCHEDULE MODAL */}
      <Modal isOpen={rescheduleModalOpen} onClose={() => setRescheduleModalOpen(false)} title="Request Rescheduling">
        <form onSubmit={handleRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <textarea
            onChange={e => setRescheduleReason(e.target.value)}
            placeholder="Reason for reschedule..."
            required
            className="form-input"
            rows={3}
            style={{ resize: 'none' }}
          />
          <button type="submit" disabled={rescheduleIsSubmitting} className="btn btn-primary" style={{ width: '100%' }}>
            {rescheduleIsSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </Modal>

      {/* EDIT COURSE MODAL */}
      <Modal isOpen={isEditCourseModalOpen} onClose={() => setIsEditCourseModalOpen(false)} title={`Edit Course - ${editingCourseName}`}>
        <form onSubmit={handleSaveCourseEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customize your attended and total class counts for personal analysis tracking.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>Attended Classes Count:</span>
              <input 
                type="number" 
                min="0" 
                max={customTotal}
                value={customAttended} 
                onChange={e => setCustomAttended(Math.max(0, parseInt(e.target.value) || 0))}
                className="form-input"
                required
              />
            </label>

            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>Total Classes Count:</span>
              <input 
                type="number" 
                min="0" 
                value={customTotal} 
                onChange={e => setCustomTotal(Math.max(0, parseInt(e.target.value) || 0))}
                className="form-input"
                required
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsEditCourseModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default function Overview() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh' }}>
        <div className="spinning" style={{ width: '32px', height: '32px', border: '3px solid rgba(83,109,254,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
      </div>
    );
  }
  
  const userRoleLower = user?.role?.toLowerCase();
  if (userRoleLower === 'admin' || userRoleLower === 'faculty' || userRoleLower === 'member') return <AdminDashboard />;
  
  return <StudentOverview />;
}
