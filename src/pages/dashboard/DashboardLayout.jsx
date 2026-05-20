import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, ClipboardList, FileText,
  Settings, LogOut, Search, Bell
} from 'lucide-react';

const NAV_MAIN = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/courses', label: 'Course', icon: BookOpen },
  { to: '/dashboard/tests', label: 'Tests', icon: ClipboardList },
  { to: '/dashboard/assignments', label: 'Lesson Plan', icon: FileText },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#F0F4FF',
      overflow: 'hidden',
      padding: '20px',
      gap: '24px',
    }}>
      {/* ── SIDEBAR ── matching the image: blue rounded sidebar */}
      <aside style={{
        width: '200px',
        background: 'linear-gradient(180deg, #536DFE 0%, #667FFF 100%)',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 16px 20px',
        flexShrink: 0,
        boxShadow: '0 8px 32px rgba(83, 109, 254, 0.25)',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          paddingLeft: '8px',
          marginBottom: '40px',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', fontWeight: 900, color: 'white',
          }}>C</div>
          <span style={{
            fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem',
            color: 'white', letterSpacing: '-0.02em',
          }}>Compution</span>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {NAV_MAIN.map(({ to, label, icon: Icon, exact }) => (
            <NavLink key={to} to={to} end={exact}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px',
                  background: isActive ? 'rgba(255,255,255,0.22)' : 'transparent',
                  color: 'white',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.92rem',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}>
                  <Icon size={18} />
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', borderRadius: '12px',
            color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '0.92rem',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <Settings size={18} /> Settings
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', borderRadius: '12px', width: '100%', textAlign: 'left',
            color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '0.92rem',
            cursor: 'pointer', transition: 'all 0.2s', background: 'none', border: 'none',
          }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '0' }}>
        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          paddingBottom: '20px', flexShrink: 0,
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search courses...."
              style={{
                width: '100%', padding: '13px 16px 13px 46px',
                borderRadius: '100px',
                border: '1.5px solid rgba(83,109,254,0.2)',
                background: 'white',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                color: 'var(--dark)',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(83,109,254,0.2)'}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button style={{ position: 'relative', color: 'var(--text-muted)', padding: '8px' }}>
              <Bell size={22} />
              <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid #F0F4FF' }} />
            </button>
            {/* Avatar */}
            {user?.photoURL ? (
              <img src={user.photoURL} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: '0.9rem',
                border: '2px solid white', boxShadow: '0 2px 8px rgba(83,109,254,0.2)',
              }}>
                {(user?.displayName || 'S')[0].toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(83,109,254,0.15) transparent' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={typeof window !== 'undefined' ? window.location.pathname : ''}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
