import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Play, Clock, Trophy, TrendingUp, BarChart2, ChevronRight, CheckCircle2, UploadCloud, FileText, Trash2, Plus, Search, Eye } from 'lucide-react';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const history = [
  { id: 1, title: 'Python Basics', date: '2025-01-18', score: 18, total: 20, rank: 3, subjects: 'Python' },
  { id: 2, title: 'C++ OOP Concepts', date: '2025-01-14', score: 15, total: 20, rank: 7, subjects: 'C++' },
  { id: 3, title: 'Data Structures MCQ', date: '2025-01-10', score: 17, total: 20, rank: 2, subjects: 'DSA' },
  { id: 4, title: 'HTML/CSS Quiz', date: '2025-01-06', score: 20, total: 20, rank: 1, subjects: 'Web Dev' },
];

const defaultUpcoming = [
  { title: 'Python Advanced', date: '2025-01-25', duration: '30 mins', subject: 'Python', classLevel: 'All' },
  { title: 'DSA Trees & Graphs', date: '2025-01-28', duration: '45 mins', subject: 'DSA', classLevel: 'B.Tech' },
];

const leaderboard = [
  { rank: 1, name: 'Priya M.', score: '98/100', badge: '🥇' },
  { rank: 2, name: 'Rohan D.', score: '95/100', badge: '🥈' },
  { rank: 3, name: 'Arjun S.', score: '90/100', badge: '🥉', isYou: true },
  { rank: 4, name: 'Shreya K.', score: '88/100', badge: '' },
  { rank: 5, name: 'Ankit R.', score: '85/100', badge: '' },
];

const CLASS_LEVELS = [
  'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7',
  'Class 8', 'Class 9', 'Class 10', 'Class 11 CS', 'Class 11 App', 'Class 12 CS', 'Class 12 App',
  'BCA', 'B.Tech'
];

const MockTests = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // File Upload states
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [testForm, setTestForm] = useState({
    title: '',
    subject: 'Python',
    classLevel: 'Class 10',
    duration: '45 mins'
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tests'), (snap) => {
      const data = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Sort newest first
      data.sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
      setTests(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setFileError('Please upload a PDF document.');
      setFile(null);
      setFileName('');
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      setFileError('File size must be under 2MB.');
      setFile(null);
      setFileName('');
      return;
    }

    setFileError('');
    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleUploadTest = async (e) => {
    e.preventDefault();
    if (!file) {
      setFileError('Please select a PDF file to upload.');
      return;
    }
    
    setIsSubmitting(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        await addDoc(collection(db, 'tests'), {
          title: testForm.title,
          subject: testForm.subject,
          classLevel: testForm.classLevel,
          duration: testForm.duration,
          pdfName: fileName,
          pdfData: base64Data,
          dateStr: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          createdAt: serverTimestamp()
        });

        setIsModalOpen(false);
        setFile(null);
        setFileName('');
        setTestForm({
          title: '',
          subject: 'Python',
          classLevel: 'Class 10',
          duration: '45 mins'
        });
      } catch (err) {
        console.error("Error saving PDF to database:", err);
        setFileError('Failed to upload test question set.');
      } finally {
        setIsSubmitting(false);
      }
    };

    reader.onerror = () => {
      setFileError('Failed to read document file.');
      setIsSubmitting(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteTest = async (id) => {
    if (window.confirm("Are you sure you want to delete this test set?")) {
      try {
        await deleteDoc(doc(db, 'tests', id));
      } catch (err) {
        console.error("Error deleting test:", err);
      }
    }
  };

  const handleOpenPDF = (test) => {
    const w = window.open();
    w.document.write(
      `<iframe src="${test.pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
    );
  };

  // Student history average
  const avg = Math.round(history.reduce((sum, t) => sum + (t.score / t.total) * 100, 0) / history.length);

  // ── ADMIN VIEW ───────────────────────────────────────
  if (user?.role === 'admin') {
    const filteredTests = tests.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.classLevel.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Admin Header */}
        <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>Mock Test Management</h1>
            <p style={{ color: 'var(--text-muted)' }}>Publish PDF question sets and allocate tests to student standards</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Upload Question Set
          </button>
        </motion.div>

        {/* Filter and search */}
        <motion.div variants={item} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search tests by title, subject or level..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px 12px 48px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--white)', fontSize: '0.9rem', outline: 'none', color: 'var(--dark)'
              }}
            />
          </div>
        </motion.div>

        {/* Tests Grid */}
        <div className="grid-auto-cards">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} style={{ height: 220, background: 'var(--white)', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)
          ) : filteredTests.length === 0 ? (
            <motion.div variants={item} style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'var(--white)', borderRadius: '20px', color: 'var(--text-light)', border: '1px dashed var(--border-strong)' }}>
              <FileText size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--dark)', marginBottom: '8px' }}>No Mock Tests Uploaded</h3>
              <p>Create your first mock test question sheet by clicking Upload above!</p>
            </motion.div>
          ) : (
            filteredTests.map((t) => (
              <motion.div key={t.id} variants={item} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)' }}>{t.title}</h3>
                  <button onClick={() => handleDeleteTest(t.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }} title="Delete Test">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary">{t.subject}</span>
                  <span className="badge badge-secondary" style={{ background: 'rgba(83,109,254,0.1)', color: 'var(--primary)', border: 'none' }}>🎯 {t.classLevel}</span>
                </div>

                <div style={{ margin: '8px 0', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> Duration: <strong>{t.duration}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} /> Attachment: <span style={{ color: 'var(--primary)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={t.pdfName}>{t.pdfName}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '4px' }}>
                    Uploaded on: {t.dateStr}
                  </div>
                </div>

                <button onClick={() => handleOpenPDF(t)} className="btn btn-ghost" style={{ width: '100%', marginTop: 'auto', padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid var(--border-strong)' }}>
                  <Eye size={14} /> View Question Sheet
                </button>
              </motion.div>
            ))
          )}
        </div>

        {/* Upload Test Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Question Set (PDF)">
          <form onSubmit={handleUploadTest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">Test Title</label>
              <input
                type="text"
                className="form-input"
                required
                value={testForm.title}
                onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                placeholder="e.g. Unit 3 Programming Logic"
              />
            </div>

            <div className="grid-2-col" style={{ gap: '16px' }}>
              <div>
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={testForm.subject}
                  onChange={e => setTestForm({ ...testForm, subject: e.target.value })}
                  placeholder="e.g. C++ OOP"
                />
              </div>
              <div>
                <label className="form-label">Target Student Level</label>
                <select
                  className="form-input"
                  value={testForm.classLevel}
                  onChange={e => setTestForm({ ...testForm, classLevel: e.target.value })}
                >
                  {CLASS_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2-col" style={{ gap: '16px' }}>
              <div>
                <label className="form-label">Duration</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={testForm.duration}
                  onChange={e => setTestForm({ ...testForm, duration: e.target.value })}
                  placeholder="e.g. 45 mins"
                />
              </div>
              <div>
                <label className="form-label">PDF Question Document</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="pdf-test-upload"
                />
                <label htmlFor="pdf-test-upload" style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  borderRadius: '8px', border: '1px dashed var(--border-strong)', cursor: 'pointer',
                  fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--surface)'
                }}>
                  <UploadCloud size={18} />
                  <span>{fileName ? `${fileName.slice(0, 20)}...` : 'Choose PDF File'}</span>
                </label>
              </div>
            </div>

            {fileError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 600 }}>⚠️ {fileError}</div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
                {isSubmitting ? 'Uploading PDF...' : 'Publish Test'}
              </button>
            </div>
          </form>
        </Modal>

      </motion.div>
    );
  }

  // ── STUDENT VIEW ─────────────────────────────────────
  // Fetch only tests matching the student's grade or 'All'
  const targetGrade = user?.grade || 'Class 10';
  const studentUpcoming = tests.filter(t => t.classLevel === targetGrade || t.classLevel === 'All').map(t => ({
    title: t.title,
    date: t.dateStr,
    duration: t.duration,
    subject: t.subject,
    originalTest: t
  }));

  // Fallback to defaults if no custom tests uploaded for this student
  const activeUpcoming = studentUpcoming.length > 0 ? studentUpcoming : defaultUpcoming;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Mock Tests</h1>
        <p style={{ color: 'var(--text-muted)' }}>Practice, track your scores, and climb the leaderboard</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Tests Taken', val: history.length, icon: '📝', color: 'var(--primary)', bg: 'rgba(83,109,254,0.08)' },
          { label: 'Average Score', val: `${avg}%`, icon: '📊', color: 'var(--success)', bg: 'rgba(102,187,106,0.08)' },
          { label: 'Best Rank', val: '#1', icon: '🏆', color: '#FFA726', bg: 'rgba(255,167,38,0.08)' },
          { label: 'Perfect Scores', val: '1', icon: '⭐', color: '#BD93F9', bg: 'rgba(189,147,249,0.08)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px', background: s.bg, border: 'none' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.75rem', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </motion.div>

      <div className="grid-2-1">
        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Upcoming */}
          <motion.div variants={item} className="card card-p">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={18} color="var(--primary)" /> Active Tests
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeUpcoming.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {t.duration}</span>
                      <span>📅 {t.date}</span>
                      <span style={{ color: 'var(--primary)' }}>🎯 {t.subject}</span>
                    </div>
                  </div>
                  {t.originalTest ? (
                    <button onClick={() => handleOpenPDF(t.originalTest)} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
                      <Play size={14} /> Open PDF Test
                    </button>
                  ) : (
                    <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
                      <Play size={14} /> Start Quiz
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Score History */}
          <motion.div variants={item} className="card card-p">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} color="var(--primary)" /> Score History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((t) => {
                const pct = Math.round((t.score / t.total) * 100);
                return (
                  <div key={t.id} style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.title}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rank #{t.rank}</span>
                        <span style={{ fontWeight: 800, color: pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)', fontFamily: 'var(--font-heading)' }}>
                          {t.score}/{t.total}
                        </span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <motion.div className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '6px' }}>{t.date} · {t.subjects}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Leaderboard */}
        <motion.div variants={item} className="card card-p">
          <h3 style={{ fontSize: '1.05rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="#FFA726" /> Leaderboard
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leaderboard.map((s) => (
              <div key={s.rank} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: 'var(--radius-md)',
                background: s.isYou ? 'rgba(83,109,254,0.08)' : 'var(--bg)',
                border: s.isYou ? '1px solid rgba(83,109,254,0.2)' : '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{s.badge || `#${s.rank}`}</span>
                <span style={{ flex: 1, fontWeight: s.isYou ? 700 : 500, color: s.isYou ? 'var(--primary)' : 'var(--dark)', fontSize: '0.9rem' }}>
                  {s.name} {s.isYou && <span style={{ fontSize: '0.75rem' }}>(You)</span>}
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color: s.isYou ? 'var(--primary)' : 'var(--dark)' }}>{s.score}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            🏆 Top 3 students get a special badge
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MockTests;
