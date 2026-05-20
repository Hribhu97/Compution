import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Users, ChevronRight, Play, Lock } from 'lucide-react';

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const enrolled = [
  { id: 1, title: 'Python Mastery', subject: 'Python', progress: 68, nextLesson: 'File I/O & Exceptions', color: '#3776AB', emoji: '🐍', totalLessons: 32, done: 22, schedule: 'Mon, Wed, Fri · 5 PM' },
  { id: 2, title: 'Data Structures & Algorithms', subject: 'DSA', progress: 85, nextLesson: 'Binary Search Trees', color: 'var(--primary)', emoji: '🧩', totalLessons: 28, done: 24, schedule: 'Tue, Thu · 6 PM' },
  { id: 3, title: 'Class XII CS (CBSE)', subject: 'Academic', progress: 72, nextLesson: 'Chapter 7: Networking', color: '#7C4DFF', emoji: '📗', totalLessons: 24, done: 17, schedule: 'Mon–Sat · 4 PM' },
];

const available = [
  { title: 'Web Development', subject: 'HTML/CSS/JS', color: '#E44D26', emoji: '🌐', duration: '3 months', students: 12 },
  { title: 'Java Development', subject: 'Java', color: '#ED8B00', emoji: '☕', duration: '4 months', students: 8 },
  { title: 'C & C++ Fundamentals', subject: 'C/C++', color: '#00599C', emoji: '⚡', duration: '3 months', students: 11 },
];

const Courses = () => {
  const [tab, setTab] = useState('enrolled');

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>My Courses</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track your active courses and discover new programs</p>
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
          {enrolled.map((c, i) => (
            <motion.div key={c.id} variants={item} className="card"
              style={{ overflow: 'hidden' }}>
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
                      <div className="progress-track">
                        <motion.div className="progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${c.progress}%` }}
                          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                          style={{ background: c.color }}
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
          {available.map((c, i) => (
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
