import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { CheckCircle2, XCircle, Search, Mail, Phone, BookOpen } from 'lucide-react';
import Modal from './Modal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminStudentGrid = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentStats, setStudentStats] = useState({ present: 0, absent: 0, late: 0, attendanceLogs: [] });
  const [statsLoading, setStatsLoading] = useState(false);

  // Progress Update State
  const [tempProgress, setTempProgress] = useState(35);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  const [toast, setToast] = useState('');
  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (!db) {
      console.error("AdminStudentGrid: Firestore not initialized");
      triggerToast("Firestore not initialized");
      return;
    }

    let unsub = () => {};
    try {
      // Fetch all students
      const usersRef = collection(db, 'users');
      // Using onSnapshot without where('role', '==', 'student') to avoid needing a composite index immediately if not set. 
      // We filter client-side since this is a small-scale app right now.
      unsub = onSnapshot(usersRef, (snap) => {
        const data = [];
        snap.forEach(doc => {
          const d = doc.data();
          if (d.role !== 'admin') {
            data.push({ id: doc.id, ...d });
          }
        });
        setStudents(data);
        setLoading(false);
      }, (error) => {
        console.error("AdminStudentGrid: Error fetching students list", error);
        setLoading(false);
      });
    } catch (err) {
      console.error("AdminStudentGrid: Failed to setup users listener", err);
      triggerToast("Failed to connect to students roster");
      setLoading(false);
    }

    return () => unsub();
  }, []);

  const handleMarkAttendance = async (e, studentId, status) => {
    e.stopPropagation(); // Prevent modal from opening
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    try {
      await addDoc(collection(db, `users/${studentId}/attendance`), {
        date: dateStr,
        status: status, // 'present' or 'absent'
        subject: 'General Class',
        createdAt: serverTimestamp()
      });
      // Optionally show a toast here
    } catch (err) {
      console.error("Error marking attendance:", err);
    }
  };

  const handleOpenStudent = async (student) => {
    setSelectedStudent(student);
    setTempProgress(student.courseProgress !== undefined ? student.courseProgress : 35);
    setStatsLoading(true);
    
    try {
      const attRef = collection(db, `users/${student.id}/attendance`);
      const snap = await getDocs(attRef);
      let p = 0, a = 0, l = 0;
      const logs = [];
      snap.forEach(doc => {
        const d = doc.data();
        logs.push({ id: doc.id, ...d });
        if (d.status === 'present') p++;
        else if (d.status === 'absent') a++;
        else if (d.status === 'late') { l++; p++; } // Late counts as present
      });
      // Sort logs by date (descending)
      logs.sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
      setStudentStats({ present: p, absent: a, late: l, attendanceLogs: logs });
    } catch (error) {
      console.error(error);
    }
    setStatsLoading(false);
  };

  const handleUpdateProgress = async () => {
    if (!selectedStudent) return;
    setUpdatingProgress(true);
    try {
      const userRef = doc(db, 'users', selectedStudent.id);
      await setDoc(userRef, {
        courseProgress: tempProgress
      }, { merge: true });
      setSelectedStudent(prev => ({ ...prev, courseProgress: tempProgress }));
    } catch (err) {
      console.error("Error updating progress:", err);
    } finally {
      setUpdatingProgress(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ marginTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Student Management</h2>
        
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px', flex: '1 1 200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '10px 16px 10px 46px', borderRadius: '100px', border: '1px solid var(--border)',
              background: 'var(--white)', fontSize: '0.9rem', outline: 'none', color: 'var(--dark)'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: '20px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 200, flex: 1, background: 'var(--white)', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <div className="grid-auto-cards-sm">
          <AnimatePresence>
            {filteredStudents.map(student => {
              const initials = student.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S';
              return (
                <motion.div 
                  key={student.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleOpenStudent(student)}
                  className="card card-p"
                  style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--white)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {student.photoURL ? (
                      <img src={student.photoURL} alt={student.displayName} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-on-primary)', fontWeight: 800 }}>{initials}</div>
                    )}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{student.displayName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{student.email}</div>
                    </div>
                  </div>

                  <div className="grid-2-col" style={{ gap: '8px', padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600 }}>ID</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{student.studentId}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600 }}>COURSE</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{student.course || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Progress</span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: (student.courseProgress !== undefined ? student.courseProgress : 35) >= 80 ? 'var(--success)' : 'var(--primary)'
                      }}>
                        {(student.courseProgress !== undefined ? student.courseProgress : 35)}% {(student.courseProgress !== undefined ? student.courseProgress : 35) >= 80 ? '🎓 Established' : '🆕 New'}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--surface)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        background: (student.courseProgress !== undefined ? student.courseProgress : 35) >= 80 ? 'var(--success)' : 'var(--primary)',
                        width: `${student.courseProgress !== undefined ? student.courseProgress : 35}%`,
                        borderRadius: '100px'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                    <button 
                      onClick={(e) => handleMarkAttendance(e, student.id, 'present')}
                      className="btn" 
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: 'rgba(102,187,106,0.1)', color: 'var(--success)', border: '1px solid rgba(102,187,106,0.2)' }}
                    >
                      <CheckCircle2 size={16} /> Present
                    </button>
                    <button 
                      onClick={(e) => handleMarkAttendance(e, student.id, 'absent')}
                      className="btn" 
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: 'rgba(239,83,80,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,83,80,0.2)' }}
                    >
                      <XCircle size={16} /> Absent
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="Student Statistics">
        {selectedStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                {selectedStudent.displayName?.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedStudent.displayName}</h3>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={14}/> {selectedStudent.email}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14}/> {selectedStudent.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            {statsLoading ? (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>Loading stats...</div>
            ) : (
              <>
                <div className="grid-stats-dashboard" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(102,187,106,0.1)', border: '1px solid rgba(102,187,106,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{studentStats.present}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', marginTop: '4px' }}>PRESENT</div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{studentStats.absent}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', marginTop: '4px' }}>ABSENT</div>
                  </div>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(83,109,254,0.1)', border: '1px solid rgba(83,109,254,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {studentStats.present + studentStats.absent > 0 
                        ? Math.round((studentStats.present / (studentStats.present + studentStats.absent)) * 100) 
                        : 0}%
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginTop: '4px' }}>ATTENDANCE RATE</div>
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    📈 Course Progress Tracker
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Progress: <strong style={{ color: 'var(--dark)' }}>{tempProgress}%</strong></span>
                      <span style={{ 
                        fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                        background: tempProgress >= 80 ? 'rgba(102,187,106,0.12)' : 'rgba(83,109,254,0.12)',
                        color: tempProgress >= 80 ? 'var(--success)' : 'var(--primary)'
                      }}>
                        {tempProgress >= 80 ? '🎓 Established Student' : '🆕 New Student'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={tempProgress} 
                        onChange={(e) => setTempProgress(parseInt(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <button 
                        onClick={handleUpdateProgress}
                        disabled={updatingProgress}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '6px', whiteSpace: 'nowrap' }}
                      >
                        {updatingProgress ? 'Updating...' : 'Update Progress'}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Recent Attendance Logs</h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    {studentStats.attendanceLogs.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No records found.</div>
                    ) : (
                      studentStats.attendanceLogs.map((log, i) => (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < studentStats.attendanceLogs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{log.date}</span>
                          <span style={{ 
                            fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '100px', textTransform: 'uppercase',
                            background: log.status === 'present' ? 'rgba(102,187,106,0.1)' : 'rgba(239,83,80,0.1)',
                            color: log.status === 'present' ? 'var(--success)' : 'var(--danger)'
                          }}>{log.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', padding: '12px 24px',
          background: 'rgba(239,83,80,0.95)', color: 'var(--text-on-primary)', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span>⚠️ {toast}</span>
        </div>
      )}
    </div>
  );
};

export default AdminStudentGrid;
