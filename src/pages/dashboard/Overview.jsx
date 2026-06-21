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
import StudentOverview from '../../features/dashboard/StudentOverview';

const stagger = { show: { transition: { staggerChildren: 0.06 } } };

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
      background: isDarkMode ? 'var(--bg)' : 'transparent',
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
        background: 'var(--surface-card)',
        color: 'var(--text-primary)',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        flexWrap: 'wrap',
        gap: '12px',
        transition: 'all 0.3s ease'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Student Workspace</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Choose between gamified child theme or classic layout</p>
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
                color: uiMode === 'child' ? 'white' : ('var(--text-secondary)'),
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
                color: uiMode === 'default' ? 'white' : ('var(--text-secondary)'),
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
              color: 'var(--text-primary)',
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
        <StudentOverview isDarkMode={isDarkMode} />
      )}
    </div>
  );
}
