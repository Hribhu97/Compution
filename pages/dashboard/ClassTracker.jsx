import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Trophy, Zap, Coins, Flame, TrendingUp,
  Filter, Search, Trash2, Edit3, X, Loader2, BarChart2,
  CheckCircle2, Star, Clock, ChevronDown, Sparkles, Users,
  UploadCloud, FileText, Check, CheckCheck, Info, AlertTriangle, CheckCircle, Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, query, where, onSnapshot, orderBy, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { notificationService } from '../../services/notificationService';
import {
  subscribeTrackerEntries,
  subscribeStudentXP,
  subscribeStudentCoins,
  subscribeStudentStreak,
  deleteTrackerEntry,
  getWeeklySummary,
} from '../../services/trackerService';
import LearningTimeline from '../../components/tracker/LearningTimeline';
import XPProgressBar from '../../components/tracker/XPProgressBar';
import StreakWidget from '../../components/tracker/StreakWidget';
import WeeklySummary from '../../components/tracker/WeeklySummary';
import MotivationBanner from '../../components/tracker/MotivationBanner';
import FacultyUploadForm from '../../components/tracker/FacultyUploadForm';
import PerformanceMeter from '../../components/tracker/PerformanceMeter';
import Modal from '../../components/Modal';

// ─── Confetti Effect ─────────────────────────────────────────────────────────
const Confetti = ({ active }) => {
  if (!active) return null;
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6],
    size: 6 + Math.random() * 8,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: '-20px', rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: 720, opacity: [1, 1, 0] }}
          transition={{ duration: 2.5 + Math.random(), delay: p.delay, ease: 'linear' }}
          style={{
            position: 'absolute', width: p.size, height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            background: p.color,
          }}
        />
      ))}
    </div>
  );
};

// ─── Admin/Faculty Entry Row ──────────────────────────────────────────────────
const EntryRow = ({ entry, isAdmin, onDelete, canDelete }) => {
  const age = entry.createdAt?.toDate ? (Date.now() - entry.createdAt.toDate().getTime()) : 0;
  const within24h = age < 86400000;
  const deletable = isAdmin || (canDelete && within24h);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px',
        background: '#fff',
        border: '1px solid rgba(226,232,240,1)',
        borderRadius: '14px',
        transition: 'box-shadow 0.2s',
      }}
      whileHover={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
        background: 'rgba(99,102,241,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <BookOpen size={18} color="#6366f1" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.93rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.topic}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
          {entry.courseName} · {entry.chapter} · by {entry.facultyName}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {entry.performance && (
          <PerformanceMeter performance={entry.performance} size={36} label={false} />
        )}
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {entry.classDate?.toDate
            ? entry.classDate.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            : entry.classDate || ''}
        </span>
        {deletable && (
          <button
            onClick={() => onDelete(entry.id)}
            style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ─── Stats Card ────────────────────────────────────────────────────────────────
const StatsCard = ({ icon, label, value, color, sub }) => (
  <div style={{
    background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: '18px', padding: '18px 20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    display: 'flex', alignItems: 'center', gap: '14px',
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: '14px',
      background: `${color}12`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const ClassTracker = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isFaculty = user?.role?.toLowerCase() === 'faculty';
  const isStudent = user?.role?.toLowerCase() === 'student';
  const canManage = isAdmin || isFaculty;

  // Tracker entries
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student stats
  const [totalXP, setTotalXP] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [streakData, setStreakData] = useState({});
  const [weeklySummary, setWeeklySummary] = useState({});

  // Students list (for faculty tagging)
  const [students, setStudents] = useState([]);

  // UI state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterCourse, setFilterCourse] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [activeTab, setActiveTab] = useState(isStudent ? 'journey' : 'entries');
  const [showConfetti, setShowConfetti] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [faculties, setFaculties] = useState([]);
  const [uploadingStudentId, setUploadingStudentId] = useState(null);

  useEffect(() => {
    if (!canManage) return;
    const q = query(collection(db, 'users'), where('role', 'in', ['faculty', 'Faculty', 'admin', 'Admin', 'member', 'staff']));
    const unsub = onSnapshot(q, snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setFaculties(list);
    });
    return unsub;
  }, [canManage]);

  const handleUploadFile = async (e, studentId, actionType) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      showToast('Only .pdf and .docx files are allowed.', 'danger');
      return;
    }

    setUploadingStudentId(studentId);
    showToast(actionType === 'replace' ? 'Replacing tracker...' : 'Uploading tracker...', 'info');

    try {
      const storageRef = ref(storage, `student_trackers/${studentId}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const studentRef = doc(db, 'users', studentId);
      await setDoc(studentRef, {
        trackerUrl: downloadUrl,
        trackerFileName: file.name,
        trackerUploadedAt: new Date().toISOString()
      }, { merge: true });

      showToast('Tracker uploaded successfully!', 'success');
    } catch (err) {
      console.error('[Upload Tracker Error]', err);
      showToast('Failed to upload tracker. Please try again.', 'danger');
    } finally {
      setUploadingStudentId(null);
    }
  };

  const handleDeleteTracker = async (studentId, fileName) => {
    if (!window.confirm('Are you sure you want to delete this tracker?')) return;
    
    setUploadingStudentId(studentId);
    showToast('Deleting tracker...', 'info');

    try {
      if (fileName) {
        try {
          const storageRef = ref(storage, `student_trackers/${studentId}/${fileName}`);
          await deleteObject(storageRef);
        } catch (errStorage) {
          console.warn('File not found in storage, deleting Firestore reference...', errStorage);
        }
      }

      const studentRef = doc(db, 'users', studentId);
      await setDoc(studentRef, {
        trackerUrl: null,
        trackerFileName: null,
        trackerUploadedAt: null
      }, { merge: true });

      showToast('Tracker deleted successfully!', 'success');
    } catch (err) {
      console.error('[Delete Tracker Error]', err);
      showToast('Failed to delete tracker. Please try again.', 'danger');
    } finally {
      setUploadingStudentId(null);
    }
  };

  // Student Roadmap States
  const [roadmap, setRoadmap] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(isStudent);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [searchTopic, setSearchTopic] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, completed, pending, today, upcoming
  const { showToast } = useToast();

  // Subscribe to student roadmap
  useEffect(() => {
    if (!isStudent || !user?.uid) return;
    setRoadmapLoading(true);
    const docRef = doc(db, 'studentClassRoadmaps', user.uid);
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoadmap(snapshot.data());
      } else {
        setRoadmap(null);
      }
      setRoadmapLoading(false);
    }, (err) => {
      console.error("Roadmap subscription error:", err);
      setRoadmapLoading(false);
    });
    return unsub;
  }, [user?.uid, isStudent]);

  const handleToggleStudentCheckbox = async (chapterId, topicId, currentVal) => {
    try {
      const docRef = doc(db, 'studentClassRoadmaps', user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const roadmapData = docSnap.data();
      const chapters = roadmapData.chapters || [];
      let targetTopicName = '';
      let isFullyCompletedNow = false;

      const updatedChapters = chapters.map(ch => {
        if (ch.id !== chapterId) return ch;

        const updatedTopics = ch.topics.map(t => {
          if (t.id !== topicId) return t;

          targetTopicName = t.name;
          const newVal = !currentVal;
          const bothChecked = newVal && t.facultyCompleted;
          if (bothChecked) {
            isFullyCompletedNow = true;
          }

          return {
            ...t,
            studentCompleted: newVal,
            studentCompletedAt: newVal ? new Date().toISOString() : null
          };
        });

        return { ...ch, topics: updatedTopics };
      });

      // Recalculate counts
      let totalTopics = 0;
      let completedTopics = 0;
      updatedChapters.forEach(ch => {
        ch.topics.forEach(t => {
          totalTopics++;
          if (t.facultyCompleted && t.studentCompleted) {
            completedTopics++;
          }
        });
      });

      const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      await setDoc(docRef, {
        chapters: updatedChapters,
        totalTopicsCount: totalTopics,
        completedTopicsCount: completedTopics,
        progressPercent: progressPercent
      }, { merge: true });

      // Notify faculty
      try {
        if (user.assignedFacultyIds && user.assignedFacultyIds.length > 0) {
          await Promise.all(
            user.assignedFacultyIds.map(facId => 
              notificationService.send(
                facId,
                `${user.displayName} revised ${targetTopicName}`,
                `${user.displayName} has marked "${targetTopicName}" as revised. Please check if this topic is fully complete.`,
                'general'
              )
            )
          );
        }
      } catch (errNotification) {
        console.error("Failed to notify faculty mentors:", errNotification);
      }

      // Award XP
      if (isFullyCompletedNow) {
        const studentRef = doc(db, 'users', user.uid);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const currentXp = Number(studentSnap.data().xp || 0);
          await setDoc(studentRef, { xp: currentXp + 20 }, { merge: true });
          
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
          showToast(`🎉 Complete Study Loop! You earned +20 XP.`, 'success');
        }
      } else {
        showToast("Revision checklist updated.", "success");
      }
    } catch (err) {
      console.error("Error toggling checkbox:", err);
      showToast("Failed to update revision status.", "danger");
    }
  };

  // ── Subscribe to entries
  useEffect(() => {
    if (!user?.uid) return;
    const filters = isStudent ? { studentId: user.uid } : {};
    const unsub = subscribeTrackerEntries(filters, (data) => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid, isStudent]);

  // ── Student: subscribe XP, coins, streak
  useEffect(() => {
    if (!user?.uid) return;
    const unsubXP = subscribeStudentXP(user.uid, setTotalXP);
    const unsubCoins = subscribeStudentCoins(user.uid, setTotalCoins);
    const unsubStreak = subscribeStudentStreak(user.uid, setStreakData);
    return () => { unsubXP(); unsubCoins(); unsubStreak(); };
  }, [user?.uid]);

  // ── Weekly summary
  useEffect(() => {
    if (!user?.uid) return;
    getWeeklySummary(user.uid).then(setWeeklySummary);
  }, [user?.uid, entries.length]);

  // ── Load students (for faculty tagging)
  useEffect(() => {
    if (!canManage) return;
    const q = query(collection(db, 'users'), where('role', 'in', ['student', 'Student']));
    const unsub = onSnapshot(q, snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setStudents(list);
    });
    return unsub;
  }, [canManage]);

  // ── Filter entries for display
  const filteredEntries = entries.filter(e => {
    const matchCourse = !filterCourse || e.courseName?.toLowerCase().includes(filterCourse.toLowerCase());
    const matchSearch = !searchQ || e.topic?.toLowerCase().includes(searchQ.toLowerCase()) || e.chapter?.toLowerCase().includes(searchQ.toLowerCase());
    return matchCourse && matchSearch;
  });

  // ── Build timeline entries for student
  const timelineEntries = filteredEntries.map((e, i) => ({
    ...e,
    status: i === 0 ? 'current' : 'completed',
  }));

  // ── Stats
  const completedCount = entries.filter(e => e.status === 'completed' || e.topic).length;
  const uniqueCourses = [...new Set(entries.map(e => e.courseName).filter(Boolean))];

  // ── Handle delete
  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteTrackerEntry(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete failed', err);
    }
    setDeleting(false);
  };

  // ── Handle upload success
  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const getSyllabusInsights = () => {
    if (!roadmap || !roadmap.chapters) return { todayTopic: 'N/A', lastCompleted: 'N/A', upcomingChapter: 'N/A' };
    
    let todayTopic = '';
    let lastCompleted = '';
    let upcomingChapter = '';
    
    let foundToday = false;
    let foundUpcoming = false;

    // Search topics
    for (let cIdx = 0; cIdx < roadmap.chapters.length; cIdx++) {
      const ch = roadmap.chapters[cIdx];
      const hasPending = ch.topics.some(t => !t.facultyCompleted || !t.studentCompleted);
      
      if (hasPending && !foundUpcoming) {
        upcomingChapter = ch.name;
        foundUpcoming = true;
      }

      for (let tIdx = 0; tIdx < ch.topics.length; tIdx++) {
        const t = ch.topics[tIdx];
        if (t.facultyCompleted && t.studentCompleted) {
          lastCompleted = t.name;
        }
        if (!foundToday && (!t.studentCompleted || !t.facultyCompleted)) {
          todayTopic = t.name;
          foundToday = true;
        }
      }
    }

    return {
      todayTopic: todayTopic || 'All Completed!',
      lastCompleted: lastCompleted || 'None Yet',
      upcomingChapter: upcomingChapter || 'None'
    };
  };

  const insights = getSyllabusInsights();

  const calculateEstimatedCompletionDate = () => {
    if (!roadmap || !roadmap.progressPercent) return 'TBD (Start learning to estimate)';
    const pct = roadmap.progressPercent;
    if (pct >= 100) return 'Completed';

    // Fallback joining date: user.joiningDate or user.createdAt or 30 days ago
    const joinDateStr = user?.joiningDate || user?.createdAt || new Date(Date.now() - 30 * 86400000).toISOString();
    const joiningDate = new Date(joinDateStr);
    const elapsedMs = Date.now() - joiningDate.getTime();
    if (elapsedMs <= 0) return 'TBD';

    const totalMs = (elapsedMs / pct) * 100;
    const completionTime = joiningDate.getTime() + totalMs;
    return new Date(completionTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getFilteredChapters = () => {
    if (!roadmap || !roadmap.chapters) return [];
    
    return roadmap.chapters.map(ch => {
      const filteredTopics = ch.topics.filter(t => {
        const matchesSearch = !searchTopic || t.name.toLowerCase().includes(searchTopic.toLowerCase());
        
        let matchesStatus = true;
        if (statusFilter === 'completed') {
          matchesStatus = t.facultyCompleted && t.studentCompleted;
        } else if (statusFilter === 'pending') {
          matchesStatus = !t.facultyCompleted || !t.studentCompleted;
        } else if (statusFilter === 'today') {
          matchesStatus = (t.facultyCompleted && !t.studentCompleted) || (!t.facultyCompleted && t.studentCompleted);
        } else if (statusFilter === 'upcoming') {
          matchesStatus = !t.facultyCompleted && !t.studentCompleted;
        }
        
        return matchesSearch && matchesStatus;
      });

      return {
        ...ch,
        topics: filteredTopics
      };
    }).filter(ch => ch.topics.length > 0);
  };

  const filteredChapters = getFilteredChapters();

  // Donut progress chart component
  const ProgressDonut = ({ percent, total, completed }) => {
    const size = 120;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--white)', padding: '16px', borderRadius: '20px', border: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="rgba(99,102,241,0.04)" strokeWidth={strokeWidth} />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="var(--primary)" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, color: 'var(--dark)' }}>
            {percent}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--dark)' }}>Course Progress</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {completed} of {total} topics complete
          </div>
        </div>
      </div>
    );
  };

  if (isStudent && roadmapLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <Loader2 size={40} className="spinning" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  if (isStudent && !roadmap) {
    return (
      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', background: '#fff', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🗺️</div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--dark)' }}>Roadmap Under Construction</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '450px' }}>
            Your interactive learning roadmap is currently being prepared by the academic team. Once uploaded, you'll be able to track your progress and earn XP!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
      <Confetti active={showConfetti} />

      {isStudent ? (
        // ==================== STUDENT DASHBOARD VIEW ====================
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--dark)', letterSpacing: '-0.02em' }}>
              Learning Journey
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Track classes taught by mentors and check off revised topics to earn rewards!
            </p>
          </div>

          {/* Motivation banner */}
          <MotivationBanner studentId={user?.uid} streak={streakData?.currentStreak || 0} />

          {/* Metrics dashboard row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '16px' }} className="tracker-grid">
            <ProgressDonut percent={roadmap.progressPercent || 0} total={roadmap.totalTopicsCount || 0} completed={roadmap.completedTopicsCount || 0} />
            
            <div style={{ background: '#fff', padding: '20px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Today's Target</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--dark)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {insights.todayTopic}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Last Completed</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--success)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {insights.lastCompleted}
              </div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Upcoming Chapter</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {insights.upcomingChapter}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', padding: '4px', borderRadius: '14px', width: 'fit-content' }}>
            {[
              { id: 'journey', label: '🗺️ Journey' },
              { id: 'analytics', label: '📊 Analytics' },
              { id: 'timeline', label: '🛣️ Timeline' },
              { id: 'xp', label: '⚡ XP & Coins' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s',
                  background: activeTab === tab.id ? '#fff' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab contents */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }} className="tracker-grid">
            {/* Left Content Area */}
            <div>
              <AnimatePresence mode="wait">
                {activeTab === 'journey' && (
                  <motion.div key="journey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Double verification banner */}
                    <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
                      💡 <strong>Double Verification Check:</strong> A topic is marked fully complete (100%) only when your mentor marks it taught AND you check it off as revised.
                    </div>

                    {/* Filter and Search Bar */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          value={searchTopic}
                          onChange={e => setSearchTopic(e.target.value)}
                          placeholder="Search topics (e.g. loops, variables)..."
                          style={{
                            width: '100%', padding: '10px 14px 10px 36px', borderRadius: '12px',
                            border: '1.5px solid var(--border)', fontSize: '0.82rem',
                            background: '#fff', outline: 'none', boxSizing: 'border-box', color: 'var(--dark)',
                          }}
                        />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '12px', border: '1.5px solid var(--border)', fontSize: '0.82rem', background: '#fff', outline: 'none', color: 'var(--dark)' }}
                      >
                        <option value="all">All Topics</option>
                        <option value="completed">Completed (100%)</option>
                        <option value="pending">Incomplete / Pending</option>
                        <option value="today">Today's Class Target</option>
                        <option value="upcoming">Upcoming Topics</option>
                      </select>
                    </div>

                    {/* Collapsible Accordion Chapters */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filteredChapters.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#fff', border: '1px solid var(--border)', borderRadius: '20px', color: 'var(--text-muted)' }}>
                          No topics match your filters.
                        </div>
                      ) : (
                        filteredChapters.map(ch => {
                          const isExpanded = !!expandedChapters[ch.id];
                          const chCompleted = ch.topics.filter(t => t.facultyCompleted && t.studentCompleted).length;
                          const chTotal = ch.topics.length;
                          const chPercent = chTotal > 0 ? Math.round((chCompleted / chTotal) * 100) : 0;

                          return (
                            <div key={ch.id} style={{ border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
                              <div 
                                onClick={() => setExpandedChapters(prev => ({ ...prev, [ch.id]: !isExpanded }))}
                                style={{ padding: '16px', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--dark)' }}>{ch.name}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{chCompleted} / {chTotal} Completed</span>
                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                                    <span style={{ fontWeight: 700, color: chPercent === 100 ? 'var(--success)' : 'var(--primary)' }}>{chPercent}%</span>
                                  </div>
                                </div>
                                <ChevronDown size={18} style={{ color: 'var(--text-light)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                              </div>

                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {ch.topics.map(t => {
                                        const bothChecked = t.facultyCompleted && t.studentCompleted;
                                        return (
                                          <div 
                                            key={t.id} 
                                            style={{ 
                                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                              padding: '10px 12px', borderRadius: '12px', background: bothChecked ? 'rgba(16,185,129,0.02)' : 'var(--bg)',
                                              border: bothChecked ? '1px dashed rgba(16,185,129,0.15)' : '1px solid transparent'
                                            }}
                                          >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0, paddingRight: '12px' }}>
                                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark)' }}>{t.name}</span>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem' }}>
                                                <span style={{ color: t.facultyCompleted ? 'var(--success)' : 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                  {t.facultyCompleted ? '✓ Taught by Faculty' : '⏳ Taught Status Pending'}
                                                </span>
                                              </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleToggleStudentCheckbox(ch.id, t.id, t.studentCompleted)}
                                                style={{
                                                  padding: '6px 12px',
                                                  fontSize: '0.72rem',
                                                  fontWeight: 700,
                                                  borderRadius: '8px',
                                                  border: '1px solid var(--border)',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  background: t.studentCompleted ? 'var(--success)' : 'var(--white)',
                                                  color: t.studentCompleted ? 'white' : 'var(--text-light)'
                                                }}
                                              >
                                                {t.studentCompleted ? (
                                                  <>
                                                    <Check size={12} /> Revised
                                                  </>
                                                ) : (
                                                  "Mark Revised"
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'analytics' && (
                  <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--dark)' }}>Course Analytics Summary</h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-2-col-mobile">
                        <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Faculty Completion Rate</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', marginTop: '4px' }}>
                            {(() => {
                              let taught = 0;
                              let total = 0;
                              roadmap.chapters.forEach(ch => ch.topics.forEach(t => { total++; if (t.facultyCompleted) taught++; }));
                              return total > 0 ? `${Math.round((taught / total) * 100)}%` : '0%';
                            })()}
                          </div>
                        </div>

                        <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Student Revision Rate</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)', marginTop: '4px' }}>
                            {(() => {
                              let revised = 0;
                              let total = 0;
                              roadmap.chapters.forEach(ch => ch.topics.forEach(t => { total++; if (t.studentCompleted) revised++; }));
                              return total > 0 ? `${Math.round((revised / total) * 100)}%` : '0%';
                            })()}
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Estimated Completion Date</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--dark)', marginTop: '4px' }}>
                            {calculateEstimatedCompletionDate()}
                          </div>
                        </div>
                        <span style={{ fontSize: '1.5rem' }}>📅</span>
                      </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '24px', padding: '20px' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: 'var(--dark)' }}>Syllabus Breakdown</h3>
                      {roadmap.chapters.map(ch => {
                        const chDone = ch.topics.filter(t => t.facultyCompleted && t.studentCompleted).length;
                        const pct = ch.topics.length > 0 ? Math.round((chDone / ch.topics.length) * 100) : 0;
                        return (
                          <div key={ch.id} style={{ marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark)' }}>
                              <span>{ch.name}</span>
                              <span>{pct}%</span>
                            </div>
                            <div style={{ height: '6px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: 'var(--primary)', width: `${pct}%`, borderRadius: '100px', transition: 'width 0.5s' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'timeline' && (
                  <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px' }}>
                      <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 800, color: 'var(--dark)' }}>LMS Journey Milestones</h3>
                      
                      {(() => {
                        const totalCh = roadmap.chapters.length;
                        const progressPercent = roadmap.progressPercent || 0;
                        
                        const milestones = [
                          { label: 'Student Admission', desc: 'Syllabus roadmap generated', icon: '🎉', done: true, current: false },
                          { 
                            label: 'Orientation & Chapter 1', 
                            desc: roadmap.chapters[0]?.name || 'Introduction', 
                            icon: '🏁', 
                            done: progressPercent >= 10,
                            current: progressPercent < 10 
                          },
                          { 
                            label: 'Midterm Mark', 
                            desc: '50% Curriculum complete', 
                            icon: '🎯', 
                            done: progressPercent >= 50,
                            current: progressPercent >= 10 && progressPercent < 50 
                          },
                          { 
                            label: 'Capstone Project', 
                            desc: 'Apply learning to practical projects', 
                            icon: '💻', 
                            done: progressPercent >= 80,
                            current: progressPercent >= 50 && progressPercent < 80 
                          },
                          { 
                            label: 'Final Evaluation', 
                            desc: '100% Curriculum complete', 
                            icon: '🏆', 
                            done: progressPercent === 100,
                            current: progressPercent >= 80 && progressPercent < 100 
                          }
                        ];

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '2px solid var(--border)', marginLeft: '16px', paddingLeft: '24px', position: 'relative' }}>
                            {milestones.map((m, mIdx) => (
                              <div key={mIdx} style={{ position: 'relative' }}>
                                <div style={{
                                  position: 'absolute', left: '-37px', top: '2px',
                                  width: '24px', height: '24px', borderRadius: '50%',
                                  background: m.done ? 'var(--success)' : m.current ? 'var(--warning)' : 'var(--white)',
                                  border: `2px solid ${m.done ? 'var(--success)' : m.current ? 'var(--warning)' : 'var(--border)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: m.done ? 'white' : 'var(--text-muted)', fontSize: '0.75rem',
                                  fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                }}>
                                  {m.done ? '✓' : mIdx + 1}
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: m.done || m.current ? 'var(--dark)' : 'var(--text-muted)' }}>
                                  {m.label} <span style={{ marginLeft: '6px' }}>{m.icon}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {m.desc}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'xp' && (
                  <motion.div key="xp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <XPProgressBar totalXP={totalXP} />
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: 'var(--dark)' }}>🌱 Seed Coins Wallet</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '3rem' }}>🌱</div>
                        <div>
                          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--success)' }}>{totalCoins}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Seed Coins earned from revision and attendance</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)', fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>
                        💡 You earn Seed Coins when you complete topic checklist tasks! Check back daily to see your wallet grow.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <XPProgressBar totalXP={totalXP} />
              <StreakWidget streakData={streakData} />
              <WeeklySummary
                summary={{ ...weeklySummary, currentStreak: streakData?.currentStreak || 0 }}
                studentName={user?.displayName}
              />
            </div>
          </div>
        </div>
      ) : (
        // ==================== FACULTY/ADMIN TRACKERS DIRECTORY VIEW ====================
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <StatsCard
              icon={<Users size={20} color="#6366f1" />}
              label="Total Students"
              value={students.length}
              color="#6366f1"
            />
            <StatsCard
              icon={<UploadCloud size={20} color="#22c55e" />}
              label="Trackers Uploaded"
              value={students.filter(s => s.trackerUrl).length}
              color="#22c55e"
              sub={`${students.length - students.filter(s => s.trackerUrl).length} pending`}
            />
            <StatsCard
              icon={<BarChart2 size={20} color="#3b82f6" />}
              label="Avg Progress"
              value={
                students.length > 0 
                  ? Math.round(students.reduce((acc, s) => acc + (s.progressPercent || 0), 0) / students.length) + '%' 
                  : '0%'
              }
              color="#3b82f6"
            />
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search students by name, email, or class..."
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  borderRadius: '14px',
                  border: '1.5px solid var(--border)',
                  fontSize: '0.88rem',
                  background: 'var(--surface-elevated, #ffffff)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Student roster */}
          <div style={{ background: 'var(--surface-elevated, #ffffff)', border: '1px solid var(--border)', borderRadius: '20px', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
            
            {/* Desktop Table View */}
            <div className="table-responsive" style={{ display: 'block', width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Student</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Class & Semester</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Faculty</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tracker Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Updated</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Syllabus Progress</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(s => {
                      const q = searchQ.toLowerCase();
                      return (
                        s.displayName?.toLowerCase().includes(q) ||
                        s.email?.toLowerCase().includes(q) ||
                        s.class?.toLowerCase().includes(q)
                      );
                    })
                    .map(student => {
                      const assignedNames = (student.assignedFacultyIds || [])
                        .map(id => faculties.find(f => f.id === id)?.displayName || 'None')
                        .filter(n => n !== 'None')
                        .join(', ') || 'Unassigned';

                      const isUploading = uploadingStudentId === student.id;

                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{student.displayName || student.name || 'Anonymous'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{student.email}</div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 600 }}>{student.class || 'N/A'}</div>
                            {student.semester && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{student.semester}</div>
                            )}
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                            {assignedNames}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {student.trackerUrl ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 700 }}>
                                <Check size={12} /> Uploaded
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(100,116,139,0.1)', color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
                                <Clock size={12} /> Not Uploaded
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {student.trackerUploadedAt 
                              ? new Date(student.trackerUploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'N/A'}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
                              <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: 'var(--primary)', width: `${student.progressPercent || 0}%` }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{student.progressPercent || 0}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {isUploading ? (
                                <Loader2 size={16} className="spinning" style={{ color: 'var(--primary)' }} />
                              ) : student.trackerUrl ? (
                                <>
                                  <a
                                    href={student.trackerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                  >
                                    <FileText size={12} /> Preview
                                  </a>
                                  
                                  <label 
                                    htmlFor={`replace-${student.id}`} 
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                  >
                                    Replace
                                  </label>
                                  <input
                                    type="file"
                                    id={`replace-${student.id}`}
                                    style={{ display: 'none' }}
                                    accept=".pdf,.docx"
                                    onChange={(e) => handleUploadFile(e, student.id, 'replace')}
                                  />

                                  <button
                                    onClick={() => handleDeleteTracker(student.id, student.trackerFileName)}
                                    className="btn btn-danger"
                                    style={{ padding: '6px 10px', fontSize: '0.78rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <label 
                                    htmlFor={`upload-${student.id}`} 
                                    className="btn btn-primary"
                                    style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                  >
                                    <UploadCloud size={12} /> Upload Tracker
                                  </label>
                                  <input
                                    type="file"
                                    id={`upload-${student.id}`}
                                    style={{ display: 'none' }}
                                    accept=".pdf,.docx"
                                    onChange={(e) => handleUploadFile(e, student.id, 'upload')}
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Roster View */}
            <div className="mobile-only-cards" style={{ display: 'none', flexDirection: 'column', gap: '12px' }}>
              {students
                .filter(s => {
                  const q = searchQ.toLowerCase();
                  return (
                    s.displayName?.toLowerCase().includes(q) ||
                    s.email?.toLowerCase().includes(q) ||
                    s.class?.toLowerCase().includes(q)
                  );
                })
                .map(student => {
                  const assignedNames = (student.assignedFacultyIds || [])
                    .map(id => faculties.find(f => f.id === id)?.displayName || 'None')
                    .filter(n => n !== 'None')
                    .join(', ') || 'Unassigned';

                  const isUploading = uploadingStudentId === student.id;

                  return (
                    <div key={student.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{student.displayName || student.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{student.email}</div>
                        </div>
                        {student.trackerUrl ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 6px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.72rem', fontWeight: 700 }}>
                            <Check size={10} /> Uploaded
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 6px', borderRadius: '6px', background: 'rgba(100,116,139,0.1)', color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>
                            <Clock size={10} /> Pending
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Class & Semester</div>
                          <div style={{ fontWeight: 700, marginTop: '2px' }}>{student.class || 'N/A'} {student.semester && `(${student.semester})`}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Mentor</div>
                          <div style={{ fontWeight: 700, marginTop: '2px' }}>{assignedNames}</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.78rem' }}>
                        <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Syllabus Progress</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--primary)', width: `${student.progressPercent || 0}%` }} />
                          </div>
                          <span style={{ fontWeight: 800 }}>{student.progressPercent || 0}%</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        {isUploading ? (
                          <Loader2 size={16} className="spinning" style={{ color: 'var(--primary)' }} />
                        ) : student.trackerUrl ? (
                          <>
                            <a
                              href={student.trackerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                            >
                              <FileText size={12} /> Preview
                            </a>
                            
                            <label 
                              htmlFor={`replace-mob-${student.id}`} 
                              className="btn btn-secondary"
                              style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            >
                              Replace
                            </label>
                            <input
                              type="file"
                              id={`replace-mob-${student.id}`}
                              style={{ display: 'none' }}
                              accept=".pdf,.docx"
                              onChange={(e) => handleUploadFile(e, student.id, 'replace')}
                            />

                            <button
                              onClick={() => handleDeleteTracker(student.id, student.trackerFileName)}
                              className="btn btn-danger"
                              style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <label 
                              htmlFor={`upload-mob-${student.id}`} 
                              className="btn btn-primary"
                              style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                            >
                              <UploadCloud size={14} /> Upload Tracker
                            </label>
                            <input
                              type="file"
                              id={`upload-mob-${student.id}`}
                              style={{ display: 'none' }}
                              accept=".pdf,.docx"
                              onChange={(e) => handleUploadFile(e, student.id, 'upload')}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

          </div>
        </div>
      )}

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {showUploadModal && (
          <Modal title="Upload Class Record" onClose={() => setShowUploadModal(false)}>
            <FacultyUploadForm
              user={user}
              students={students}
              onSuccess={handleUploadSuccess}
              onClose={() => setShowUploadModal(false)}
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <Modal title="Delete Entry" onClose={() => setDeleteConfirmId(null)}>
            <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 24px' }}>
              Are you sure you want to delete this class entry? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '10px 20px', borderRadius: '12px', border: '1.5px solid rgba(226,232,240,1)', background: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', color: '#475569' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} disabled={deleting} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {deleting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Deleting...</> : <><Trash2 size={14} /> Delete</>}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Responsive style */}
      <style>{`
        @media (max-width: 768px) {
          .tracker-grid { grid-template-columns: 1fr !important; }
          .table-responsive { display: none !important; }
          .mobile-only-cards { display: flex !important; }
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClassTracker;
