import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle2, Clock, ChevronRight } from 'lucide-react';

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const assignments = [
  { id: 1, title: 'Python File Handling Exercise', subject: 'Python', dueDate: 'Jan 15, 2024', status: 'completed', description: 'Write a script to read, process, and output log data.' },
  { id: 2, title: 'Binary Search Tree Implementation', subject: 'DSA', dueDate: 'Jan 22, 2024', status: 'pending', description: 'Implement insert, delete, and traversal methods for a BST.' },
  { id: 3, title: 'HTML/CSS Layouts Project', subject: 'Web Dev', dueDate: 'Jan 25, 2024', status: 'pending', description: 'Recreate the provided Figma design using Flexbox and Grid.' }
];

const Assignments = () => {
  const [tab, setTab] = useState('pending');
  
  const filtered = assignments.filter(a => a.status === tab);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Lesson Plan & Assignments</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track your assigned coursework and deadlines</p>
      </motion.div>

      {/* Tab switcher */}
      <motion.div variants={item} style={{ display: 'flex', gap: '4px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '28px', width: 'fit-content' }}>
        {['pending', 'completed'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 22px', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? 'var(--dark)' : 'var(--text-muted)',
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
            transition: 'var(--transition)', border: 'none', cursor: 'pointer',
            textTransform: 'capitalize'
          }}>
            {t}
          </button>
        ))}
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filtered.length === 0 ? (
          <motion.div variants={item} style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'white', borderRadius: '20px', color: 'var(--text-light)' }}>
            <FileText size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No {tab} assignments found.</p>
          </motion.div>
        ) : (
          filtered.map(a => (
            <motion.div key={a.id} variants={item} className="card card-p" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
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
        )}
      </div>
    </motion.div>
  );
};

export default Assignments;
