import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { BookOpen, Clock, Users, ChevronRight, Play, Lock, Plus, Trash2, Search } from 'lucide-react';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const COURSE_METADATA = {
  'Python Mastery': { subject: 'Python', color: '#3776AB', emoji: '🐍', nextLesson: 'File I/O & Exceptions', totalLessons: 32, schedule: 'Mon, Wed, Fri · 5 PM' },
  'Data Structures & Algorithms': { subject: 'DSA', color: '#536DFE', emoji: '🧩', nextLesson: 'Binary Search Trees', totalLessons: 28, schedule: 'Tue, Thu · 6 PM' },
  'Class XII CS (CBSE)': { subject: 'Academic', color: '#7C4DFF', emoji: '📗', nextLesson: 'Chapter 7: Networking', totalLessons: 24, schedule: 'Mon–Sat · 4 PM' },
  'Class XI CS (CBSE)': { subject: 'Academic', color: '#03A9F4', emoji: '📘', nextLesson: 'Chapter 2: Data Representations', totalLessons: 22, schedule: 'Mon–Sat · 3 PM' },
  'ICSE Class X Computer Applications': { subject: 'Academic', color: '#E040FB', emoji: '📙', nextLesson: 'Chapter 4: User-Defined Methods', totalLessons: 20, schedule: 'Tue, Thu, Sat · 4 PM' },
  'ISC Class XII Computer Science': { subject: 'Academic', color: '#651FFF', emoji: '📕', nextLesson: 'Chapter 3: Boolean Laws', totalLessons: 26, schedule: 'Mon–Sat · 5 PM' },
  'Web Development (HTML/CSS/JS)': { subject: 'Web Dev', color: '#E44D26', emoji: '🌐', nextLesson: 'HTML Semantic Structure', totalLessons: 40, schedule: 'Mon, Wed, Fri · 6 PM' },
  'Java Development': { subject: 'Java', color: '#ED8B00', emoji: '☕', nextLesson: 'Object Oriented Programming', totalLessons: 35, schedule: 'Tue, Thu · 7 PM' },
  'C & C++ Fundamentals': { subject: 'C/C++', color: '#00599C', emoji: '⚡', nextLesson: 'Pointers & References', totalLessons: 30, schedule: 'Wed, Sat · 6 PM' },
  'BCA / B.Tech Computer Science Coaching': { subject: 'Coaching', color: '#009688', emoji: '💻', nextLesson: 'Discrete Mathematics Logic', totalLessons: 45, schedule: 'Mon–Sat · 6 PM' }
};

const Courses = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('enrolled');
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Course Form State
  const [courseForm, setCourseForm] = useState({
    title: '',
    subject: '',
    color: '#536DFE',
    emoji: '💻',
    nextLesson: 'Introduction & Setup',
    totalLessons: 24,
    schedule: 'Mon, Wed · 5 PM',
    duration: '3 months'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulator State
  const [simulatedPeriod, setSimulatedPeriod] = useState(() => {
    const saved = localStorage.getItem('simulatedPeriod');
    if (saved) return saved;
    return 'new';
  });

  // Keep simulatedPeriod in sync with user progress if no manual override is set
  useEffect(() => {
    const saved = localStorage.getItem('simulatedPeriod');
    if (!saved) {
      const progress = user?.courseProgress !== undefined ? user.courseProgress : 35;
      setSimulatedPeriod(progress >= 80 ? 'established' : 'new');
    }
  }, [user?.courseProgress]);

  // Sync simulator state across tabs if they change it
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('simulatedPeriod');
      if (saved) {
        setSimulatedPeriod(saved);
      } else {
        const progress = user?.courseProgress !== undefined ? user.courseProgress : 35;
        setSimulatedPeriod(progress >= 80 ? 'established' : 'new');
      }
    };
    window.addEventListener('simulatedPeriodChanged', handleSync);
    return () => window.removeEventListener('simulatedPeriodChanged', handleSync);
  }, [user?.courseProgress]);

  // Fetch live courses & student list
  useEffect(() => {
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const data = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setCourses(data);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const data = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.role !== 'admin') data.push({ id: doc.id, ...d });
      });
      setStudents(data);
    });

    return () => {
      unsubCourses();
      unsubUsers();
    };
  }, []);

  const isNew = simulatedPeriod === 'new';

  // Get active list merged with defaults
  const getMergedCourses = () => {
    const defaultList = Object.entries(COURSE_METADATA).map(([title, meta]) => ({
      id: `default-${title}`,
      title,
      subject: meta.subject,
      color: meta.color,
      emoji: meta.emoji,
      nextLesson: meta.nextLesson,
      totalLessons: meta.totalLessons,
      schedule: meta.schedule,
      duration: '3 months',
      isDefault: true
    }));

    // Filter defaults if overridden in Firestore by title
    const activeDbTitles = courses.map(c => c.title);
    const filteredDefaults = defaultList.filter(d => !activeDbTitles.includes(d.title));

    return [...courses, ...filteredDefaults];
  };

  const activeCourses = getMergedCourses();

  // Handle Dynamic Course Addition
  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title || !courseForm.subject) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'courses'), {
        title: courseForm.title,
        subject: courseForm.subject,
        color: courseForm.color,
        emoji: courseForm.emoji,
        nextLesson: courseForm.nextLesson || 'Introduction & Setup',
        totalLessons: parseInt(courseForm.totalLessons) || 20,
        schedule: courseForm.schedule || 'Flexible',
        duration: courseForm.duration || '3 months',
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setCourseForm({
        title: '',
        subject: '',
        color: '#536DFE',
        emoji: '💻',
        nextLesson: 'Introduction & Setup',
        totalLessons: 24,
        schedule: 'Mon, Wed · 5 PM',
        duration: '3 months'
      });
    } catch (err) {
      console.error("Error creating course:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Course Deletion (Only for database courses)
  const handleDeleteCourse = async (courseId) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await deleteDoc(doc(db, 'courses', courseId));
      } catch (err) {
        console.error("Error deleting course:", err);
      }
    }
  };

  // ── ADMIN VIEW ───────────────────────────────────────
  if (user?.role === 'admin') {
    const filteredCourses = activeCourses.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Admin Header */}
        <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>Course Management</h1>
            <p style={{ color: 'var(--text-muted)' }}>Overview existing curriculums and deploy new dynamic programs</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Add New Course
          </button>
        </motion.div>

        {/* Filters and Search */}
        <motion.div variants={item} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search course title or subject..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px 12px 48px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'white', fontSize: '0.9rem', outline: 'none', color: 'var(--dark)'
              }}
            />
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Showing {filteredCourses.length} courses
          </div>
        </motion.div>

        {/* Courses Admin Grid */}
        <div className="grid-auto-cards">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} style={{ height: 220, background: 'white', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)
          ) : (
            filteredCourses.map((c) => {
              const enrolledCount = students.filter(s => s.course === c.title).length;
              return (
                <motion.div key={c.id} variants={item} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '5px', background: c.color }} />
                  <div className="card-p" style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{c.emoji}</div>
                      {!c.isDefault && (
                        <button onClick={() => handleDeleteCourse(c.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }} title="Delete Course">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: 'var(--dark)' }}>{c.title}</h3>
                    <span className="badge badge-primary" style={{ width: 'fit-content', marginBottom: '16px' }}>{c.subject}</span>
                    
                    <div className="divider" style={{ margin: 'auto 0 16px' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>📅 Schedule:</span>
                        <strong style={{ color: 'var(--dark)' }}>{c.schedule}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>⏱️ Duration:</span>
                        <strong style={{ color: 'var(--dark)' }}>{c.duration || '3 months'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>📖 Lessons:</span>
                        <strong style={{ color: 'var(--dark)' }}>{c.totalLessons} lectures</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', padding: '6px 10px', background: 'var(--surface)', borderRadius: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary)' }}>
                          <Users size={14} /> Active Enrolled:
                        </span>
                        <strong style={{ color: 'var(--dark)', fontSize: '0.95rem' }}>{enrolledCount} students</strong>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Add Course Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Course">
          <form onSubmit={handleAddCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">Course Title</label>
              <input
                type="text"
                className="form-input"
                required
                value={courseForm.title}
                onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                placeholder="e.g. Kotlin Android Mastery"
              />
            </div>
            
            <div className="grid-2-col" style={{ gap: '16px' }}>
              <div>
                <label className="form-label">Subject Category</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={courseForm.subject}
                  onChange={e => setCourseForm({ ...courseForm, subject: e.target.value })}
                  placeholder="e.g. Android"
                />
              </div>
              <div>
                <label className="form-label">Emoji Icon</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={courseForm.emoji}
                  onChange={e => setCourseForm({ ...courseForm, emoji: e.target.value })}
                  placeholder="e.g. 🤖"
                />
              </div>
            </div>

            <div className="grid-2-col" style={{ gap: '16px' }}>
              <div>
                <label className="form-label">Theme Color</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    style={{ border: 'none', width: '38px', height: '38px', cursor: 'pointer', padding: 0, borderRadius: '6px', background: 'transparent' }}
                    value={courseForm.color}
                    onChange={e => setCourseForm({ ...courseForm, color: e.target.value })}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={courseForm.color}
                    onChange={e => setCourseForm({ ...courseForm, color: e.target.value })}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Duration</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={courseForm.duration}
                  onChange={e => setCourseForm({ ...courseForm, duration: e.target.value })}
                  placeholder="e.g. 3 months"
                />
              </div>
            </div>

            <div className="grid-2-col" style={{ gap: '16px' }}>
              <div>
                <label className="form-label">Total Lessons</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  value={courseForm.totalLessons}
                  onChange={e => setCourseForm({ ...courseForm, totalLessons: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 24"
                />
              </div>
              <div>
                <label className="form-label">Weekly Schedule</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={courseForm.schedule}
                  onChange={e => setCourseForm({ ...courseForm, schedule: e.target.value })}
                  placeholder="e.g. Mon, Wed, Fri · 6 PM"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Next/First Lesson Title</label>
              <input
                type="text"
                className="form-input"
                value={courseForm.nextLesson}
                onChange={e => setCourseForm({ ...courseForm, nextLesson: e.target.value })}
                placeholder="e.g. Introduction & Setup"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
                {isSubmitting ? 'Adding...' : 'Create Course'}
              </button>
            </div>
          </form>
        </Modal>
      </motion.div>
    );
  }

  // ── STUDENT VIEW ─────────────────────────────────────
  const userCourse = user?.course && user.course !== 'Not specified' ? user.course : 'Python Mastery';
  
  // Find course details dynamically from allCourses
  const getCourseDetails = (title) => {
    const found = activeCourses.find(c => c.title === title);
    if (found) return found;
    return COURSE_METADATA[title] || COURSE_METADATA['Python Mastery'];
  };

  const primaryMeta = getCourseDetails(userCourse);

  const userProgress = user?.courseProgress !== undefined ? user.courseProgress : (isNew ? 0 : 68);

  const enrolledList = [
    {
      id: 'primary',
      title: userCourse,
      subject: primaryMeta.subject,
      progress: userProgress,
      nextLesson: isNew ? 'Introduction & Setup' : (primaryMeta.nextLesson || 'Chapter 1 Overview'),
      color: primaryMeta.color,
      emoji: primaryMeta.emoji,
      totalLessons: primaryMeta.totalLessons,
      done: Math.round(primaryMeta.totalLessons * (userProgress / 100)),
      schedule: primaryMeta.schedule
    }
  ];

  // Secondary choice setup
  const secondaryChoices = ['Data Structures & Algorithms', 'Class XII CS (CBSE)'].filter(c => c !== userCourse);
  secondaryChoices.forEach((cName, idx) => {
    const meta = getCourseDetails(cName);
    if (meta) {
      const defaultProg = idx === 0 ? 85 : 72;
      enrolledList.push({
        id: `secondary-${idx}`,
        title: cName,
        subject: meta.subject,
        progress: isNew ? 0 : defaultProg,
        nextLesson: isNew ? 'Course Overview' : (meta.nextLesson || 'Chapter 1 Overview'),
        color: meta.color,
        emoji: meta.emoji,
        totalLessons: meta.totalLessons,
        done: isNew ? 0 : Math.round(meta.totalLessons * (defaultProg / 100)),
        schedule: meta.schedule
      });
    }
  });

  const availableList = activeCourses.filter(c => c.title !== userCourse).map(c => ({
    title: c.title,
    subject: c.subject,
    color: c.color,
    emoji: c.emoji,
    duration: c.duration || '3 months',
    students: students.filter(s => s.course === c.title).length + 8 // add fallback students count for available exploring
  }));

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>My Courses</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {isNew ? 'Kickstart your fresh syllabus study sessions' : 'Track your active courses and discover new programs'}
        </p>
      </motion.div>

      {/* Tab switcher */}
      <motion.div variants={item} style={{ display: 'flex', gap: '4px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '28px', width: 'fit-content' }}>
        {['enrolled', 'available'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 22px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? 'var(--dark)' : 'var(--text-muted)',
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
            transition: 'var(--transition)', border: 'none', cursor: 'pointer'
          }}>
            {t === 'enrolled' ? '📚 Enrolled' : '🔍 Explore More'}
          </button>
        ))}
      </motion.div>

      {tab === 'enrolled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {enrolledList.map((c, i) => (
            <motion.div key={c.id} variants={item} className="card"
              style={{ overflow: 'hidden' }}>
              <div style={{ height: '5px', background: c.color }} />
              <div className="card-p">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{c.emoji}</div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
                          {c.title}
                          {c.id === 'primary' && (
                            <span style={{
                              marginLeft: '8px', fontSize: '0.7rem', background: 'rgba(83,109,254,0.1)',
                              color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', verticalAlign: 'middle'
                            }}>
                              Primary Track
                            </span>
                          )}
                        </h3>
                        <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{c.subject}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', color: c.color }}>{c.progress}%</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.done}/{c.totalLessons} lessons</div>
                      </div>
                    </div>

                    <div style={{ margin: '16px 0 8px' }}>
                      <div className="progress-track" style={{ background: 'var(--surface)', borderRadius: '100px', height: '6px' }}>
                        <motion.div className="progress-fill"
                           initial={{ width: 0 }}
                           animate={{ width: `${c.progress}%` }}
                           transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                           style={{ background: c.color, height: '100%', borderRadius: '100px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                        <span>📅 {c.schedule}</span>
                        <span>Next: <strong style={{ color: 'var(--dark)' }}>{c.nextLesson}</strong></span>
                      </div>
                      <button className="btn btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>
                        <Play size={14} /> Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {tab === 'available' && (
        <div className="grid-auto-cards">
          {availableList.map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="card" style={{ overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ height: '5px', background: c.color }} />
              <div className="card-p">
                <div style={{ fontSize: '2rem', marginBottom: '14px' }}>{c.emoji}</div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>{c.title}</h3>
                <span className="badge badge-primary" style={{ marginBottom: '16px', display: 'inline-flex' }}>{c.subject}</span>
                <div className="divider" style={{ margin: '14px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {c.duration}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={13} /> {c.students}/15</span>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                    Enquire <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Courses;
