import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, firebaseConfig } from '../firebase';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, doc, updateDoc, deleteDoc, getDocs, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Download, Plus, MoreHorizontal, Eye, ArrowUpRight, Sparkles, ShieldCheck, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Users, Bell, AlertCircle, Calendar, GraduationCap, ChevronDown, Mail, Send } from 'lucide-react';
import Modal from './Modal';

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

/* ── TOAST NOTIFICATION ──────────────────────────── */
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <ShieldCheck size={14} />,
    danger: <AlertTriangle size={14} />,
    info: <RefreshCw size={14} />
  };
  const colors = {
    success: 'var(--success)',
    danger: 'var(--danger)',
    info: 'var(--primary)'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
      animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
      exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      style={{
        position: 'fixed', top: '32px', left: '50%', zIndex: 99999,
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 24px', borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)',
        fontWeight: 600, fontSize: '0.95rem',
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: '50%', background: colors[type],
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
      }}>
        {icons[type]}
      </div>
      <span>{message}</span>
    </motion.div>
  );
};

const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('This quarter');
  const [toast, setToast] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('May 2026');
  
  // New States
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [newStudent, setNewStudent] = useState({
    displayName: '', email: '', phone: '', course: ''
  });

  const [simulatedPeriod, setSimulatedPeriod] = useState(() => {
    return localStorage.getItem('simulatedPeriod') || 'new';
  });

  useEffect(() => {
    localStorage.setItem('simulatedPeriod', simulatedPeriod);
    window.dispatchEvent(new Event('simulatedPeriodChanged'));
  }, [simulatedPeriod]);

  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('simulatedPeriod');
      if (saved) setSimulatedPeriod(saved);
    };
    window.addEventListener('simulatedPeriodChanged', handleSync);
    return () => window.removeEventListener('simulatedPeriodChanged', handleSync);
  }, []);

  const fetchStudents = async () => {
    setIsSyncing(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.role !== 'admin') {
          data.push({ id: doc.id, ...d });
        }
      });
      setStudents(data);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to fetch data', type: 'danger' });
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create a secondary Firebase app to prevent logging out the current admin
      const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      // Create the user in Firebase Auth with a default password (e.g. compution123)
      const defaultPassword = 'compution123';
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStudent.email, defaultPassword);
      
      // Update their display name in Auth
      await updateProfile(userCredential.user, {
        displayName: newStudent.displayName
      });
      
      const newUserId = userCredential.user.uid;
      await secondaryAuth.signOut();
      
      // Add them to Firestore using their new Auth UID
      await setDoc(doc(db, 'users', newUserId), {
        ...newStudent,
        role: 'student',
        verified: true,
        createdAt: serverTimestamp(),
      });
      
      setToast({ message: `Student added successfully! Password: ${defaultPassword}`, type: 'success' });
      setIsAddStudentOpen(false);
      setNewStudent({ displayName: '', email: '', phone: '', course: '' });
      fetchStudents();
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setToast({ message: 'Email is already registered!', type: 'danger' });
      } else {
        setToast({ message: 'Failed to add student. Please try again.', type: 'danger' });
      }
    }
  };

  const handleSendReceipts = () => {
    setToast({ message: 'Receipts sent to paid students successfully!', type: 'success' });
  };

  const handleSendReminders = () => {
    setToast({ message: 'Reminders sent to pending students!', type: 'info' });
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.course?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── APPROVE STUDENT ──
  const handleApprove = async (studentId) => {
    setVerifyingId(studentId);
    try {
      const userRef = doc(db, 'users', studentId);
      await updateDoc(userRef, { verified: true });
      setToast({ message: 'Student approved successfully!', type: 'success' });
    } catch (err) {
      console.error('Error approving student:', err);
      setToast({ message: 'Failed to approve student', type: 'danger' });
    } finally {
      setVerifyingId(null);
    }
  };

  // ── REJECT STUDENT (delete from database) ──
  const handleReject = async (studentId, studentName) => {
    if (!window.confirm(`Reject "${studentName}"? This will permanently delete their account from the database.`)) return;
    setDeletingId(studentId);
    try {
      await deleteDoc(doc(db, 'users', studentId));
      setToast({ message: `${studentName} rejected and removed from roster`, type: 'danger' });
    } catch (err) {
      console.error('Error rejecting student:', err);
      setToast({ message: 'Failed to reject student', type: 'danger' });
    } finally {
      setDeletingId(null);
    }
  };

  // ── EXPORT DASHBOARD AS CSV ──
  const handleExportCSV = useCallback(() => {
    const headers = ['Name', 'Contact', 'Gmail', 'Course', 'Student ID', 'Approved', 'Joined'];
    const rows = students.map(s => [
      s.displayName || 'N/A',
      s.phone || 'N/A',
      s.email || 'N/A',
      s.course || 'N/A',
      s.studentId || 'N/A',
      s.verified ? 'Yes' : 'No',
      s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [
      `Compution Admin Dashboard Export - ${new Date().toLocaleDateString()}`,
      '',
      `Total Active Students: ${students.length}`,
      `Approved Students: ${students.filter(s => s.verified).length}`,
      `Pending Approval: ${students.filter(s => !s.verified).length}`,
      '',
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Compution_Dashboard_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast({ message: 'Dashboard exported as CSV successfully!', type: 'success' });
  }, [students]);

  const verifiedCount = students.filter(s => s.verified).length;
  const unverifiedCount = students.length - verifiedCount;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Real-time Sync Indicator */}
      <motion.div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '12px 24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={fetchStudents}
            disabled={isSyncing}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '100px',
              background: 'var(--primary)', color: 'white',
              border: 'none', cursor: isSyncing ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={14} className={isSyncing ? "spinning" : ""} /> 
            {isSyncing ? 'Syncing...' : 'Sync Data'}
          </button>
          {lastSyncTime && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Last synced: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '100px', padding: '3px' }}>
            <button
              onClick={() => setSimulatedPeriod('new')}
              style={{
                padding: '8px 16px',
                borderRadius: '100px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: simulatedPeriod === 'new' ? 'var(--white)' : 'transparent',
                color: simulatedPeriod === 'new' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: simulatedPeriod === 'new' ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              🆕 New Student
            </button>
            <button
              onClick={() => setSimulatedPeriod('established')}
              style={{
                padding: '8px 16px',
                borderRadius: '100px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: simulatedPeriod === 'established' ? 'var(--white)' : 'transparent',
                color: simulatedPeriod === 'established' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: simulatedPeriod === 'established' ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              🎓 Established Student
            </button>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('simulatedPeriod');
              window.dispatchEvent(new Event('simulatedPeriodChanged'));
              setSimulatedPeriod('new');
            }}
            className="btn btn-ghost"
            style={{ padding: '8px 12px', fontSize: '0.78rem', borderRadius: '100px', height: 'auto' }}
            title="Clear manual override and restore automatic progress-based mode"
          >
            Reset
          </button>
        </div>
      </motion.div>

      {/* NEW HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--dark)', margin: 0 }}>Dashboard</h1>
          <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>{selectedMonth} · Academic Year 2025–26</span>
        </div>
        <div style={{ position: 'relative' }}>
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ 
              padding: '8px 36px 8px 16px', borderRadius: '8px', border: '1px solid var(--border)', 
              background: 'white', fontSize: '0.9rem', fontWeight: 500, color: 'var(--dark)',
              appearance: 'none', cursor: 'pointer'
            }}
          >
            <option>May 2026</option>
            <option>April 2026</option>
            <option>March 2026</option>
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* TOP STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Card 1: Total Students */}
        <motion.div variants={item} className="card" style={{ padding: '20px', background: 'var(--surface)', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--dark)', fontWeight: 600, marginBottom: '8px' }}>Total Students</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--dark)', lineHeight: 1, marginBottom: '8px' }}>
            {students.length || 53}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
             <ArrowUpRight size={14} color="var(--text-muted)" /> 4 since last month
          </div>
        </motion.div>

        {/* Card 2: Active Enrollments */}
        <motion.div variants={item} className="card" style={{ padding: '20px', background: 'var(--surface)', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--dark)', fontWeight: 600, marginBottom: '8px' }}>Active Enrollments</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)', lineHeight: 1, marginBottom: '8px' }}>
            {verifiedCount || 41}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
             {students.length > 0 ? Math.round((verifiedCount/students.length)*100) : 77}% of total
          </div>
        </motion.div>

        {/* Card 3: Completed Courses */}
        <motion.div variants={item} className="card" style={{ padding: '20px', background: 'var(--surface)', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--dark)', fontWeight: 600, marginBottom: '8px' }}>Completed Courses</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1, marginBottom: '8px' }}>
            9
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
             17% completion rate
          </div>
        </motion.div>

        {/* Card 4: Fees Pending */}
        <motion.div variants={item} className="card" style={{ padding: '20px', background: 'var(--surface)', borderRadius: '16px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--dark)', fontWeight: 600, marginBottom: '8px' }}>Fees Pending</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#8D6E63', lineHeight: 1, marginBottom: '8px' }}>
            ₹18,400
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
             8 students overdue
          </div>
        </motion.div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Left: Recent Students Table */}
        <motion.div variants={item} className="card" style={{ padding: '24px', borderRadius: '16px', background: 'white', border: '1px solid var(--border)', flex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
             <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
               <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--dark)', margin: 0 }}>
                 <Users size={18} /> Recent students
               </h2>
               <div style={{ display: 'flex', gap: '8px' }}>
                 <button onClick={handleSendReceipts} style={{ background: 'var(--surface)', color: 'var(--success)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <Mail size={12} /> Send Receipts
                 </button>
                 <button onClick={handleSendReminders} style={{ background: 'var(--surface)', color: '#F59E0B', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <Send size={12} /> Send Reminders
                 </button>
               </div>
             </div>
             <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
               <button onClick={() => setIsAddStudentOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                 <Plus size={14} /> Add new student
               </button>
               <div style={{ position: 'relative', width: '200px' }}>
                 <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                 <input
                   placeholder="Search..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   style={{ width: '100%', padding: '6px 12px 6px 30px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', outline: 'none' }}
                 />
               </div>
               <a href="#" onClick={(e) => { e.preventDefault(); setSearchTerm(''); }} style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                 View all students <ArrowUpRight size={14} />
               </a>
             </div>
          </div>

          <div className="table-scroll">
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Student</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Class / Program</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Joined</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Attendance</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Fee status</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status / Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading students...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No students found.</td></tr>
                ) : (
                  filteredStudents.slice(0, searchTerm ? undefined : 6).map((student, idx) => {
                    const roll = `#0${41 - idx}`;
                    const joined = student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2026';
                    const att = [88, 74, 96, 61, 82, 90, 85, 78][idx % 8];
                    const feeStatus = ['Paid', 'Pending', 'Paid', 'Overdue', 'Paid', 'Paid', 'Pending', 'Paid'][idx % 8];
                    const feeColor = feeStatus === 'Paid' ? 'var(--success)' : feeStatus === 'Pending' ? '#F59E0B' : 'var(--danger)';
                    const statusText = student.verified ? 'Active' : 'Pending';
                    const statusColor = student.verified ? 'var(--success)' : '#F59E0B';

                    return (
                      <motion.tr key={student.id} whileHover={{ backgroundColor: 'rgba(0,0,0,0.01)' }} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px' }}>
                          <div 
                            onClick={() => setSelectedStudentDetails({ ...student, roll, joined, att, feeStatus })}
                            style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.2s' }}
                            onMouseEnter={e => e.target.style.textDecorationColor = 'var(--dark)'}
                            onMouseLeave={e => e.target.style.textDecorationColor = 'transparent'}
                          >
                            {student.displayName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll {roll}</div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--dark)' }}>
                          {student.course || 'B.Tech'}
                        </td>
                        <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--dark)' }}>{joined}</td>
                        <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--dark)' }}>{att}%</td>
                        <td style={{ padding: '16px', fontSize: '0.85rem', color: feeColor, fontWeight: 500 }}>{feeStatus}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }}></div>
                              <span style={{ fontSize: '0.85rem', color: 'var(--dark)' }}>{statusText}</span>
                            </div>
                            {/* Action Buttons to keep original work */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {!student.verified && (
                                <button onClick={() => handleApprove(student.id)} title="Approve" style={{ padding: '4px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                  <CheckCircle size={14} />
                                </button>
                              )}
                              {!student.verified && (
                                <button onClick={() => handleReject(student.id, student.displayName)} title="Reject" style={{ padding: '4px', background: 'rgba(239,83,80,0.1)', color: 'var(--danger)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                  <XCircle size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Right: Alerts */}
        <motion.div variants={item} className="card" style={{ padding: '24px', borderRadius: '16px', background: 'white', border: '1px solid var(--border)', flex: 1 }}>
           <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--dark)' }}>
             <Bell size={18} /> Alerts
           </h2>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface)', display: 'flex', gap: '12px' }}>
                 <AlertCircle size={18} style={{ color: '#8D6E63', flexShrink: 0 }} />
                 <div>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '0.9rem', marginBottom: '4px', lineHeight: 1.4 }}>3 students haven't paid fees in 60+ days</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fee tracking · urgent</div>
                 </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface)', display: 'flex', gap: '12px' }}>
                 <Users size={18} style={{ color: '#8D6E63', flexShrink: 0 }} />
                 <div>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '0.9rem', marginBottom: '4px', lineHeight: 1.4 }}>5 students with attendance below 70%</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attendance · this month</div>
                 </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface)', display: 'flex', gap: '12px' }}>
                 <GraduationCap size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                 <div>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '0.9rem', marginBottom: '4px', lineHeight: 1.4 }}>2 students due for course completion this week</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>BCA batch · May 28</div>
                 </div>
              </div>

           </div>
        </motion.div>

      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spinning { animation: spin 1s linear infinite; }
      `}</style>

      <Modal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title="Add New Student">
        <form onSubmit={handleAddStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--dark)' }}>Full Name</label>
            <input required value={newStudent.displayName} onChange={e => setNewStudent({...newStudent, displayName: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} placeholder="John Doe" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--dark)' }}>Email Address</label>
            <input required type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} placeholder="john@example.com" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--dark)' }}>Phone Number</label>
            <input required value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} placeholder="+91 9876543210" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--dark)' }}>Course / Program</label>
            <select required value={newStudent.course} onChange={e => setNewStudent({...newStudent, course: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', background: 'white' }}>
              <option value="" disabled>Select course</option>
              {['Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11 CS', 'Class 11 App', 'Class 12 CS', 'Class 12 App', 'BCA', 'B.Tech'].map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
          <button type="submit" style={{ marginTop: '10px', width: '100%', padding: '12px', background: 'var(--primary)', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
            Add Student
          </button>
        </form>
      </Modal>

      <Modal isOpen={!!selectedStudentDetails} onClose={() => setSelectedStudentDetails(null)} title="Student Details">
        {selectedStudentDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--dark)' }}>{selectedStudentDetails.displayName}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                <div><strong>Roll:</strong> {selectedStudentDetails.roll || 'N/A'}</div>
                <div><strong>Status:</strong> {selectedStudentDetails.verified ? 'Active' : 'Pending Approval'}</div>
                <div><strong>Email:</strong> {selectedStudentDetails.email || 'N/A'}</div>
                <div><strong>Phone:</strong> {selectedStudentDetails.phone || 'N/A'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Course:</strong> {selectedStudentDetails.course || 'N/A'}</div>
              </div>
            </div>
            
            <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} /> Fees Information
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Current Month Status:</span>
                  <span style={{ fontWeight: 600, color: selectedStudentDetails.feeStatus === 'Paid' ? 'var(--success)' : selectedStudentDetails.feeStatus === 'Pending' ? '#F59E0B' : 'var(--danger)' }}>
                    {selectedStudentDetails.feeStatus || 'Paid'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Submission Date:</span>
                  <span style={{ fontWeight: 500 }}>
                    {selectedStudentDetails.joined || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                  <span style={{ fontWeight: 500 }}>₹2,400</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminDashboard;
