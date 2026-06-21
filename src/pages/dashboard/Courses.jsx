import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { BookOpen, Clock, Users, ChevronRight, Play, Lock, Plus, Trash2, Search } from 'lucide-react';
import Modal from '../../components/Modal';
import { useCourses } from '../../hooks/useCourses';
import { courseRepository } from '../../repositories/courseRepository';

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const COURSE_METADATA = {
  'Basic+AI (Prompt Engn)': { subject: 'AI & Basics', color: '#7C4DFF', emoji: '🤖', nextLesson: 'Intro to Prompts & LLMs', totalLessons: 16, schedule: 'Mon, Wed · 4 PM' },
  'School Syllabus (Classes 2 to 5)': { subject: 'Academic', color: '#FF7043', emoji: '🎒', nextLesson: 'Intro to Computers & Keyboard', totalLessons: 12, schedule: 'Mon, Thu · 3 PM' },
  'School Syllabus (Classes 6 to 10)': { subject: 'Academic', color: '#FFA726', emoji: '🏫', nextLesson: 'Block Coding & Flowcharts', totalLessons: 20, schedule: 'Tue, Fri · 3 PM' },
  'Class XI & XII Computer Science': { subject: 'Academic', color: '#536DFE', emoji: '📘', nextLesson: 'Chapter 2: Data Representations', totalLessons: 22, schedule: 'Mon–Sat · 3 PM' },
  'Class XI & XII Computer Application': { subject: 'Academic', color: '#0097A7', emoji: '📙', nextLesson: 'Lesson 1: Office Tools', totalLessons: 22, schedule: 'Mon–Sat · 3 PM' },
  'Basic Coding': { subject: 'Programming', color: '#66BB6A', emoji: '💻', nextLesson: 'First Program & Variables', totalLessons: 24, schedule: 'Mon, Wed · 5 PM' },
  'Advance Coding': { subject: 'Programming', color: '#ED8B00', emoji: '🚀', nextLesson: 'OOP & Code Design Patterns', totalLessons: 30, schedule: 'Tue, Thu · 7 PM' },
  'Data Structures & Algorithms': { subject: 'Programming', color: '#43A047', emoji: '🧩', nextLesson: 'Binary Search Trees', totalLessons: 28, schedule: 'Tue, Thu · 6 PM' },
  'Python Mastery': { subject: 'Programming', color: '#4F46E5', emoji: '🐍', nextLesson: 'Intro to Python & Syntax', totalLessons: 24, schedule: 'Mon, Wed · 5 PM' }
};

const Courses = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('enrolled');
  const { courses, loading } = useCourses(user);
  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };
  
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

  // Fetch student list ONLY for admin/faculty to save bandwidth and secure data
  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'faculty') return;

    if (!db) {
      console.error("Courses: Firestore not initialized");
      triggerToast("Firestore not initialized");
      return;
    }
    
    let unsubUsers = () => {};

    try {
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        const data = [];
        snap.forEach(doc => {
          const d = doc.data();
          if (d.role !== 'admin') data.push({ id: doc.id, ...d });
        });
        setStudents(data);
      }, (err) => {
        console.error("Courses: Error fetching users list", err);
      });
    } catch (err) {
      console.error("Courses: Failed to setup users listener", err);
      triggerToast("Failed to connect to users roster");
    }

    return () => {
      unsubUsers();
    };
  }, [user?.role]);

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
                background: 'var(--white)', fontSize: '0.9rem', outline: 'none', color: 'var(--dark)'
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
            [1, 2, 3].map(i => <div key={i} style={{ height: 220, background: 'var(--white)', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)
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
  const enrolledList = courses.map((c, index) => {
    const progress = user?.courseProgress?.[c.id] !== undefined ? user.courseProgress[c.id] : 35;
    return {
      id: c.id,
      title: c.title,
      subject: c.subject,
      progress,
      nextLesson: c.nextLesson || 'Introduction & Setup',
      color: c.color,
      emoji: c.emoji,
      totalLessons: c.totalLessons,
      done: Math.round(c.totalLessons * (progress / 100)),
      schedule: c.schedule
    };
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>My Assigned Courses</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Access your personal courses. Other syllabuses are protected.
        </p>
      </motion.div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading courses...</div>
      ) : enrolledList.length === 0 ? (
        <div style={{ background: 'var(--surface-card)', padding: '48px', textAlign: 'center', borderRadius: '20px', border: '1.5px dashed var(--border-strong)', color: 'var(--text-light)' }}>
          <BookOpen size={44} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3>No Courses Assigned</h3>
          <p style={{ fontSize: '0.9rem' }}>You are currently not enrolled in any programs. Please contact your administrator to assign courses.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {enrolledList.map((c) => (
            <motion.div key={c.id} variants={item} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ height: '5px', background: c.color }} />
              <div className="card-p">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{c.emoji}</div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{c.title}</h3>
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
                        <Play size={14} /> Continue Course
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', padding: '12px 24px',
          background: 'var(--danger)', color: 'var(--text-on-primary)', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span>⚠️ {toast}</span>
        </div>
      )}
    </motion.div>
  );
};

export default Courses;
