import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { 
  collection, query, where, getDocs, doc, setDoc, updateDoc, 
  onSnapshot, serverTimestamp, addDoc, writeBatch 
} from 'firebase/firestore';
import { 
  Users, UserPlus, Upload, Search, Filter, CheckCircle2, 
  Clock, AlertCircle, Phone, Mail, Share2, Copy, Send, 
  ExternalLink, FileSpreadsheet, ShieldAlert, Check, X, Edit3, Trash2 
} from 'lucide-react';
import Modal from '../Modal';
import { normalizePhoneNumber, validatePhoneNumber } from '../../utils/phoneUtils';

const STATUS_BADGES = {
  active: { label: 'Active', icon: '🟢', bg: 'rgba(34, 197, 94, 0.12)', color: '#16A34A', border: 'rgba(34, 197, 94, 0.3)' },
  pending_activation: { label: 'Pending Activation', icon: '🟡', bg: 'rgba(245, 158, 11, 0.12)', color: '#D97706', border: 'rgba(245, 158, 11, 0.3)' },
  alumni: { label: 'Alumni', icon: '🎓', bg: 'rgba(99, 102, 241, 0.12)', color: '#4F46E5', border: 'rgba(99, 102, 241, 0.3)' },
  suspended: { label: 'Suspended', icon: '🔴', bg: 'rgba(239, 68, 68, 0.12)', color: '#DC2626', border: 'rgba(239, 68, 68, 0.3)' },
  archived: { label: 'Archived', icon: '⚪', bg: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: 'rgba(100, 116, 139, 0.3)' }
};

const AdminStudentEnrollment = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'pending_activation', 'alumni', 'suspended', 'archived'
  const [courseFilter, setCourseFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [inviteStudent, setInviteStudent] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [importReport, setImportReport] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    countryCode: '+91',
    email: '',
    course: 'Basic Computer',
    class: 'Class 10',
    batch: 'Batch A',
    rollNumber: '',
    guardianName: '',
    guardianPhone: '',
    admissionDate: new Date().toISOString().split('T')[0],
    feePlan: '₹700 / Month',
    notes: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Realtime Firestore Listener for Students
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const usersRef = collection(db, 'users');
    
    const unsub = onSnapshot(usersRef, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.role === 'student' || (!data.role && data.status)) {
          list.push({
            id: docSnap.id,
            ...data,
            status: data.status || (data.claimed ? 'active' : 'pending_activation')
          });
        }
      });
      setStudents(list);
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to student records:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Search & Filter
  const filteredStudents = students.filter(s => {
    const statusMatch = statusFilter === 'all' || s.status === statusFilter;
    const courseMatch = courseFilter === 'all' || s.course === courseFilter;
    const batchMatch = batchFilter === 'all' || s.batch === batchFilter;
    
    const term = searchTerm.toLowerCase();
    const searchMatch = !term || 
      (s.name || s.displayName || s.fullName || '').toLowerCase().includes(term) ||
      (s.phone || s.phoneNumber || s.mobileNumber || '').includes(term) ||
      (s.email || '').toLowerCase().includes(term) ||
      (s.rollNumber || '').toLowerCase().includes(term) ||
      (s.studentId || '').toLowerCase().includes(term);

    return statusMatch && courseMatch && batchMatch && searchMatch;
  });

  // Count metrics
  const activeCount = students.filter(s => s.status === 'active').length;
  const pendingCount = students.filter(s => s.status === 'pending_activation').length;
  const alumniCount = students.filter(s => s.status === 'alumni').length;

  // Duplicate Check helper
  const checkDuplicateStudent = async (phoneFormatted, emailLower) => {
    const usersRef = collection(db, 'users');
    
    // Check phone
    if (phoneFormatted) {
      const qPhone = query(usersRef, where('phone', '==', phoneFormatted));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) {
        const existing = snapPhone.docs[0].data();
        return { isDuplicate: true, type: 'phone', data: existing, id: snapPhone.docs[0].id };
      }
    }
    // Check email
    if (emailLower) {
      const qEmail = query(usersRef, where('email', '==', emailLower));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const existing = snapEmail.docs[0].data();
        return { isDuplicate: true, type: 'email', data: existing, id: snapEmail.docs[0].id };
      }
    }

    return { isDuplicate: false };
  };

  // Add Student Handler
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Please enter full student name.'); return; }
    if (!form.phone.trim()) { setFormError('Please enter mobile number.'); return; }
    if (!form.course.trim()) { setFormError('Please select a course.'); return; }

    const rawNational = normalizePhoneNumber(form.phone, form.countryCode);
    const valid = validatePhoneNumber(rawNational, form.countryCode);
    if (!valid.isValid) { setFormError(valid.error); return; }

    const formattedPhone = `${form.countryCode}${rawNational}`;
    const emailLower = (form.email || '').trim().toLowerCase();

    setFormSubmitting(true);
    setFormError('');

    try {
      // 1. Duplicate check
      const dup = await checkDuplicateStudent(formattedPhone, emailLower);
      if (dup.isDuplicate) {
        setDuplicateWarning(dup);
        setFormSubmitting(false);
        return;
      }

      // 2. Pre-create student record in Firestore
      const studentDocId = `student_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const docRef = doc(db, 'users', studentDocId);

      const year = new Date().getFullYear();
      const generatedStudentId = `COMP-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newStudentData = {
        uid: studentDocId,
        studentId: generatedStudentId,
        name: form.name.trim(),
        displayName: form.name.trim(),
        fullName: form.name.trim(),
        phone: formattedPhone,
        mobileNumber: formattedPhone,
        phoneNumber: formattedPhone,
        email: emailLower,
        course: form.course,
        batch: form.batch,
        class: form.class,
        rollNumber: form.rollNumber.trim(),
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        admissionDate: form.admissionDate,
        feePlan: form.feePlan,
        notes: form.notes.trim(),
        status: 'pending_activation',
        claimed: false,
        profileCompleted: false,
        role: 'student',
        createdBy: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        phoneVerified: false,
        emailVerified: false,
        feeStatus: 'pending'
      };

      await setDoc(docRef, newStudentData);
      
      triggerToast(`Student record for ${form.name} created! (Pending Activation)`);
      setIsAddModalOpen(false);
      setForm({
        name: '', phone: '', countryCode: '+91', email: '', course: 'Basic Computer',
        class: 'Class 10', batch: 'Batch A', rollNumber: '', guardianName: '',
        guardianPhone: '', admissionDate: new Date().toISOString().split('T')[0],
        feePlan: '₹700 / Month', notes: ''
      });
    } catch (err) {
      console.error("Error creating student profile:", err);
      setFormError(err.message || 'Failed to save student profile.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Status Change Handler
  const handleUpdateStatus = async (studentId, newStatus) => {
    try {
      const sRef = doc(db, 'users', studentId);
      await updateDoc(sRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      triggerToast(`Status updated to ${STATUS_BADGES[newStatus]?.label || newStatus}`);
    } catch (err) {
      console.error("Failed updating status:", err);
      triggerToast("Failed to update status.");
    }
  };

  // Bulk CSV Import Handler
  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (lines.length <= 1) {
        triggerToast("CSV file is empty or missing data rows.");
        return;
      }

      // Header row
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows = lines.slice(1);

      let processed = 0;
      let imported = 0;
      let duplicates = 0;
      let invalid = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        processed++;
        const rowNum = i + 2;
        const cols = rows[i].split(',').map(c => c.trim());
        
        if (cols.length < 2) {
          invalid++;
          errors.push({ row: rowNum, error: 'Insufficient columns' });
          continue;
        }

        const name = cols[0] || '';
        const rawPhone = cols[1] || '';
        const course = cols[2] || 'Basic Computer';
        const batch = cols[3] || 'Batch A';
        const email = (cols[4] || '').toLowerCase();
        const guardian = cols[5] || '';

        if (!name) {
          invalid++;
          errors.push({ row: rowNum, error: 'Missing Name' });
          continue;
        }

        const normPhone = normalizePhoneNumber(rawPhone, '+91');
        if (!normPhone || normPhone.length !== 10) {
          invalid++;
          errors.push({ row: rowNum, error: `Invalid Phone Number: ${rawPhone}` });
          continue;
        }

        const formattedPhone = `+91${normPhone}`;

        // Check duplicate
        const dup = await checkDuplicateStudent(formattedPhone, email);
        if (dup.isDuplicate) {
          duplicates++;
          errors.push({ row: rowNum, error: `Duplicate Student (${dup.type}: ${cols[1]})` });
          continue;
        }

        // Create doc
        try {
          const docId = `student_${Date.now()}_${i}_${Math.floor(1000 + Math.random() * 9000)}`;
          const docRef = doc(db, 'users', docId);
          await setDoc(docRef, {
            uid: docId,
            studentId: `COMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            name,
            displayName: name,
            fullName: name,
            phone: formattedPhone,
            mobileNumber: formattedPhone,
            phoneNumber: formattedPhone,
            email,
            course,
            batch,
            guardianName: guardian,
            status: 'pending_activation',
            claimed: false,
            profileCompleted: false,
            role: 'student',
            createdBy: 'admin',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            feeStatus: 'pending'
          });
          imported++;
        } catch (err) {
          invalid++;
          errors.push({ row: rowNum, error: err.message });
        }
      }

      setImportReport({
        total: processed,
        imported,
        duplicates,
        invalid,
        errors
      });
      setIsImportModalOpen(true);
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      
      {/* Toast Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 99999, background: '#0F172A', color: '#FFF', padding: '12px 24px',
              borderRadius: '100px', fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <CheckCircle2 size={18} color="#4ADE80" /> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Main Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 950, color: 'var(--dark)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Student Enrollment & Roster 👨‍🎓
          </h2>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Admin pre-creates student records. Students claim their workspace via OTP or Email upon first login.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{
            padding: '12px 20px',
            borderRadius: '100px',
            background: 'var(--white)',
            border: '1.5px solid var(--border)',
            color: 'var(--dark)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <Upload size={16} color="var(--primary)" /> Bulk Import (CSV)
            <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
          </label>

          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '12px 24px',
              borderRadius: '100px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary), #3B82F6)',
              color: '#FFF',
              fontWeight: 900,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
              minHeight: '44px'
            }}
          >
            <UserPlus size={18} /> + Add Student
          </button>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px'
      }}>
        <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '18px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL STUDENTS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 950, color: 'var(--dark)', marginTop: '2px' }}>{students.length}</div>
        </div>

        <div style={{ background: 'rgba(34, 197, 94, 0.06)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 800, textTransform: 'uppercase' }}>🟢 ACTIVE</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#16A34A', marginTop: '2px' }}>{activeCount}</div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.06)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 800, textTransform: 'uppercase' }}>🟡 PENDING ACTIVATION</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#D97706', marginTop: '2px' }}>{pendingCount}</div>
        </div>

        <div style={{ background: 'rgba(99, 102, 241, 0.06)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div style={{ fontSize: '0.72rem', color: '#4F46E5', fontWeight: 800, textTransform: 'uppercase' }}>🎓 ALUMNI</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#4F46E5', marginTop: '2px' }}>{alumniCount}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{
        background: 'var(--white)',
        padding: '14px 18px',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: '🟢 Active' },
            { id: 'pending_activation', label: '🟡 Pending Activation' },
            { id: 'alumni', label: '🎓 Alumni' },
            { id: 'suspended', label: '🔴 Suspended' },
            { id: 'archived', label: '⚪ Archived' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '100px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: statusFilter === tab.id ? 'var(--primary)' : 'var(--bg)',
                color: statusFilter === tab.id ? '#FFF' : 'var(--text-muted)',
                minHeight: '38px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '340px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, phone, email, roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '100px',
              border: '1px solid var(--border)',
              fontSize: '0.88rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Roster Grid / Table */}
      {loading ? (
        <div style={{ background: 'var(--white)', padding: '40px', borderRadius: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading student roster...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div style={{ background: 'var(--white)', padding: '40px', borderRadius: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No students found matching the selected status or search query.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredStudents.map(s => {
            const badge = STATUS_BADGES[s.status] || STATUS_BADGES.pending_activation;
            return (
              <div key={s.id} style={{
                background: 'var(--white)',
                borderRadius: '22px',
                padding: '20px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                position: 'relative'
              }}>
                <div>
                  {/* Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '100px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {badge.icon} {badge.label}
                    </span>

                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                      ID: {s.studentId || 'N/A'}
                    </span>
                  </div>

                  {/* Student Name & Details */}
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 900, color: 'var(--dark)' }}>
                    {s.name || s.displayName || s.fullName}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} color="var(--primary)" /> <strong>{s.phone || s.phoneNumber || s.mobileNumber}</strong>
                    </div>
                    {s.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} color="var(--primary)" /> {s.email}
                      </div>
                    )}
                    <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--dark)' }}>
                      Course: {s.course || 'Basic Computer'} • Batch: {s.batch || 'Batch A'}
                    </div>
                  </div>
                </div>

                {/* Footer Controls & Invitation Button */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  {s.status === 'pending_activation' ? (
                    <button
                      onClick={() => setInviteStudent(s)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '100px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        color: '#FFF',
                        fontWeight: 900,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        minHeight: '40px'
                      }}
                    >
                      <Share2 size={14} /> Invite Student
                    </button>
                  ) : (
                    <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={16} /> Account Claimed
                    </div>
                  )}

                  {/* Quick Status Dropdown */}
                  <select
                    value={s.status}
                    onChange={(e) => handleUpdateStatus(s.id, e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '100px',
                      border: '1px solid var(--border)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      background: 'var(--bg)',
                      color: 'var(--dark)',
                      cursor: 'pointer',
                      minHeight: '40px'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="pending_activation">Pending</option>
                    <option value="alumni">Alumni</option>
                    <option value="suspended">Suspend</option>
                    <option value="archived">Archive</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ➕ ADD STUDENT MODAL */}
      {isAddModalOpen && (
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="➕ Pre-Create Student Profile">
          <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {formError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800 }}>
                {formError}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Country Code</label>
                <select
                  value={form.countryCode}
                  onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                >
                  <option value="+91">🇮🇳 +91 (India)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Course *</label>
                <select
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                >
                  <option value="Basic Computer">Basic Computer</option>
                  <option value="Basic with AI">Basic with AI</option>
                  <option value="Tally ERP 9">Tally ERP 9</option>
                  <option value="Full Stack Web Dev">Full Stack Web Dev</option>
                  <option value="Python & AI">Python & AI</option>
                  <option value="Class 10 Science">Class 10 Science</option>
                  <option value="Class 12 Physics">Class 12 Physics</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Batch *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Batch A / Morning"
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Email (Optional)</label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. R-102"
                  value={form.rollNumber}
                  onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={formSubmitting}
              style={{
                marginTop: '10px',
                padding: '14px',
                borderRadius: '100px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--primary), #3B82F6)',
                color: '#FFF',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: formSubmitting ? 'wait' : 'pointer'
              }}
            >
              {formSubmitting ? 'Saving Pre-Created Record...' : 'Pre-Create Student Profile'}
            </button>
          </form>
        </Modal>
      )}

      {/* ⚠️ DUPLICATE WARNING MODAL */}
      {duplicateWarning && (
        <Modal isOpen={Boolean(duplicateWarning)} onClose={() => setDuplicateWarning(null)} title="⚠️ Duplicate Student Record Found">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--dark)' }}>
              A student record with this <strong>{duplicateWarning.type}</strong> already exists:
            </p>
            <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '12px', fontSize: '0.85rem' }}>
              <div><strong>Name:</strong> {duplicateWarning.data.name}</div>
              <div><strong>Phone:</strong> {duplicateWarning.data.phone}</div>
              <div><strong>Course:</strong> {duplicateWarning.data.course} ({duplicateWarning.data.batch})</div>
              <div><strong>Status:</strong> {duplicateWarning.data.status}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => {
                  setSearchTerm(duplicateWarning.data.phone);
                  setDuplicateWarning(null);
                  setIsAddModalOpen(false);
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}
              >
                Open Existing Profile
              </button>
              <button
                onClick={() => setDuplicateWarning(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '100px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 800, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 💬 INVITATION DRAWER MODAL */}
      {inviteStudent && (
        <Modal isOpen={Boolean(inviteStudent)} onClose={() => setInviteStudent(null)} title="✉️ Send Student Workspace Invitation">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '14px', fontSize: '0.85rem' }}>
              <div><strong>Student:</strong> {inviteStudent.name}</div>
              <div><strong>Mobile:</strong> {inviteStudent.phone}</div>
              <div><strong>Course:</strong> {inviteStudent.course} ({inviteStudent.batch})</div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Choose how you would like to send the activation instructions:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* WhatsApp */}
              <button
                onClick={() => {
                  const msg = encodeURIComponent(
                    `Hi ${inviteStudent.name},\n\nYour Compution Student Workspace is ready.\n\nLogin using your registered mobile number: ${inviteStudent.phone}.\nNo registration required.\n\nOpen App: https://compution.app/login`
                  );
                  const cleanPhone = (inviteStudent.phone || '').replace(/\D/g, '');
                  window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                }}
                style={{
                  padding: '14px 20px', borderRadius: '14px', border: 'none',
                  background: '#25D366', color: '#FFF', fontWeight: 900, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                💬 Send WhatsApp Invitation
              </button>

              {/* SMS */}
              <button
                onClick={() => {
                  const msg = encodeURIComponent(
                    `Hi ${inviteStudent.name}, Your Compution Student Workspace is ready. Login using your mobile: ${inviteStudent.phone}. Open: https://compution.app/login`
                  );
                  window.open(`sms:${inviteStudent.phone}?body=${msg}`, '_self');
                }}
                style={{
                  padding: '14px 20px', borderRadius: '14px', border: '1px solid var(--border)',
                  background: 'var(--white)', color: 'var(--dark)', fontWeight: 800, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                📱 Send SMS Invitation
              </button>

              {/* Copy Link */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Hi ${inviteStudent.name}, Your Compution Student Workspace is ready. Login using your mobile number ${inviteStudent.phone} at https://compution.app/login`);
                  triggerToast("Invitation message copied to clipboard!");
                  setInviteStudent(null);
                }}
                style={{
                  padding: '14px 20px', borderRadius: '14px', border: '1px solid var(--border)',
                  background: 'var(--white)', color: 'var(--dark)', fontWeight: 800, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Copy size={16} /> Copy Invitation Text
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 📥 BULK IMPORT AUDIT REPORT MODAL */}
      {importReport && (
        <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="📊 Bulk CSV Import Audit Report">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PROCESSED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{importReport.total}</div>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '12px', color: '#16A34A' }}>
                <div style={{ fontSize: '0.72rem' }}>IMPORTED</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{importReport.imported}</div>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px', color: '#D97706' }}>
                <div style={{ fontSize: '0.72rem' }}>SKIPPED/ERRORS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{importReport.duplicates + importReport.invalid}</div>
              </div>
            </div>

            {importReport.errors.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--bg)', padding: '12px', borderRadius: '12px', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 800, marginBottom: '8px', color: '#DC2626' }}>Skipped / Error Log:</div>
                {importReport.errors.map((err, idx) => (
                  <div key={idx} style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
                    • Line {err.row}: {err.error}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsImportModalOpen(false)}
              style={{ padding: '14px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#FFF', fontWeight: 900, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminStudentEnrollment;
