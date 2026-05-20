import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, ClipboardList,
  FileText, Settings, LogOut, Search, Bell,
  CalendarCheck, MessageSquare, User
} from 'lucide-react';
import ChatAssistant from '../../components/ChatAssistant';

const NAV_MAIN = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/courses', label: 'Course', icon: BookOpen },
  { to: '/dashboard/tests', label: 'Tests', icon: ClipboardList },
  { to: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/dashboard/assignments', label: 'Assignments', icon: FileText },
  { to: '/dashboard/community', label: 'Community', icon: MessageSquare },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const notifRef = query(collection(db, `users/${user.uid}/notifications`), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(notifRef, (snap) => {
      // Just check if there's any for the red dot logic
      setHasUnread(!snap.empty);
    });
    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div style={{
      display: 'flex', height: '100vh', background: '#F0F4FF',
      overflow: 'hidden', padding: '20px', gap: '24px',
    }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '200px', background: 'linear-gradient(180deg, #536DFE 0%, #667FFF 100%)',
        borderRadius: '24px', display: 'flex', flexDirection: 'column',
        padding: '28px 16px 20px', flexShrink: 0, boxShadow: '0 8px 32px rgba(83, 109, 254, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', marginBottom: '40px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900, color: 'white',
          }}>C</div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: 'white', letterSpacing: '-0.02em' }}>Compution</span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {NAV_MAIN.map(({ to, label, icon: Icon, exact }) => (
            <NavLink key={to} to={to} end={exact}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                  background: isActive ? 'rgba(255,255,255,0.22)' : 'transparent', color: 'white',
                  fontWeight: isActive ? 700 : 500, fontSize: '0.92rem', transition: 'all 0.2s', cursor: 'pointer',
                }}>
                  <Icon size={18} /> {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '0.92rem', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <Settings size={18} /> Settings
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', width: '100%', textAlign: 'left',
            color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '0.92rem', cursor: 'pointer', transition: 'all 0.2s', background: 'none', border: 'none',
          }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '0' }}>
        {/* Top bar */}
        <header style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', flexShrink: 0 }}>
          
          <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '1.05rem', marginRight: '16px' }}>
            Welcome back, {user?.displayName?.split(' ')[0] || 'Student'} 👋
          </div>

          <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search courses...."
              style={{
                width: '100%', padding: '13px 16px 13px 46px', borderRadius: '100px', border: '1.5px solid rgba(83,109,254,0.2)',
                background: 'white', fontSize: '0.9rem', outline: 'none', color: 'var(--dark)', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(83,109,254,0.2)'}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button style={{ position: 'relative', color: 'var(--text-muted)', padding: '8px' }}>
              <Bell size={22} />
              {hasUnread && <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid #F0F4FF' }} />}
            </button>
            
            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', 
                  background: 'white', padding: '6px 16px 6px 6px', borderRadius: '100px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.9rem',
                  }}>
                    {(user?.displayName || 'S')[0].toUpperCase()}
                  </div>
                )}
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.displayName || 'Student'} ▼</span>
              </div>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '200px',
                      background: 'white', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      padding: '8px', zIndex: 100
                    }}
                  >
                    <div style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background='var(--surface)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <User size={16} /> My Profile
                    </div>
                    <div style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.background='var(--surface)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <Settings size={16} /> Settings
                    </div>
                    <div style={{ margin: '4px 0', height: 1, background: 'var(--border)' }} />
                    <div onClick={handleLogout} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--danger)' }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,83,80,0.08)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <LogOut size={16} /> Logout
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={typeof window !== 'undefined' ? window.location.pathname : ''}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ChatAssistant />
    </div>
  );
};

export default DashboardLayout;
