import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { FileText, CheckCircle2, Clock, ChevronRight, Plus, FileEdit, Trash2, Filter, Award } from 'lucide-react';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const LEVELS = [
  'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7',
  'Class 8', 'Class 9', 'Class 10', 'Class 11 CS', 'Class 11 App', 'Class 12 CS', 'Class 12 App',
  'BCA', 'B.Tech'
];

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const Assignments = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('assignments'); // 'assignments' or 'notes' for student; 'all' or by level for admin
  
  // Student view collections
  const [personalAssignments, setPersonalAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  
  // Admin view collections & Global collections
  const [globalAssignments, setGlobalAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('All');

  // Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  
  // Form States
  const [assignForm, setAssignForm] = useState({ 
    title: '', 
    subject: '', 
    dueDate: '', 
    description: '',
    level: 'Class 10',
    difficulty: 'Intermediate'
  });
  const [noteForm, setNoteForm] = useState({ id: '', title: '', subject: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time Firestore sync
  useEffect(() => {
    if (!user?.uid) return;
    
    // Fetch global assignments
    const unsubGlobal = onSnapshot(collection(db, 'assignments'), (snap) => {
      const data = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Sort newest first
      data.sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
      setGlobalAssignments(data);
      setLoading(false);
    });

    // Fetch personal assignments (for student)
    let unsubPersonal = () => {};
    if (user.role?.toLowerCase() !== 'admin') {
      unsubPersonal = onSnapshot(collection(db, `users/${user.uid}/assignments`), (snap) => {
        const data = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setPersonalAssignments(data);
      });
    }

    // Fetch notes (for student)
    const unsubNote = onSnapshot(collection(db, `users/${user.uid}/notes`), (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setNotes(data);
    });

    return () => { 
      unsubGlobal(); 
      unsubPersonal(); 
      unsubNote(); 
    };
  }, [user?.uid, user?.role]);

  // Handle Admin creating a global assignment
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignForm.title || !assignForm.subject || !assignForm.dueDate) return;
    setIsSubmitting(true);
    try {
      if (user.role?.toLowerCase() === 'admin') {
        // Save to global assignments
        await addDoc(collection(db, 'assignments'), {
          title: assignForm.title,
          subject: assignForm.subject,
          dueDate: assignForm.dueDate,
          description: assignForm.description,
          level: assignForm.level,
          difficulty: assignForm.difficulty,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      } else {
        // Save to student personal assignments
        await addDoc(collection(db, `users/${user.uid}/assignments`), {
          title: assignForm.title,
          subject: assignForm.subject,
          dueDate: assignForm.dueDate,
          description: assignForm.description,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }
      setIsAssignModalOpen(false);
      setAssignForm({ 
        title: '', 
        subject: '', 
        dueDate: '', 
        description: '',
        level: 'Class 10',
        difficulty: 'Intermediate'
      });
    } catch (err) { 
      console.error(err); 
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting global assignments (Admin only)
  const handleDeleteAssignment = async (id) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      try {
        await deleteDoc(doc(db, 'assignments', id));
      } catch (err) {
        console.error("Error deleting assignment:", err);
      }
    }
  };

  // Handle Student creating or editing personal notes
  const handleCreateNote = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (noteForm.id) {
        // Edit existing note
        await updateDoc(doc(db, `users/${user.uid}/notes`, noteForm.id), {
          title: noteForm.title,
          subject: noteForm.subject,
          content: noteForm.content,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new note
        await addDoc(collection(db, `users/${user.uid}/notes`), {
          title: noteForm.title,
          subject: noteForm.subject,
          content: noteForm.content,
          createdAt: serverTimestamp()
        });
      }
      setIsNoteModalOpen(false);
      setNoteForm({ id: '', title: '', subject: '', content: '' });
    } catch (err) { console.error(err); }
    setIsSubmitting(false);
  };

  // Handle Student deleting personal notes
  const handleDeleteNote = async (e, noteId) => {
    e.stopPropagation(); // Avoid triggering open/edit
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/notes`, noteId));
      } catch (err) {
        console.error("Error deleting note:", err);
      }
    }
  };

  const handleOpenAddNote = () => {
    setNoteForm({ id: '', title: '', subject: '', content: '' });
    setIsNoteModalOpen(true);
  };

  const handleOpenEditNote = (note) => {
    setNoteForm({ id: note.id, title: note.title, subject: note.subject, content: note.content });
    setIsNoteModalOpen(true);
  };

  // ── ADMIN VIEW ───────────────────────────────────────
  if (user?.role?.toLowerCase() === 'admin') {
    // Filter assignments by level filter tabs
    const filteredAssignments = globalAssignments.filter(a => 
      selectedLevelFilter === 'All' || a.level === selectedLevelFilter
    );

    // Grouping shortcuts for quick toggle filters
    const quickGroups = [
      { label: '🌎 All', value: 'All' },
      { label: '🎒 Class 2-5', value: 'Class 2-5' },
      { label: '🏫 Class 6-8', value: 'Class 6-8' },
      { label: '📚 Class 9-10', value: 'Class 9-10' },
      { label: '🎓 Class 11-12', value: 'Class 11-12' },
      { label: '💻 BCA', value: 'BCA' },
      { label: '⚙️ B.Tech', value: 'B.Tech' }
    ];

    // Helper to evaluate groups matches
    const isLevelInGroup = (level, groupVal) => {
      if (groupVal === 'All') return true;
      if (groupVal === 'Class 2-5') return ['Class 2', 'Class 3', 'Class 4', 'Class 5'].includes(level);
      if (groupVal === 'Class 6-8') return ['Class 6', 'Class 7', 'Class 8'].includes(level);
      if (groupVal === 'Class 9-10') return ['Class 9', 'Class 10'].includes(level);
      if (groupVal === 'Class 11-12') return ['Class 11 CS', 'Class 11 App', 'Class 12 CS', 'Class 12 App'].includes(level);
      return level === groupVal;
    };

    const groupedFilteredAssignments = globalAssignments.filter(a => 
      isLevelInGroup(a.level, selectedLevelFilter)
    );

    return (
      <motion.div variants={stagger} initial="hidden" animate="show">
        
        {/* Admin Header */}
        <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>Publish Assignments</h1>
            <p style={{ color: 'var(--text-muted)' }}>Publish student worksheets and coding assignments scaled to class standards</p>
          </div>
          <button onClick={() => setIsAssignModalOpen(true)} className="btn btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> New Assignment
          </button>
        </motion.div>

        {/* Level Filters Tab Swapper */}
        <motion.div variants={item} style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px' }}>
          {quickGroups.map(grp => (
            <button
              key={grp.value}
              onClick={() => setSelectedLevelFilter(grp.value)}
              style={{
                padding: '9px 18px',
                borderRadius: '100px',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: selectedLevelFilter === grp.value ? 'var(--dark)' : 'var(--surface)',
                color: selectedLevelFilter === grp.value ? 'white' : 'var(--text-muted)',
                transition: 'all 0.25s'
              }}
            >
              {grp.label}
            </button>
          ))}
        </motion.div>

        {/* Global Assignments Grid */}
        <div className="grid-auto-cards">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} style={{ height: 220, background: 'var(--white)', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)
          ) : groupedFilteredAssignments.length === 0 ? (
            <motion.div variants={item} style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'var(--white)', borderRadius: '20px', color: 'var(--text-light)', border: '1px dashed var(--border-strong)' }}>
              <FileText size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--dark)', marginBottom: '8px' }}>No Assignments Published</h3>
              <p>Ready to deploy study sheets? Click "New Assignment" to publish tasks for {selectedLevelFilter === 'All' ? 'any standard' : selectedLevelFilter}.</p>
            </motion.div>
          ) : (
            groupedFilteredAssignments.map(a => (
              <motion.div key={a.id} variants={item} className="card card-p" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3 }}>{a.title}</h3>
                  <button onClick={() => handleDeleteAssignment(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }} title="Delete Assignment">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <span className="badge badge-primary">{a.subject}</span>
                  <span className="badge badge-secondary" style={{ background: 'rgba(83,109,254,0.1)', color: 'var(--primary)', border: 'none' }}>🎯 {a.level}</span>
                  <span className="badge" style={{ 
                    background: a.difficulty === 'Beginner' ? 'rgba(102,187,106,0.1)' : a.difficulty === 'Advanced' ? 'rgba(239,83,80,0.1)' : 'rgba(255,167,38,0.1)',
                    color: a.difficulty === 'Beginner' ? 'var(--success)' : a.difficulty === 'Advanced' ? 'var(--danger)' : '#FFA726',
                    border: 'none'
                  }}>
                    {a.difficulty}
                  </span>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '24px', flex: 1 }}>{a.description}</p>
                
                <div className="divider" style={{ margin: '0 0 16px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Clock size={14} color="var(--danger)" /> 
                    <span style={{ color: 'var(--danger)' }}>Due: {a.dueDate}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Admin Creator Modal */}
        <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Publish Global Assignment">
          <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">Assignment Title</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                value={assignForm.title} 
                onChange={e => setAssignForm({...assignForm, title: e.target.value})} 
                placeholder="e.g. OOP Polymorphism Exercise" 
              />
            </div>
            
            <div className="grid-2-col" style={{ gap: '16px' }}>
              <div>
                <label className="form-label">Subject</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={assignForm.subject} 
                  onChange={e => setAssignForm({...assignForm, subject: e.target.value})} 
                  placeholder="e.g. DSA" 
                />
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  required 
                  value={assignForm.dueDate} 
                  onChange={e => setAssignForm({...assignForm, dueDate: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid-2-col" style={{ gap: '16px' }}>
              <div>
                <label className="form-label">Target Level / standard</label>
                <select
                  className="form-input"
                  value={assignForm.level}
                  onChange={e => setAssignForm({...assignForm, level: e.target.value})}
                >
                  {LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Difficulty Level</label>
                <select
                  className="form-input"
                  value={assignForm.difficulty}
                  onChange={e => setAssignForm({...assignForm, difficulty: e.target.value})}
                >
                  {DIFFICULTY_LEVELS.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Description / Instructions</label>
              <textarea 
                className="form-input" 
                required 
                rows="3" 
                value={assignForm.description} 
                onChange={e => setAssignForm({...assignForm, description: e.target.value})} 
                placeholder="Provide detailed problem statement..." 
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
                {isSubmitting ? 'Saving...' : 'Deploy Assignment'}
              </button>
            </div>
          </form>
        </Modal>

      </motion.div>
    );
  }

  // ── STUDENT VIEW ─────────────────────────────────────
  // Fetch assignments matching the student's level, combined with any student-specific assignments
  const studentGrade = user?.grade || 'Class 10';
  
  // Filter global assignments to match the student grade
  const gradeMatchedAssignments = globalAssignments.filter(a => a.level === studentGrade);

  // Combine both: personal ones + global matching grade
  const combinedAssignments = [...personalAssignments, ...gradeMatchedAssignments];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Lesson Plan & Workspace</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track assignments and save your personal notes</p>
        </div>
        
        {tab === 'assignments' ? (
          <button onClick={() => setIsAssignModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
            <Plus size={18} /> New Personal Task
          </button>
        ) : (
          <button onClick={handleOpenAddNote} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
            <FileEdit size={18} /> Add Note
          </button>
        )}
      </motion.div>

      {/* Tab switcher */}
      <motion.div variants={item} style={{ display: 'flex', gap: '4px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '28px', width: 'fit-content' }}>
        {['assignments', 'notes'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 22px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem',
            background: tab === t ? 'white' : 'transparent', color: tab === t ? 'var(--dark)' : 'var(--text-muted)',
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none', transition: 'var(--transition)', border: 'none', cursor: 'pointer',
            textTransform: 'capitalize'
          }}>
            {t}
          </button>
        ))}
      </motion.div>

      {/* Content Grid */}
      <div className="grid-auto-cards">
        {loading ? (
          [1,2,3].map(i => <motion.div key={i} variants={item} style={{ height: 200, background: 'var(--white)', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)
        ) : tab === 'assignments' ? (
          combinedAssignments.length === 0 ? (
            <motion.div variants={item} style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'var(--white)', borderRadius: '20px', color: 'var(--text-light)', border: '1px dashed var(--border-strong)' }}>
              <FileText size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--dark)', marginBottom: '8px' }}>No assignments yet</h3>
              <p>You're all caught up for {studentGrade}!</p>
            </motion.div>
          ) : (
            combinedAssignments.map(a => (
              <motion.div key={a.id} variants={item} className="card card-p" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', lineHeight: 1.3, marginBottom: '6px' }}>{a.title}</h3>
                  <span className={`badge ${a.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                    {a.status === 'completed' ? <CheckCircle2 size={12}/> : <Clock size={12}/>} {a.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                  <span className="badge badge-primary" style={{ display: 'inline-flex', width: 'fit-content' }}>{a.subject}</span>
                  {a.level && <span className="badge badge-secondary" style={{ display: 'inline-flex', width: 'fit-content', background: 'rgba(83,109,254,0.1)', color: 'var(--primary)', border: 'none' }}>🎯 {a.level}</span>}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px', flex: 1 }}>{a.description}</p>
                
                <div className="divider" style={{ margin: '0 0 16px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Clock size={14} color={a.status === 'pending' ? 'var(--danger)' : 'var(--text-muted)'} /> 
                    <span style={{ color: a.status === 'pending' ? 'var(--danger)' : 'inherit' }}>Due: {a.dueDate}</span>
                  </div>
                  {a.status === 'pending' && (
                    <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                      Start <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )
        ) : (
          notes.length === 0 ? (
            <motion.div variants={item} style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'var(--white)', borderRadius: '20px', color: 'var(--text-light)', border: '1px dashed var(--border-strong)' }}>
              <FileEdit size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--dark)', marginBottom: '8px' }}>No notes saved</h3>
              <p>Create a note to remember important class details.</p>
            </motion.div>
          ) : (
            notes.map(n => (
              <motion.div
                key={n.id}
                variants={item}
                onClick={() => handleOpenEditNote(n)}
                whileHover={{ translateY: -2 }}
                className="card card-p"
                style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span className="badge badge-primary" style={{ display: 'inline-flex', width: 'fit-content' }}>{n.subject}</span>
                  <button
                    onClick={(e) => handleDeleteNote(e, n.id)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
                    title="Delete note"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <h3 style={{ fontSize: '1.15rem', lineHeight: 1.3, marginBottom: '12px' }}>{n.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, flex: 1, whiteSpace: 'pre-wrap' }}>{n.content}</p>
              </motion.div>
            ))
          )
        )}
      </div>

      {/* CREATE STUDENT PERSONAL TASK MODAL */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Create Task">
        <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Title</label>
            <input type="text" className="form-input" required value={assignForm.title} onChange={e => setAssignForm({...assignForm, title: e.target.value})} placeholder="e.g. React Hooks Project" />
          </div>
          <div className="grid-2-col" style={{ gap: '16px' }}>
            <div>
              <label className="form-label">Subject</label>
              <input type="text" className="form-input" required value={assignForm.subject} onChange={e => setAssignForm({...assignForm, subject: e.target.value})} placeholder="e.g. Web Dev" />
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" required value={assignForm.dueDate} onChange={e => setAssignForm({...assignForm, dueDate: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" required rows="3" value={assignForm.description} onChange={e => setAssignForm({...assignForm, description: e.target.value})} placeholder="What needs to be done?" />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? 'Saving...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE NOTE MODAL */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title={noteForm.id ? "Edit Note" : "Add Note"}>
        <form onSubmit={handleCreateNote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Title</label>
            <input type="text" className="form-input" required value={noteForm.title} onChange={e => setNoteForm({...noteForm, title: e.target.value})} placeholder="Note title" />
          </div>
          <div>
            <label className="form-label">Subject</label>
            <input type="text" className="form-input" required value={noteForm.subject} onChange={e => setNoteForm({...noteForm, subject: e.target.value})} placeholder="e.g. DSA" />
          </div>
          <div>
            <label className="form-label">Content</label>
            <textarea className="form-input" required rows="6" value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})} placeholder="Write your notes here..." />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsNoteModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};

export default Assignments;
