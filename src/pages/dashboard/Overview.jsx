import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db, syncStudentFeeAggregates } from '../../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, where, setDoc, increment } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Users, Send, Clock, UserMinus, ChevronDown, Share2,
  Sparkles, ShieldCheck, Download, ExternalLink, Calendar,
  ChevronRight, BookOpen, Clock3, CheckCircle, Info, Play, MessageSquare, ShieldAlert,
  FileEdit, Trash2, Plus, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { calculateAttendancePercent, calculateAssignmentCompletion, calculatePerformanceScore, calculateGrade } from '../../utils/formulas';
import AdminStudentGrid from '../../components/AdminStudentGrid';
import AdminDashboard from '../../components/AdminDashboard';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.06 } } };
const fadeItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
};

const CircularProgress = ({ percentage, size = 140, stroke = 12 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8EDF5" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--success)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--dark)' }}>{percentage}%</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>completed</span>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--dark)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
        {payload[0].value} hrs
      </div>
    );
  }
  return null;
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

  // State Variables
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0, doubts: 0 });
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [calendarEventsRaw, setCalendarEventsRaw] = useState({ calendar: [], schedules: [] });
  const [activeChatRooms, setActiveChatRooms] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [assignedFacultyList, setAssignedFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Calendar State
  const [calendarViewMode, setCalendarViewMode] = useState('agenda'); // 'agenda' | 'week' | 'month'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  // Rescheduling Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedEventToReschedule, setSelectedEventToReschedule] = useState(null);
  const [proposedRescheduleDate, setProposedRescheduleDate] = useState('');
  const [proposedRescheduleTime, setProposedRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleFacultyId, setRescheduleFacultyId] = useState('');
  const [rescheduleIsSubmitting, setRescheduleIsSubmitting] = useState(false);

  // Load Realtime Data
  useEffect(() => {
    if (!user?.uid) return;

    // 1. Fetch Attendance Logs and Stats
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
      logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setAttendanceLogs(logs);
      setAttendanceStats({ present, absent, late, doubts: 0 });
      setLoading(false);
    });

    // 2. Fetch Assigned Faculty List
    const facAssRef = query(collection(db, 'assignedFaculty'), where('studentId', '==', user.uid));
    const unsubAssignedFac = onSnapshot(facAssRef, (snap) => {
      const data = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setAssignedFacultyList(data);
    });

    // 3. Fetch All Users (to resolve details of Faculty members)
    const usersRef = collection(db, 'users');
    const unsubFaculty = onSnapshot(usersRef, (snap) => {
      const facs = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.role === 'faculty') {
          facs.push({ id: doc.id, ...d });
        }
      });
      setAllFaculty(facs);
    });

    // 4. Fetch Calendar Events (studentCalendar)
    const calendarRef = query(collection(db, 'studentCalendar'), where('studentId', '==', user.uid));
    const unsubCalendar = onSnapshot(calendarRef, (snap) => {
      const data = [];
      snap.forEach(doc => {
        const ev = doc.data();
        data.push({
          id: doc.id,
          source: 'studentCalendar',
          title: ev.title || 'Event',
          date: ev.date || '',
          time: ev.time || '',
          type: ev.type || 'class',
          faculty: ev.faculty || 'Faculty Mentor',
          facultyId: ev.facultyId || '',
          meetingLink: ev.meetingLink || ''
        });
      });
      setCalendarEventsRaw(prev => ({ ...prev, calendar: data }));
    });

    // 5. Fetch Class Schedules (studentSchedules)
    const schedulesRef = query(collection(db, 'studentSchedules'), where('studentId', '==', user.uid));
    const unsubSchedules = onSnapshot(schedulesRef, (snap) => {
      const data = [];
      snap.forEach(doc => {
        const ev = doc.data();
        data.push({
          id: doc.id,
          source: 'studentSchedules',
          title: ev.subject || 'Class Slot',
          date: ev.date || '',
          time: ev.time || '',
          type: 'class',
          faculty: ev.faculty || 'Faculty Mentor',
          facultyId: ev.facultyId || '',
          mode: ev.mode || 'online',
          notes: ev.notes || ''
        });
      });
      setCalendarEventsRaw(prev => ({ ...prev, schedules: data }));
    });

    // 6. Fetch Active Doubt Chat Rooms
    const roomsQuery = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubRooms = onSnapshot(roomsQuery, (snap) => {
      const roomList = [];
      snap.forEach(doc => {
        roomList.push({ id: doc.id, ...doc.data() });
      });
      roomList.sort((a, b) => (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));
      setActiveChatRooms(roomList);
    });

    return () => {
      unsubAtt();
      unsubAssignedFac();
      unsubFaculty();
      unsubCalendar();
      unsubSchedules();
      unsubRooms();
    };
  }, [user]);

  // Derived Values
  const displayName = user?.displayName || 'Student';
  const email = user?.email || 'student@compution.in';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Combine Faculty Roster
  const enrichedFacultyList = assignedFacultyList.map(af => {
    const profile = allFaculty.find(f => f.id === af.facultyId || f.email === af.facultyId);
    return {
      ...af,
      displayName: profile?.displayName || af.studentName || 'Faculty Mentor',
      photoURL: profile?.photoURL || '',
      availability: profile?.availability || 'Available',
      officeTimings: profile?.officeTimings || 'Flexible Hours',
      email: profile?.email || '',
      phone: profile?.phone || '',
      role: af.role || profile?.role || 'Faculty Mentor',
      subject: af.subject || profile?.subjects?.[0] || 'Python Mastery'
    };
  });
  let facultyList = enrichedFacultyList;

  // Fallback to match course if assignedFaculty is empty
  if (facultyList.length === 0 && allFaculty.length > 0) {
    const activeCourse = user?.course || 'Python Mastery';
    let fallbackFac;
    if (activeCourse.toLowerCase().includes('python') || activeCourse.toLowerCase().includes('basic computer') || activeCourse.toLowerCase().includes('class 11') || activeCourse.toLowerCase().includes('class 12') || activeCourse.toLowerCase().includes('tally') || activeCourse.toLowerCase().includes('excel')) {
      fallbackFac = allFaculty.find(f => f.email === 'sharmisthaghosh855@gmail.com');
    } else {
      fallbackFac = allFaculty.find(f => f.email === 'tapadarhribhu350@gmail.com');
    }
    if (fallbackFac) {
      facultyList = [{
        id: 'fallback',
        facultyId: fallbackFac.id,
        displayName: fallbackFac.displayName,
        photoURL: fallbackFac.photoURL,
        subject: activeCourse,
        role: fallbackFac.role || 'Faculty Mentor',
        availability: fallbackFac.availability || 'Available',
        officeTimings: fallbackFac.officeTimings || 'Flexible Hours',
        email: fallbackFac.email,
        phone: fallbackFac.phone
      }];
    }
  }

  // Unified Calendar Events
  const calendarEvents = [...calendarEventsRaw.calendar, ...calendarEventsRaw.schedules];
  calendarEvents.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));

  // Doubt Chart Data
  const doubtActivityData = [
    { day: 'Mon', solved: 4, raised: 5 },
    { day: 'Tue', solved: 6, raised: 6 },
    { day: 'Wed', solved: 3, raised: 5 },
    { day: 'Thu', solved: 8, raised: 8 },
    { day: 'Fri', solved: 5, raised: 7 },
    { day: 'Sat', solved: 7, raised: 7 },
    { day: 'Sun', solved: 2, raised: 3 }
  ];

  // Helper: Automated Chat Message Reschedule Alert
  const sendAutomatedChatMessage = async (targetFacultyId, targetFacultyName, classTitle, proposedDate, proposedTime, reason) => {
    if (!targetFacultyId || targetFacultyId === 'fallback') return;
    const roomId = user.uid < targetFacultyId ? `${user.uid}_${targetFacultyId}` : `${targetFacultyId}_${user.uid}`;
    const roomRef = doc(db, 'chatRooms', roomId);
    try {
      await setDoc(roomRef, {
        id: roomId,
        participants: [user.uid, targetFacultyId],
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        studentPhoto: user.photoURL || '',
        facultyId: targetFacultyId,
        facultyName: targetFacultyName,
        lastMessage: `Requested rescheduling: ${classTitle}`,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        studentUnreadCount: 0,
        facultyUnreadCount: increment(1),
        typing: { [user.uid]: false, [targetFacultyId]: false }
      }, { merge: true });

      await addDoc(collection(db, `chatRooms/${roomId}/messages`), {
        senderId: user.uid,
        senderName: user.displayName || 'Student',
        text: `🚨 Rescheduling Request:\nClass: ${classTitle}\nProposed Date/Time: ${proposedDate} at ${proposedTime}\nReason: ${reason}`,
        seen: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending automated chat message:", err);
    }
  };

  // Helper: Mark Attendance
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const hasMarkedToday = attendanceLogs.some(log => log.date === todayStr);

  const handleMarkAttendance = async () => {
    if (hasMarkedToday) return;
    try {
      // 1. Top level
      await addDoc(collection(db, 'attendance'), {
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        date: todayStr,
        status: 'present',
        timestamp: serverTimestamp()
      });

      // 2. Personal subcollection
      const personalAttRef = doc(collection(db, `users/${user.uid}/attendance`));
      await setDoc(personalAttRef, {
        date: todayStr,
        status: 'present',
        timestamp: serverTimestamp()
      });

      setToast('Attendance marked successfully! 🎉');
    } catch (err) {
      console.error(err);
      setToast('Failed to mark attendance. Please try again.');
    }
  };

  // 1. ATTENDANCE LOG WIDGET
  const renderAttendanceWidget = () => {
    const totalAttCount = attendanceStats.present + attendanceStats.absent + attendanceStats.late;
    const attPct = totalAttCount > 0 ? Math.round(((attendanceStats.present + attendanceStats.late * 0.5) / totalAttCount) * 100) : 100;

    return (
      <motion.div variants={fadeItem} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Attendance Log</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Mark and view daily check-in logs</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-light)', letterSpacing: '0.05em' }}>RATE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', marginTop: '4px' }}>{attPct}%</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(102,187,106,0.06)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '0.05em' }}>PRESENT</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>{attendanceStats.present}</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(255,167,38,0.06)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#FFA726', letterSpacing: '0.05em' }}>LATE</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFA726', marginTop: '4px' }}>{attendanceStats.late}</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(239,83,80,0.06)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--danger)', letterSpacing: '0.05em' }}>ABSENT</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--danger)', marginTop: '4px' }}>{attendanceStats.absent}</div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {hasMarkedToday ? (
            <button disabled style={{ width: '100%', padding: '14px', background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'not-allowed' }}>
              <CheckCircle size={18} style={{ color: 'var(--success)' }} /> Attendance Marked for Today
            </button>
          ) : (
            <button onClick={handleMarkAttendance} className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircle size={18} /> Mark Attendance for Today
            </button>
          )}
        </div>

        {/* Recent logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--dark)' }}>Recent Logs</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {attendanceLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.8rem' }}>No logs recorded yet.</div>
            ) : (
              attendanceLogs.slice(0, 5).map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{format(parseISO(log.date), 'PPPP')}</span>
                  <span style={{
                    padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                    background: log.status === 'present' ? 'rgba(102,187,106,0.1)' : log.status === 'late' ? 'rgba(255,167,38,0.1)' : 'rgba(239,83,80,0.1)',
                    color: log.status === 'present' ? 'var(--success)' : log.status === 'late' ? '#FFA726' : 'var(--danger)'
                  }}>{log.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // 2. DOUBT CHATS & CHARTS WIDGET
  const renderDoubtChatsAndChartsWidget = () => {
    return (
      <motion.div variants={fadeItem} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Doubt Chats & Charts</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Resolve coding questions and track queries trend</p>
        </div>

        {/* Chart representation */}
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>Weekly Doubt Resolution Trend</h4>
          <div style={{ height: '160px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={doubtActivityData} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-light)', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-light)', fontWeight: 500 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="raised" name="Doubts Asked" fill="rgba(83,109,254,0.15)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="solved" name="Doubts Resolved" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chats list representation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--dark)' }}>Active Doubt Chats</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {activeChatRooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-light)', border: '1.5px dashed var(--border)', borderRadius: '12px', fontSize: '0.8rem' }}>
                No active doubt rooms. Go to Community to initiate chats!
              </div>
            ) : (
              activeChatRooms.map(room => (
                <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <img src={room.facultyPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} alt={room.facultyName} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dark)' }}>{room.facultyName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.lastMessage}</div>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/community', { state: { startChatWith: room.facultyId } })}
                    style={{
                      padding: '6px 12px', background: 'white', border: '1.5px solid var(--border-strong)',
                      borderRadius: '8px', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'var(--transition)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--primary)'; }}
                  >
                    Chat
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // 3. CLASS SCHEDULE WIDGET
  const renderInteractiveCalendarWidget = () => {
    const monthStart = startOfMonth(selectedCalendarDate);
    const monthEnd = endOfMonth(monthStart);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const weekStart = startOfWeek(selectedCalendarDate, { weekStartsOn: 1 });
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(addDays(weekStart, i));
    }

    const changeMonth = (amount) => {
      setSelectedCalendarDate(prev => addMonths(prev, amount));
    };

    const handleSelectDay = (day) => {
      setSelectedCalendarDate(day);
    };

    const filteredEventsForSelectedDate = calendarEvents.filter(ev => 
      isSameDay(parseISO(ev.date), selectedCalendarDate)
    );

    const renderEventCardDetailed = (ev) => {
      const isToday = isSameDay(new Date(), parseISO(ev.date));
      const badgeColors = {
        class: 'badge-primary',
        assignment: 'badge-warning',
        test: 'badge-danger',
        meeting: 'badge-success'
      };

      return (
        <div key={ev.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', background: 'var(--bg)', borderRadius: '12px', border: isToday ? '1.5px solid var(--success)' : '1px solid var(--border)', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={`badge ${badgeColors[ev.type] || 'badge-primary'}`} style={{ textTransform: 'uppercase', fontSize: '0.65rem', padding: '2px 8px' }}>
              {ev.type || 'class'}
            </span>
            {isToday && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--success)' }}>TODAY</span>}
          </div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0, color: 'var(--dark)' }}>{ev.title}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
            <div>🕒 {ev.time} ({format(parseISO(ev.date), 'EEE, MMM d')})</div>
            {ev.faculty && <div>👨‍🏫 Faculty: {ev.faculty}</div>}
            {ev.mode && <div style={{ textTransform: 'capitalize' }}>📍 Mode: {ev.mode}</div>}
            {ev.notes && <div style={{ fontStyle: 'italic', color: 'var(--text-light)', background: 'var(--surface)', padding: '6px', borderRadius: '6px', marginTop: '4px' }}>📝 Notes: {ev.notes}</div>}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {ev.meetingLink && (
              <a
                href={ev.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '6px 12px', background: 'var(--primary)', color: 'white', borderRadius: '6px',
                  fontWeight: 700, fontSize: '0.75rem', textAlign: 'center'
                }}
              >
                <Play size={10} /> Join Live Meet
              </a>
            )}
            {ev.type === 'class' && (
              <button
                onClick={() => {
                  setSelectedEventToReschedule(ev);
                  setProposedRescheduleDate(ev.date);
                  setProposedRescheduleTime(ev.time);
                  setRescheduleFacultyId(ev.facultyId || facultyList[0]?.id || facultyList[0]?.facultyId || '');
                  setRescheduleReason('');
                  setRescheduleModalOpen(true);
                }}
                style={{
                  flex: 1, padding: '6px 12px', background: 'white', border: '1.5px solid var(--border-strong)',
                  color: 'var(--primary)', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: 'var(--transition)'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--primary)'; }}
              >
                🔄 Request Reschedule
              </button>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Class Schedule</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interactive schedule planner</p>
          </div>
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '100px', padding: '2px' }}>
            {['agenda', 'week', 'month'].map(mode => (
              <button
                type="button"
                key={mode}
                onClick={() => setCalendarViewMode(mode)}
                style={{
                  padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700,
                  background: calendarViewMode === mode ? 'white' : 'transparent',
                  color: calendarViewMode === mode ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {calendarViewMode === 'month' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
              <button type="button" onClick={() => changeMonth(-1)} style={{ padding: '4px 8px', color: 'var(--primary)' }}>&lt;</button>
              <span>{format(selectedCalendarDate, 'MMMM yyyy')}</span>
              <button type="button" onClick={() => changeMonth(1)} style={{ padding: '4px 8px', color: 'var(--primary)' }}>&gt;</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.75rem' }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <div key={idx} style={{ fontWeight: 700, color: 'var(--text-light)', padding: '4px 0' }}>{day}</div>
              ))}
              {monthDays.map((day, idx) => {
                const hasEvents = calendarEvents.some(ev => isSameDay(parseISO(ev.date), day));
                const isSelected = isSameDay(day, selectedCalendarDate);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectDay(day)}
                    style={{
                      padding: '6px 0', borderRadius: '8px', cursor: 'pointer', position: 'relative',
                      background: isSelected ? 'var(--primary)' : isToday ? 'var(--primary-light)' : 'transparent',
                      color: isSelected ? 'white' : 'var(--dark)',
                      fontWeight: isSelected || isToday ? 700 : 500
                    }}
                  >
                    {format(day, 'd')}
                    {hasEvents && (
                      <span style={{
                        position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
                        width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? 'white' : 'var(--success)'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Events for {format(selectedCalendarDate, 'MMM d, yyyy')}
              </div>
              {filteredEventsForSelectedDate.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                  No classes or events scheduled
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredEventsForSelectedDate.map(ev => renderEventCardDetailed(ev))}
                </div>
              )}
            </div>
          </div>
        )}

        {calendarViewMode === 'week' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
              <button type="button" onClick={() => setSelectedCalendarDate(prev => addDays(prev, -7))} style={{ padding: '4px 8px', color: 'var(--primary)' }}>&lt;</button>
              <span>Week of {format(weekStart, 'MMM d, yyyy')}</span>
              <button type="button" onClick={() => setSelectedCalendarDate(prev => addDays(prev, 7))} style={{ padding: '4px 8px', color: 'var(--primary)' }}>&gt;</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.75rem' }}>
              {weekDays.map((day, idx) => {
                const isSelected = isSameDay(day, selectedCalendarDate);
                const hasEvents = calendarEvents.some(ev => isSameDay(parseISO(ev.date), day));
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectDay(day)}
                    style={{
                      padding: '8px 0', borderRadius: '8px', cursor: 'pointer',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid transparent'
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{format(day, 'eee')}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dark)' }}>{format(day, 'd')}</div>
                    {hasEvents && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--success)', margin: '2px auto 0' }} />}
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Events for {format(selectedCalendarDate, 'MMM d, yyyy')}
              </div>
              {filteredEventsForSelectedDate.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                  No events on this day
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredEventsForSelectedDate.map(ev => renderEventCardDetailed(ev))}
                </div>
              )}
            </div>
          </div>
        )}

        {calendarViewMode === 'agenda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {calendarEvents.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                No events in your agenda.
              </div>
            ) : (
              calendarEvents.map(ev => renderEventCardDetailed(ev))
            )}
          </div>
        )}
      </div>
    );
  };

  // RESCHEDULE MODAL RENDERING
  const renderRescheduleModal = () => {
    return (
      <Modal isOpen={rescheduleModalOpen} onClose={() => setRescheduleModalOpen(false)} title="Request Class Rescheduling">
        <form onSubmit={handleRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Class Subject</label>
            <input type="text" className="form-input" disabled value={selectedEventToReschedule?.title || 'Class'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Current Date</label>
              <input type="text" className="form-input" disabled value={selectedEventToReschedule?.date ? format(parseISO(selectedEventToReschedule.date), 'PPPP') : ''} />
            </div>
            <div>
              <label className="form-label">Current Time</label>
              <input type="text" className="form-input" disabled value={selectedEventToReschedule?.time || ''} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0', padding: '8px 0' }} />

          <div>
            <label className="form-label">Select Mentor</label>
            <select
              className="form-input"
              required
              value={rescheduleFacultyId}
              onChange={e => setRescheduleFacultyId(e.target.value)}
            >
              <option value="" disabled>Choose a faculty mentor</option>
              {facultyList.map(fac => (
                <option key={fac.id || fac.facultyId} value={fac.id || fac.facultyId}>{fac.displayName} ({fac.subject})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Proposed Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={proposedRescheduleDate}
                onChange={e => setProposedRescheduleDate(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Proposed Time</label>
              <input
                type="time"
                required
                className="form-input"
                value={proposedRescheduleTime}
                onChange={e => setProposedRescheduleTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Reason for Rescheduling</label>
            <textarea
              className="form-input"
              required
              rows={4}
              value={rescheduleReason}
              onChange={e => setRescheduleReason(e.target.value)}
              placeholder="Please provide the exact reason why you need this class slot rescheduled..."
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setRescheduleModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={rescheduleIsSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {rescheduleIsSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    );
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleFacultyId || !proposedRescheduleDate || !proposedRescheduleTime || !rescheduleReason.trim()) {
      setToast('Please fill out all fields.');
      return;
    }
    setRescheduleIsSubmitting(true);
    try {
      const selectedFaculty = facultyList.find(f => (f.id === rescheduleFacultyId || f.facultyId === rescheduleFacultyId));
      const facultyName = selectedFaculty ? selectedFaculty.displayName : 'Faculty Mentor';

      // 1. Add reschedule request document
      await addDoc(collection(db, 'rescheduleRequests'), {
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        facultyId: rescheduleFacultyId,
        facultyName: facultyName,
        classId: selectedEventToReschedule?.id || 'none',
        classTitle: selectedEventToReschedule?.title || 'Class Slot',
        originalDate: selectedEventToReschedule?.date || '',
        originalTime: selectedEventToReschedule?.time || '',
        requestedDate: proposedRescheduleDate,
        requestedTime: proposedRescheduleTime,
        reason: rescheduleReason.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2. Alert faculty via automated direct message
      await sendAutomatedChatMessage(
        rescheduleFacultyId,
        facultyName,
        selectedEventToReschedule?.title || 'Class Slot',
        proposedRescheduleDate,
        proposedRescheduleTime,
        rescheduleReason.trim()
      );

      setToast('Rescheduling request submitted! Mentor notified via chat. 🔄');
      setRescheduleModalOpen(false);
    } catch (err) {
      console.error("Error submitting reschedule request:", err);
      setToast('Failed to submit reschedule request.');
    } finally {
      setRescheduleIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh' }}>
        <div className="spinning" style={{ width: '32px', height: '32px', border: '3px solid rgba(83,109,254,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header bar */}
      <motion.div variants={fadeItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>Student Dashboard Overview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Check attendance logs, class schedules, and mentor doubt clearings</p>
        </div>
      </motion.div>

      {/* Main Grid: 2-columns (1.4fr and 1.6fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '24px' }} className="grid-2-col-mobile">
        
        {/* Left Column: Attendance Log & Doubt Chats/Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. ATTENDANCE LOG WIDGET */}
          {renderAttendanceWidget()}

          {/* 3. DOUBT CHATS & CHARTS WIDGET */}
          {renderDoubtChatsAndChartsWidget()}
          
        </div>

        {/* Right Column: Interactive Class Schedule Calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 2. CLASS SCHEDULE WIDGET */}
          {renderInteractiveCalendarWidget()}

        </div>

      </div>

      {/* RESCHEDULE REQUEST MODAL */}
      {renderRescheduleModal()}

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

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
  
  if (user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'member') return <AdminDashboard />;
  
  return <StudentOverview />;
}
