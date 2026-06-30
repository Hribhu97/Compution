import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useCourses } from '../../hooks/useCourses';
import { useTests } from '../../hooks/useTests';
import { useGames } from '../../hooks/useGames';
import { db } from '../../firebase';
import { collection, query, where, doc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { 
  Users, Calendar, Clock, BookOpen, ClipboardList, Gamepad2, Award, 
  Flame, MessageSquare, AlertCircle, FileText, Bell, ArrowUpRight, Trophy, Star, X 
} from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import FacultyQueryModal from '../../components/FacultyQueryModal';
import { getActiveSeason, getStandings } from '../../services/worldCupService';

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
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        borderRadius: '12px',
        background: 'var(--surface-elevated, rgba(255, 255, 255, 0.95))',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)',
        color: 'var(--text-primary, #121212)',
        fontWeight: 600,
        fontSize: '0.95rem',
      }}
    >
      <span>{message}</span>
    </motion.div>
  );
};

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'resolved':
      return { background: 'rgba(34,197,94,0.1)', color: '#22C55E' };
    case 'replied':
      return { background: 'rgba(37,99,235,0.1)', color: '#2563EB' };
    case 'viewed':
      return { background: 'rgba(245,158,11,0.1)', color: '#F59E0B' };
    default:
      return { background: 'rgba(100,116,139,0.1)', color: '#64748B' };
  }
};

const StudentOverview = ({ isDarkMode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Subscribe to World Cup Squad
  const [wcSquad, setWcSquad] = useState(null);
  const [wcSeason, setWcSeason] = useState(null);
  const [wcLoading, setWcLoading] = useState(true);
  const [wcStats, setWcStats] = useState({ goals: 0, score: 0, teamRank: '-', playedToday: false });

  const getWcCountdown = () => {
    if (!wcSeason?.endDate) return '24 Days';
    const end = wcSeason.endDate.toDate ? wcSeason.endDate.toDate() : new Date(wcSeason.endDate);
    const diff = end - new Date();
    if (diff <= 0) return 'Season Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} Days ${hours} Hours`;
  };

  useEffect(() => {
    let unsub = () => {};
    const fetchWC = async () => {
      try {
        const season = await getActiveSeason();
        setWcSeason(season);
        
        if (user?.worldcupGroupId) {
          const squadRef = doc(db, 'worldcup_groups', user.worldcupGroupId);
          unsub = onSnapshot(squadRef, (docSnap) => {
            if (docSnap.exists()) {
              setWcSquad(docSnap.data());
            } else {
              setWcSquad(null);
            }
          });
        }
      } catch (err) {
        console.error("Error setting up WC subscriptions in StudentOverview:", err);
      } finally {
        setWcLoading(false);
      }
    };
    fetchWC();
    return () => unsub();
  }, [user?.uid, user?.worldcupGroupId]);

  useEffect(() => {
    if (!user?.uid || !user?.worldcupGroupId || !wcSquad) return;
    
    // Find player in squad members
    const member = wcSquad.members?.find(m => m.uid === user.uid);
    const goals = member?.goals || 0;
    const score = member?.score || 0;
    
    // Check if played today
    const playedKey = `wc_played_${user.uid}_${new Date().toDateString()}`;
    const playedToday = localStorage.getItem(playedKey) === 'true';
    
    // Fetch team rank
    const getTeamRank = async () => {
      try {
        const season = await getActiveSeason();
        const standings = await getStandings(season.id);
        const rankIdx = standings.squadStandings.findIndex(s => s.id === user.worldcupGroupId);
        const teamRank = rankIdx !== -1 ? `#${rankIdx + 1}` : '-';
        setWcStats({ goals, score, teamRank, playedToday });
      } catch (err) {
        console.error(err);
      }
    };
    getTeamRank();
  }, [user?.uid, user?.worldcupGroupId, wcSquad]);

  // Custom Hooks for core SaaS data
  const { courses, loading: coursesLoading } = useCourses(user);
  const { attempts: testAttempts } = useTests(user?.uid);
  const { attempts: gameAttempts } = useGames(user?.uid);

  // Component local states for real-time collections
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [assignedFaculty, setAssignedFaculty] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [queriesList, setQueriesList] = useState([]);

  // Faculty doubt flow state
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Subscriptions
  useEffect(() => {
    if (!user?.uid) return;

    if (!db) {
      console.error("Firestore not initialized");
      return;
    }

    let unsubAtt = () => {};
    let unsubFac = () => {};
    let unsubCal = () => {};
    let unsubAssign = () => {};
    let unsubNotices = () => {};
    let unsubQueries = () => {};

    // 1. Attendance Log Subscription
    try {
      const attRef = collection(db, 'users', user.uid, 'attendance');
      unsubAtt = onSnapshot(attRef, (snap) => {
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setAttendanceLogs(data);
      }, (err) => {
        console.error("StudentOverview: Attendance listener error:", err);
      });
    } catch (err) {
      console.error("StudentOverview: Attendance listener creation failed", err);
    }

    // 2. Assigned Faculty Subscription
    try {
      const mapRef = doc(db, 'studentFacultyMap', user.uid);
      unsubFac = onSnapshot(mapRef, (docSnap) => {
        if (docSnap.exists()) {
          setAssignedFaculty(docSnap.data().assignedFaculty || []);
        } else {
          setAssignedFaculty([]);
        }
      }, (err) => {
        console.error("StudentOverview: Faculty map listener error:", err);
      });
    } catch (err) {
      console.error("StudentOverview: Faculty map listener creation failed", err);
    }

    // 3. Calendar Events Subscription
    try {
      const calRef = collection(db, 'calendarEvents');
      const userGroup = user.studentGroup || '';
      unsubCal = onSnapshot(calRef, (snap) => {
        const data = [];
        snap.forEach(evDoc => {
          const ev = evDoc.data();
          const isInStudents = ev.assignedStudents?.includes(user.uid);
          const isInGroups = ev.assignedGroups?.includes(userGroup);
          if (isInStudents || isInGroups) {
            data.push({ id: evDoc.id, ...ev });
          }
        });
        // Sort upcoming first
        data.sort((x, y) => (x.startDate || '').localeCompare(y.startDate || ''));
        setCalendarEvents(data);
      }, (err) => {
        console.error("StudentOverview: Calendar events listener error:", err);
      });
    } catch (err) {
      console.error("StudentOverview: Calendar events listener creation failed", err);
    }

    // 4. Assignments Subscription
    try {
      const assignRef = query(collection(db, 'assignments'), where('classGroup', '==', user.grade || 'Class 10'));
      unsubAssign = onSnapshot(assignRef, (snap) => {
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setAssignments(data);
      }, (err) => {
        console.error("StudentOverview: Assignments listener error:", err);
      });
    } catch (err) {
      console.error("StudentOverview: Assignments listener creation failed", err);
    }

    // 5. Notices/Announcements Subscription
    try {
      const noticesRef = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(5));
      unsubNotices = onSnapshot(noticesRef, (snap) => {
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setNotices(data);
      }, (err) => {
        console.error("StudentOverview: Notices listener error:", err);
      });
    } catch (err) {
      console.error("StudentOverview: Notices listener creation failed", err);
    }

    // 6. Doubt Queries Subscription (Client-side sorted to avoid composite index requirements)
    try {
      const qRef = query(
        collection(db, 'facultyQueries'),
        where('studentId', '==', user.uid)
      );
      unsubQueries = onSnapshot(qRef, (snap) => {
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        data.sort((x, y) => {
          const dateX = x.createdAt?.toDate ? x.createdAt.toDate() : new Date(x.createdAt || 0);
          const dateY = y.createdAt?.toDate ? y.createdAt.toDate() : new Date(y.createdAt || 0);
          return dateY - dateX;
        });
        setQueriesList(data.slice(0, 5));
      }, (err) => {
        console.error("StudentOverview: Queries listener error:", err);
      });
    } catch (err) {
      console.error("StudentOverview: Queries listener creation failed", err);
    }

    return () => {
      unsubAtt();
      unsubFac();
      unsubCal();
      unsubAssign();
      unsubNotices();
      unsubQueries();
    };
  }, [user?.uid, user?.studentGroup, user?.grade]);

  // Aggregate Metrics Calculations
  const presentCount = attendanceLogs.filter(l => l.status === 'present' || l.status === 'late').length;
  const attendanceRate = attendanceLogs.length > 0 ? Math.round((presentCount / attendanceLogs.length) * 100) : 100;
  
  const progressRate = courses.length > 0 
    ? Math.round(courses.reduce((acc, c) => acc + (user?.courseProgress?.[c.id] || 0), 0) / courses.length) 
    : 0;

  const totalGamePoints = user?.gamePoints || 0;
  const averageTestScore = testAttempts.length > 0 
    ? Math.round(testAttempts.reduce((acc, a) => acc + a.percentage, 0) / testAttempts.length) 
    : 0;

  const recentTest = testAttempts.length > 0 ? testAttempts[0] : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 0.9fr', gap: '28px', color: 'var(--text-primary)' }} className="grid-2-col-mobile">
      
      {/* Left Column: Dashboard SaaS overview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Welcome Hero Card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          color: 'var(--text-on-primary)',
          borderRadius: '24px',
          padding: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-on-primary)', opacity: 0.7, letterSpacing: '0.05em' }}>
              Academic Workspace
            </span>
            <h2 style={{ color: 'var(--text-on-primary)', margin: '4px 0 8px 0', fontSize: '1.75rem', fontWeight: 800 }}>
              Welcome back, {user?.displayName || 'Student'}!
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.92rem' }}>
              Level {user?.level || 1} • {user?.xp || 0} XP • Total Game Score: {totalGamePoints} pts
            </p>
          </div>
          <Award size={64} style={{ color: 'var(--text-on-primary)', opacity: 0.8 }} />
        </div>

        {/* Fullscreen Event Announcement (Show on first login if unjoined) */}
        {wcSeason && wcSeason.status !== 'completed' && (!user?.worldcupGroupId) && (
          <AnimatePresence>
            {!localStorage.getItem(`wc_announced_${user?.uid}`) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed', inset: 0, zIndex: 99999,
                  background: 'rgba(9, 11, 20, 0.95)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '20px', overflowY: 'auto'
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  style={{
                    background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
                    border: '2px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '32px',
                    padding: '40px',
                    maxWidth: '550px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 25px 70px -10px rgba(99,102,241,0.4)',
                    color: 'white',
                    position: 'relative'
                  }}
                >
                  {/* Decorative close button */}
                  <button 
                    onClick={() => {
                      localStorage.setItem(`wc_announced_${user?.uid}`, 'true');
                      // Force re-render of this block
                      setWcLoading(p => !p);
                    }}
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>

                  <div style={{ fontSize: '3.5rem', marginBottom: '16px', filter: 'drop-shadow(0 10px 15px rgba(99,102,241,0.3))' }}>🌍</div>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '0.05em', margin: '0 0 8px', color: '#60A5FA' }}>WORLD CUP MANIA</h1>
                  <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '24px' }}>
                    🏆 Limited Time Campus Championship
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', fontSize: '0.95rem', opacity: 0.9, margin: '20px 0 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>⚽ <span>Pick your favourite country.</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>👥 <span>Represent your squad.</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>🔥 <span>Compete with classmates.</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>🏅 <span>Win trophies.</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>👑 <span>Become Campus Champion.</span></div>
                  </div>

                  <div style={{ 
                    background: 'rgba(99,102,241,0.06)', 
                    border: '1.5px dashed rgba(99,102,241,0.3)', 
                    padding: '16px', 
                    borderRadius: '16px', 
                    marginBottom: '32px' 
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 800 }}>Season ends in</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#f59e0b', marginTop: '4px' }}>{getWcCountdown()}</div>
                  </div>

                  <button
                    onClick={() => {
                      localStorage.setItem(`wc_announced_${user?.uid}`, 'true');
                      navigate('/dashboard/worldcup');
                    }}
                    style={{
                      width: '100%',
                      padding: '16px 0',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '1rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 10px 24px rgba(99,102,241,0.3)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Choose My Team
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}


        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Attendance Rate', val: `${attendanceRate}%`, icon: Calendar, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
            { label: 'Course Progress', val: `${progressRate}%`, icon: BookOpen, color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
            { label: 'Avg Test Score', val: testAttempts.length > 0 ? `${averageTestScore}%` : 'N/A', icon: ClipboardList, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
            { label: 'Mini-Game Rank', val: totalGamePoints > 0 ? `#${user?.level || 1}` : 'N/A', icon: Gamepad2, color: '#EC4899', bg: 'rgba(236,72,153,0.08)' }
          ].map((m, idx) => {
            const Icon = m.icon;
            return (
              <div key={idx} style={{ background: m.bg, padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Icon size={20} style={{ color: m.color }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{m.label}</span>
                <strong style={{ fontSize: '1.6rem', fontWeight: 900, color: m.color }}>{m.val}</strong>
              </div>
            );
          })}
        </div>

        {/* Debug Info Banner */}
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '16px' }}>
          🛠️ Debug Info — wcSeason: {wcSeason ? `${wcSeason.name} (${wcSeason.status})` : 'NULL'} | GroupId: {user?.worldcupGroupId || 'NONE'} | Squad: {wcSquad ? 'LOADED' : 'NULL'}
        </div>

        {/* World Cup Event Section */}
        {wcSeason && (
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #030712 100%)',
            border: '1.5px solid rgba(99,102,241,0.25)',
            borderRadius: '24px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Stadium Lights visual effect */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
              background: 'linear-gradient(180deg, rgba(99,102,241,0.1) 0%, transparent 100%)',
              pointerEvents: 'none'
            }} />
            
            <div style={{ zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60A5FA', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🔥 LIVE EVENT
              </div>
              <h3 style={{ margin: '6px 0 2px', fontSize: '1.45rem', fontWeight: 950, color: 'white' }}>
                WORLD CUP MANIA 2026
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                Represent your country and lead your squad to glory! Season ends: <strong>{getWcCountdown()}</strong>
              </p>
            </div>
            
            <button
              onClick={() => navigate('/dashboard/worldcup')}
              style={{
                zIndex: 1,
                padding: '12px 28px',
                borderRadius: '100px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(99,102,241,0.4)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Continue →
            </button>
          </div>
        )}

        {/* My Assigned Courses List */}
        <div style={{ background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} style={{ color: '#2563EB' }} /> My Enrolled Courses
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {coursesLoading ? (
              <div>Loading courses...</div>
            ) : courses.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.88rem' }}>No courses assigned to your roster.</div>
            ) : (
              courses.slice(0, 3).map((c) => {
                const progress = user?.courseProgress?.[c.id] || 0;
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#F8F7F4', borderRadius: '12px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '2rem' }}>{c.emoji}</div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800 }}>{c.title}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        <span>Progress: {progress}%</span>
                        <span>{c.schedule}</span>
                      </div>
                      <div className="progress-track" style={{ background: '#E2E8F0', height: '4px' }}>
                        <div className="progress-fill" style={{ width: `${progress}%`, background: c.color }} />
                      </div>
                    </div>
                    <button onClick={() => navigate('/dashboard/courses')} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.78rem' }}>
                      Open
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Schedule & Pending Assignments Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="grid-2-col-mobile">
          
          {/* Upcoming Classes */}
          <div style={{ background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: '#8B5CF6' }} /> Upcoming Schedule
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {calendarEvents.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic', padding: '10px 0' }}>No classes scheduled this week.</div>
              ) : (
                calendarEvents.slice(0, 3).map((ev) => (
                  <div key={ev.id} style={{ padding: '12px', background: '#F8F7F4', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>{ev.title}</span>
                      <span style={{ color: '#8B5CF6', fontSize: '0.7rem' }}>{ev.eventType}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                      📅 {ev.startDate} at {ev.startTime}
                    </div>
                    {ev.meetLink && (
                      <a href={ev.meetLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#2563EB', fontWeight: 700, fontSize: '0.72rem' }}>
                        Join Meeting <ArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Assignments */}
          <div style={{ background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#EF4444' }} /> Pending Assignments
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {assignments.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic', padding: '10px 0' }}>No active assignments.</div>
              ) : (
                assignments.slice(0, 3).map((a) => (
                  <div key={a.id} style={{ padding: '12px', background: '#F8F7F4', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{a.title}</div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Due: {a.dueDate || 'No due date'}</span>
                    </div>
                    <span style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>Pending</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Right Column: Streaks, Mentors, Notices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Streak & Achievements */}
        <div style={{ background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={18} style={{ color: '#F59E0B' }} /> Daily Streak
            </h3>
            <span style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800 }}>
              🔥 {user?.streak || 0} Days
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Play a mini-game or complete a test every day to build your educational streak and claim extra bonus points!
          </p>
        </div>

        {/* Assigned Mentors */}
        <div style={{ background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--primary)' }} /> My Faculty Mentors
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {assignedFaculty.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic', padding: '10px 0' }}>No mentor assigned yet.</div>
            ) : (
              assignedFaculty.map((mentor, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: idx + 1 === assignedFaculty.length ? 0 : '12px', borderBottom: idx + 1 === assignedFaculty.length ? 'none' : '1px solid var(--border)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--text-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    {mentor.facultyName.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mentor.facultyName}</div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{mentor.subject}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedMentor(mentor);
                      setIsQueryModalOpen(true);
                    }} 
                    className="btn btn-ghost" 
                    style={{ padding: '6px 10px' }} 
                    title="Ask Faculty Mentor"
                  >
                    <MessageSquare size={14} style={{ color: 'var(--primary)' }} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Doubt Queries History */}
        <div style={{ background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} style={{ color: '#8B5CF6' }} /> Doubt Query History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {queriesList.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic', padding: '10px 0' }}>No doubt queries submitted yet.</div>
            ) : (
              queriesList.map((q) => (
                <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--surface-primary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', wordBreak: 'break-word' }}>{q.subject}</span>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      ...getStatusStyle(q.status)
                    }}>
                      {q.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
                    {q.question}
                  </p>
                  {q.reply && (
                    <div style={{ marginTop: '4px', padding: '8px', background: 'rgba(37,99,235,0.05)', borderRadius: '6px', borderLeft: '3px solid #2563EB', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: '#2563EB' }}>Reply:</span> {q.reply}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span>Mentor: {q.facultyName}</span>
                    <span>{q.createdAt ? format(q.createdAt.toDate(), 'dd MMM, p') : 'Just now'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notices & Announcements */}
        <div style={{ background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} style={{ color: '#F59E0B' }} /> Institutional Notices
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notices.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', fontStyle: 'italic', padding: '10px 0' }}>No active notices posted.</div>
            ) : (
              notices.map((n) => (
                <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#F8F7F4', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{n.title}</div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <FacultyQueryModal
        isOpen={isQueryModalOpen}
        onClose={() => {
          setIsQueryModalOpen(false);
          setSelectedMentor(null);
        }}
        student={user}
        faculty={selectedMentor}
        triggerToast={(msg) => setToast(msg)}
      />

      <AnimatePresence>
        {toast && (
          <Toast message={toast} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

    </div>
  );
};

export default StudentOverview;
