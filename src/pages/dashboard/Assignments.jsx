import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Upload, Clock, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';

const stagger = { show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};

const assignments = [
  { id: 1, title: 'Python: File I/O Exercise', subject: 'Python', desc: 'Write a program to read/write student records using file handling.', due: '2025-01-22', status: 'pending', urgent: true },
  { id: 2, title: 'DSA: Implement a Stack', subject: 'Data Structures', desc: 'Implement push, pop, peek, and isEmpty using arrays.', due: '2025-01-24', status: 'pending', urgent: false },
  { id: 3, title: 'HTML Form Project', subject: 'Web Dev', desc: 'Build a styled registration form with CSS validation states.', due: '2025-01-26', status: 'pending', urgent: false },
  { id: 4, title: 'C++ OOP Mini Project', subject: 'C++', desc: 'Create a class hierarchy for a library management system.', due: '2025-01-20', status: 'submitted', urgent: false },
  { id: 5, title: 'Python List Comprehensions', subject: 'Python', desc: 'Convert 10 for-loop solutions to list comprehensions.', due: '2025-01-18', status: 'graded', grade: '18/20', urgent: false },
];

const Assignments = () => {
  const [filter, setFilter] = useState('All');
  const [uploading, setUploading] = useState(null);
  const [uploadDone, setUploadDone] = useState([]);

  const filters = ['All', 'Pending', 'Submitted', 'Graded'];
  const filtered = filter === 'All' ? assignments : assignments.filter(a => a.status === filter.toLowerCase());

  const handleUpload = (id) => {
    setUploading(id);
    setTimeout(() => {
      setUploading(null);
      setUploadDone(d => [...d, id]);
    }, 1800);
  };

  const getStatusBadge = (a) => {
    if (uploadDone.includes(a.id)) return <span className="badge badge-success"><CheckCircle2 size={12} /> Submitted</span>;
    if (a.status === 'submitted') return <span className="badge badge-success"><CheckCircle2 size={12} /> Submitted</span>;
    if (a.status === 'graded') return <span className="badge badge-primary">Graded: {a.grade}</span>;
    if (a.urgent) return <span className="badge badge-danger"><AlertCircle size={12} /> Due Tomorrow</span>;
    return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Assignments</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track, upload, and review your assignments</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {filters.map(f => (
            <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </motion.div>

      {/* Summary Strip */}
      <motion.div variants={item}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Pending', val: 3, color: 'var(--warning)', bg: 'rgba(255,167,38,0.08)' },
          { label: 'Submitted', val: 1, color: 'var(--success)', bg: 'rgba(102,187,106,0.08)' },
          { label: 'Graded', val: 1, color: 'var(--primary)', bg: 'rgba(83,109,254,0.08)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 'var(--radius-md)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{s.label} assignments</div>
          </div>
        ))}
      </motion.div>

      {/* Assignment Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filtered.map((a, i) => (
          <motion.div key={a.id} variants={item} className="card"
            style={{ padding: '24px', borderLeft: `4px solid ${a.urgent && a.status === 'pending' ? 'var(--danger)' : a.status === 'graded' ? 'var(--primary)' : a.status === 'submitted' ? 'var(--success)' : 'var(--border)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{a.title}</span>
                  {getStatusBadge(a)}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px', lineHeight: 1.6 }}>{a.desc}</p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckSquare size={13} /> {a.subject}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> Due: {a.due}
                  </span>
                </div>
              </div>

              {/* Upload button */}
              {a.status === 'pending' && !uploadDone.includes(a.id) && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleUpload(a.id)}
                  className="btn btn-primary"
                  disabled={uploading === a.id}
                  style={{ padding: '11px 22px', fontSize: '0.9rem', flexShrink: 0 }}
                >
                  {uploading === a.id ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                      <Upload size={16} />
                    </motion.div>
                  ) : (
                    <><Upload size={16} /> Submit Work</>
                  )}
                </motion.button>
              )}
              {(uploadDone.includes(a.id) || a.status === 'submitted') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <CheckCircle2 size={18} /> Uploaded
                </div>
              )}
              {a.status === 'graded' && (
                <div style={{ background: 'rgba(83,109,254,0.08)', padding: '12px 20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', color: 'var(--primary)' }}>{a.grade}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score</div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 16px', color: 'var(--success)' }} />
            <p style={{ fontSize: '1rem' }}>All clear! No {filter.toLowerCase()} assignments.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Assignments;
