import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, ClipboardList,
  FileText, Settings, LogOut, Search, Bell,
  CalendarCheck, Calendar, MessageSquare, User, Sparkles, ShieldAlert, Loader2,
  Video
} from 'lucide-react';

const ADMISSION_SUBJECTS = [
  'Python Mastery',
  'Data Structures & Algorithms',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11 CS',
  'Class 11 App',
  'Class 12 CS',
  'Class 12 App',
  'Web Development (HTML/CSS/JS)',
  'Java Development',
  'C & C++ Fundamentals',
  'BCA',
  'B.Tech',
  'Tally Prime',
  'Advanced Excel',
  'Basic Computer'
];

const isProfileIncomplete = (u) => {
  if (!u) return false;
  if (u.role?.toLowerCase() !== 'student') return false;
  return !u.phone || u.course === 'Not specified' || !u.schoolOrCollege || !u.grade || !u.guardianName || !u.guardianPhone;
};

const NAV_MAIN = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/courses', label: 'Course', icon: BookOpen },
  { to: '/dashboard/schedule', label: 'Schedule', icon: Calendar },
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);

  useEffect(() => {
    let timer;
    const handleOnline = () => {
      setIsOffline(false);
      setShowOnlineBanner(true);
      timer = setTimeout(() => {
        setShowOnlineBanner(false);
      }, 4000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowOnlineBanner(false);
      if (timer) clearTimeout(timer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    course: '',
    schoolOrCollege: '',
    grade: '',
    guardianName: '',
    guardianPhone: '',
    photoURL: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        phone: user.phone || '',
        course: user.course && user.course !== 'Not specified' ? user.course : '',
        schoolOrCollege: user.schoolOrCollege || '',
        grade: user.grade || '',
        guardianName: user.guardianName || '',
        guardianPhone: user.guardianPhone || '',
        photoURL: user.photoURL || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const notifRef = query(collection(db, `users/${user.uid}/notifications`), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(notifRef, (snap) => {
      setHasUnread(!snap.empty);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setError('Image size should be less than 1.5MB');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, photoURL: reader.result }));
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.displayName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    const phoneReg = /^[0-9]{10}$/;
    if (!phoneReg.test(formData.phone.trim())) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (!formData.course) {
      setError('Please select a course of interest');
      return;
    }
    if (!formData.schoolOrCollege.trim()) {
      setError('Please enter your school or college name');
      return;
    }
    if (!formData.grade.trim()) {
      setError('Please enter your class / grade / standard');
      return;
    }
    if (!formData.guardianName.trim()) {
      setError('Please enter your parent/guardian name');
      return;
    }
    if (!formData.guardianPhone.trim()) {
      setError('Please enter your parent/guardian phone number');
      return;
    }
    if (!phoneReg.test(formData.guardianPhone.trim())) {
      setError('Please enter a valid 10-digit parent/guardian phone number');
      return;
    }

    setSaving(true);
    try {
      let classCategory = '';
      let stream = '';
      let autoGroup = '';
      
      const text = `${formData.grade || ''} ${formData.course || ''}`.toLowerCase();
      if (text.includes('class 2') || text.includes('grade 2') || text.includes('class 3') || text.includes('grade 3') || text.includes('class 4') || text.includes('grade 4') || text.includes('class 5') || text.includes('grade 5')) {
        const match = text.match(/class\s+(\d)|grade\s+(\d)/);
        classCategory = match ? (match[1] || match[2]) : '2';
      } else if (text.includes('class 6') || text.includes('grade 6') || text.includes('class 7') || text.includes('grade 7') || text.includes('class 8') || text.includes('grade 8')) {
        const match = text.match(/class\s+(\d)|grade\s+(\d)/);
        classCategory = match ? (match[1] || match[2]) : '6';
      } else if (text.includes('class 9') || text.includes('grade 9') || text.includes('class 10') || text.includes('grade 10')) {
        const match = text.match(/class\s+(\d+)|grade\s+(\d+)/);
        classCategory = match ? (match[1] || match[2]) : '9';
      } else if (text.includes('class 11') || text.includes('grade 11') || text.includes('11th')) {
        classCategory = '11';
        if (text.includes('science') || text.includes('cs')) stream = 'science';
        else if (text.includes('app') || text.includes('application')) stream = 'application';
      } else if (text.includes('class 12') || text.includes('grade 12') || text.includes('12th')) {
        classCategory = '12';
        if (text.includes('science') || text.includes('cs')) stream = 'science';
        else if (text.includes('app') || text.includes('application')) stream = 'application';
      } else {
        const match = text.match(/\b(\d+)\b/);
        if (match) {
          const num = parseInt(match[1]);
          if (num >= 2 && num <= 5) classCategory = String(num);
          else if (num >= 6 && num <= 8) classCategory = String(num);
          else if (num >= 9 && num <= 10) classCategory = String(num);
          else if (num === 11 || num === 12) {
            classCategory = String(num);
            if (text.includes('science') || text.includes('cs')) stream = 'science';
            else if (text.includes('app') || text.includes('application')) stream = 'application';
          }
        }
      }
      
      const numCat = parseInt(classCategory) || 0;
      if (numCat >= 2 && numCat <= 5) {
        autoGroup = 'class_2_5';
      } else if (numCat >= 6 && numCat <= 8) {
        autoGroup = 'class_6_8';
      } else if (numCat >= 9 && numCat <= 10) {
        autoGroup = 'class_9_10';
      } else if (numCat === 11 || numCat === 12) {
        if (stream === 'science') {
          autoGroup = 'class_11_12_science';
        } else if (stream === 'application') {
          autoGroup = 'class_11_12_application';
        } else {
          autoGroup = 'class_11_12_science';
        }
      }

      const customGroupException = user?.customGroupException || '';
      const studentGroup = customGroupException ? customGroupException : autoGroup;

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: formData.displayName.trim(),
        name: formData.displayName.trim(),
        phone: formData.phone.trim(),
        course: formData.course,
        schoolOrCollege: formData.schoolOrCollege.trim(),
        grade: formData.grade.trim(),
        guardianName: formData.guardianName.trim(),
        guardianPhone: formData.guardianPhone.trim(),
        photoURL: formData.photoURL,
        classCategory: classCategory,
        stream: stream,
        autoGroup: autoGroup,
        studentGroup: studentGroup, // preserves custom overrides
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Error updating profile:", err);
      setError('Failed to save profile details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const bottomNav = [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard, exact: true },
    { to: '/dashboard/courses', label: 'Courses', icon: BookOpen },
    { to: '/dashboard/schedule', label: 'Schedule', icon: Calendar },
    { to: '/dashboard/assignments', label: 'Tasks', icon: FileText },
    { to: '/dashboard/community', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar-panel hide-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', marginBottom: '40px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900, color: 'white',
          }}>C</div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: 'white', letterSpacing: '-0.02em' }}>Compution</span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {NAV_MAIN.filter(item => {
            const userRoleLower = user?.role?.toLowerCase();
            if (item.to === '/dashboard/attendance' && userRoleLower !== 'admin' && userRoleLower !== 'student') {
              return false;
            }
            return true;
          }).map(({ to, label, icon: Icon, exact }) => (
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
          {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'faculty') && (
            <a 
              href="https://meet.google.com/kzw-aheq-ejj" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'block' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
                background: 'transparent', color: 'white',
                fontWeight: 500, fontSize: '0.92rem', transition: 'all 0.2s', cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              >
                <Video size={18} /> Meet
              </div>
            </a>
          )}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '16px' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', width: '100%', textAlign: 'left',
            color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: '0.92rem', cursor: 'pointer', transition: 'all 0.2s', background: 'none', border: 'none',
          }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: 'rgba(239,83,80,0.1)',
                color: 'var(--danger)',
                borderBottom: '1px solid rgba(239,83,80,0.2)',
                padding: '12px 24px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                boxSizing: 'border-box',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1.5s infinite' }} />
              <span>Working offline. Changes will sync once connection is restored.</span>
              <style>{`
                @keyframes pulse {
                  0% { transform: scale(0.95); opacity: 0.5; }
                  50% { transform: scale(1.1); opacity: 1; }
                  100% { transform: scale(0.95); opacity: 0.5; }
                }
              `}</style>
            </motion.div>
          )}
          {showOnlineBanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: 'rgba(102,187,106,0.1)',
                color: 'var(--success)',
                borderBottom: '1px solid rgba(102,187,106,0.2)',
                padding: '12px 24px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                boxSizing: 'border-box',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              <span>Reconnected Successfully. Your database is up to date!</span>
            </motion.div>
          )}
        </AnimatePresence>
        <header className="dash-header-bar">
          <div className="dash-welcome" style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '1.05rem', marginRight: '16px' }}>
            Welcome back, {user?.role?.toLowerCase() === 'admin' ? 'Admin' : (user?.displayName || 'Student').split(' ')[0]} 👋
          </div>

          <div className="dash-search-wrap">
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

          <div className="dash-header-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button style={{ position: 'relative', color: 'var(--text-muted)', padding: '8px' }}>
              <Bell size={22} />
              {hasUnread && <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid #F0F4FF' }} />}
            </button>
            
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
                <span className="hide-mobile" style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.displayName || 'Student'} ▼</span>
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
                    <div 
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/dashboard/profile');
                      }}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }} 
                      onMouseEnter={e => e.currentTarget.style.background='var(--surface)'} 
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
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

        <div className="dash-body-scroll">
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
      <nav className="dash-bottom-nav hide-desktop hide-desktop--flex" aria-label="Mobile navigation">
        {bottomNav.map(({ to, label, icon: Icon, exact }) => (
          <NavLink key={to} to={to} end={exact} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'faculty') && (
          <a 
            href="https://meet.google.com/kzw-aheq-ejj" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 4px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              fontSize: '0.65rem',
              fontWeight: 600,
              minWidth: 0,
            }}
          >
            <Video size={20} />
            <span>Meet</span>
          </a>
        )}
      </nav>

      <AnimatePresence>
        {isProfileIncomplete(user) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(240, 244, 255, 0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              overflowY: 'auto'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: 'var(--shadow-lg)',
                maxWidth: '650px',
                width: '100%',
                borderRadius: '24px',
                padding: '36px',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Complete Your Profile</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Just a few quick details to set up your student workspace</p>
                </div>
              </div>

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.2)',
                  borderRadius: '12px', padding: '12px 16px', color: 'var(--danger)',
                  fontSize: '0.9rem', fontWeight: 500, marginBottom: '20px'
                }}>
                  <ShieldAlert size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', margin: '10px 0 20px' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    {formData.photoURL ? (
                      <img
                        src={formData.photoURL}
                        alt="Profile Preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--primary)'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '1.8rem'
                        }}
                      >
                        {(formData.displayName || user?.displayName || 'S')[0].toUpperCase()}
                      </div>
                    )}
                    <label
                      htmlFor="avatar-upload"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-sm)',
                        border: '2px solid white'
                      }}
                    >
                      <Sparkles size={12} />
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    Click icon to upload profile photo (Optional)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.displayName}
                      onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Your Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="10-digit number"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Select Course / Class of Interest</label>
                  <select
                    className="form-input"
                    value={formData.course}
                    onChange={e => setFormData({ ...formData, course: e.target.value })}
                    style={{ appearance: 'none', background: 'white url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E") no-repeat right 16px center / 16px' }}
                    required
                  >
                    <option value="" disabled>Choose a course</option>
                    {ADMISSION_SUBJECTS.map((sub, i) => (
                      <option key={i} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                  <div>
                    <label className="form-label">School / College Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.schoolOrCollege}
                      onChange={e => setFormData({ ...formData, schoolOrCollege: e.target.value })}
                      placeholder="e.g. DPS, St. Xavier's"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Class / Grade / Year</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.grade}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="e.g. Class 12, B.Tech 1st Year"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                  <div>
                    <label className="form-label">Parent / Guardian Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.guardianName}
                      onChange={e => setFormData({ ...formData, guardianName: e.target.value })}
                      placeholder="Guardian's full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Parent's Contact Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.guardianPhone}
                      onChange={e => setFormData({ ...formData, guardianPhone: e.target.value.replace(/\D/g, '') })}
                      placeholder="10-digit number"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button
                    onClick={handleLogout}
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: '14px', fontSize: '0.95rem' }}
                  >
                    Logout & Exit
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ flex: 2, padding: '14px', fontSize: '0.95rem', justifyContent: 'center' }}
                  >
                    {saving ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          style={{ display: 'inline-flex' }}
                        >
                          <Loader2 size={18} />
                        </motion.span>
                        Saving Details...
                      </div>
                    ) : (
                      'Save & Unlock Workspace'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
