import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../firebase';
import { collection, query, doc, updateDoc, addDoc, serverTimestamp, where, setDoc, increment } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Users, Send, Clock, UserMinus, ChevronDown, Share2,
  Sparkles, Download, ExternalLink, Calendar, Flame,
  ChevronRight, BookOpen, Clock3, CheckCircle, Info, Play, MessageSquare, ShieldAlert,
  FileEdit, Trash2, Pencil, Plus, FileText, GraduationCap, Globe, Megaphone, ClipboardList, UserCheck, ArrowUpRight, Phone, Swords, Star, UserPlus, Copy, X, Search
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import AdminDashboard from '../../components/AdminDashboard';
import ChildDashboard from '../../components/ChildDashboard';
import Modal from '../../components/Modal';
import { queryManager } from '../../utils/FirestoreQueryManager';

const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const StudentOverview = ({ 
  isDarkMode, xp, setXp, level, setLevel, rankPoints, setRankPoints, 
  streak, setStreak, friends, setFriends, duels, setDuels, 
  studentHasCrown, setStudentHasCrown, hasPlayedGame, setHasPlayedGame, referralCode, referralLink
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const cardBg = isDarkMode ? '#151F32' : '#FFFFFF';
  const cardBorder = isDarkMode ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid var(--border)';
  const textPrimary = isDarkMode ? '#F1F5F9' : 'var(--dark)';
  const textSecondary = isDarkMode ? '#94A3B8' : 'var(--text-muted)';
  const friendRowBg = isDarkMode ? '#1E2D4A' : '#F8FAFC';
  const searchInputBg = isDarkMode ? '#1E2D4A' : '#FFFFFF';
  const searchInputBorder = isDarkMode ? '1.5px solid rgba(255, 255, 255, 0.08)' : '1.5px solid var(--border)';

  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0 });
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [calendarEventsRaw, setCalendarEventsRaw] = useState({ calendar: [], schedules: [] });
  const [activeChatRooms, setActiveChatRooms] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [assignedFacultyList, setAssignedFacultyList] = useState([]);
  const [globalCourses, setGlobalCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [friendSearch, setFriendSearch] = useState('');
  const [newFriendName, setNewFriendName] = useState('');
  
  // Game states inside Classic UI
  const [activeGame, setActiveGame] = useState(null);
  const [duelOpponentId, setDuelOpponentId] = useState(null);
  const [duelOpponentName, setDuelOpponentName] = useState('');
  const [gameState, setGameState] = useState({ score: 0, questionIndex: 0, questions: [], completed: false });
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);

  // Daily Streak Quiz State inside Classic UI
  const [isStreakQuizOpen, setIsStreakQuizOpen] = useState(false);
  const [streakQuizState, setStreakQuizState] = useState({ active: false, questionIndex: 0, questions: [], score: 0, completed: false, failed: false });
  const [streakSelectedAns, setStreakSelectedAns] = useState(null);
  const [streakAnsResult, setStreakAnsResult] = useState(null);

  const setToast = (msg, type = 'success') => showToast(msg, type);

  const [editingCourseName, setEditingCourseName] = useState(null);
  const [customAttended, setCustomAttended] = useState(0);
  const [customTotal, setCustomTotal] = useState(0);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  const [countdownText, setCountdownText] = useState('');
  const [nextEventObj, setNextEventObj] = useState(null);

  const getEventColor = (type) => {
    switch (type) {
      case 'Regular Class': return '#3B82F6';
      case 'Extra Class': return '#8B5CF6';
      case 'Practical Class': return '#F97316';
      case 'Exam Revision Session': return '#EF4444';
      case 'Practice Session': return '#10B981';
      case 'Google Meet Session': return '#06B6D4';
      default: return '#536DFE';
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    const unsubAtt = queryManager.subscribeToQuery(collection(db, `users/${user.uid}/attendance`), (logs) => {
      let present = 0, absent = 0, late = 0;
      logs.forEach(data => {
        if (data.status === 'present') present++;
        else if (data.status === 'absent') absent++;
        else if (data.status === 'late') late++;
      });
      setAttendanceLogs(logs);
      setAttendanceStats({ present, absent, late });
      setLoading(false);
    });

    const studMapRef = doc(db, 'studentFacultyMap', user.uid);
    const unsubAssignedFac = queryManager.subscribeToQuery(studMapRef, (docData) => {
      if (docData) {
        const assignedFac = docData.assignedFaculty || [];
        setAssignedFacultyList(assignedFac.map(f => ({
          facultyId: f.facultyId,
          subject: f.subject || 'Python Mastery',
          assignedAt: f.assignedAt || '',
          facultyName: f.facultyName || 'Faculty Mentor',
          facultyPhoto: f.facultyPhoto || ''
        })));
      } else {
        setAssignedFacultyList([]);
      }
    });

    const usersRef = collection(db, 'users');
    const unsubFaculty = queryManager.subscribeToQuery(usersRef, (allUsersList) => {
      const facs = allUsersList.filter(u => u.role?.toLowerCase() === 'faculty');
      setAllFaculty(facs);
    });

    const calendarRef = query(collection(db, 'calendarEvents'));
    const userGroup = user?.studentGroup || '';
    const unsubCalendar = queryManager.subscribeToQuery(calendarRef, (eventsList) => {
      const data = [];
      eventsList.forEach(ev => {
        const isInStudents = ev.assignedStudents?.includes(user.uid);
        const isInGroups = ev.assignedGroups?.includes(userGroup);
        if (isInStudents || isInGroups) {
          data.push({
            id: ev.id,
            title: ev.title || 'Academic Class',
            description: ev.description || '',
            eventType: ev.eventType || 'Regular Class',
            startDate: ev.startDate || '',
            endDate: ev.endDate || '',
            startTime: ev.startTime || '',
            endTime: ev.endTime || '',
            meetLink: ev.meetLink || '',
            venue: ev.venue || '',
            facultyId: ev.assignedFacultyId || '',
            facultyName: ev.assignedFacultyName || 'Faculty Mentor',
            date: ev.startDate || '',
            time: ev.startTime || '',
            type: ev.eventType || 'Regular Class',
            meetingLink: ev.meetLink || ''
          });
        }
      });
      setCalendarEventsRaw({ calendar: data, schedules: [] });
    });

    const roomsQuery = query(collection(db, 'communityThreads'), where('participants', 'array-contains', user.uid));
    const unsubRooms = queryManager.subscribeToQuery(roomsQuery, (roomList) => {
      const sorted = [...roomList].sort((a, b) => (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));
      setActiveChatRooms(sorted);
    });

    const unsubCourses = queryManager.subscribeToQuery(collection(db, 'courses'), (list) => {
      setGlobalCourses(list);
    });

    return () => {
      unsubAtt(); unsubAssignedFac(); unsubFaculty(); unsubCalendar(); unsubRooms(); unsubCourses();
    };
  }, [user?.uid, user?.studentGroup]);

  const displayName = user?.displayName || 'Student';
  const studentCourses = user?.enrolledCourses || (user?.course && user.course !== 'Not specified' ? [user.course] : ['Python Mastery']);
  
  const totalAttCount = attendanceStats.present + attendanceStats.absent + attendanceStats.late;
  const attPct = totalAttCount > 0 ? Math.round(((attendanceStats.present + attendanceStats.late * 0.5) / totalAttCount) * 100) : 85;
  const studentStats = { percentage: attPct };

  const calendarEvents = [...calendarEventsRaw.calendar, ...calendarEventsRaw.schedules];
  calendarEvents.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const upcoming = calendarEvents.filter(ev => {
        if (!ev.date) return false;
        try {
          const classDate = new Date(`${ev.date}T${ev.time || '00:00'}`);
          return classDate >= now;
        } catch {
          return false;
        }
      });

      if (upcoming.length === 0) {
        setCountdownText('');
        setNextEventObj(null);
        return;
      }

      const nextEvent = upcoming[0];
      const eventTime = new Date(`${nextEvent.date}T${nextEvent.time || '00:00'}`);
      const diffMs = eventTime - now;
      
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setCountdownText(`${hrs}h ${mins}m ${secs}s remaining`);
      setNextEventObj(nextEvent);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [calendarEvents]);

  const getNextClass = (facId) => {
    const mentorEvents = calendarEvents.filter(ev => {
      return ev.facultyId === facId && ev.date;
    });
    
    if (mentorEvents.length === 0) return 'No upcoming class scheduled';
    
    const now = new Date();
    const upcoming = mentorEvents.filter(ev => {
      try {
        const classDate = new Date(`${ev.date}T${ev.time || '00:00'}`);
        return classDate >= now;
      } catch {
        return false;
      }
    });

    if (upcoming.length === 0) return 'No upcoming class scheduled';
    return `${upcoming[0].date} at ${upcoming[0].time}`;
  };

  const resolvedMentors = [];
  assignedFacultyList.forEach(af => {
    if (af.facultyId && !resolvedMentors.some(m => m.facultyId === af.facultyId)) {
      resolvedMentors.push({ facultyId: af.facultyId, subject: af.subject || 'Python Mastery', assignedDate: af.assignedAt || '' });
    }
  });

  const profileAssignments = user?.assignedFaculty || [];
  profileAssignments.forEach(item => {
    let facultyId = '';
    let subject = '';
    let date = '';
    if (typeof item === 'string') {
      facultyId = item;
    } else if (item && typeof item === 'object') {
      facultyId = item.facultyId;
      subject = item.subject || '';
      date = item.assignedDate || '';
    }
    
    if (facultyId && !resolvedMentors.some(m => m.facultyId === facultyId)) {
      resolvedMentors.push({ facultyId, subject: subject || 'Python Mastery', assignedDate: date });
    }
  });

  const enrichedFacultyList = resolvedMentors.map(m => {
    const profile = allFaculty.find(f => f.id === m.facultyId || f.email === m.facultyId);
    return {
      facultyId: m.facultyId,
      displayName: profile?.displayName || 'Faculty Mentor',
      photoURL: profile?.photoURL || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      availability: profile?.availability || 'Available',
      officeTimings: profile?.officeTimings || 'Flexible Hours',
      subject: m.subject || profile?.subjects?.[0] || 'Python Mastery',
      assignedDate: m.assignedDate
    };
  });

  let mentorList = enrichedFacultyList;

  if (mentorList.length === 0 && allFaculty.length > 0) {
    const activeCourse = user?.course || 'Python Mastery';
    const fallbackFac = allFaculty.find(f => f.email === (activeCourse.toLowerCase().includes('python') ? 'sharmisthaghosh855@gmail.com' : 'tapadarhribhu350@gmail.com'));
    if (fallbackFac) {
      mentorList = [{ id: 'fallback', facultyId: fallbackFac.id, displayName: fallbackFac.displayName, photoURL: fallbackFac.photoURL, subject: activeCourse, availability: fallbackFac.availability || 'Available', officeTimings: fallbackFac.officeTimings || 'Flexible Hours' }];
    }
  }

  const handleRemoveCourse = async (courseTitle) => {
    if (window.confirm(`Are you sure you want to remove ${courseTitle} from your courses?`)) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const currentEnrolled = user?.enrolledCourses || (user?.course && user.course !== 'Not specified' ? [user.course] : ['Python Mastery']);
        const updatedEnrolled = currentEnrolled.filter(c => c !== courseTitle);
        
        const updatedOverrides = { ...(user?.courseOverrides || {}) };
        delete updatedOverrides[courseTitle];

        await setDoc(userRef, { 
          enrolledCourses: updatedEnrolled,
          courseOverrides: updatedOverrides
        }, { merge: true });
        setToast(`Removed ${courseTitle}.`);
      } catch (err) {
        console.error(err);
        setToast("Failed to remove course.", 'error');
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
      await setDoc(userRef, { courseOverrides: updatedOverrides }, { merge: true });
      setToast(`Updated attendance details for ${editingCourseName}!`);
      setIsEditCourseModalOpen(false);
      setEditingCourseName(null);
    } catch (err) {
      console.error(err);
      setToast("Failed to update course.", 'error');
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
      { bg: '#EEF2FF', iconColor: '#4F46E5', badgeBg: '#E0E7FF', icon: <ClipboardList size={22} style={{ color: '#4F46E5' }} /> }, 
      { bg: '#FFF7ED', iconColor: '#EA580C', badgeBg: '#FFEDD5', icon: <Globe size={22} style={{ color: '#EA580C' }} /> }, 
      { bg: '#FFF1F2', iconColor: '#E11D48', badgeBg: '#FFE4E6', icon: <Megaphone size={22} style={{ color: '#E11D48' }} /> }, 
      { bg: '#F0FDF4', iconColor: '#16A34A', badgeBg: '#DCFCE7', icon: <BookOpen size={22} style={{ color: '#16A34A' }} /> }  
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
          <span style={{ fontFamily: 'var(--font-heading)', color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>{format(selectedCalendarDate, 'MMMM yyyy')}</span>
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
                  color: isSelected ? 'white' : (isDarkMode ? '#F1F5F9' : 'var(--dark)'),
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
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 800, color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>
            Schedule for {format(selectedCalendarDate, 'MMMM d')}
          </h4>
          {filteredEvents.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontStyle: 'italic', padding: '8px 0' }}>
              No classes scheduled.
            </div>
          ) : (
            filteredEvents.map(ev => {
              const eventColor = getEventColor(ev.eventType);
              return (
                <div key={ev.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', background: `${eventColor}08`, borderRadius: '12px', borderLeft: `4px solid ${eventColor}`, borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>{ev.title}</strong>
                    <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: `${eventColor}15`, color: eventColor, fontWeight: 800 }}>
                      {ev.eventType || 'Regular Class'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>🕒 {ev.startTime} - {ev.endTime || 'End'}</div>
                  {ev.meetLink && (
                    <a href={ev.meetLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: eventColor, fontWeight: 700, fontSize: '0.75rem' }}>
                      Join Google Meet <ArrowUpRight size={12} />
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Add Friend via Whatsapp Share URL
  const handleAddFriendWhatsApp = () => {
    const message = encodeURIComponent(`Hey! Join me on Compution to learn computer science and play educational games together! Sign up here: https://compution.vercel.app (My Student ID is: ${referralCode})`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  // Search/Add Friend by Student ID from Friends Tab
  const handleAddFriendById = (e) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    const idStr = newFriendName.trim().toUpperCase();
    if (!idStr.startsWith("COMP2K26") || idStr.length !== 12) {
      showToast("Please enter a 12-character Student ID (e.g. COMP2K260024)", "error");
      return;
    }
    const friendName = `Friend #${idStr.slice(-4)}`;
    showToast(`Friend request sent to Student ID ${idStr}! 👥`, "success");
    setFriends(prev => [
      ...prev,
      { id: idStr, name: friendName, rank: 'Beginner', points: 0, active: false, hasCrown: false }
    ]);
    setNewFriendName('');
  };

  // Send Match challenge from Friends tab
  const handleSendMatchChallenge = (friend) => {
    const newDuel = {
      id: 'duel_' + friend.id + '_' + Date.now(),
      friendId: friend.id,
      challenger: friend.name,
      points: Math.floor(Math.random() * 50) + 60,
      time: 'Just now'
    };
    setDuels(prev => [newDuel, ...prev]);
    showToast(`Challenge sent to ${friend.name}! ⚔️`, "info");
  };

  // Accept duel handling
  const handleDuelAction = (duelId, action, friendId, challenger) => {
    setDuels(prev => prev.filter(d => d.id !== duelId));
    if (action === 'accept') {
      showToast(`Preparing match against ${challenger}... ⚔️`, "info");
      startMathGame(friendId, challenger);
    } else {
      showToast("Duel declined.", "info");
    }
  };

  // Game Logic inside Classic UI
  const startMathGame = (opponentId = null, opponentName = '') => {
    setDuelOpponentId(opponentId);
    setDuelOpponentName(opponentName);
    const questions = [];
    for (let i = 0; i < 5; i++) {
      const num1 = Math.floor(Math.random() * 10) + 2;
      const num2 = Math.floor(Math.random() * 10) + 2;
      const operation = Math.random() > 0.5 ? '+' : 'x';
      const ans = operation === '+' ? num1 + num2 : num1 * num2;
      const choices = [ans];
      while (choices.length < 3) {
        const wrong = ans + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1);
        if (wrong >= 0 && !choices.includes(wrong)) choices.push(wrong);
      }
      choices.sort(() => Math.random() - 0.5);
      questions.push({ q: `What is ${num1} ${operation} ${num2}?`, a: ans, options: choices });
    }
    setGameState({ score: 0, questionIndex: 0, questions, completed: false });
    setSelectedAnswer(null);
    setAnswerResult(null);
    setActiveGame('math');
  };

  const startLanguageGame = (opponentId = null, opponentName = '') => {
    setDuelOpponentId(opponentId);
    setDuelOpponentName(opponentName);
    const questions = [
      { q: "Which keyword defines a function in Python?", a: "def", options: ["def", "function", "func"] },
      { q: "Which symbol starts a comment in Python?", a: "#", options: ["//", "#", "/*"] },
      { q: "What is the correct way to output 'Hello' in Python?", a: "print('Hello')", options: ["echo('Hello')", "print('Hello')", "console.log('Hello')"] },
      { q: "Which data type stores True or False?", a: "boolean", options: ["string", "integer", "boolean"] },
      { q: "Which symbol is used for multiplication in coding?", a: "*", options: ["x", "*", "^"] }
    ];
    questions.sort(() => Math.random() - 0.5);
    setGameState({ score: 0, questionIndex: 0, questions, completed: false });
    setSelectedAnswer(null);
    setAnswerResult(null);
    setActiveGame('lang');
  };

  const startHistoryGame = (opponentId = null, opponentName = '') => {
    setDuelOpponentId(opponentId);
    setDuelOpponentName(opponentName);
    const questions = [
      { q: "Who designed the Analytical Engine, the first computer design?", a: "Charles Babbage", options: ["Alan Turing", "Charles Babbage", "Bill Gates"] },
      { q: "Who is celebrated as the first computer programmer?", a: "Ada Lovelace", options: ["Ada Lovelace", "Grace Hopper", "Steve Jobs"] },
      { q: "Who created the Python programming language?", a: "Guido van Rossum", options: ["Dennis Ritchie", "Guido van Rossum", "James Gosling"] },
      { q: "Which machine cracked the Enigma code in World War II?", a: "The Bombe", options: ["ENIAC", "The Bombe", "Colossus"] },
      { q: "In which decade was the World Wide Web invented?", a: "1980s", options: ["1970s", "1980s", "1990s"] }
    ];
    questions.sort(() => Math.random() - 0.5);
    setGameState({ score: 0, questionIndex: 0, questions, completed: false });
    setSelectedAnswer(null);
    setAnswerResult(null);
    setActiveGame('history');
  };

  const handleAnswerSubmit = (option) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    const correct = option === gameState.questions[gameState.questionIndex].a;
    setAnswerResult(correct ? 'correct' : 'wrong');
    if (correct) {
      setGameState(prev => ({ ...prev, score: prev.score + 1 }));
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setAnswerResult(null);
    if (gameState.questionIndex < 4) {
      setGameState(prev => ({ ...prev, questionIndex: prev.questionIndex + 1 }));
    } else {
      setGameState(prev => ({ ...prev, completed: true }));
      setHasPlayedGame(true);

      const addedXp = gameState.score * 100;
      const addedPoints = gameState.score * 20;

      setXp(xp + addedXp);
      setRankPoints(rankPoints + addedPoints);
      setLevel(Math.max(1, Math.floor((xp + addedXp) / 400) + 1));

      if (duelOpponentId) {
        const opponentScore = Math.floor(Math.random() * 4) + 1;
        const studentWon = gameState.score > opponentScore;
        if (studentWon) {
          setStudentHasCrown(true);
          setFriends(prev => prev.map(f => f.id === duelOpponentId ? { ...f, hasCrown: false } : f));
          showToast(`YOU WON the duel! 👑`, "success");
        } else {
          setStudentHasCrown(false);
          setFriends(prev => prev.map(f => f.id === duelOpponentId ? { ...f, hasCrown: true } : f));
          showToast(`${duelOpponentName} won the duel.`, "info");
        }
        setDuelOpponentId(null);
        setDuelOpponentName('');
      } else {
        showToast(`Game Over! Earned +${addedXp} XP!`, "success");
      }
    }
  };

  // Streak Quiz logic in Classic UI
  const startDailyStreakQuiz = () => {
    const numCat = parseInt(user?.classCategory) || 2;
    let questionsPool = [];
    if (numCat >= 2 && numCat <= 5) {
      questionsPool = [
        { q: "Which part of a computer do you use to type letters?", a: "Keyboard", options: ["Mouse", "Keyboard", "Printer", "Monitor"] },
        { q: "What is 5 + 3?", a: "8", options: ["7", "8", "9", "10"] },
        { q: "Which of these is a computer mouse used for?", a: "Clicking items", options: ["Typing", "Printing", "Clicking items", "Eating"] },
        { q: "What is 10 - 4?", a: "6", options: ["4", "5", "6", "7"] },
        { q: "Which of these is a type of computer?", a: "Laptop", options: ["Laptop", "Bicycle", "Toaster", "Fridge"] }
      ];
    } else {
      questionsPool = [
        { q: "What does HTML stand for?", a: "Hypertext Markup Language", options: ["Hypertext Markup Language", "HighText Machine Language", "Hyperlink Text Markup Language", "Hypertext Machine Language"] },
        { q: "Which of these is a secure website protocol?", a: "HTTPS", options: ["HTTP", "HTTPS", "FTP", "SMTP"] },
        { q: "What is 12 x 8?", a: "96", options: ["84", "92", "96", "104"] },
        { q: "Who is known as the father of modern computers?", a: "Alan Turing", options: ["Alan Turing", "Charles Babbage", "Bill Gates", "Ada Lovelace"] },
        { q: "Which of these is a programming language?", a: "Python", options: ["Python", "HTML", "CSS", "Excel"] }
      ];
    }
    const selectedQuestions = [...questionsPool].sort(() => Math.random() - 0.5).slice(0, 5);
    setStreakQuizState({ active: true, questionIndex: 0, questions: selectedQuestions, score: 0, completed: false, failed: false });
    setStreakSelectedAns(null);
    setStreakAnsResult(null);
    setIsStreakQuizOpen(true);
  };

  const handleStreakAnswer = (option) => {
    if (streakSelectedAns !== null) return;
    setStreakSelectedAns(option);
    const correct = option === streakQuizState.questions[streakQuizState.questionIndex].a;
    setStreakAnsResult(correct ? 'correct' : 'wrong');
    if (correct) {
      setStreakQuizState(prev => ({ ...prev, score: prev.score + 1 }));
    } else {
      setStreakQuizState(prev => ({ ...prev, failed: true }));
      setStreak(0);
    }
  };

  const handleStreakNext = () => {
    setStreakSelectedAns(null);
    setStreakAnsResult(null);
    if (streakQuizState.failed) {
      setIsStreakQuizOpen(false);
      showToast("Better luck next time! Streak ended.", "error");
      return;
    }
    if (streakQuizState.questionIndex < 4) {
      setStreakQuizState(prev => ({ ...prev, questionIndex: prev.questionIndex + 1 }));
    } else {
      setStreakQuizState(prev => ({ ...prev, completed: true }));
      setStreak(streak + 1);
      setXp(xp + 250);
      showToast("Quest complete! Streak saved! 🔥", "success");
    }
  };

  if (loading) return null;

  const todayFormatted = format(new Date(), 'MMMM d, EEEE');

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.8)' }}>
                  {todayFormatted}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.18)', color: '#FFF', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>
                  ID: {referralCode}
                </span>
                {studentHasCrown && <span style={{ fontSize: '1.2rem' }} title="Champion Crown">👑</span>}
              </div>
              <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
                Welcome back, {displayName.split(' ')[0]}!
              </h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.92rem' }}>
                Level {level} student • Rank points: {rankPoints} pts • XP: {xp}
              </p>
            </div>
            
            <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hide-mobile">
              <GraduationCap size={96} strokeWidth={1.2} style={{ color: 'white', opacity: 0.85, transform: 'rotate(10deg)' }} />
            </div>
          </div>

          {/* My Courses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>My Courses</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {studentCoursesList.map((c, index) => {
                const isHighlighted = index === 1;
                return (
                  <div
                    key={c.title}
                    style={{
                      padding: '24px',
                      background: isDarkMode ? '#151F32' : 'white',
                      borderRadius: '24px',
                      border: isHighlighted ? '2.5px solid var(--primary)' : (isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border)'),
                      boxShadow: isHighlighted ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      position: 'relative',
                      transition: 'all 0.25s ease-in-out'
                    }}
                  >
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
                        style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCourse(c.title);
                        }}
                        style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: isDarkMode ? '#1E2D4A' : c.theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {c.icon}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: isDarkMode ? '#F1F5F9' : 'var(--dark)', lineHeight: 1.3 }}>{c.title}</h4>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>{c.mentor}</span>
                    </div>
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>
                        <span>Attended: {c.attended}/{c.total}</span>
                        <span>{c.progress}%</span>
                      </div>
                      <div className="progress-track" style={{ background: isDarkMode ? '#1E2D4A' : 'rgba(0,0,0,0.06)' }}>
                        <div className="progress-fill" style={{ width: `${c.progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ARCADE MINI GAMES IN CLASSIC UI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>Arcade Mini Games</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              
              <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)', color: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#F1F5F9' }}>History Heroes</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.95 }}>Test computer science history knowledge!</p>
                <button onClick={() => startHistoryGame(null, '')} style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'white', color: '#F43F5E', fontWeight: 800, fontSize: '0.72rem', marginTop: '6px' }}>Play</button>
              </div>

              <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#F1F5F9' }}>Language War</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.95 }}>Show off syntax coding syntax!</p>
                <button onClick={() => startLanguageGame(null, '')} style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'white', color: '#D97706', fontWeight: 800, fontSize: '0.72rem', marginTop: '6px' }}>Play</button>
              </div>

              <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1.05rem', color: '#F1F5F9' }}>Math Master</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.95 }}>Solve maths operations at speed!</p>
                <button onClick={() => startMathGame(null, '')} style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: '8px', border: 'none', background: 'white', color: '#059669', fontWeight: 800, fontSize: '0.72rem', marginTop: '6px' }}>Play</button>
              </div>

            </div>
          </div>

          {/* Mentors Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>Your Assigned Mentor</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {mentorList.map((mentor, index) => {
                const buttonColors = ['#FFA726', '#AB47BC', 'var(--primary)'];
                const btnColor = buttonColors[index % buttonColors.length];
                const nextClassText = getNextClass(mentor.facultyId);

                return (
                  <div
                    key={mentor.facultyId}
                    style={{
                      padding: '24px',
                      background: isDarkMode ? '#151F32' : 'white',
                      borderRadius: '24px',
                      border: `1.5px solid var(--border)`,
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <img
                        src={mentor.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'}
                        alt={mentor.displayName}
                        style={{ width: '64px', height: '64px', borderRadius: '18px', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem', fontWeight: 800, color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>{mentor.displayName}</h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>{mentor.subject || 'Faculty Mentor'}</p>
                        
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '100px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            background: mentor.availability === 'Busy' ? 'rgba(239,83,80,0.1)' : 'rgba(102,187,106,0.1)',
                            color: mentor.availability === 'Busy' ? 'var(--danger)' : 'var(--success)'
                          }}>
                            {mentor.availability || 'Available'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '0.78rem', color: '#94A3B8' }}>
                      <div>📅 <strong>Next Scheduled Class:</strong></div>
                      <div style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '4px', fontSize: '0.82rem' }}>
                        {nextClassText}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        onClick={() => navigate('/dashboard/community', { state: { startChatWith: mentor.facultyId } })}
                        style={{
                          flex: 1, padding: '10px 16px', borderRadius: '12px', background: btnColor, color: 'white', border: 'none',
                          fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <MessageSquare size={14} /> Message
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Daily Streak in Classic UI */}
          <div className="card-premium-child" style={{ padding: '24px', background: isDarkMode ? '#151F32' : 'white', borderRadius: '24px', border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: isDarkMode ? '#F1F5F9' : 'var(--dark)', margin: 0 }}>🎯 Daily Streak</h3>
              {streak > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,152,0,0.15)', color: '#FF9800', padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 900 }}>
                  🔥 {streak} Days
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0 0 12px 0' }}>Quiz computer science and fundamentals to keep streak active!</p>
            <button onClick={startDailyStreakQuiz} style={{ width: '100%', padding: '8px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800 }}>Start Daily Quiz</button>
          </div>

          {/* Duel Arena & Friends Sidebar inside Classic UI */}
          <div className="card-premium-child" style={{ padding: '24px', background: isDarkMode ? '#151F32' : 'white', borderRadius: '24px', border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: isDarkMode ? '#F1F5F9' : 'var(--dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>⚔️ Duel Arena</h3>
            
            {duels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-light)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                No active challenges. Click swords next to a friend to invite.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {duels.map(d => (
                  <div key={d.id} style={{ padding: '10px', background: isDarkMode ? '#1E2E4A' : '#F8FAFC', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justify: 'space-between', fontSize: '0.78rem', fontWeight: 800 }}>
                      <span style={{ color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>{d.challenger}</span>
                      <span style={{ color: '#94A3B8' }}>{d.time}</span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '4px 0 8px 0' }}>Wants to play (+{d.points} pts)</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleDuelAction(d.id, 'decline', d.friendId, d.challenger)} style={{ flex: 1, padding: '4px', background: 'transparent', border: '1px solid var(--border-strong)', color: '#94A3B8', fontSize: '0.7rem', borderRadius: '6px' }}>Decline</button>
                      <button onClick={() => handleDuelAction(d.id, 'accept', d.friendId, d.challenger)} style={{ flex: 1, padding: '4px', background: 'var(--success)', border: 'none', color: 'white', fontSize: '0.7rem', borderRadius: '6px' }}>Accept</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Friends Tab inside Classic UI */}
          <div className="card-premium-child" style={{ padding: '24px', background: isDarkMode ? '#151F32' : 'white', borderRadius: '24px', border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: isDarkMode ? '#F1F5F9' : 'var(--dark)', margin: 0 }}>👤 Friends</h3>
              <button 
                onClick={handleAddFriendWhatsApp}
                style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Share2 size={12} /> Invite
              </button>
            </div>

            {/* Direct search by ID */}
            <form onSubmit={handleAddFriendById} style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              <input 
                placeholder="Search by Friend's ID..." 
                value={newFriendName} 
                onChange={e => setNewFriendName(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: isDarkMode ? '#1E2D4A' : '#FFF', color: isDarkMode ? '#F1F5F9' : 'var(--dark)', outline: 'none' }}
              />
              <button type="submit" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800 }}>Search</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {friends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 8px', color: textSecondary, fontSize: '0.78rem', fontWeight: 600 }}>
                  👥 Add friends to enjoy learning together
                </div>
              ) : (
                friends.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: isDarkMode ? '#1E2D4A' : '#F8FAFC', borderRadius: '12px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ position: 'relative' }}>
                        {f.hasCrown && <span style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', fontSize: '1.05rem', zIndex: 10 }}>👑</span>}
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #FF5E62 0%, #00B4D8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.7rem' }}>
                          {f.name.slice(0,2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>{f.name}</div>
                        <div style={{ fontSize: '0.62rem', color: '#94A3B8' }}>ID: {f.id.length > 8 ? f.id : 'Internal'}</div>
                      </div>
                    </div>
                    <button onClick={() => handleSendMatchChallenge(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }} title="Send Duel">
                      <Swords size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Schedule Calendar Widget */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>My Schedule</h3>
            <div style={{
              background: isDarkMode ? '#151F32' : 'white',
              padding: '24px',
              borderRadius: '24px',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {renderMonthCalendarView()}
            </div>
          </div>

          {/* Leaderboard Lock Section inside Classic UI */}
          <div style={{ padding: '24px', borderRadius: '24px', background: isDarkMode ? '#151F32' : 'white', border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isDarkMode ? '#F1F5F9' : 'var(--dark)', textAlign: 'left', marginBottom: '12px' }}>🏆 Leaderboard</h3>
            <div style={{ padding: '20px 0' }}>
              <div style={{ fontSize: '2rem' }}>🔒</div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isDarkMode ? '#F1F5F9' : 'var(--dark)', marginTop: '4px' }}>This page will be available soon</div>
            </div>
          </div>

        </div>
      </div>

      {/* Playable Game overlay in Classic UI */}
      <AnimatePresence>
        {activeGame && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(11,15,25,0.75)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
          }}>
            <div className="modal-responsive-card" style={{
              width: '100%', maxWidth: '500px', background: cardBg,
              boxShadow: '0 32px 80px rgba(0,0,0,0.3)', border: cardBorder
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: textPrimary }}>
                  🎮 {activeGame === 'math' ? 'Math Master' : activeGame === 'lang' ? 'Language War' : 'History Heroes'}
                </h3>
                <button onClick={() => setActiveGame(null)} style={{ background: isDarkMode ? '#1E2D4A' : '#E2E8F0', border: 'none', color: isDarkMode ? '#94A3B8' : '#475569', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {!gameState.completed ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '10px' }}>
                    <span>Question {gameState.questionIndex + 1} of 5</span>
                    <span>Score: {gameState.score}/5</span>
                  </div>
                  <div className="candy-progress-track" style={{ height: '8px', marginBottom: '28px' }}>
                    <div className="candy-progress-fill" style={{ width: `${((gameState.questionIndex)/5)*100}%` }} />
                  </div>
                  <div className="modal-question-box" style={{ background: friendRowBg, fontWeight: 900, color: textPrimary, textAlign: 'center', marginBottom: '28px', border: cardBorder }}>
                    {gameState.questions[gameState.questionIndex]?.q}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {gameState.questions[gameState.questionIndex]?.options.map((opt, i) => {
                      const isSelected = selectedAnswer === opt;
                      const isCorrectAnswer = opt === gameState.questions[gameState.questionIndex].a;
                      let bg = friendRowBg;
                      let border = searchInputBorder;
                      let txtColor = textPrimary;
                      if (selectedAnswer !== null) {
                        if (isCorrectAnswer) { bg = 'rgba(16,185,129,0.15)'; border = '2px solid var(--success)'; txtColor = 'var(--success)'; }
                        else if (isSelected) { bg = 'rgba(239,83,80,0.15)'; border = '2px solid var(--danger)'; txtColor = 'var(--danger)'; }
                        else { bg = isDarkMode ? '#1E2D4A' : '#E2E8F0'; border = isDarkMode ? '1.5px solid rgba(255,255,255,0.04)' : '1.5px solid rgba(0,0,0,0.04)'; txtColor = textSecondary; }
                      }
                      return (
                        <button key={i} onClick={() => handleAnswerSubmit(opt)} disabled={selectedAnswer !== null} className="modal-option-btn" style={{ width: '100%', background: bg, border, color: txtColor, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {selectedAnswer !== null && (
                    <button onClick={handleNextQuestion} style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 800, marginTop: '24px', cursor: 'pointer' }}>
                      Next Question
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <dotlottie-player src="/animations/task completed successfully.lottie" background="transparent" speed="1" style={{ width: '100px', height: '100px', margin: '0 auto 20px' }} autoplay></dotlottie-player>
                  <h4 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: textPrimary }}>Game Completed!</h4>
                  <p style={{ color: textSecondary, fontSize: '0.95rem', marginTop: '8px' }}>You scored {gameState.score} out of 5 correct!</p>
                  <button onClick={() => setActiveGame(null)} style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 800, marginTop: '24px', cursor: 'pointer' }}>Back to Dashboard</button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Streak Quiz Modal in Classic UI */}
      <AnimatePresence>
        {isStreakQuizOpen && streakQuizState.active && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(11,15,25,0.75)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
          }}>
            <div className="modal-responsive-card" style={{
              width: '100%', maxWidth: '500px', background: cardBg,
              boxShadow: '0 32px 80px rgba(0,0,0,0.3)', border: cardBorder
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: textPrimary }}>🔥 Daily Streak Challenge</h3>
                <button onClick={() => setIsStreakQuizOpen(false)} style={{ background: isDarkMode ? '#1E2E4E' : '#E2E8F0', border: 'none', color: isDarkMode ? '#94A3B8' : '#475569', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {!streakQuizState.completed && !streakQuizState.failed ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '10px' }}>
                    <span>Question {streakQuizState.questionIndex + 1} of 5</span>
                    <span>Streak: {streak} 🔥</span>
                  </div>
                  <div className="progress-track" style={{ height: '8px', background: isDarkMode ? '#202D45' : '#E2E8F0', borderRadius: '100px', marginBottom: '28px', overflow: 'hidden' }}>
                    <div style={{ width: `${((streakQuizState.questionIndex)/5)*100}%`, height: '100%', background: '#FF9800', borderRadius: '100px' }} />
                  </div>
                  <div className="modal-question-box" style={{ background: friendRowBg, fontWeight: 900, color: textPrimary, textAlign: 'center', marginBottom: '28px', border: cardBorder }}>
                    {streakQuizState.questions[streakQuizState.questionIndex]?.q}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {streakQuizState.questions[streakQuizState.questionIndex]?.options.map((opt, i) => {
                      const isSelected = streakSelectedAns === opt;
                      const isCorrectAnswer = opt === streakQuizState.questions[streakQuizState.questionIndex].a;
                      let bg = friendRowBg;
                      let border = searchInputBorder;
                      let txtColor = textPrimary;
                      if (streakSelectedAns !== null) {
                        if (isCorrectAnswer) { bg = 'rgba(16,185,129,0.15)'; border = '2px solid var(--success)'; txtColor = 'var(--success)'; }
                        else if (isSelected) { bg = 'rgba(239,83,80,0.15)'; border = '2px solid var(--danger)'; txtColor = 'var(--danger)'; }
                        else { bg = isDarkMode ? '#1E2D4A' : '#E2E8F0'; border = isDarkMode ? '1.5px solid rgba(255,255,255,0.04)' : '1.5px solid rgba(0,0,0,0.04)'; txtColor = textSecondary; }
                      }
                      return (
                        <button key={i} onClick={() => handleStreakAnswer(opt)} disabled={streakSelectedAns !== null} className="modal-option-btn" style={{ width: '100%', background: bg, border, color: txtColor, fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {streakSelectedAns !== null && (
                    <button onClick={handleStreakNext} style={{ width: '100%', padding: '16px', background: '#FF9800', color: '#000', fontWeight: 900, borderRadius: '20px', marginTop: '24px', cursor: 'pointer', border: 'none' }}>
                      Next Question
                    </button>
                  )}
                </div>
              ) : streakQuizState.failed ? (
                <div style={{ textAlign: 'center' }}>
                  <dotlottie-player src="/animations/fail.lottie" background="transparent" speed="1" style={{ width: '120px', height: '120px', margin: '0 auto 20px' }} autoplay></dotlottie-player>
                  <h4 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: textPrimary }}>Better luck next time!</h4>
                  <p style={{ color: textSecondary, fontSize: '0.92rem', marginTop: '8px' }}>Daily streak has been reset to 0.</p>
                  <button onClick={() => setIsStreakQuizOpen(false)} style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 800, marginTop: '24px', cursor: 'pointer' }}>Back to Dashboard</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <dotlottie-player src="/animations/streak on.lottie" background="transparent" speed="1" style={{ width: '140px', height: '140px', margin: '0 auto 20px' }} autoplay></dotlottie-player>
                  <h4 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: textPrimary }}>Streak Saved! 🔥</h4>
                  <p style={{ color: textSecondary, fontSize: '0.92rem', marginTop: '8px' }}>Quest complete! Streak is now {streak} days.</p>
                  <button onClick={() => setIsStreakQuizOpen(false)} style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 800, marginTop: '24px', cursor: 'pointer' }}>Claim Reward</button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT COURSE ATTENDANCE MODAL */}
      <Modal isOpen={isEditCourseModalOpen} onClose={() => setIsEditCourseModalOpen(false)} title={`Edit Course - ${editingCourseName}`}>
        <form onSubmit={handleSaveCourseEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Customize your attended and total class counts for personal analysis tracking.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>Attended Classes Count:</span>
              <input type="number" min="0" max={customTotal} value={customAttended} onChange={e => setCustomAttended(Math.max(0, parseInt(e.target.value) || 0))} className="form-input" required style={{ background: isDarkMode ? '#1E2D4A' : '#FFF', color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }} />
            </label>
            <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }}>Total Classes Count:</span>
              <input type="number" min="0" value={customTotal} onChange={e => setCustomTotal(Math.max(0, parseInt(e.target.value) || 0))} className="form-input" required style={{ background: isDarkMode ? '#1E2D4A' : '#FFF', color: isDarkMode ? '#F1F5F9' : 'var(--dark)' }} />
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
  const { showToast } = useToast();
  
  // Theme Switching (Defaulting to system default)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (!user?.uid) {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    const saved = localStorage.getItem(`isDarkMode_${user.uid}`);
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // UI layout mode switcher
  const [uiMode, setUiMode] = useState(() => {
    if (!user?.uid) return 'default';
    const saved = localStorage.getItem(`uiMode_${user.uid}`);
    if (saved) return saved;
    const numCat = parseInt(user.classCategory);
    if (!isNaN(numCat) && numCat >= 2 && numCat <= 5) {
      return 'child';
    }
    return 'default';
  });

  // Shared state variables synchronized in localStorage
  const [xp, setXp] = useState(() => {
    if (!user?.uid) return 0;
    return parseInt(localStorage.getItem(`xp_${user.uid}`) || '0');
  });
  const [level, setLevel] = useState(() => {
    if (!user?.uid) return 1;
    return parseInt(localStorage.getItem(`level_${user.uid}`) || '1');
  });
  const [rankPoints, setRankPoints] = useState(() => {
    if (!user?.uid) return 0;
    return parseInt(localStorage.getItem(`rankPoints_${user.uid}`) || '0');
  });
  const [streak, setStreak] = useState(() => {
    if (!user?.uid) return 0;
    return parseInt(localStorage.getItem(`streak_${user.uid}`) || '0');
  });
  const [friends, setFriends] = useState(() => {
    if (!user?.uid) return [];
    const saved = localStorage.getItem(`friends_${user.uid}`);
    return saved ? JSON.parse(saved).filter(f => f.id !== '1' && f.id !== '2' && f.id !== '3' && f.id !== '4' && f.id !== '5') : [];
  });
  const [duels, setDuels] = useState([]);
  const [studentHasCrown, setStudentHasCrown] = useState(() => {
    if (!user?.uid) return false;
    return localStorage.getItem(`studentHasCrown_${user.uid}`) === 'true';
  });
  const [hasPlayedGame, setHasPlayedGame] = useState(() => {
    if (!user?.uid) return false;
    return localStorage.getItem(`hasPlayedGame_${user.uid}`) === 'true';
  });

  useEffect(() => {
    if (user?.uid) {
      localStorage.setItem(`uiMode_${user.uid}`, uiMode);
      localStorage.setItem(`isDarkMode_${user.uid}`, isDarkMode);
      localStorage.setItem(`xp_${user.uid}`, xp);
      localStorage.setItem(`level_${user.uid}`, level);
      localStorage.setItem(`rankPoints_${user.uid}`, rankPoints);
      localStorage.setItem(`streak_${user.uid}`, streak);
      localStorage.setItem(`friends_${user.uid}`, JSON.stringify(friends));
      localStorage.setItem(`studentHasCrown_${user.uid}`, studentHasCrown);
      localStorage.setItem(`hasPlayedGame_${user.uid}`, hasPlayedGame);
      window.dispatchEvent(new Event('themechange'));
    }
  }, [uiMode, isDarkMode, xp, level, rankPoints, streak, friends, studentHasCrown, hasPlayedGame, user?.uid]);

  useEffect(() => {
    document.body.classList.toggle('dark-theme', isDarkMode);
  }, [isDarkMode]);

  const getReferralCode = () => {
    if (!user?.studentId) return 'COMP2K260000';
    const digits = user.studentId.replace(/\D/g, ''); 
    const lastDigits = digits.slice(-4); 
    return `COMP2K26${lastDigits.padStart(4, '0')}`;
  };

  const referralCode = getReferralCode();
  const referralLink = `https://compution.vercel.app/login?ref=${referralCode}`;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh' }}>
        <div className="spinning" style={{ width: '32px', height: '32px', border: '3px solid rgba(83,109,254,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
      </div>
    );
  }
  
  const userRoleLower = user?.role?.toLowerCase();
  if (userRoleLower === 'admin' || userRoleLower === 'faculty' || userRoleLower === 'member') return <AdminDashboard />;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px', 
      background: isDarkMode ? '#0B0F19' : 'transparent',
      minHeight: '100vh',
      padding: '12px',
      borderRadius: '24px',
      transition: 'background-color 0.3s ease'
    }}>
      {/* UI Mode Toggle Switcher Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: isDarkMode ? '#151F32' : 'white',
        color: isDarkMode ? '#F1F5F9' : 'var(--dark)',
        borderRadius: '20px',
        border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        flexWrap: 'wrap',
        gap: '12px',
        transition: 'all 0.3s ease'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Student Workspace</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: isDarkMode ? '#94A3B8' : 'var(--text-muted)' }}>Choose between gamified child theme or classic layout</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Layout buttons */}
          <div style={{ display: 'flex', gap: '4px', background: isDarkMode ? '#1E2E4A' : '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setUiMode('child')}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: uiMode === 'child' ? 'var(--primary)' : 'transparent',
                color: uiMode === 'child' ? 'white' : (isDarkMode ? '#94A3B8' : 'var(--text-muted)'),
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              🎮 Child Theme
            </button>
            <button
              onClick={() => setUiMode('default')}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: uiMode === 'default' ? 'var(--primary)' : 'transparent',
                color: uiMode === 'default' ? 'white' : (isDarkMode ? '#94A3B8' : 'var(--text-muted)'),
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              💼 Default UI
            </button>
          </div>

          {/* Light/Dark mode switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: isDarkMode ? '#1E2E4A' : '#F1F5F9',
              color: isDarkMode ? '#F1F5F9' : 'var(--dark)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      {uiMode === 'child' ? (
        <ChildDashboard 
          user={user} 
          showToast={showToast} 
          isDarkMode={isDarkMode} 
          xp={xp} setXp={setXp}
          level={level} setLevel={setLevel}
          rankPoints={rankPoints} setRankPoints={setRankPoints}
          streak={streak} setStreak={setStreak}
          friends={friends} setFriends={setFriends}
          duels={duels} setDuels={setDuels}
          studentHasCrown={studentHasCrown} setStudentHasCrown={setStudentHasCrown}
          hasPlayedGame={hasPlayedGame} setHasPlayedGame={setHasPlayedGame}
          referralCode={referralCode} referralLink={referralLink}
        />
      ) : (
        <StudentOverview 
          isDarkMode={isDarkMode} 
          xp={xp} setXp={setXp}
          level={level} setLevel={setLevel}
          rankPoints={rankPoints} setRankPoints={setRankPoints}
          streak={streak} setStreak={setStreak}
          friends={friends} setFriends={setFriends}
          duels={duels} setDuels={setDuels}
          studentHasCrown={studentHasCrown} setStudentHasCrown={setStudentHasCrown}
          hasPlayedGame={hasPlayedGame} setHasPlayedGame={setHasPlayedGame}
          referralCode={referralCode} referralLink={referralLink}
        />
      )}
    </div>
  );
}
