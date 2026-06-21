import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BookOpen, Terminal, Code, Trophy, Users, Clock,
  ArrowRight, CheckCircle, Star, ChevronRight,
  Zap, Target, TrendingUp, Award, MapPin, Phone, Mail,
  Menu, X, Loader2, Sun, Moon, Play
} from 'lucide-react';
import Modal from '../../components/Modal';
import LeadCaptureSystem from '../../components/LeadCaptureSystem';
import { useAuth } from '../../contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

/* ── FADE IN VARIANTS ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }
  })
};

const ADMISSION_SUBJECTS = [
  'Basic+AI (Prompt Engn)',
  'School Syllabus (Classes 2 to 5)',
  'School Syllabus (Classes 6 to 10)',
  'Class XI & XII Computer Science',
  'Class XI & XII Computer Application',
  'Basic Coding (C, C++, Java, Python, AI/ML)',
  'Advance Coding (Master C/C++/Java/Python)',
  'Data Structures & Algorithms'
];

/* ── ADMISSION POPUP ───────────────────────────────── */
const AdmissionApplicationModal = ({ isOpen, onClose, triggerToast, initialSubject }) => {
  const [form, setForm] = useState({ name: '', contact: '', subject: 'Basic+AI (Prompt Engn)' });
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success'

  useEffect(() => {
    if (isOpen) {
      let matchedSubject = ADMISSION_SUBJECTS[0];
      if (initialSubject && typeof initialSubject === 'string') {
        const found = ADMISSION_SUBJECTS.find(s => 
          s.toLowerCase().startsWith(initialSubject.toLowerCase()) || 
          initialSubject.toLowerCase().startsWith(s.toLowerCase())
        );
        if (found) {
          matchedSubject = found;
        }
      }
      setForm(prev => ({
        ...prev,
        subject: matchedSubject
      }));
    }
  }, [isOpen, initialSubject]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('submitting');

    setTimeout(() => {
      setStatus('success');

      setTimeout(() => {
        const text = `Hello, I would like to apply for admission.%0AName: ${form.name}%0AContact: ${form.contact}%0ASubject: ${form.subject}`;
        triggerToast("Opening WhatsApp to complete your application...");
        window.open(`https://wa.me/919674035542?text=${text}`, '_blank');
        window.open(`https://wa.me/916290935898?text=${text}`, '_blank');
        onClose();
        setForm({ name: '', contact: '', subject: 'Basic+AI (Prompt Engn)' });
        setStatus('idle');
      }, 1000);
    }, 1500);
  };

  const handleClose = () => {
    if (status === 'idle') {
      onClose();
    }
  };

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring', 
        stiffness: 260, 
        damping: 24 
      } 
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Apply for Admission">
      <AnimatePresence mode="wait">
        <motion.div
          key="form-container"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.p 
            variants={itemVariants} 
            style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px', lineHeight: 1.6 }}
          >
            Fill in your details and we&apos;ll reach out on WhatsApp to confirm your seat.
          </motion.p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <motion.div variants={itemVariants}>
              <label className="form-label">Name</label>
              <input
                required
                disabled={status !== 'idle'}
                className="form-input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Enter your full name"
                style={{
                  transition: 'var(--transition)'
                }}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <label className="form-label">Contact Number</label>
              <input
                required
                type="tel"
                disabled={status !== 'idle'}
                className="form-input"
                value={form.contact}
                onChange={e => setForm({ ...form, contact: e.target.value })}
                placeholder="e.g. +91 9876543210"
                style={{
                  transition: 'var(--transition)'
                }}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <label className="form-label">Subject of Interest</label>
              <select
                disabled={status !== 'idle'}
                className="form-input"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                style={{
                  transition: 'var(--transition)'
                }}
              >
                {ADMISSION_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </motion.div>

            <motion.div variants={itemVariants}>
              {status === 'idle' && (
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '4px' }}
                >
                  Submit Application
                </button>
              )}
              {status === 'submitting' && (
                <button 
                  type="button" 
                  disabled
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    fontSize: '1rem', 
                    marginTop: '4px',
                    cursor: 'not-allowed',
                    opacity: 0.85,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: 'flex' }}>
                    <Loader2 size={18} />
                  </motion.div>
                  Processing Application...
                </button>
              )}
              {status === 'success' && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="btn" 
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    fontSize: '1rem', 
                    marginTop: '4px',
                    background: 'var(--success)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 24px rgba(102, 187, 106, 0.25)'
                  }}
                >
                  <CheckCircle size={18} />
                  Seat Reserved! Redirecting...
                </motion.div>
              )}
            </motion.div>
          </form>
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
};

/* ── NAVBAR ────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Courses', href: '#courses' },
  { label: 'Faculty & Team', to: '/staff' },
  { label: 'Our Stories', href: '#stories' },
  { label: 'Contact', href: '#contact' },
];

const Navbar = ({ onOpenAdmission, isDarkMode, toggleTheme }) => {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          padding: scrolled ? '12px 0' : '20px 0',
          background: scrolled || menuOpen ? 'var(--navbar-bg)' : 'transparent',
          backdropFilter: scrolled || menuOpen ? 'blur(16px)' : 'none',
          borderBottom: scrolled || menuOpen ? '1px solid var(--navbar-border)' : 'none',
          transition: 'all 0.35s ease',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <a href="#" onClick={closeMenu} style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 'clamp(1.15rem, 4vw, 1.5rem)', letterSpacing: '-0.04em', color: 'var(--dark)', flexShrink: 0 }}>
            COMP<span style={{ color: 'var(--primary)' }}>UTION</span>
          </a>
          <div className="hide-mobile" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {NAV_LINKS.map(item => (
              item.to ? (
                <Link key={item.label} to={item.to}
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem', transition: 'var(--transition)' }}
                  onMouseEnter={e => e.target.style.color = 'var(--dark)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                >{item.label}</Link>
              ) : (
                <a key={item.label} href={item.href}
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem', transition: 'var(--transition)' }}
                  onMouseEnter={e => e.target.style.color = 'var(--dark)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
                >{item.label}</a>
              )
            ))}
          </div>
          <div className="hide-mobile" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={toggleTheme}
              style={{
                padding: '8px',
                borderRadius: '50%',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)',
                background: 'var(--surface)',
                border: '1px solid var(--border)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/login" className="btn btn-ghost" style={{ padding: '10px 20px' }}>Login</Link>
            <button type="button" className="btn btn-primary" style={{ padding: '10px 20px' }} onClick={onOpenAdmission}>Enroll Now</button>
          </div>
          <div className="hide-desktop hide-desktop--flex" style={{ gap: '8px', alignItems: 'center' }}>
            <button
              onClick={toggleTheme}
              style={{
                padding: '8px',
                borderRadius: '50%',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)',
                background: 'var(--surface)',
                border: '1px solid var(--border)'
              }}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{ padding: '10px', borderRadius: 'var(--radius-sm)', color: 'var(--dark)', flexShrink: 0 }}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="mobile-nav-overlay hide-desktop hide-desktop--block"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeMenu}
            />
            <motion.div
              className="mobile-nav-drawer hide-desktop hide-desktop--flex"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {NAV_LINKS.map(item => (
                item.to ? (
                  <Link key={item.label} to={item.to} onClick={closeMenu}>{item.label}</Link>
                ) : (
                  <a key={item.label} href={item.href} onClick={closeMenu}>{item.label}</a>
                )
              ))}
              <div className="divider" style={{ margin: '12px 0' }} />
              <button
                onClick={() => { toggleTheme(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  width: '100%',
                  background: 'var(--surface)'
                }}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <div className="divider" style={{ margin: '12px 0' }} />
              <Link to="/login" className="btn btn-ghost" style={{ width: '100%' }} onClick={closeMenu}>Login</Link>
              <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => { closeMenu(); onOpenAdmission(); }}>Enroll Now</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

/* ── HERO ──────────────────────────────────────────── */
const Hero = ({ onOpenAdmission }) => (
  <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '100px' }}>
    <div className="container grid-hero">
      {/* Left */}
      <div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <span className="badge badge-primary" style={{ marginBottom: '24px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
            Kolkata's Premier CS Institute
          </span>
        </motion.div>
        <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
          style={{ marginBottom: '24px', fontWeight: 900 }}>
          Learn Computer Science{' '}
          <span className="gradient-text">Beyond Textbooks</span>
        </motion.h1>
        <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
          style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '40px', lineHeight: 1.7, maxWidth: '480px' }}>
          Academic excellence meets practical programming. From Class XI CS to B.Tech support — mentorship that actually works.
        </motion.p>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}
          style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-lg" onClick={onOpenAdmission}>
            Enroll Now <ArrowRight size={20} />
          </button>
          <Link to="/login" className="btn btn-secondary btn-lg">Login</Link>
          <a href="#courses" className="btn btn-ghost btn-lg">Explore Courses</a>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
          className="grid-stats-row" style={{ marginTop: '48px' }}>
          {[['500+', 'Students Trained'], ['95%', 'Success Rate'], ['5+', 'Years Experience']].map(([val, label]) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '2rem', color: 'var(--dark)' }}>{val}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right — Code Visual */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="hero-visual-wrap"
        style={{ position: 'relative' }}
      >
        {/* Main editor card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
          {/* Editor topbar */}
          <div style={{ background: '#1A1D24', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {['#EF5350','#FFA726','#66BB6A'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
            <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>main.py — Compution</span>
          </div>
          {/* Code content */}
          <div style={{ background: '#1E1E2E', padding: '28px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 2 }}>
            {[
              { color: '#FF79C6', text: 'def ' },
              { color: '#50FA7B', text: 'solve_problem' },
              { color: '#F8F8F2', text: '(input_data):' },
            ].map((t, i) => <span key={i} style={{ color: t.color }}>{t.text}</span>)}
            <br />
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>{'    '}# Think. Code. Conquer.</span>
            <br />
            <span style={{ color: '#BD93F9' }}>{'    '}result</span>
            <span style={{ color: '#F8F8F2' }}> = []</span>
            <br />
            <span style={{ color: '#FF79C6' }}>{'    '}for </span>
            <span style={{ color: '#BD93F9' }}>item </span>
            <span style={{ color: '#FF79C6' }}>in </span>
            <span style={{ color: '#F8F8F2' }}>input_data:</span>
            <br />
            <span style={{ color: '#F8F8F2' }}>{'        '}result.append(item </span>
            <span style={{ color: '#FF79C6' }}>* </span>
            <span style={{ color: '#F1FA8C' }}>2</span>
            <span style={{ color: '#F8F8F2' }}>)</span>
            <br />
            <span style={{ color: '#FF79C6' }}>{'    '}return </span>
            <span style={{ color: '#BD93F9' }}>result</span>
            <br /><br />
            {/* blinking cursor */}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{ background: '#50FA7B', width: 10, height: 18, display: 'inline-block', verticalAlign: 'middle' }}
            />
          </div>
        </div>

        {/* Floating achievement card */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          className="card hero-float-card"
          style={{
            position: 'absolute', bottom: '-24px', left: '-32px',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '14px',
            width: '220px'
          }}
        >
          <div className="icon-box icon-box-sm" style={{ background: 'rgba(102,187,106,0.1)' }}>
            <Trophy size={20} color="var(--success)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Python Badge</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Intermediate unlocked!</div>
          </div>
        </motion.div>

        {/* Floating streak card */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.5 }}
          className="card hero-float-card"
          style={{
            position: 'absolute', top: '-20px', right: '-24px',
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: '12px',
            width: '180px'
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🔥</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>7 Day Streak</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Keep going!</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

/* ── WHY COMPUTION ─────────────────────────────────── */
const WhyCompution = () => {
  const features = [
    { icon: <Users size={24} />, color: '#536DFE', bg: 'rgba(83,109,254,0.1)', title: 'Small Batch Sizes', desc: 'Max 15 students per batch. Every student gets personal attention and mentoring.' },
    { icon: <Code size={24} />, color: '#66BB6A', bg: 'rgba(102,187,106,0.1)', title: 'Project-Based Learning', desc: 'Build real applications from day one. Theory meets hands-on coding practice.' },
    { icon: <BookOpen size={24} />, color: '#FFA726', bg: 'rgba(255,167,38,0.1)', title: 'Academic + Practical', desc: 'Aligned with CBSE & University syllabi while teaching industry-relevant skills.' },
    { icon: <Target size={24} />, color: '#7EC8FF', bg: 'rgba(126,200,255,0.15)', title: 'Exam-Focused Strategy', desc: 'Score-boosting techniques for board exams, semester tests, and competitive coding.' },
    { icon: <TrendingUp size={24} />, color: '#FF79C6', bg: 'rgba(255,121,198,0.1)', title: 'Progress Tracking', desc: 'Digital dashboard to track attendance, assignments, and coding milestones.' },
    { icon: <Award size={24} />, color: '#BD93F9', bg: 'rgba(189,147,249,0.1)', title: 'Career Guidance', desc: 'From DSA to interview prep — we prepare students beyond the classroom.' },
  ];

  return (
    <section id="about" className="section" style={{ background: 'var(--white)' }}>
      <div className="container">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ maxWidth: '560px', marginBottom: '64px' }}>
          <span className="badge badge-primary" style={{ marginBottom: '16px' }}>Why Choose Us</span>
          <h2>Built for students who want to <span className="gradient-text">actually learn</span></h2>
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            Not a tuition center. Not a generic coaching class. A focused engineering mindset from day one.
          </p>
        </motion.div>

        <div className="grid-auto-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show"
              viewport={{ once: true }} custom={i * 0.5}
              className="card card-p"
            >
              <div className="icon-box icon-box-md" style={{ background: f.bg, marginBottom: '20px' }}>
                <span style={{ color: f.color }}>{f.icon}</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '10px' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── COURSES SECTION ───────────────────────────────── */
const CoursesSection = ({ onOpenAdmission }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', 'Academic', 'Programming'];

  const courses = [
    { tag: 'Programming', title: 'Basic+AI (Prompt Engn)', desc: 'Master computing basics along with Prompt Engineering and AI tools to supercharge your learning and productivity.', color: '#7C4DFF', icon: '🤖', duration: '2 Months', students: '0/15', isNew: true },
    { tag: 'Academic', title: 'School Syllabus (Classes 2 to 5)', desc: 'Foundation computer classes covering school curricula, basics of typing, scratch programming, and digital literacy.', color: '#FF7043', icon: '🎒', duration: 'Ongoing', students: '0/15' },
    { tag: 'Academic', title: 'School Syllabus (Classes 6 to 10)', desc: 'Comprehensive school syllabus support for computer applications, logic building, block coding, and basic programming concepts.', color: '#FFA726', icon: '🏫', duration: 'Ongoing', students: '0/15' },
    { tag: 'Academic', title: 'Class XI & XII Computer Science', desc: 'Board exam mastery & complete syllabus — programming fundamentals, SQL, networking, and full-stack projects in Python, C++ & Java.', color: '#536DFE', icon: '📘', duration: '1-2 Years', students: '22/30' },
    { tag: 'Academic', title: 'Class XI & XII Computer Application', desc: 'Applied computing, database management, HTML/CSS/JS, and real-world software development skills scaled to school standards.', color: '#0097A7', icon: '📙', duration: '1-2 Years', students: '18/30' },
    { tag: 'Programming', title: 'Basic Coding', desc: 'Begin your coding journey: C, C++, Java, Python, and AI/ML foundations.', color: '#66BB6A', icon: '💻', duration: '3 Months', students: '0/15' },
    { tag: 'Programming', title: 'Advance Coding', desc: 'Master one language of your choice: C, C++, Java, or Python to build robust software.', color: '#ED8B00', icon: '🚀', duration: '4 Months', students: '0/15' },
    { tag: 'Programming', title: 'Data Structures & Algorithms', desc: 'Arrays, trees, graphs, sorting — crack coding interviews and olympiads.', color: '#43A047', icon: '🧩', duration: '4 Months', students: '13/15' },
  ];

  const filtered = activeFilter === 'All' ? courses : courses.filter(c => c.tag === activeFilter);

  return (
    <section id="courses" className="section" style={{ background: 'var(--bg)' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', flexWrap: 'wrap', gap: '24px' }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <span className="badge badge-primary" style={{ marginBottom: '16px' }}>Our Programs</span>
            <h2>Courses <span className="gradient-text">designed to take you far</span></h2>
          </motion.div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {filters.map(f => (
              <button key={f} className={`chip ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
            ))}
          </div>
        </div>

        <div className="grid-auto-cards">
          {filtered.map((course, i) => (
            <motion.div key={course.title} layout
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="card"
              style={{ overflow: 'hidden', cursor: 'pointer' }}
            >
              {/* Card top band */}
              <div style={{ height: '6px', background: course.color }} />
              <div className="card-p">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span style={{ fontSize: '2rem' }}>{course.icon}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {course.isNew && (
                      <span className="badge badge-warning" style={{ animation: 'pulseHealth 2s infinite' }}>NEW</span>
                    )}
                    <span className="badge badge-primary">{course.tag}</span>
                  </div>
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>{course.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '20px' }}>{course.desc}</p>
                <div className="divider" style={{ marginBottom: '16px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {course.duration}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} /> {course.students}
                    </span>
                  </div>
                  {course.isNew ? (
                    <button
                      onClick={() => onOpenAdmission(course.title)}
                      style={{
                        background: `linear-gradient(135deg, ${course.color} 0%, #7C4DFF 100%)`,
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        boxShadow: '0 4px 12px rgba(124, 77, 255, 0.35)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      className="pulse"
                    >
                      Admission
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenAdmission(course.title)}
                      style={{ color: course.color, fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Admission
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── LEARNING JOURNEY ──────────────────────────────── */
const LearningJourney = () => {
  const steps = [
    { num: '01', title: 'Learn', desc: 'Concepts explained clearly with real-world examples', color: '#536DFE', icon: <BookOpen size={24} /> },
    { num: '02', title: 'Practice', desc: 'Coding exercises and problem sets after every session', color: '#7EC8FF', icon: <Terminal size={24} /> },
    { num: '03', title: 'Build Projects', desc: 'Apply your skills on actual mini-projects', color: '#66BB6A', icon: <Code size={24} /> },
    { num: '04', title: 'Get Confident', desc: 'Mock tests, doubt sessions, and mentor feedback', color: '#FFA726', icon: <Zap size={24} /> },
    { num: '05', title: 'Results', desc: 'Ace exams, crack interviews, and level up your career', color: '#BD93F9', icon: <Trophy size={24} /> },
  ];

  return (
    <section className="section" style={{ background: 'var(--white)' }}>
      <div className="container">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '72px' }}>
          <span className="badge badge-primary" style={{ marginBottom: '16px' }}>Your Path</span>
          <h2>The Compution Learning Journey</h2>
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '1.1rem' }}>A proven 5-step process to transform a student into a confident programmer.</p>
        </motion.div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '0', overflowX: 'auto', paddingBottom: '8px' }}>
          {/* connecting line */}
          <div style={{
            position: 'absolute', top: '40px', left: '80px', right: '80px', height: '2px',
            background: 'linear-gradient(to right, #536DFE, #7EC8FF, #66BB6A, #FFA726, #BD93F9)',
            zIndex: 0
          }} />

          {steps.map((step, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show"
              viewport={{ once: true }} custom={i * 0.8}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 16px', position: 'relative', zIndex: 1, minWidth: '160px' }}
            >
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: step.color, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px', boxShadow: `0 8px 24px ${step.color}40`,
                border: '4px solid var(--white)'
              }}>
                {step.icon}
              </div>
              <div style={{ fontFamily: 'var(--font-support)', fontWeight: 900, fontSize: '0.75rem', color: step.color, letterSpacing: '0.08em', marginBottom: '8px' }}>STEP {step.num}</div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>{step.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── STUDENT STORIES ────────────────────────────────── */
const VideoPlayer = ({ src, duration, name }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = React.useRef(null);

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setHasError(false);
      }).catch((err) => {
        console.warn("Video play failed or file not found:", err);
        setHasError(true);
      });
    }
  };

  const handleVideoError = () => {
    setHasError(true);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16/9',
      background: 'linear-gradient(135deg, #1e1e38 0%, #0c0c1e 100%)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.12)',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px'
    }}>
      <video
        ref={videoRef}
        src={src}
        onError={handleVideoError}
        onClick={handlePlayClick}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: isPlaying && !hasError ? 'block' : 'none'
        }}
        controls={isPlaying && !hasError}
      />

      {(!isPlaying || hasError) && (
        <div 
          onClick={handlePlayClick}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px',
            cursor: 'pointer',
            background: 'radial-gradient(circle at center, rgba(30,30,60,0.25) 0%, rgba(10,10,25,0.75) 100%)',
            zIndex: 2
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.08)',
              padding: '4px 8px',
              borderRadius: '100px',
              backdropFilter: 'blur(4px)'
            }}>
              Student Story
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'white',
              background: 'rgba(0,0,0,0.6)',
              padding: '3px 8px',
              borderRadius: '6px'
            }}>
              ⏱️ {duration}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <motion.div
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: 48, height: 48,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                color: 'white'
              }}
            >
              <Play size={20} fill="white" style={{ marginLeft: 2 }} />
            </motion.div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              Watch {name.split(' ')[0]}'s Experience
            </span>
            {hasError && (
              <span style={{ fontSize: '0.65rem', color: '#ff6b6b', fontWeight: 600, background: 'rgba(255,0,0,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                Video Pending
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StudentStories = () => {
  const students = [
    { 
      name: 'Ritika Sharma', 
      batch: 'Class XII CS, 2024', 
      score: '98/100 in CS Board', 
      quote: 'Compution taught me how to actually think through problems. I scored 98 in my board CS paper — something I never thought was possible.', 
      avatar: 'RS',
      videoUrl: '/student stories/story1.mp4',
      duration: '1:45 mins'
    },
    { 
      name: 'Aditya Bose', 
      batch: 'Python + DSA, 2024', 
      score: 'SWE Intern at Startup', 
      quote: 'Within 4 months, I went from not knowing arrays to cracking a startup internship interview. The DSA track was a game changer.', 
      avatar: 'AB',
      videoUrl: '/student stories/story2.mp4',
      duration: '1:20 mins'
    },
    { 
      name: 'Priya Mukherjee', 
      batch: 'BCA Semester Support', 
      score: 'Topped her semester', 
      quote: 'University C++ concepts felt impossible until I joined Compution. Cleared all papers with distinction.', 
      avatar: 'PM',
      videoUrl: '/student stories/story3.mp4',
      duration: '1:10 mins'
    },
  ];

  return (
    <section id="stories" className="section" style={{ background: 'var(--bg)' }}>
      <div className="container">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="badge badge-primary" style={{ marginBottom: '16px' }}>Student Stories</span>
          <h2>Real students. <span className="gradient-text">Real results.</span></h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' }}>
          {students.map((s, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show"
              viewport={{ once: true }} custom={i * 0.8} className="card card-p"
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <VideoPlayer src={s.videoUrl} duration={s.duration} name={s.name} />

              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                {[...Array(5)].map((_, j) => <Star key={j} size={16} fill="#FFA726" color="#FFA726" />)}
              </div>
              <p style={{ color: 'var(--text-main)', lineHeight: 1.75, marginBottom: '8px', fontStyle: 'italic', fontSize: '0.95rem' }}>"{s.quote}"</p>
              <div className="divider" style={{ marginTop: 'auto', marginBottom: '16px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: '0.9rem'
                }}>{s.avatar}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.batch}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>{s.score}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};


/* ── NEW TESTIMONIALS (PRIORITY 4) ──────────────────── */
const DEFAULT_TESTIMONIALS = [
  { name: 'Soham Dutta', course: 'Class XII CS', review: 'Hribhu sir explained memory structures and pointer references in C++ so clearly. The mock tests helped me score a 99 in boards!', faculty: 'Hribhu Tapadar' },
  { name: 'Ananya Sen', course: 'Python Mastery', review: 'Building projects like the Python CLI game made me fall in love with coding. Compution feels like a real programming lab.', faculty: 'Sharmistha Ghosh' },
  { name: 'Rohit Banerjee', course: 'Data Structures & Algorithms', review: 'The whiteboard coding sessions and sorting algorithm walkthroughs prepared me completely for my technical round.', faculty: 'Hribhu Tapadar' }
];

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  
  useEffect(() => {
    if (!db) {
      console.error("Firestore not initialized");
      setTestimonials(DEFAULT_TESTIMONIALS);
      return;
    }
    
    let unsub = () => {};
    try {
      unsub = onSnapshot(collection(db, 'testimonials'), (snap) => {
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setTestimonials(list);
        } else {
          setTestimonials(DEFAULT_TESTIMONIALS);
        }
      }, (err) => {
        console.error("Testimonials listener error:", err);
        setTestimonials(DEFAULT_TESTIMONIALS);
      });
    } catch (err) {
      console.error("Home: Testimonials - Failed to create Firestore listener", err);
      setTestimonials(DEFAULT_TESTIMONIALS);
    }
    return () => unsub();
  }, []);

  return (
    <section id="testimonials" className="section" style={{ background: 'var(--surface-secondary)' }}>
      <div className="container">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="badge badge-primary" style={{ marginBottom: '16px' }}>Student Reviews</span>
          <h2>What our students say <span className="gradient-text">about Compution</span></h2>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.98rem' }}>Authentic feedback from school, college, and professional learners.</p>
        </motion.div>

        {/* Carousel for mobile / grid for desktop */}
        <div className="testimonials-display-layout">
          {testimonials.map((t, i) => (
            <div key={i} className="card card-p testimonial-card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)' }}>
              {/* Avatar Placeholder */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.95rem'
                }}>
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t.name}</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t.course}</span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', flex: 1 }}>
                "{t.review}"
              </p>

              {t.faculty && (
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                  Mentor: {t.faculty}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        .testimonials-display-layout {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 800px) {
          .testimonials-display-layout {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding-bottom: 12px;
            gap: 16px;
            scrollbar-width: none;
          }
          .testimonial-card-premium {
            flex: 0 0 280px;
            scroll-snap-align: start;
          }
        }
      `}</style>
    </section>
  );
};


/* ── STORIES DATA ─────────────────────────────────── */
const STORIES_DATA = [
  {
    category: 'Board Toppers',
    title: 'Deepanjan Saha',
    subtitle: '99/100 in ISC Computer Science (2024)',
    desc: 'Deepanjan (Class XII, La Martiniere for Boys) mastered Java Object-Oriented Programming, recursive algorithms, and complex stack data structures. Through our interactive problem-solving method, he built the confidence to ace his board paper.',
    quote: 'Compution helped me break down complex Java theory into simple logical parts. The class tests and doubt-clearing sessions were invaluable.',
    badge: 'ISC Topper',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600'
  },
  {
    category: 'Board Toppers',
    title: 'Sagnik Sen',
    subtitle: '98/100 in CBSE XII Computer Science (2024)',
    desc: 'Sagnik (Class XII, Delhi Public School, Ruby Park) excelled in his SQL database design and Python programming segments. He built and presented a full library management database system as part of his CBSE practical assessment.',
    quote: 'The practical hands-on approach and direct guidance from tape-by-tape debugging in SQL made all the difference in my scores.',
    badge: 'CBSE Topper',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600'
  },
  {
    category: 'Lab Sessions',
    title: 'Python Automation Bootcamp',
    subtitle: 'Weekend Coding Intensive (October 2024)',
    desc: 'A dedicated weekend bootcamp where students collaborated in our computer laboratory. Over 12 hours of intensive coding, students built CLI tools, web scrapers, and local automation scripts in Python.',
    quote: 'Seeing the script run and fetch data live from a website was like magic. It is so different from writing code on a sheet of paper!',
    badge: 'Python Lab',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600'
  },
  {
    category: 'Lab Sessions',
    title: 'Class XI Logic Building',
    subtitle: 'Kickstarting Programming Journeys (July 2024)',
    desc: 'Our introductory lab session designed to help Class XI students shift from syntax memorization to structural logic. Students dry-run loops, understand array indices, and write basic arithmetic games.',
    quote: 'Learning how to break down a problem step-by-step helped me overcome my fear of programming in school.',
    badge: 'Logic Lab',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=600'
  },
  {
    category: 'Projects',
    title: 'Rohan Banerjee',
    subtitle: 'BCA 3rd Sem (Heritage Academy) Topper',
    desc: 'Rohan developed a Java GUI billing dashboard for small businesses. His project featured interactive data tables, SQLite database integration, and receipt generation, earning him a top grade in his semester.',
    quote: 'At Compution, I learned how to structure real software. The B.Sc/BCA semester support classes gave me both theory and real-world coding skills.',
    badge: 'Java Project',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600'
  },
  {
    category: 'Projects',
    title: 'Shreya Mitra',
    subtitle: 'B.Tech CSE, Full-Stack Project',
    desc: 'Shreya created a complete student tracker application using React and Firestore database. The application enables tutors to log student progress, marks, and view analytics charts in real time.',
    quote: 'Building a real React + Firebase app from scratch taught me Git version control, state management, and async database APIs.',
    badge: 'React Project',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600'
  }
];

/* ── OUR STORIES SECTION ───────────────────────────── */
const OurStories = ({ onOpenAdmission }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', 'Board Toppers', 'Lab Sessions', 'Projects'];

  const filteredStories = activeFilter === 'All'
    ? STORIES_DATA
    : STORIES_DATA.filter(s => s.category === activeFilter);

  return (
    <section id="stories" className="section" style={{ background: 'var(--white)' }}>
      <div className="container">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <span className="badge badge-primary" style={{ marginBottom: '16px' }}>Student Success</span>
          <h2>Our stories <span className="gradient-text">from the classroom & lab</span></h2>
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '16px auto 0' }}>
            Discover the achievements, practical workshops, and code projects created by our students at Compution Kolkata.
          </p>
        </motion.div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '40px' }}>
          {filters.map(f => (
            <button
              key={f}
              className={`chip ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '10px 20px',
                borderRadius: '100px',
                fontWeight: 600,
                fontSize: '0.9rem',
                border: '1.5px solid rgba(83,109,254,0.15)',
                cursor: 'pointer',
                background: activeFilter === f ? 'var(--primary)' : 'var(--white)',
                color: activeFilter === f ? 'white' : 'var(--text-main)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid of stories */}
        <motion.div
          layout
          className="grid-auto-cards"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '32px',
            marginBottom: '64px'
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredStories.map((story) => (
              <motion.div
                layout
                key={story.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  height: '100%',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Image Wrap */}
                <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                  <img
                    src={story.image}
                    alt={story.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease'
                    }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  />
                  <span
                    className="badge"
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(8px)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      border: '1px solid rgba(83,109,254,0.2)'
                    }}
                  >
                    {story.badge}
                  </span>
                </div>

                {/* Card Body */}
                <div className="card-p" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '24px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', tracking: '0.05em', marginBottom: '6px' }}>
                    {story.category}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '4px', fontWeight: 800 }}>{story.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '14px' }}>{story.subtitle}</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '20px', flex: 1 }}>
                    {story.desc}
                  </p>

                  <div style={{ background: 'var(--bg)', padding: '14px 18px', borderRadius: '12px', borderLeft: '3px solid var(--primary)', fontStyle: 'italic', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    &ldquo;{story.quote}&rdquo;
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Admissions CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="admissions-cta"
        >
          <div>
            <h2 style={{ color: 'white', marginBottom: '16px', fontSize: '2.25rem' }}>Start your story with us</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '480px', lineHeight: 1.7 }}>
              New batches starting soon. Limited seats. Walk in or call us to secure your place.
            </p>
            <div style={{ marginTop: '28px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {[
                { icon: <MapPin size={16} />, text: '20, J.K. Mitra Road, Kolkata – 700037' },
                { icon: <Phone size={16} />, text: '+91-9674035542', href: 'tel:+919674035542' },
                { icon: <Mail size={16} />, text: 'compution.kolkata@gmail.com', href: 'mailto:compution.kolkata@gmail.com' },
              ].map((item, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
                  {item.href ? (
                    <a href={item.href} style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}
                       onMouseEnter={e => e.target.style.color = 'white'}
                       onMouseLeave={e => e.target.style.color = 'inherit'}>
                      {item.text}
                    </a>
                  ) : (
                    item.text
                  )}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '220px' }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={onOpenAdmission}>Apply for Admission</button>
            <Link to="/login" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '14px 28px', borderRadius: 'var(--radius-lg)', fontWeight: 700, textAlign: 'center' }}>
              Login
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ── FOOTER ────────────────────────────────────────── */
const Footer = ({ onOpenAdmission }) => (
  <footer style={{ background: 'var(--footer-bg)', color: 'rgba(255,255,255,0.6)', padding: '60px 0 40px' }}>
    <div className="container">
      <div className="grid-footer" style={{ marginBottom: '48px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', color: 'white', marginBottom: '16px', letterSpacing: '-0.04em' }}>
            COMP<span style={{ color: 'var(--accent)' }}>UTION</span>
          </div>
          <p style={{ lineHeight: 1.8, maxWidth: '300px', fontSize: '0.9rem' }}>
            Kolkata's focused computer science institute. Academic support meets real programming skills.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            <MapPin size={14} /> 20, J.K. Mitra Road, Kolkata – 700037
          </div>
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: 700, marginBottom: '20px' }}>Programs</div>
          {['Class XI CS', 'Class XII CS', 'Python', 'Java', 'C & C++', 'Web Dev', 'DSA', 'B.Sc/BCA Support'].map(item => (
            <div key={item} style={{ marginBottom: '10px', fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition)' }}
              onMouseEnter={e => e.target.style.color = 'white'}
              onMouseLeave={e => e.target.style.color = ''}
            >{item}</div>
          ))}
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: 700, marginBottom: '20px' }}>Quick Links</div>
          {[
            { label: 'About Us', href: '#about' },
            { label: 'Faculty', href: '#about' },
            { label: 'Admissions', action: onOpenAdmission },
            { label: 'Login', href: '/login', isRoute: true },
            { label: 'Contact', href: '#admissions' },
          ].map(item => (
            item.action ? (
              <button key={item.label} type="button" onClick={item.action}
                style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition)', background: 'none', border: 'none', color: 'inherit', padding: 0, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                onMouseLeave={e => e.currentTarget.style.color = ''}
              >{item.label}</button>
            ) : item.isRoute ? (
              <Link key={item.label} to={item.href} style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', transition: 'var(--transition)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                onMouseLeave={e => e.currentTarget.style.color = ''}
              >{item.label}</Link>
            ) : (
              <a key={item.label} href={item.href} style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', transition: 'var(--transition)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                onMouseLeave={e => e.currentTarget.style.color = ''}
              >{item.label}</a>
            )
          ))}
        </div>
      </div>
      <div className="divider" style={{ background: 'rgba(255,255,255,0.08)', marginBottom: '28px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', flexWrap: 'wrap', gap: '12px' }}>
        <span>© 2025 Compution. All rights reserved.</span>
        <span style={{ color: 'var(--accent)' }}>Learn. Code. Grow.</span>
      </div>
    </div>
  </footer>
);

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
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)',
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
        <CheckCircle size={14} />
      </div>
      <span>{message}</span>
    </motion.div>
  );
};
/* ── CONTACT SECTION ────────────────────────────────── */
const ContactSection = ({ onOpenAdmission }) => {
  return (
    <section id="contact" className="section" style={{ background: 'var(--white)', padding: '60px 0' }}>
      <div className="container">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          style={{
            background: '#070a13',
            borderRadius: '24px',
            padding: '48px 56px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '40px',
            flexWrap: 'wrap',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            width: '100%'
          }}
        >
          <div style={{ flex: '1 1 500px' }}>
            <h2 style={{ color: 'white', marginBottom: '12px', fontSize: '2.25rem', fontWeight: 800 }}>
              Start your story with us
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', maxWidth: '520px', lineHeight: 1.6, marginBottom: '24px' }}>
              New batches starting soon. Limited seats. Walk in or call us to secure your place.
            </p>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { icon: <MapPin size={16} />, text: '20, J.K. Mitra Road, Kolkata - 700037' },
                { icon: <Phone size={16} />, text: '+91-9674035542', href: 'tel:+919674035542' },
                { icon: <Mail size={16} />, text: 'compution.kolkata@gmail.com', href: 'mailto:compution.kolkata@gmail.com' },
              ].map((item, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 500 }}>
                  <span style={{ color: '#536df5' }}>{item.icon}</span>
                  {item.href ? (
                    <a href={item.href} style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}
                       onMouseEnter={e => e.target.style.color = 'white'}
                       onMouseLeave={e => e.target.style.color = 'inherit'}>
                      {item.text}
                    </a>
                  ) : (
                    item.text
                  )}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '220px', width: '100%', maxWidth: '240px' }}>
            <button 
              type="button" 
              onClick={onOpenAdmission}
              style={{ 
                background: '#4c6ef5', 
                color: 'white', 
                padding: '14px 28px', 
                borderRadius: '12px', 
                fontWeight: 700, 
                fontSize: '0.95rem',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(76, 110, 245, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.backgroundColor = '#3b5bdb';
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'none';
                e.target.style.backgroundColor = '#4c6ef5';
              }}
            >
              Apply for Admission
            </button>
            <Link 
              to="/login" 
              style={{ 
                background: '#1c1f26', 
                color: 'white', 
                padding: '14px 28px', 
                borderRadius: '12px', 
                fontWeight: 700, 
                fontSize: '0.95rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                textDecoration: 'none'
              }}
              onMouseEnter={e => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.backgroundColor = '#252934';
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'none';
                e.target.style.backgroundColor = '#1c1f26';
              }}
            >
              Login
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ── PAGE EXPORT ───────────────────────────────────── */
const Home = () => {
  const { user } = useAuth();
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [toast, setToast] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let hasSavedPref = false;
    let savedVal = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.indexOf('isDarkMode_') === 0) {
        hasSavedPref = true;
        if (localStorage.getItem(key) === 'true') {
          savedVal = true;
        }
      }
    }
    return hasSavedPref ? savedVal : systemDark;
  });

  const toggleTheme = () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    const key = user ? `isDarkMode_${user.uid}` : 'isDarkMode_public';
    localStorage.setItem(key, String(nextVal));
    document.documentElement.classList.toggle('dark-theme', nextVal);
    document.body.classList.toggle('dark-theme', nextVal);
    window.dispatchEvent(new Event('themechange'));
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark-theme') || document.body.classList.contains('dark-theme');
      if (isDark !== isDarkMode) {
        setIsDarkMode(isDark);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [isDarkMode]);

  const openAdmission = (courseName = '') => {
    const course = typeof courseName === 'string' ? courseName : '';
    setSelectedCourse(course);
    setAdmissionOpen(true);
  };
  const closeAdmission = () => setAdmissionOpen(false);

  // Auto-open enquire form after 4 minutes (240,000 ms) for logged-out users
  useEffect(() => {
    if (user || admissionOpen) return;

    const timer = setTimeout(() => {
      setAdmissionOpen(true);
    }, 4 * 60 * 1000); // 4 minutes

    return () => clearTimeout(timer);
  }, [user, admissionOpen]);

  return (
    <>
      <Navbar onOpenAdmission={openAdmission} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <Hero onOpenAdmission={openAdmission} />
      <WhyCompution />
      <CoursesSection onOpenAdmission={openAdmission} />
      <LearningJourney />
      <StudentStories />
      <Testimonials />
      <ContactSection onOpenAdmission={openAdmission} />
      <Footer onOpenAdmission={openAdmission} />
      
      <AdmissionApplicationModal 
        isOpen={admissionOpen} 
        onClose={closeAdmission} 
        triggerToast={setToast}
        initialSubject={selectedCourse}
      />
      <LeadCaptureSystem />

      <AnimatePresence>
        {toast && (
          <Toast message={toast} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default Home;
