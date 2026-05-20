import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { FileText, CheckCircle2, Clock, ChevronRight, Plus, FileEdit } from 'lucide-react';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const Assignments = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('assignments'); // 'assignments' or 'notes'
  
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  
  // Form States
  const [assignForm, setAssignForm] = useState({ title: '', subject: '', dueDate: '', description: '' });
  const [noteForm, setNoteForm] = useState({ title: '', subject: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    
    const assignRef = query(collection(db, `users/${user.uid}/assignments`), orderBy('createdAt', 'desc'));
    const unsubAssign = onSnapshot(assignRef, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setAssignments(data);
    });

    const noteRef = query(collection(db, `users/${user.uid}/notes`), orderBy('createdAt', 'desc'));
    const unsubNote = onSnapshot(noteRef, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setNotes(data);
      setLoading(false);
    });

    return () => { unsubAssign(); unsubNote(); };
  }, [user]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/assignments`), {
        ...assignForm,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsAssignModalOpen(false);
      setAssignForm({ title: '', subject: '', dueDate: '', description: '' });
    } catch (err) { console.error(err); }
    setIsSubmitting(false);
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/notes`), {
        ...noteForm,
        createdAt: serverTimestamp()
      });
      setIsNoteModalOpen(false);
      setNoteForm({ title: '', subject: '', content: '' });
    } catch (err) { console.error(err); }
    setIsSubmitting(false);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Lesson Plan & Workspace</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track assignments and save your personal notes</p>
        </div>
        
        {tab === 'assignments' ? (
          <button onClick={() => setIsAssignModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
            <Plus size={18} /> New Assignment
          </button>
        ) : (
          <button onClick={() => setIsNoteModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
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
          [1,2,3].map(i => <motion.div key={i} variants={item} style={{ height: 200, background: 'white', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)
        ) : tab === 'assignments' ? (
          assignments.length === 0 ? (
            <motion.div variants={item} style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'white', borderRadius: '20px', color: 'var(--text-light)', border: '1px dashed var(--border-strong)' }}>
              <FileText size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--dark)', marginBottom: '8px' }}>No assignments yet</h3>
              <p>You're all caught up!</p>
            </motion.div>
          ) : (
            assignments.map(a => (
              <motion.div key={a.id} variants={item} className="card card-p" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', lineHeight: 1.3, marginBottom: '6px' }}>{a.title}</h3>
                  <span className={`badge ${a.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                    {a.status === 'completed' ? <CheckCircle2 size={12}/> : <Clock size={12}/>} {a.status}
                  </span>
                </div>
                <span className="badge badge-primary" style={{ display: 'inline-flex', width: 'fit-content', marginBottom: '16px' }}>{a.subject}</span>
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
            <motion.div variants={item} style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'white', borderRadius: '20px', color: 'var(--text-light)', border: '1px dashed var(--border-strong)' }}>
              <FileEdit size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--dark)', marginBottom: '8px' }}>No notes saved</h3>
              <p>Create a note to remember important class details.</p>
            </motion.div>
          ) : (
            notes.map(n => (
              <motion.div key={n.id} variants={item} className="card card-p" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="badge badge-primary" style={{ display: 'inline-flex', width: 'fit-content', marginBottom: '16px' }}>{n.subject}</span>
                <h3 style={{ fontSize: '1.15rem', lineHeight: 1.3, marginBottom: '12px' }}>{n.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, flex: 1, whiteSpace: 'pre-wrap' }}>{n.content}</p>
              </motion.div>
            ))
          )
        )}
      </div>

      {/* CREATE ASSIGNMENT MODAL */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Create Assignment">
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
              {isSubmitting ? 'Saving...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE NOTE MODAL */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Add Note">
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
