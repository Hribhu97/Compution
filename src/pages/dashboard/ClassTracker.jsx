import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Trophy, Zap, Coins, Flame, TrendingUp,
  Filter, Search, Trash2, Edit3, X, Loader2, BarChart2,
  CheckCircle2, Star, Clock, ChevronDown, Sparkles, Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
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

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
      <Confetti active={showConfetti} />

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' }}>
            Class Tracker
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {isStudent ? 'Your learning journey — every class, every milestone.' : 'Manage class records and track student progress.'}
          </p>
        </div>
        {canManage && (
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowUploadModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 20px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
            }}
          >
            <Plus size={18} /> Upload Class
          </motion.button>
        )}
      </div>

      {/* ── Student: Motivation Banner ── */}
      {isStudent && (
        <div style={{ marginBottom: '20px' }}>
          <MotivationBanner studentId={user?.uid} streak={streakData?.currentStreak || 0} />
        </div>
      )}

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <StatsCard
          icon={<BookOpen size={20} color="#6366f1" />}
          label="Classes Logged"
          value={completedCount}
          color="#6366f1"
          sub={`${uniqueCourses.length} course${uniqueCourses.length !== 1 ? 's' : ''}`}
        />
        {isStudent && (
          <>
            <StatsCard
              icon={<Zap size={20} color="#f59e0b" />}
              label="Total XP"
              value={totalXP.toLocaleString()}
              color="#f59e0b"
              sub="Experience Points"
            />
            <StatsCard
              icon={<span style={{ fontSize: '1.2rem' }}>🌱</span>}
              label="Seed Coins"
              value={totalCoins}
              color="#22c55e"
              sub="Keep earning!"
            />
            <StatsCard
              icon={<Flame size={20} color="#ef4444" />}
              label="Day Streak"
              value={`${streakData?.currentStreak || 0}🔥`}
              color="#ef4444"
              sub={`Best: ${streakData?.longestStreak || 0} days`}
            />
          </>
        )}
        {canManage && (
          <>
            <StatsCard
              icon={<Users size={20} color="#22c55e" />}
              label="Students Tracked"
              value={students.length}
              color="#22c55e"
            />
            <StatsCard
              icon={<TrendingUp size={20} color="#3b82f6" />}
              label="Courses"
              value={uniqueCourses.length}
              color="#3b82f6"
            />
          </>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(248,250,252,1)', padding: '4px', borderRadius: '14px', width: 'fit-content' }}>
        {(isStudent
          ? [{ id: 'journey', label: '🗺️ Journey', icon: null }, { id: 'weekly', label: '📊 Weekly', icon: null }, { id: 'xp', label: '⚡ XP & Coins', icon: null }]
          : [{ id: 'entries', label: '📋 Entries', icon: null }, { id: 'analytics', label: '📊 Analytics', icon: null }]
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.83rem', transition: 'all 0.2s',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#6366f1' : '#64748b',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isStudent ? '1fr 300px' : '1fr', gap: '20px' }} className="tracker-grid">
        <div>
          <AnimatePresence mode="wait">

            {/* Student: Journey Tab */}
            {isStudent && activeTab === 'journey' && (
              <motion.div key="journey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : (
                  <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <LearningTimeline
                      entries={timelineEntries.map((e, i) => ({
                        ...e,
                        status: i === 0 ? 'current' : 'completed',
                      }))}
                      courseName={user?.course || uniqueCourses[0] || ''}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* Student: Weekly Tab */}
            {isStudent && activeTab === 'weekly' && (
              <motion.div key="weekly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <WeeklySummary
                  summary={{ ...weeklySummary, currentStreak: streakData?.currentStreak || 0 }}
                  studentName={user?.displayName}
                />
              </motion.div>
            )}

            {/* Student: XP Tab */}
            {isStudent && activeTab === 'xp' && (
              <motion.div key="xp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <XPProgressBar totalXP={totalXP} />
                <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '20px', padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>🌱 Seed Coins Wallet</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '3rem' }}>🌱</div>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#22c55e' }}>{totalCoins}</div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Seed Coins earned from attendance & homework</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)', fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                    💡 Coins are earned by attending classes, completing homework, and helping classmates.
                  </div>
                </div>
              </motion.div>
            )}

            {/* Faculty/Admin: Entries Tab */}
            {canManage && activeTab === 'entries' && (
              <motion.div key="entries" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {/* Filter bar */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      value={searchQ} onChange={e => setSearchQ(e.target.value)}
                      placeholder="Search topics..."
                      style={{
                        width: '100%', padding: '10px 14px 10px 36px', borderRadius: '12px',
                        border: '1.5px solid rgba(226,232,240,1)', fontSize: '0.86rem',
                        background: '#fff', outline: 'none', boxSizing: 'border-box', color: '#1e293b',
                      }}
                    />
                  </div>
                  <input
                    value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                    placeholder="Filter by course..."
                    style={{
                      width: '180px', padding: '10px 14px', borderRadius: '12px',
                      border: '1.5px solid rgba(226,232,240,1)', fontSize: '0.86rem',
                      background: '#fff', outline: 'none', boxSizing: 'border-box', color: '#1e293b',
                    }}
                  />
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', background: '#fff', border: '1px solid rgba(226,232,240,1)', borderRadius: '20px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📝</div>
                    <p style={{ margin: 0, fontWeight: 600 }}>No class entries yet.</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.83rem' }}>Click "Upload Class" to add your first entry.</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredEntries.map(entry => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        isAdmin={isAdmin}
                        canDelete={isFaculty && entry.facultyId === user?.uid}
                        onDelete={id => setDeleteConfirmId(id)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>
            )}

            {/* Faculty/Admin: Analytics Tab */}
            {canManage && activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>📊 Course Distribution</h3>
                  {uniqueCourses.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>No data yet.</p>
                  ) : uniqueCourses.map(course => {
                    const count = entries.filter(e => e.courseName === course).length;
                    const pct = Math.round((count / entries.length) * 100);
                    return (
                      <div key={course} style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.83rem', fontWeight: 600, color: '#475569' }}>
                          <span>{course}</span>
                          <span>{count} classes ({pct}%)</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(148,163,184,0.12)', borderRadius: '100px', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '100px' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>⭐ Performance Breakdown</h3>
                  {['excellent', 'good', 'average', 'needs_practice'].map(p => {
                    const count = entries.filter(e => e.performance === p).length;
                    const labels = { excellent: 'Excellent', good: 'Good', average: 'Average', needs_practice: 'Needs Practice' };
                    const colors = { excellent: '#22c55e', good: '#3b82f6', average: '#f59e0b', needs_practice: '#ef4444' };
                    const pct = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;
                    return (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, width: '110px', color: '#475569' }}>{labels[p]}</span>
                        <div style={{ flex: 1, height: '8px', background: 'rgba(148,163,184,0.12)', borderRadius: '100px', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            style={{ height: '100%', background: colors[p], borderRadius: '100px' }}
                          />
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', width: '32px', textAlign: 'right' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Student: Right Sidebar ── */}
        {isStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <XPProgressBar totalXP={totalXP} />
            <StreakWidget streakData={streakData} />
            <WeeklySummary
              summary={{ ...weeklySummary, currentStreak: streakData?.currentStreak || 0 }}
              studentName={user?.displayName}
            />
          </div>
        )}
      </div>

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
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClassTracker;
