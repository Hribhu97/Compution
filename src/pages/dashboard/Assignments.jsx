import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { FileText, CheckCircle2, Clock, Plus, BookOpen, Tag } from 'lucide-react';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const Assignments = () => {
  const { user } = useAuth();
  
  const [tab, setTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [assignForm, setAssignForm] = useState({ title: '', description: '', dueDate: '' });
  const [noteForm, setNoteForm] = useState({ title: '', subject: '', content: '' });

  useEffect(() => {
    if (!user?.uid) return;
    
    // Assignments listener
    const asgnRef = query(collection(db, `users/${user.uid}/assignments`), orderBy('createdAt', 'desc'));
    const unsubAsgn = onSnapshot(asgnRef, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setAssignments(data);
      if (tab === 'assignments') setLoading(false);
    });

    // Notes listener
    const notesRef = query(collection(db, `users/${user.uid}/notes`), orderBy('createdAt', 'desc'));
    const unsubNotes = onSnapshot(notesRef, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setNotes(data);
      if (tab === 'notes') setLoading(false);
    });

    return () => { unsubAsgn(); unsubNotes(); };
  }, [user]);

  // Handle Tab Change
  useEffect(() => { setLoading(true); setTimeout(() => setLoading(false), 300); }, [tab]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignForm.title || !assignForm.dueDate) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/assignments`), {
        ...assignForm,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsAssignModalOpen(false);
      setAssignForm({ title: '', description: '', dueDate: '' });
    } catch(err) { console.error(err); }
    setIsSubmitting(false);
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!noteForm.title || !noteForm.content) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/notes`), {
        ...noteForm,
        createdAt: serverTimestamp()
      });
      setIsNoteModalOpen(false);
      setNoteForm({ title: '', subject: '', content: '' });
    } catch(err) { console.error(err); }
    setIsSubmitting(false);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Lesson Plan</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your assignments and study notes</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '6px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <button onClick={() => setTab('assignments')} className={`chip ${tab === 'assignments' ? 'active' : ''}`} style={{ background: tab==='assignments' ? 'var(--primary)' : 'transparent', color: tab==='assignments' ? 'white' : 'var(--text-muted)', boxShadow: 'none' }}>
            Assignments
          </button>
          <button onClick={() => setTab('notes')} className={`chip ${tab === 'notes' ? 'active' : ''}`} style={{ background: tab==='notes' ? 'var(--primary)' : 'transparent', color: tab==='notes' ? 'white' : 'var(--text-muted)', boxShadow: 'none' }}>
            My Notes
          </button>
        </div>
      </motion.div>

      {/* ACTION BUTTON */}
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {tab === 'assignments' ? (
          <button onClick={() => setIsAssignModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
            <Plus size={18} /> New Assignment
          </button>
        ) : (
          <button onClick={() => setIsNoteModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
            <Plus size={18} /> Add Note
          </button>
        )}
      </motion.div>

      {loading ? (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 160, width: '100%', maxWidth: 320, background: 'white', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : tab === 'assignments' ? (
        /* ASSIGNMENTS GRID */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {assignments.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-light)', background: 'white', borderRadius: 20 }}>
              <FileText size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>No assignments found</p>
            </div>
          ) : (
            assignments.map(a => (
              <motion.div key={a.id} variants={item} className="card card-p" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.05rem', lineHeight: 1.3 }}>{a.title}</h3>
                  <span className={`badge ${a.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                    {a.status === 'completed' ? <CheckCircle2 size={12}/> : <Clock size={12}/>} {a.status}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px', flex: 1 }}>{a.description}</p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <Clock size={14} color="var(--primary)" /> Due: {a.dueDate}
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* NOTES GRID */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {notes.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-light)', background: 'white', borderRadius: 20 }}>
              <BookOpen size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>No notes added</p>
            </div>
          ) : (
            notes.map(n => (
              <motion.div key={n.id} variants={item} className="card card-p" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Tag size={14} color="var(--primary)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{n.subject}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{n.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {n.content}
                </p>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="New Assignment">
        <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Title</label>
            <input className="form-input" required value={assignForm.title} onChange={e => setAssignForm({...assignForm, title: e.target.value})} placeholder="e.g. Python Functions" />
          </div>
          <div>
            <label className="form-label">Due Date</label>
            <input type="date" className="form-input" required value={assignForm.dueDate} onChange={e => setAssignForm({...assignForm, dueDate: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows="3" value={assignForm.description} onChange={e => setAssignForm({...assignForm, description: e.target.value})} placeholder="Assignment details..." />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Add Note">
        <form onSubmit={handleCreateNote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Title</label>
            <input className="form-input" required value={noteForm.title} onChange={e => setNoteForm({...noteForm, title: e.target.value})} placeholder="e.g. Binary Trees Concepts" />
          </div>
          <div>
            <label className="form-label">Subject</label>
            <input className="form-input" required value={noteForm.subject} onChange={e => setNoteForm({...noteForm, subject: e.target.value})} placeholder="e.g. DSA" />
          </div>
          <div>
            <label className="form-label">Content</label>
            <textarea className="form-input" required rows="5" value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})} placeholder="Write your notes here..." />
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
