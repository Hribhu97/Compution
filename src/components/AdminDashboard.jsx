import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Search, Download, Plus, MoreHorizontal, Eye, ArrowUpRight } from 'lucide-react';

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('This quarter');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const data = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.role !== 'admin') data.push({ id: doc.id, ...d });
      });
      setStudents(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* HEADER */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '24px' }}>Admin Dashboard</h1>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {['This quarter', 'This year', 'Last year'].map((tab) => (
              <div 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                style={{ 
                  position: 'relative', paddingBottom: '12px', fontWeight: activeTab === tab ? 600 : 500, 
                  fontSize: '0.95rem', color: activeTab === tab ? 'var(--dark)' : 'var(--text-muted)', 
                  cursor: 'pointer', transition: 'color 0.2s'
                }}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="adminTabIndicator"
                    style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--dark)' }} 
                  />
                )}
              </div>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.9rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Download size={16} /> Export as PDF
          </motion.button>
        </div>
      </div>

      {/* TOP STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        {[
          { label: 'Active users', value: students.length, suffix: '' },
          { label: 'Scores created', value: students.length * 4 + 17, suffix: '' },
          { label: 'Av. session', value: '26', suffix: 'min' },
          { label: 'Assignments submitted', value: '62', suffix: '', trend: '+5%' }
        ].map((stat, i) => (
          <motion.div key={i} variants={item} whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.06)' }} className="card card-p" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dark)' }}>{stat.label}</div>
              {i === 2 ? <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 7 days</div> : 
               i === 3 ? <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 7 days</div> :
               <Eye size={16} color="var(--text-light)" />}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--dark)', lineHeight: 1 }}>{stat.value}</span>
              {stat.suffix && <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>{stat.suffix}</span>}
              {stat.trend && <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center' }}><ArrowUpRight size={14}/>{stat.trend}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* MIDDLE SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Progress Bars Card */}
        <motion.div variants={item} whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.06)' }} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--dark)', marginBottom: '4px' }}>18 New assignments</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 7 days</div>
            </div>
            <Eye size={16} color="var(--text-light)" />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Compositions', val: 6, max: 10, color: '#10B981' },
              { label: 'Worksheets', val: 4, max: 10, color: '#EC4899' },
              { label: 'Performances', val: 8, max: 10, color: '#3B82F6' }
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ width: '100%', height: '12px', background: 'var(--surface)', borderRadius: '10px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: `${(b.val/b.max)*100}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    style={{ height: '100%', background: b.color, borderRadius: '10px' }} 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>{b.label}</span>
                  <span>{b.val}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Circular Progress Card */}
        <motion.div variants={item} whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.06)' }} className="card card-p" style={{ position: 'relative' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'absolute', top: 24, left: 24, right: 24, zIndex: 10 }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--dark)', marginBottom: '4px' }}>Assignment success</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 7 days</div>
            </div>
            <Eye size={16} color="var(--text-light)" />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: '40px' }}>
            <div style={{ position: 'relative', width: '180px', height: '180px' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--surface)" strokeWidth="12" />
                <motion.circle 
                  cx="50" cy="50" r="40" fill="none" stroke="#10B981" strokeWidth="12" 
                  strokeDasharray="251.2" 
                  initial={{ strokeDashoffset: 251.2 }} 
                  animate={{ strokeDashoffset: 251.2 * (1 - 0.9) }} 
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                  strokeLinecap="round" 
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--dark)', lineHeight: 1 }}>90%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Positive grades</span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      {/* TABLE SECTION */}
      <motion.div variants={item}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)' }}>Student breakdown</h2>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                placeholder="Search student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} /> Export as CSV
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dark)', fontWeight: 500 }}>
              <Plus size={16} /> Add students
            </motion.button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Student <span>↓</span></th>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Last activity <span>↓</span></th>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Course</th>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>ID <span>↓</span></th>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Attendance <span>↓</span></th>
                <th style={{ padding: '16px', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No students found.</td></tr>
              ) : (
                filteredStudents.map(student => {
                  const initials = student.displayName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'S';
                  return (
                    <motion.tr 
                      key={student.id} 
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.01)' }}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {student.photoURL ? (
                            <img src={student.photoURL} alt={student.displayName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dark)' }}>{initials}</div>
                          )}
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--dark)' }}>{student.displayName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Today</td>
                      <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--dark)' }}>{student.course || 'N/A'}</td>
                      <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{student.studentId}</td>
                      <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--dark)' }}>{Math.floor(Math.random() * 20 + 80)}%</td>
                      <td style={{ padding: '16px', color: 'var(--text-light)', cursor: 'pointer' }}><motion.div whileHover={{ scale: 1.1, color: 'var(--dark)' }}><MoreHorizontal size={18} /></motion.div></td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

    </motion.div>
  );
};

export default AdminDashboard;
