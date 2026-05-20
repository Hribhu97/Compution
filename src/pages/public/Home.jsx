import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BookOpen, Terminal, Code, Trophy, Users, Clock,
  ArrowRight, CheckCircle, Star, ChevronRight,
  Zap, Target, TrendingUp, Award, MapPin, Phone, Mail
} from 'lucide-react';
import Modal from '../../components/Modal';

/* ── FADE IN VARIANTS ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }
  })
};

/* ── NAVBAR ────────────────────────────────────────── */
const Navbar = () => {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: scrolled ? '12px 0' : '20px 0',
        background: scrolled ? 'rgba(247,246,243,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : 'none',
        transition: 'all 0.35s ease',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.04em', color: 'var(--dark)' }}>
          COMP<span style={{ color: 'var(--primary)' }}>UTION</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {['Courses', 'Faculty', 'Admissions', 'Contact'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem', transition: 'var(--transition)' }}
              onMouseEnter={e => e.target.style.color = 'var(--dark)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            >{item}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/login" className="btn btn-ghost" style={{ padding: '10px 20px' }}>Student Login</Link>
          <a href="#admissions" className="btn btn-primary" style={{ padding: '10px 20px' }}>Enroll Now</a>
        </div>
      </div>
    </motion.nav>
  );
};

/* ── HERO ──────────────────────────────────────────── */
const Hero = () => (
  <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '100px' }}>
    <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
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
          <a href="#admissions" className="btn btn-primary btn-lg">
            Enroll Now <ArrowRight size={20} />
          </a>
          <Link to="/login" className="btn btn-secondary btn-lg">Student Login</Link>
          <a href="#courses" className="btn btn-ghost btn-lg">Explore Courses</a>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}
          style={{ marginTop: '48px', display: 'flex', gap: '40px' }}>
          {[['500+', 'Students Trained'], ['95%', 'Success Rate'], ['10+', 'Years Experience']].map(([val, label]) => (
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
        style={{ position: 'relative' }}
      >
        {/* Main editor card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
          {/* Editor topbar */}
          <div style={{ background: 'var(--dark)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          className="card"
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
          className="card"
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
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
const CoursesSection = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', 'Academic', 'Programming', 'Undergraduate'];

  const courses = [
    { tag: 'Academic', title: 'Class XI Computer Science', desc: 'Complete CBSE syllabus with programming fundamentals in Python and C++.', color: '#536DFE', icon: '📘', duration: '1 Year', students: '12/15' },
    { tag: 'Academic', title: 'Class XII Computer Science', desc: 'Board exam mastery — algorithms, SQL, networking, and full stack project.', color: '#7C4DFF', icon: '📗', duration: '1 Year', students: '10/15' },
    { tag: 'Academic', title: 'Computer Application (XI-XII)', desc: 'Applied computing, databases, and real-world software development skills.', color: '#0097A7', icon: '📙', duration: '1 Year', students: '8/15' },
    { tag: 'Programming', title: 'Python Mastery', desc: 'From syntax to data structures, OOP, file handling, and mini projects.', color: '#3776AB', icon: '🐍', duration: '3 Months', students: '14/15' },
    { tag: 'Programming', title: 'C & C++ Fundamentals', desc: 'Pointers, memory management, OOP concepts and competitive coding basics.', color: '#00599C', icon: '⚡', duration: '3 Months', students: '11/15' },
    { tag: 'Programming', title: 'Java Development', desc: 'OOP deep dive, exception handling, collections, and desktop application.', color: '#ED8B00', icon: '☕', duration: '4 Months', students: '9/15' },
    { tag: 'Programming', title: 'Web Development', desc: 'HTML, CSS, JavaScript — build real websites from scratch to deployment.', color: '#E44D26', icon: '🌐', duration: '3 Months', students: '15/15' },
    { tag: 'Programming', title: 'Data Structures & Algorithms', desc: 'Arrays, trees, graphs, sorting — crack coding interviews and olympiads.', color: '#43A047', icon: '🧩', duration: '4 Months', students: '13/15' },
    { tag: 'Undergraduate', title: 'B.Sc / BCA / B.Tech Support', desc: 'Semester-by-semester guidance for university CS courses and practicals.', color: '#F4511E', icon: '🎓', duration: 'Ongoing', students: '7/15' },
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
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
                  <span className="badge badge-primary">{course.tag}</span>
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
                  <button style={{ color: course.color, fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Details <ChevronRight size={14} />
                  </button>
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

/* ── TESTIMONIALS ──────────────────────────────────── */
const Testimonials = () => {
  const students = [
    { name: 'Ritika Sharma', batch: 'Class XII CS, 2024', score: '98/100 in CS Board', quote: 'Compution taught me how to actually think through problems. I scored 98 in my board CS paper — something I never thought was possible.', avatar: 'RS' },
    { name: 'Aditya Bose', batch: 'Python + DSA, 2024', score: 'SWE Intern at Startup', quote: 'Within 4 months, I went from not knowing arrays to cracking a startup internship interview. The DSA track was a game changer.', avatar: 'AB' },
    { name: 'Priya Mukherjee', batch: 'BCA Semester Support', score: 'Topped her semester', quote: 'University C++ concepts felt impossible until I joined Compution. Cleared all papers with distinction.', avatar: 'PM' },
  ];

  return (
    <section className="section" style={{ background: 'var(--bg)' }}>
      <div className="container">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="badge badge-primary" style={{ marginBottom: '16px' }}>Student Stories</span>
          <h2>Real students. <span className="gradient-text">Real results.</span></h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' }}>
          {students.map((s, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show"
              viewport={{ once: true }} custom={i * 0.8} className="card card-p">
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                {[...Array(5)].map((_, j) => <Star key={j} size={16} fill="#FFA726" color="#FFA726" />)}
              </div>
              <p style={{ color: 'var(--text-main)', lineHeight: 1.75, marginBottom: '24px', fontStyle: 'italic', fontSize: '0.95rem' }}>"{s.quote}"</p>
              <div className="divider" style={{ marginBottom: '20px' }} />
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

/* ── ADMISSIONS CTA ────────────────────────────────── */
const Admissions = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', subject: 'Class XI CS' });

  const subjects = [
    'Class XI CS', 'Class XII CS', 'Computer Application', 'Python Mastery',
    'C & C++ Fundamentals', 'Java Development', 'Web Development', 
    'Data Structures & Algorithms', 'B.Sc/BCA Support'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = `Hello, I would like to apply for admission.%0AName: ${form.name}%0AContact: ${form.contact}%0ASubject: ${form.subject}`;
    window.open(`https://wa.me/919674035542?text=${text}`, '_blank');
    setIsOpen(false);
    setForm({ name: '', contact: '', subject: 'Class XI CS' });
  };

  return (
    <section id="admissions" className="section" style={{ background: 'var(--white)' }}>
      <div className="container">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{
            background: 'linear-gradient(135deg, var(--dark) 0%, #363b47 100%)',
            borderRadius: 'var(--radius-xl)', padding: '72px 80px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '48px',
            flexWrap: 'wrap'
          }}>
          <div>
            <h2 style={{ color: 'white', marginBottom: '16px', fontSize: '2.25rem' }}>Ready to start learning?</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: '480px', lineHeight: 1.7 }}>
              New batches starting soon. Limited seats. Walk in or call us to secure your place.
            </p>
            <div style={{ marginTop: '28px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {[
                { icon: <MapPin size={16} />, text: 'J.K. Mitra Road, Kolkata – 700037' },
                { icon: <Phone size={16} />, text: 'Call to Enquire' },
                { icon: <Mail size={16} />, text: 'admissions@compution.in' },
              ].map((item, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
                  {item.text}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '220px' }}>
            <button className="btn btn-primary btn-lg" onClick={() => setIsOpen(true)}>Apply for Admission</button>
            <Link to="/login" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '14px 28px', borderRadius: 'var(--radius-lg)', fontWeight: 700, textAlign: 'center' }}>
              Student Portal Login
            </Link>
          </div>
        </motion.div>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Apply for Admission">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark)', marginBottom: '8px' }}>Name</label>
            <input 
              required
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="Enter your full name"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark)', marginBottom: '8px' }}>Contact Number</label>
            <input 
              required
              type="tel"
              value={form.contact}
              onChange={e => setForm({...form, contact: e.target.value})}
              placeholder="e.g. +91 9876543210"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark)', marginBottom: '8px' }}>Subject of Interest</label>
            <select 
              value={form.subject}
              onChange={e => setForm({...form, subject: e.target.value})}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.95rem', outline: 'none', background: 'white' }}
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '8px' }}>
            Submit Application
          </button>
        </form>
      </Modal>
    </section>
  );
};

/* ── FOOTER ────────────────────────────────────────── */
const Footer = () => (
  <footer style={{ background: 'var(--dark)', color: 'rgba(255,255,255,0.6)', padding: '60px 0 40px' }}>
    <div className="container">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '60px', marginBottom: '48px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', color: 'white', marginBottom: '16px', letterSpacing: '-0.04em' }}>
            COMP<span style={{ color: 'var(--accent)' }}>UTION</span>
          </div>
          <p style={{ lineHeight: 1.8, maxWidth: '300px', fontSize: '0.9rem' }}>
            Kolkata's focused computer science institute. Academic support meets real programming skills.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            <MapPin size={14} /> J.K. Mitra Road, Kolkata – 700037
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
          {['About Us', 'Faculty', 'Admissions', 'Student Login', 'Contact'].map(item => (
            <div key={item} style={{ marginBottom: '10px', fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition)' }}
              onMouseEnter={e => e.target.style.color = 'white'}
              onMouseLeave={e => e.target.style.color = ''}
            >{item}</div>
          ))}
        </div>
      </div>
      <div className="divider" style={{ background: 'rgba(255,255,255,0.08)', marginBottom: '28px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
        <span>© 2025 Compution. All rights reserved.</span>
        <span style={{ color: 'var(--accent)' }}>Learn. Code. Grow.</span>
      </div>
    </div>
  </footer>
);

/* ── PAGE EXPORT ───────────────────────────────────── */
const Home = () => (
  <>
    <Navbar />
    <Hero />
    <WhyCompution />
    <CoursesSection />
    <LearningJourney />
    <Testimonials />
    <Admissions />
    <Footer />
  </>
);

export default Home;
