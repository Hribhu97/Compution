import React from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, CheckSquare, ClipboardList,
  BarChart2, FolderOpen, Bell, Search, User, LogOut,
  Flame, Calendar, ChevronDown
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/courses', label: 'My Courses', icon: BookOpen },
  { to: '/dashboard/assignments', label: 'Assignments', icon: CheckSquare, badge: 3 },
  { to: '/dashboard/tests', label: 'Mock Tests', icon: ClipboardList },
  { to: '/dashboard/progress', label: 'Coding Progress', icon: BarChart2 },
  { to: '/dashboard/materials', label: 'Study Materials', icon: FolderOpen },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = React.useState(false);

  return (
    <div className="dash-layout">
      {/* ── SIDEBAR ── */}
      <aside className="dash-sidebar">
        <div className="sidebar-logo">
          <Link to="/" style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-0.04em', color: 'var(--dark)' }}>
            COMP<span style={{ color: 'var(--primary)' }}>UTION</span>
          </Link>
          <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Student Portal</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {NAV.map(({ to, label, icon: Icon, badge, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && (
                <span style={{ background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px' }}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}

          <div className="nav-section-label" style={{ marginTop: '12px' }}>Account</div>
          <NavLink to="/dashboard/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <User size={18} /> Profile
          </NavLink>
          <button className="nav-item" onClick={() => navigate('/login')} style={{ width: '100%', textAlign: 'left' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </nav>

        {/* Streak card */}
        <div className="sidebar-footer">
          <div style={{ background: 'linear-gradient(135deg, rgba(83,109,254,0.08), rgba(126,200,255,0.12))', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid rgba(83,109,254,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>🔥</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>7-Day Streak!</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Keep coding daily</div>
              </div>
            </div>
            <div className="progress-track">
              <motion.div className="progress-fill" style={{ width: '70%' }}
                initial={{ width: 0 }} animate={{ width: '70%' }} transition={{ duration: 1 }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>Next: 10-day badge</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="dash-content">
        {/* Header */}
        <header className="dash-header">
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input placeholder="Search courses, materials…" className="form-input"
              style={{ paddingLeft: '38px', padding: '9px 14px 9px 38px', fontSize: '0.9rem', background: 'var(--bg)' }} />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Next class pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem' }}>
              <Calendar size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Next:</span>
              <span style={{ fontWeight: 600, color: 'var(--dark)' }}>Python — 5:00 PM</span>
            </div>

            {/* Notif */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(v => !v)}
                style={{ position: 'relative', color: 'var(--text-muted)', padding: '8px' }}>
                <Bell size={20} />
                <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid white' }} />
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="card"
                    style={{ position: 'absolute', right: 0, top: '48px', width: '300px', zIndex: 200, overflow: 'hidden' }}
                  >
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.95rem' }}>Notifications</div>
                    {[
                      { text: 'New assignment: Python Lists', time: '2h ago', dot: 'var(--primary)' },
                      { text: 'Mock Test results are out!', time: '1d ago', dot: 'var(--success)' },
                      { text: 'Class rescheduled to 6 PM', time: '2d ago', dot: 'var(--warning)' },
                    ].map((n, i) => (
                      <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', transition: 'var(--transition)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.dot, marginTop: '6px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{n.text}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.85rem' }}>
                AS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>Arjun Sen</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class XII CS</span>
              </div>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="dash-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 12 }}
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
