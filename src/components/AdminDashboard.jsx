import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, firebaseConfig, syncStudentFeeAggregates } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, collectionGroup, doc, updateDoc, deleteDoc, getDocs, addDoc, setDoc, serverTimestamp, onSnapshot, query, where, orderBy, runTransaction } from 'firebase/firestore';
import { Search, Download, Plus, MoreHorizontal, Eye, ArrowUpRight, Sparkles, ShieldCheck, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Users, Bell, AlertCircle, Calendar, GraduationCap, ChevronDown, Mail, Send, Pencil, X, ShieldAlert, MessageSquare, Briefcase, UserCheck } from 'lucide-react';
import Modal from './Modal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

// Toast Notification
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = { success: 'var(--success)', danger: 'var(--danger)', info: 'var(--primary)' };

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
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: colors[type] }} />
      <span>{message}</span>
    </motion.div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  // Navigation Tabs
  const [activePanelTab, setActivePanelTab] = useState('students'); // 'students' | 'faculty' | 'members' | 'attendance' | 'schedules' | 'chats' | 'notifications' | 'roles' | 'analytics'
  const [pendingRoleChanges, setPendingRoleChanges] = useState({});
  
  // Real-time Database lists
  const [allUsers, setAllUsers] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [schedulesList, setSchedulesList] = useState([]);
  const [chatRoomsList, setChatRoomsList] = useState([]);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [allFees, setAllFees] = useState([]);
  const [paymentHistoryList, setPaymentHistoryList] = useState([]);
  const [selectedStudentFees, setSelectedStudentFees] = useState([]);
  const [selectedStudentAssignedFaculty, setSelectedStudentAssignedFaculty] = useState([]);

  // Faculty assignment filter states
  const [facSearch, setFacSearch] = useState('');
  const [facSubjectFilter, setFacSubjectFilter] = useState('all');
  const [facAvailabilityFilter, setFacAvailabilityFilter] = useState('all');

  // Search/Filters
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [selectedFeeItem, setSelectedFeeItem] = useState(null);
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Progress report state variables
  const [selectedStudentProgressReport, setSelectedStudentProgressReport] = useState(null);
  const [editAttendanceScore, setEditAttendanceScore] = useState('100');
  const [editAssignmentScore, setEditAssignmentScore] = useState('0');
  const [editTestScore, setEditTestScore] = useState('0');
  const [editPracticalScore, setEditPracticalScore] = useState('0');
  const [editRemarks, setEditRemarks] = useState('');

  // Google Meet scheduler state variables
  const [isMeetModalOpen, setIsMeetModalOpen] = useState(false);
  const [meetTitle, setMeetTitle] = useState('');
  const [meetDate, setMeetDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetTime, setMeetTime] = useState('18:00');
  const [meetParticipants, setMeetParticipants] = useState('All Students');
  const [meetSessionsList, setMeetSessionsList] = useState([]);

  // Form inputs
  const [newStudent, setNewStudent] = useState({ displayName: '', email: '', phone: '', course: '' });
  const [newFaculty, setNewFaculty] = useState({ displayName: '', email: '', photoURL: '', subjects: [], qualification: '', bio: '', experience: '', availability: 'Available', officeTimings: 'Mon-Fri 4-6 PM' });
  const [newMember, setNewMember] = useState({ displayName: '', email: '', roleName: 'Student Support', phone: '', photoURL: '', department: 'Operations', bio: '' });
  const [paymentForm, setPaymentForm] = useState({ amountPaid: '', paymentMethod: 'Cash', notes: '' });
  const [feeForm, setFeeForm] = useState({ feeName: 'Tuition', amount: '', month: 'May 2026' });

  // Inline edits
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');

  // 1. DATA LISTENERS
  useEffect(() => {
    // 1. Users real-time listener
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setAllUsers(list);
      setLoading(false);
    });

    // 2. Attendance logs
    let unsubAtt = () => {};
    if (user?.role === 'admin') {
      unsubAtt = onSnapshot(query(collection(db, 'attendance'), orderBy('timestamp', 'desc')), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setAttendanceLogs(list);
      }, (err) => {
        console.error("Error subscribing to attendance:", err);
      });
    }

    // 3. Schedules
    const unsubSched = onSnapshot(collection(db, 'studentSchedules'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setSchedulesList(list);
    });

    // 4. Chats
    const unsubChats = onSnapshot(collection(db, 'chatRooms'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setChatRoomsList(list);
    });

    // 5. Notifications
    const unsubNotif = onSnapshot(query(collection(db, 'notificationHistory'), orderBy('timestamp', 'desc')), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setNotificationLogs(list);
    });

    // 6. Fees collectionGroup real-time listener
    let unsubFees = () => {};
    if (user?.role === 'admin') {
      unsubFees = onSnapshot(collectionGroup(db, 'fees'), (snap) => {
        const list = [];
        snap.forEach(doc => {
          const studentId = doc.ref.parent.parent.id;
          list.push({ id: doc.id, studentId, ...doc.data() });
        });
        setAllFees(list);
      }, (err) => {
        console.error("Error subscribing to fees:", err);
      });
    }

    // 7. Payment history real-time listener (sorted client-side)
    let unsubPaymentHist = () => {};
    if (user?.role === 'admin') {
      unsubPaymentHist = onSnapshot(collection(db, 'paymentHistory'), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setPaymentHistoryList(list);
      }, (err) => {
        console.error("Error subscribing to paymentHistory:", err);
      });
    }

    // 8. Google Meet sessions real-time listener
    const unsubMeets = onSnapshot(query(collection(db, 'meetSessions'), orderBy('createdAt', 'desc')), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setMeetSessionsList(list);
    });

    return () => {
      unsubUsers();
      unsubAtt();
      unsubSched();
      unsubChats();
      unsubNotif();
      unsubFees();
      unsubPaymentHist();
      unsubMeets();
    };
  }, []);

  // Sync and listen to selected student fees, assigned faculty, and progress report
  useEffect(() => {
    if (!selectedStudentDetails?.id) {
      setSelectedStudentFees([]);
      setSelectedStudentAssignedFaculty([]);
      setSelectedStudentProgressReport(null);
      return;
    }

    // Trigger client-side fallback/sync immediately
    syncStudentFeeAggregates(selectedStudentDetails.id);

    const unsubStudentFees = onSnapshot(collection(db, 'users', selectedStudentDetails.id, 'fees'), (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setSelectedStudentFees(list);
    });

    const facQuery = query(collection(db, 'assignedFaculty'), where('studentId', '==', selectedStudentDetails.id));
    const unsubAssignedFac = onSnapshot(facQuery, (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setSelectedStudentAssignedFaculty(list);
    });

    const unsubProgressReport = onSnapshot(doc(db, 'progressReports', selectedStudentDetails.id), (docSnap) => {
      if (docSnap.exists()) {
        setSelectedStudentProgressReport(docSnap.data());
      } else {
        setSelectedStudentProgressReport(null);
      }
    });

    return () => {
      unsubStudentFees();
      unsubAssignedFac();
      unsubProgressReport();
    };
  }, [selectedStudentDetails?.id]);

  // Prefill progress report fields when progress report data changes
  useEffect(() => {
    if (selectedStudentProgressReport) {
      setEditAttendanceScore(selectedStudentProgressReport.attendanceScore?.toString() || '100');
      setEditAssignmentScore(selectedStudentProgressReport.assignmentScore?.toString() || '0');
      setEditTestScore(selectedStudentProgressReport.testScore?.toString() || '0');
      setEditPracticalScore(selectedStudentProgressReport.practicalScore?.toString() || '0');
      setEditRemarks(selectedStudentProgressReport.remarks || '');
    } else {
      setEditAttendanceScore('100');
      setEditAssignmentScore('0');
      setEditTestScore('0');
      setEditPracticalScore('0');
      setEditRemarks('');
    }
  }, [selectedStudentProgressReport, selectedStudentDetails]);

  // Handle Faculty Assignment
  const handleAssignFaculty = async (facultyId, subjectName, roleName) => {
    if (!selectedStudentDetails) return;
    const studentId = selectedStudentDetails.id;
    const studentName = selectedStudentDetails.displayName;
    const docId = `${studentId}_${facultyId}`;

    try {
      // 1. Write to assignedFaculty
      await setDoc(doc(db, 'assignedFaculty', docId), {
        studentId,
        studentName,
        facultyId,
        subject: subjectName || selectedStudentDetails.course || 'Python Mastery',
        role: roleName || 'Faculty Mentor',
        priority: 1
      });

      // 2. Write to facultyAssignments
      await setDoc(doc(db, 'facultyAssignments', docId), {
        studentId,
        facultyId,
        assignedAt: new Date().toISOString(),
        assignedBy: user.displayName || 'Admin'
      });

      // 3. Update student user document's assignedFaculty array
      const currentAssigned = selectedStudentDetails.assignedFaculty || [];
      if (!currentAssigned.includes(facultyId)) {
        const updatedList = [...currentAssigned, facultyId];
        await updateDoc(doc(db, 'users', studentId), {
          assignedFaculty: updatedList
        });
        setSelectedStudentDetails(prev => ({ ...prev, assignedFaculty: updatedList }));
      }

      triggerToast('Faculty assigned successfully!', 'success');
    } catch (err) {
      console.error("Error assigning faculty:", err);
      triggerToast('Failed to assign faculty', 'danger');
    }
  };

  // Handle Faculty Unassignment
  const handleUnassignFaculty = async (facultyId) => {
    if (!selectedStudentDetails) return;
    const studentId = selectedStudentDetails.id;
    const docId = `${studentId}_${facultyId}`;

    try {
      await deleteDoc(doc(db, 'assignedFaculty', docId));
      await deleteDoc(doc(db, 'facultyAssignments', docId));

      const currentAssigned = selectedStudentDetails.assignedFaculty || [];
      const updatedList = currentAssigned.filter(id => id !== facultyId);
      await updateDoc(doc(db, 'users', studentId), {
        assignedFaculty: updatedList
      });
      setSelectedStudentDetails(prev => ({ ...prev, assignedFaculty: updatedList }));

      triggerToast('Faculty unassigned successfully!', 'success');
    } catch (err) {
      console.error("Error unassigning faculty:", err);
      triggerToast('Failed to unassign faculty', 'danger');
    }
  };

  // Handle saving progress report
  const handleSaveProgressReport = async (e) => {
    e.preventDefault();
    if (!selectedStudentDetails) return;
    const studentId = selectedStudentDetails.id;
    const attendanceVal = parseInt(editAttendanceScore) || 0;
    const assignmentVal = parseInt(editAssignmentScore) || 0;
    const testVal = parseInt(editTestScore) || 0;
    const practicalVal = parseInt(editPracticalScore) || 0;

    try {
      await setDoc(doc(db, 'progressReports', studentId), {
        studentId,
        studentName: selectedStudentDetails.displayName,
        attendanceScore: attendanceVal,
        assignmentScore: assignmentVal,
        testScore: testVal,
        practicalScore: practicalVal,
        remarks: editRemarks,
        updatedAt: new Date().toISOString(),
        updatedBy: user.displayName || 'Faculty'
      });
      triggerToast('Progress report updated!', 'success');
    } catch (err) {
      console.error("Error updating progress report:", err);
      triggerToast('Failed to update progress report', 'danger');
    }
  };

  // Handle creating a new Google Meet Session
  const handleCreateMeetSession = async (e) => {
    e.preventDefault();
    if (!meetTitle || !meetDate || !meetTime) {
      triggerToast('Please fill in all meeting fields', 'danger');
      return;
    }

    try {
      const generateMeetCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const part = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return `${part(3)}-${part(4)}-${part(3)}`;
      };

      const meetCode = generateMeetCode();
      const meetingLink = `https://meet.google.com/${meetCode}`;

      await addDoc(collection(db, 'meetSessions'), {
        title: meetTitle,
        date: meetDate,
        time: meetTime,
        meetingLink,
        participants: meetParticipants || 'All Students',
        createdBy: user.displayName || 'Management Member',
        createdById: user.uid,
        createdAt: new Date().toISOString()
      });

      const meetEvent = {
        title: `Google Meet: ${meetTitle}`,
        date: meetDate,
        time: meetTime,
        type: 'meeting',
        meetingLink,
        faculty: user.displayName || 'Management Member',
        createdAt: new Date().toISOString()
      };

      let targetStudents = [];
      if (!meetParticipants || meetParticipants === 'All Students') {
        targetStudents = allUsers.filter(u => u.role === 'student');
      } else {
        const matched = allUsers.find(u => u.role === 'student' && u.id === meetParticipants);
        if (matched) targetStudents = [matched];
      }

      for (const stud of targetStudents) {
        await addDoc(collection(db, 'studentCalendar'), {
          studentId: stud.id,
          studentName: stud.displayName,
          ...meetEvent
        });
      }

      triggerToast('Google Meet session scheduled!', 'success');
      setIsMeetModalOpen(false);
      setMeetTitle('');
      setMeetParticipants('All Students');
    } catch (err) {
      console.error("Error creating meet session:", err);
      triggerToast('Failed to schedule Meet session', 'danger');
    }
  };

  // Set default tab to overview on login for member role
  useEffect(() => {
    if (user?.role === 'member') {
      setActivePanelTab('overview');
    }
  }, [user]);

  // Real-time tab security enforcement based on user role
  useEffect(() => {
    const currentTabObj = [
      { key: 'overview', roles: ['admin', 'member'] },
      { key: 'students', roles: ['admin', 'faculty', 'member'] },
      { key: 'billing', roles: ['admin'] },
      { key: 'faculty', roles: ['admin'] },
      { key: 'members', roles: ['admin'] },
      { key: 'attendance', roles: ['admin'] },
      { key: 'schedules', roles: ['admin', 'faculty'] },
      { key: 'chats', roles: ['admin', 'faculty', 'member'] },
      { key: 'notifications', roles: ['admin', 'member'] },
      { key: 'roles', roles: ['admin'] },
      { key: 'analytics', roles: ['admin'] }
    ].find(t => t.key === activePanelTab);

    if (currentTabObj && !currentTabObj.roles.includes(user?.role)) {
      setActivePanelTab(user?.role === 'member' ? 'overview' : 'students');
    }
  }, [user?.role, activePanelTab]);
  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // ── SUBMIT ADD NEW USER ──
  const handleCreateAccount = async (email, displayName, role, extraFields) => {
    try {
      const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const defaultPassword = 'compution123';
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, defaultPassword);
      await updateProfile(userCredential.user, { displayName });
      const newUserId = userCredential.user.uid;
      await secondaryAuth.signOut();

      // Compute role permissions
      let permissions = [];
      if (role === 'faculty') {
        permissions = ['manage schedules', 'chat with assigned students', 'upload materials'];
      } else if (role === 'member') {
        permissions = ['limited dashboard access', 'student support tools'];
      }

      await setDoc(doc(db, 'users', newUserId), {
        displayName,
        email: email.toLowerCase(),
        role,
        permissions,
        createdAt: new Date().toISOString(),
        ...extraFields
      });

      triggerToast(`Account created for ${displayName}! Password: ${defaultPassword}`, 'success');
      return true;
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        triggerToast('Email is already registered!', 'danger');
      } else {
        triggerToast('Failed to create account. Try again.', 'danger');
      }
      return false;
    }
  };

  // ── ADD STUDENT SUBMIT ──
  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    const success = await handleCreateAccount(newStudent.email, newStudent.displayName, 'student', {
      phone: newStudent.phone,
      course: newStudent.course,
      studentId: `COMP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      verified: true,
      feeStatus: 'Pending',
      feesAmount: 2400
    });
    if (success) {
      setIsAddStudentOpen(false);
      setNewStudent({ displayName: '', email: '', phone: '', course: '' });
    }
  };

  // ── ADD FACULTY SUBMIT (Step 10) ──
  const handleAddFacultySubmit = async (e) => {
    e.preventDefault();
    const success = await handleCreateAccount(newFaculty.email, newFaculty.displayName, 'faculty', {
      photoURL: newFaculty.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
      subjects: typeof newFaculty.subjects === 'string' ? newFaculty.subjects.split(',').map(s=>s.trim()) : newFaculty.subjects,
      qualification: newFaculty.qualification,
      bio: newFaculty.bio,
      experience: parseInt(newFaculty.experience) || 1,
      availability: newFaculty.availability,
      officeTimings: newFaculty.officeTimings
    });
    if (success) {
      setIsAddFacultyOpen(false);
      setNewFaculty({ displayName: '', email: '', photoURL: '', subjects: [], qualification: '', bio: '', experience: '', availability: 'Available', officeTimings: 'Mon-Fri 4-6 PM' });
    }
  };

  // ── ADD MEMBER SUBMIT (Step 11) ──
  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    const success = await handleCreateAccount(newMember.email, newMember.displayName, 'member', {
      photoURL: newMember.photoURL || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      roleName: newMember.roleName,
      phone: newMember.phone,
      department: newMember.department,
      bio: newMember.bio
    });
    if (success) {
      setIsAddMemberOpen(false);
      setNewMember({ displayName: '', email: '', roleName: 'Student Support', phone: '', photoURL: '', department: 'Operations', bio: '' });
    }
  };

  // ── FEES INLINE UPDATE ──
  const handleSaveFeesAmount = async (studentId) => {
    try {
      const amount = Number(editingAmount);
      if (isNaN(amount) || amount < 0) {
        triggerToast('Please enter a valid amount', 'danger');
        return;
      }
      await updateDoc(doc(db, 'users', studentId), { feesAmount: amount });
      setEditingStudentId(null);
      triggerToast('Fees amount updated!', 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to update fees', 'danger');
    }
  };

  // ── UPDATE FEE STATUS ──
  const handleUpdateFeeStatus = async (studentId, status) => {
    try {
      await updateDoc(doc(db, 'users', studentId), { feeStatus: status });
      triggerToast(`Fee status updated to ${status}!`, 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to update fee status', 'danger');
    }
  };

  // ── SEND WHATSAPP REMINDER ──
  const handleSendWhatsAppNotification = (student) => {
    const phone = student.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const text = encodeURIComponent(`Hi ${student.displayName}, this is a reminder from Compution Academy regarding your pending fee payment of ₹${student.feesAmount || 2400} for the course ${student.course}. Please clear it at the earliest.`);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/916290935898?text=${text}`;
    window.open(url, '_blank');
    triggerToast(`WhatsApp reminder opened for ${student.displayName}!`, 'success');
  };

  // ── ROLE AND PERMISSION UPGRADE ──
  const handleSaveRole = async (userId) => {
    const newRole = pendingRoleChanges[userId];
    if (!newRole) return;

    let permissions = [];
    if (newRole === 'faculty') {
      permissions = ['manage schedules', 'chat with assigned students', 'upload materials'];
    } else if (newRole === 'member') {
      permissions = ['limited dashboard access', 'student support tools'];
    } else if (newRole === 'admin') {
      permissions = ['all'];
    }

    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole, permissions: permissions });
      triggerToast(`User role updated to ${newRole}!`, 'success');
      setPendingRoleChanges(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (err) {
      console.error(err);
      triggerToast('Failed to update user role', 'danger');
    }
  };

  // ── DELETE USER ACCOUNT ──
  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Delete user "${userName}" permanently? This will cascade delete all their attendance records, class schedules, payments history, and chat logs.`)) {
      try {
        const deletePromises = [];

        // 1. Delete top-level user doc
        deletePromises.push(deleteDoc(doc(db, 'users', userId)));

        // 2. Cascade delete subcollections: fees, attendance, progress, notes, community
        const subcollections = ['fees', 'attendance', 'progress', 'notes', 'community'];
        for (const sub of subcollections) {
          const snap = await getDocs(collection(db, 'users', userId, sub));
          snap.forEach(d => {
            deletePromises.push(deleteDoc(doc(db, 'users', userId, sub, d.id)));
          });
        }

        // 3. Cascade attendance (where studentId == userId)
        const attSnap = await getDocs(query(collection(db, 'attendance'), where('studentId', '==', userId)));
        attSnap.forEach(d => {
          deletePromises.push(deleteDoc(doc(db, 'attendance', d.id)));
        });

        // 4. Cascade studentSchedules (where studentId == userId)
        const schedSnap = await getDocs(query(collection(db, 'studentSchedules'), where('studentId', '==', userId)));
        schedSnap.forEach(d => {
          deletePromises.push(deleteDoc(doc(db, 'studentSchedules', d.id)));
        });

        // 5. Cascade chatRooms and their messages subcollections (where studentId == userId)
        const chatSnap = await getDocs(query(collection(db, 'chatRooms'), where('studentId', '==', userId)));
        for (const d of chatSnap.docs) {
          const msgsSnap = await getDocs(collection(db, 'chatRooms', d.id, 'messages'));
          msgsSnap.forEach(m => {
            deletePromises.push(deleteDoc(doc(db, 'chatRooms', d.id, 'messages', m.id)));
          });
          deletePromises.push(deleteDoc(doc(db, 'chatRooms', d.id)));
        }

        // 6. Cascade paymentHistory (where studentId == userId)
        const paySnap = await getDocs(query(collection(db, 'paymentHistory'), where('studentId', '==', userId)));
        paySnap.forEach(d => {
          deletePromises.push(deleteDoc(doc(db, 'paymentHistory', d.id)));
        });

        await Promise.all(deletePromises);
        triggerToast(`${userName} and all associated logs removed successfully`, 'info');
      } catch (err) {
        console.error("Error performing cascade deletion:", err);
        triggerToast('Failed to delete user and associated records', 'danger');
      }
    }
  };

  // ── BULK DELETE ACTION ──
  const handleBulkDelete = async (role) => {
    const targets = allUsers.filter(u => u.role === role);
    if (targets.length === 0) return;
    if (window.confirm(`Bulk delete all ${targets.length} users with role ${role}? This is irreversible.`)) {
      try {
        targets.forEach(async (u) => {
          await deleteDoc(doc(db, 'users', u.id));
        });
        triggerToast(`Bulk deleted ${targets.length} users`, 'info');
      } catch (err) {
        console.error(err);
        triggerToast('Bulk delete failed', 'danger');
      }
    }
  };

  // ── COLLECT PAYMENT SUBMIT ──
  const handleCollectPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentDetails || !selectedFeeItem || isRecordingPayment) return;

    const paymentVal = Number(paymentForm.amountPaid);
    if (isNaN(paymentVal) || paymentVal <= 0) {
      triggerToast('Please enter a valid payment amount', 'danger');
      return;
    }

    setIsRecordingPayment(true);

    try {
      await runTransaction(db, async (transaction) => {
        const feeRef = doc(db, 'users', selectedStudentDetails.id, 'fees', selectedFeeItem.id);
        const feeSnap = await transaction.get(feeRef);
        if (!feeSnap.exists()) {
          throw new Error('Fee item not found');
        }

        const feeData = feeSnap.data();
        const currentAmount = Number(feeData.amount) || 0;
        const currentPaid = Number(feeData.paidAmount) || 0;
        const remaining = currentAmount - currentPaid;

        if (paymentVal > remaining) {
          throw new Error(`Payment exceeds remaining fee balance of ₹${remaining}`);
        }

        const newPaidAmount = currentPaid + paymentVal;
        let newStatus = 'Pending';
        if (newPaidAmount === currentAmount) {
          newStatus = 'Paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'Partially Paid';
        }

        // 1. Update the fee document inside transaction
        transaction.update(feeRef, {
          paidAmount: newPaidAmount,
          status: newStatus
        });

        // 2. Add to paymentHistory inside transaction
        const histRef = doc(collection(db, 'paymentHistory'));
        transaction.set(histRef, {
          studentId: selectedStudentDetails.id,
          studentName: selectedStudentDetails.displayName,
          feeId: selectedFeeItem.id,
          feeName: selectedFeeItem.feeName,
          amount: paymentVal,
          month: selectedFeeItem.month || 'May 2026',
          paidBy: 'Admin',
          timestamp: new Date().toISOString(),
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes
        });
      });

      // Recalculate aggregates outside the transaction block
      await syncStudentFeeAggregates(selectedStudentDetails.id);

      // Local state update for drawer
      setSelectedStudentDetails(prev => {
        const updatedPaid = (prev.paidAmount || 0) + paymentVal;
        const updatedPending = Math.max(0, (prev.feesAmount || 0) - updatedPaid);
        let updatedStatus = 'Pending';
        if (updatedPending <= 0) updatedStatus = 'Paid';
        else if (updatedPaid > 0) updatedStatus = 'Partially Paid';
        return {
          ...prev,
          paidAmount: updatedPaid,
          pendingAmount: updatedPending,
          feeStatus: updatedStatus
        };
      });

      triggerToast(`Successfully collected ₹${paymentVal} for ${selectedFeeItem.feeName}!`, 'success');
      setIsCollectPaymentOpen(false);
      setPaymentForm({ amountPaid: '', paymentMethod: 'Cash', notes: '' });
    } catch (err) {
      console.error("Error collecting payment in transaction:", err);
      triggerToast(err.message || 'Failed to record payment', 'danger');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // ── ADD FEE ITEM SUBMIT ──
  const handleAddFeeItemSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentDetails) return;

    const feeAmt = Number(feeForm.amount);
    if (isNaN(feeAmt) || feeAmt <= 0) {
      triggerToast('Please enter a valid fee amount', 'danger');
      return;
    }

    try {
      const feeId = `${feeForm.feeName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      const newFee = {
        feeName: feeForm.feeName,
        amount: feeAmt,
        paidAmount: 0,
        month: feeForm.month,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', selectedStudentDetails.id, 'fees', feeId), newFee);
      await syncStudentFeeAggregates(selectedStudentDetails.id);

      // Trigger local state updates
      setSelectedStudentDetails(prev => ({
        ...prev,
        feesAmount: (prev.feesAmount || 0) + feeAmt,
        pendingAmount: (prev.pendingAmount || 0) + feeAmt
      }));

      triggerToast(`Added fee item ${feeForm.feeName} of ₹${feeAmt}`, 'success');
      setIsAddFeeOpen(false);
      setFeeForm({ feeName: 'Tuition', amount: '', month: 'May 2026' });
    } catch (err) {
      console.error("Error adding fee item:", err);
      triggerToast('Failed to add fee item', 'danger');
    }
  };

  // ── DELETE FEE ITEM ──
  const handleDeleteFeeItem = async (feeItem) => {
    if (!selectedStudentDetails) return;
    if (window.confirm(`Delete fee item "${feeItem.feeName}" (Amount: ₹${feeItem.amount})? This is irreversible.`)) {
      try {
        await deleteDoc(doc(db, 'users', selectedStudentDetails.id, 'fees', feeItem.id));
        await syncStudentFeeAggregates(selectedStudentDetails.id);

        // Local state update for drawer
        setSelectedStudentDetails(prev => {
          const updatedFees = Math.max(0, (prev.feesAmount || 0) - feeItem.amount);
          const updatedPaid = Math.max(0, (prev.paidAmount || 0) - feeItem.paidAmount);
          const updatedPending = Math.max(0, updatedFees - updatedPaid);
          let updatedStatus = 'Pending';
          if (updatedFees > 0 && updatedPending <= 0) updatedStatus = 'Paid';
          else if (updatedPaid > 0) updatedStatus = 'Partially Paid';
          return {
            ...prev,
            feesAmount: updatedFees,
            paidAmount: updatedPaid,
            pendingAmount: updatedPending,
            feeStatus: updatedStatus
          };
        });

        triggerToast(`Deleted fee item ${feeItem.feeName}`, 'success');
      } catch (err) {
        console.error("Error deleting fee item:", err);
        triggerToast('Failed to delete fee item', 'danger');
      }
    }
  };

  // ── GET BILLING TREND DATA ──
  const getBillingTrendData = () => {
    const monthlyData = {};
    allFees.forEach(fee => {
      const m = fee.month || 'Other';
      if (!monthlyData[m]) {
        monthlyData[m] = { month: m, billed: 0, collected: 0, pending: 0 };
      }
      monthlyData[m].billed += Number(fee.amount) || 0;
      monthlyData[m].collected += Number(fee.paidAmount) || 0;
      monthlyData[m].pending += (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0);
    });

    const monthsOrder = [
      'January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
      'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026'
    ];

    return Object.values(monthlyData).sort((a, b) => {
      const indexA = monthsOrder.indexOf(a.month);
      const indexB = monthsOrder.indexOf(b.month);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      return a.month.localeCompare(b.month);
    });
  };

  // Statistics summaries
  const studentsList = allUsers.filter(u => u.role === 'student').filter(s => {
    if (user?.role === 'faculty') {
      return s.assignedFaculty?.includes(user.uid) || s.assignedFaculty?.includes(user.email);
    }
    return true;
  });
  const facultyList = allUsers.filter(u => u.role === 'faculty');
  const membersList = allUsers.filter(u => u.role === 'member');

  // Search filter matching
  const filteredStudents = studentsList.filter(s => s.displayName?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()) || s.course?.toLowerCase().includes(search.toLowerCase()));
  const filteredFaculty = facultyList.filter(f => f.displayName?.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase()) || (f.subjects && f.subjects.some(sub=>sub.toLowerCase().includes(search.toLowerCase()))));
  const filteredMembers = membersList.filter(m => m.displayName?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()) || m.department?.toLowerCase().includes(search.toLowerCase()));

  // Analytics helper calculations
  const totalStudents = studentsList.length;
  const totalFaculty = facultyList.length;
  const totalMembers = membersList.length;
  const activeChatRooms = chatRoomsList.length;

  const pendingFeesTotal = studentsList.reduce((acc, s) => {
    if (s.feeStatus !== 'Paid') return acc + (s.feesAmount || 2400);
    return acc;
  }, 0);

  const courseDensityData = () => {
    const densities = {};
    studentsList.forEach(s => {
      const course = s.course || 'Unassigned';
      densities[course] = (densities[course] || 0) + 1;
    });
    return Object.entries(densities).map(([name, value]) => ({ name, value }));
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Roster Metrics Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total Students', value: totalStudents, bg: 'var(--surface)', color: 'var(--primary)' },
          { label: 'Faculty Staff', value: totalFaculty, bg: 'var(--surface)', color: 'var(--success)' },
          { label: 'Management Members', value: totalMembers, bg: 'var(--surface)', color: '#D500F9' },
          { label: 'Pending Tuition fees', value: `₹${pendingFeesTotal.toLocaleString('en-IN')}`, bg: 'var(--surface)', color: 'var(--danger)' }
        ].map((item, i) => (
          <div key={i} className="card" style={{ padding: '16px 20px', background: item.bg }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>{item.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Inner Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
        {[
          { key: 'overview', label: 'Member Overview', roles: ['admin', 'member'] },
          { key: 'students', label: 'Students Roster', roles: ['admin', 'faculty', 'member'] },
          { key: 'billing', label: 'Payments & Billing', roles: ['admin'] },
          { key: 'faculty', label: 'Faculty Staff', roles: ['admin'] },
          { key: 'members', label: 'Management Members', roles: ['admin'] },
          { key: 'attendance', label: 'Attendance logs', roles: ['admin'] },
          { key: 'schedules', label: 'Class Schedules', roles: ['admin', 'faculty'] },
          { key: 'chats', label: 'Doubt Chats', roles: ['admin', 'faculty', 'member'] },
          { key: 'notifications', label: 'Alert logs', roles: ['admin', 'member'] },
          { key: 'roles', label: 'Roles Panel', roles: ['admin'] },
          { key: 'analytics', label: 'Analytics', roles: ['admin'] }
        ].filter(tab => tab.roles.includes(user?.role || 'student')).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActivePanelTab(tab.key); setSearch(''); }}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
              background: activePanelTab === tab.key ? 'var(--primary)' : 'var(--surface)',
              color: activePanelTab === tab.key ? 'white' : 'var(--text-muted)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Container Area */}
      <div className="card card-p" style={{ background: 'white', border: '1px solid var(--border)' }}>
        
        {/* Search and creation tools header */}
        {activePanelTab !== 'overview' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                placeholder={`Search ${activePanelTab}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 12px 6px 36px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {activePanelTab === 'students' && (
                <>
                  <button onClick={() => setIsAddStudentOpen(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px' }}><Plus size={14} /> Add Student</button>
                  <button onClick={() => handleBulkDelete('student')} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.82rem', color: 'var(--danger)', borderRadius: '8px' }}><Trash2 size={14} /> Bulk Delete</button>
                </>
              )}
              {activePanelTab === 'faculty' && (
                <>
                  <button onClick={() => setIsAddFacultyOpen(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px' }}><Plus size={14} /> Add Faculty</button>
                  <button onClick={() => handleBulkDelete('faculty')} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.82rem', color: 'var(--danger)', borderRadius: '8px' }}><Trash2 size={14} /> Bulk Delete</button>
                </>
              )}
              {activePanelTab === 'members' && (
                <>
                  <button onClick={() => setIsAddMemberOpen(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px' }}><Plus size={14} /> Add Member</button>
                  <button onClick={() => handleBulkDelete('member')} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.82rem', color: 'var(--danger)', borderRadius: '8px' }}><Trash2 size={14} /> Bulk Delete</button>
                </>
              )}
            </div>
          </div>
        )}

        {activePanelTab === 'overview' ? (
          /* ==================== 0. TABS: MEMBER OVERVIEW ==================== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Hero Card */}
            <div style={{
              background: 'linear-gradient(135deg, #6200EE, #3700B3)',
              color: 'white',
              padding: '24px',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute', top: '-20%', right: '-10%', width: '250px', height: '250px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none'
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Management Control</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Logged in as Member</span>
              </div>
              <h2 style={{ color: 'white', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Welcome back, {user?.displayName || 'Management Member'}!</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.88rem', maxWidth: '600px' }}>
                Manage online class schedules, initiate instant Google Meet sessions, and check recent notification reminders sent to parents.
              </p>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(98,0,238,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6200EE' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TODAY'S CLASSES</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark)' }}>
                    {schedulesList.filter(sch => sch.date === new Date().toISOString().split('T')[0]).length}
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(102,187,106,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>GOOGLE MEETS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark)' }}>{meetSessionsList.length}</div>
                </div>
              </div>
              <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,83,80,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                  <Bell size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ALERTS DISPATCHED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark)' }}>{notificationLogs.length}</div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }} className="grid-2-col-mobile">
              
              {/* Left Column: Live Classes & Meets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Google Meet Sessions */}
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--dark)' }}>Active Google Meets</h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'rgba(98,0,238,0.08)', padding: '2px 8px', borderRadius: '4px' }}>Real-time Link Synced</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {meetSessionsList.slice(0, 5).map(meet => (
                      <div key={meet.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--dark)' }}>{meet.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🕒 {meet.date} @ {meet.time} | Participants: {meet.participants === 'All Students' ? 'All Students' : (allUsers.find(u => u.id === meet.participants)?.displayName || 'Selected Student')}</span>
                        </div>
                        <a
                          href={meet.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.72rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ArrowUpRight size={12} /> Join Session
                        </a>
                      </div>
                    ))}
                    {meetSessionsList.length === 0 && (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                        No Google Meets scheduled yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Today's Classes */}
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--dark)' }}>Today's Live Classes</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {schedulesList.filter(sch => sch.date === new Date().toISOString().split('T')[0]).map(sch => (
                      <div key={sch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--dark)' }}>{sch.studentName} ({sch.subject})</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🕒 {sch.time} | Mentor: {sch.faculty || 'Mentor'}</span>
                        </div>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                          background: sch.mode === 'online' ? 'rgba(83,109,254,0.1)' : 'rgba(102,187,106,0.1)',
                          color: sch.mode === 'online' ? 'var(--primary)' : 'var(--success)'
                        }}>{sch.mode}</span>
                      </div>
                    ))}
                    {schedulesList.filter(sch => sch.date === new Date().toISOString().split('T')[0]).length === 0 && (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                        No classes scheduled for today.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Google Meet Control & Notice Board */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Google Meet scheduler card */}
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(98,0,238,0.02) 0%, rgba(55,0,179,0.04) 100%)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--dark)' }}>Google Meet Control</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Start instant online consultation calls or coordinate live group sessions. Generating a session will automatically notify selected students.
                  </p>
                  <button
                    onClick={() => {
                      setMeetTitle('Doubt Clearing Session');
                      setMeetDate(new Date().toISOString().split('T')[0]);
                      setMeetTime(new Date().toTimeString().slice(0, 5));
                      setIsMeetModalOpen(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '10px 16px', fontSize: '0.82rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                  >
                    <Plus size={16} /> Schedule Google Meet
                  </button>
                </div>

                {/* Recent Notifications logs */}
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--dark)' }}>Dispatched Parent Alerts</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {notificationLogs.slice(0, 5).map(log => (
                      <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px', background: 'var(--bg)', borderRadius: '8px', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--dark)' }}>
                          <span>👨‍👩‍👦 {log.parentName || log.studentName || 'Parent'}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--success)' }}>SENT</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>📞 {log.phone} • {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Today'}</div>
                        <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px', borderLeft: '2px solid var(--primary)', paddingLeft: '6px' }}>"{log.message}"</div>
                      </div>
                    ))}
                    {notificationLogs.length === 0 && (
                      <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                        No dispatched notifications yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        ) : (
          <div className="table-scroll">
            
            {/* ==================== 1. TABS: STUDENTS ROSTER ==================== */}
            {activePanelTab === 'students' && (
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px' }}>Student Profile</th>
                  <th style={{ padding: '12px' }}>Course / Program</th>
                  <th style={{ padding: '12px' }}>Fees Target</th>
                  <th style={{ padding: '12px' }}>Fee status</th>
                  <th style={{ padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => {
                  const feeStatus = student.feeStatus || 'Pending';
                  const currentFeesAmount = student.feesAmount !== undefined ? student.feesAmount : 2400;

                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{student.displayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.email}</div>
                      </td>
                      <td style={{ padding: '12px' }}>{student.course}</td>
                      
                      <td style={{ padding: '12px' }}>
                        {editingStudentId === student.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="number" value={editingAmount} onChange={e => setEditingAmount(e.target.value)} style={{ width: '80px', padding: '4px' }} autoFocus />
                            <button onClick={() => handleSaveFeesAmount(student.id)} style={{ background: 'var(--success)', color: 'white', padding: '2px 6px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                            <button onClick={() => setEditingStudentId(null)} style={{ background: 'var(--danger)', color: 'white', padding: '2px 6px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => { setEditingStudentId(student.id); setEditingAmount(currentFeesAmount); }}>
                            <span>₹{currentFeesAmount.toLocaleString()}</span>
                            <Pencil size={12} style={{ color: 'var(--text-light)' }} />
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateFeeStatus(student.id, 'Paid');
                            }}
                            style={{
                              padding: '4px 10px',
                              background: feeStatus === 'Paid' ? 'rgba(102,187,106,0.15)' : 'var(--surface)',
                              color: 'var(--success)',
                              border: feeStatus === 'Paid' ? '1px solid var(--success)' : '1px solid var(--border)',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            Paid
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateFeeStatus(student.id, 'Pending');
                            }}
                            style={{
                              padding: '4px 10px',
                              background: feeStatus === 'Pending' ? 'rgba(245,158,11,0.15)' : 'var(--surface)',
                              color: '#F59E0B',
                              border: feeStatus === 'Pending' ? '1px solid #F59E0B' : '1px solid var(--border)',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            Pending
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateFeeStatus(student.id, 'Delayed');
                            }}
                            style={{
                              padding: '4px 10px',
                              background: feeStatus === 'Delayed' ? 'rgba(239,83,80,0.15)' : 'var(--surface)',
                              color: 'var(--danger)',
                              border: feeStatus === 'Delayed' ? '1px solid var(--danger)' : '1px solid var(--border)',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            Delayed
                          </button>
                          {feeStatus !== 'Paid' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendWhatsAppNotification(student);
                              }}
                              title="Send WhatsApp Reminder"
                              style={{
                                padding: '6px',
                                background: 'rgba(83,109,254,0.1)',
                                color: 'var(--primary)',
                                border: '1px solid rgba(83,109,254,0.2)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Send size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setSelectedStudentDetails({ ...student, joined: 'Jan 2026', roll: 'Roll #COMP' })} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '6px' }} title="View Detail"><Eye size={14} /></button>
                          <button onClick={() => handleDeleteUser(student.id, student.displayName)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)', borderRadius: '6px' }} title="Delete Roster"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ==================== Payments & Billing Tab ==================== */}
          {activePanelTab === 'billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Widgets Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {[
                  { label: 'Total Collected', value: `₹${allFees.reduce((acc, f) => acc + (Number(f.paidAmount) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--success)' },
                  { label: 'Total Pending', value: `₹${allFees.reduce((acc, f) => acc + ((Number(f.amount) || 0) - (Number(f.paidAmount) || 0)), 0).toLocaleString('en-IN')}`, color: 'var(--danger)' },
                  { label: 'Pending Students', value: studentsList.filter(s => (s.pendingAmount || 0) > 0 || s.feeStatus !== 'Paid').length, color: '#F59E0B' },
                  { label: 'Total Billed', value: `₹${allFees.reduce((acc, f) => acc + (Number(f.amount) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--primary)' }
                ].map((widget, i) => (
                  <div key={i} style={{ padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>{widget.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: widget.color }}>{widget.value}</div>
                  </div>
                ))}
              </div>

              {/* Chart & Recent History Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }} className="grid-2-col-mobile">
                {/* Chart card */}
                <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', height: '320px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '16px', color: 'var(--dark)' }}>Monthly Revenue Trend</h3>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getBillingTrendData()}>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <YAxis tickFormatter={val => `₹${val}`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => `₹${value}`} />
                        <Bar dataKey="collected" name="Collected" fill="var(--success)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pending" name="Pending" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* History list card */}
                <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', height: '320px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', color: 'var(--dark)' }}>Recent Transaction Logs</h3>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {paymentHistoryList.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No transactions recorded.</div>
                    ) : (
                      paymentHistoryList.slice(0, 20).map((log, index) => (
                        <div key={index} style={{ background: 'white', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--dark)' }}>{log.studentName}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.feeName} • {log.paymentMethod}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--success)' }}>+₹{log.amount}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-light)' }}>{new Date(log.timestamp).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Billed Roster Title & List */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', color: 'var(--dark)' }}>Student Billing Overview</h3>
                <div className="table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        <th style={{ padding: '10px' }}>Student</th>
                        <th style={{ padding: '10px' }}>Course</th>
                        <th style={{ padding: '10px' }}>Billed Amount</th>
                        <th style={{ padding: '10px' }}>Paid Amount</th>
                        <th style={{ padding: '10px' }}>Pending Amount</th>
                        <th style={{ padding: '10px' }}>Status</th>
                        <th style={{ padding: '10px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(student => {
                        const feeStatus = student.feeStatus || 'Pending';
                        const colorMap = {
                          'Paid': 'var(--success)',
                          'Partially Paid': '#F59E0B',
                          'Pending': 'var(--danger)',
                          'Delayed': 'var(--danger)'
                        };
                        const bgMap = {
                          'Paid': 'rgba(102,187,106,0.1)',
                          'Partially Paid': 'rgba(245,158,11,0.1)',
                          'Pending': 'rgba(239,83,80,0.1)',
                          'Delayed': 'rgba(239,83,80,0.1)'
                        };

                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: 700 }}>{student.displayName}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{student.email}</div>
                            </td>
                            <td style={{ padding: '10px' }}>{student.course}</td>
                            <td style={{ padding: '10px', fontWeight: 600 }}>₹{(student.feesAmount || 0).toLocaleString()}</td>
                            <td style={{ padding: '10px', fontWeight: 600, color: 'var(--success)' }}>₹{(student.paidAmount || 0).toLocaleString()}</td>
                            <td style={{ padding: '10px', fontWeight: 600, color: student.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>₹{(student.pendingAmount || 0).toLocaleString()}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800,
                                color: colorMap[feeStatus] || 'var(--text-muted)',
                                background: bgMap[feeStatus] || 'var(--surface)'
                              }}>{feeStatus}</span>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <button
                                onClick={() => setSelectedStudentDetails({ ...student, joined: 'Jan 2026', roll: 'Roll #COMP' })}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                Manage Fees
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ==================== 2. TABS: FACULTY STAFF ==================== */}
          {activePanelTab === 'faculty' && (
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px' }}>Faculty profile</th>
                  <th style={{ padding: '12px' }}>Qualification & Experience</th>
                  <th style={{ padding: '12px' }}>Subjects taught</th>
                  <th style={{ padding: '12px' }}>Availability Status</th>
                  <th style={{ padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.map(fac => (
                  <tr key={fac.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={fac.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150'} alt={fac.displayName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{fac.displayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fac.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>{fac.qualification || 'B.Tech CSE'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fac.experience || 4} years experience</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {fac.subjects && fac.subjects.map((sub, i) => (
                          <span key={i} className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>{sub}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800,
                        background: fac.availability === 'Busy' ? 'rgba(255,167,38,0.1)' : 'rgba(102,187,106,0.1)',
                        color: fac.availability === 'Busy' ? 'var(--warning)' : 'var(--success)'
                      }}>{fac.availability || 'Available'}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleDeleteUser(fac.id, fac.displayName)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)', borderRadius: '6px' }} title="Delete Roster"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ==================== 3. TABS: MEMBERS STAFF ==================== */}
          {activePanelTab === 'members' && (
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px' }}>Member profile</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Phone / Role</th>
                  <th style={{ padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(memb => (
                  <tr key={memb.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={memb.photoURL || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150'} alt={memb.displayName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{memb.displayName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{memb.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>{memb.department || 'Operations'}</td>
                    <td style={{ padding: '12px' }}>
                      <div>{memb.roleName || 'Student Support'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{memb.phone || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleDeleteUser(memb.id, memb.displayName)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)', borderRadius: '6px' }} title="Delete Roster"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ==================== 4. TABS: ATTENDANCE LOGS ==================== */}
          {activePanelTab === 'attendance' && (
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px' }}>Student Name</th>
                  <th style={{ padding: '12px' }}>Class Date</th>
                  <th style={{ padding: '12px' }}>Subject Track</th>
                  <th style={{ padding: '12px' }}>Marked status</th>
                  <th style={{ padding: '12px' }}>Faculty Mentor</th>
                </tr>
              </thead>
              <tbody>
                {attendanceLogs.filter(log => log.studentName?.toLowerCase().includes(search.toLowerCase()) || log.subject?.toLowerCase().includes(search.toLowerCase())).map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{log.studentName}</td>
                    <td style={{ padding: '12px' }}>{log.date}</td>
                    <td style={{ padding: '12px' }}>{log.subject}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                        background: log.status === 'present' ? 'rgba(102,187,106,0.1)' : log.status === 'absent' ? 'rgba(239,83,80,0.1)' : 'rgba(255,167,38,0.1)',
                        color: log.status === 'present' ? 'var(--success)' : log.status === 'absent' ? 'var(--danger)' : '#E65100'
                      }}>{log.status}</span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{log.faculty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ==================== 5. TABS: CLASS SCHEDULES ==================== */}
          {activePanelTab === 'schedules' && (
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px' }}>Scheduled Student</th>
                  <th style={{ padding: '12px' }}>Class timing & Mode</th>
                  <th style={{ padding: '12px' }}>Subject Target</th>
                  <th style={{ padding: '12px' }}>Lesson notes</th>
                  <th style={{ padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedulesList.filter(sch => {
                  const matchesSearch = sch.studentName?.toLowerCase().includes(search.toLowerCase()) || sch.subject?.toLowerCase().includes(search.toLowerCase());
                  if (!matchesSearch) return false;
                  if (user?.role === 'faculty') {
                    const isAssigned = studentsList.some(s => s.id === sch.studentId);
                    return sch.facultyId === user.uid || isAssigned;
                  }
                  return true;
                }).map(sch => (
                  <tr key={sch.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{sch.studentName}</td>
                    <td style={{ padding: '12px' }}>
                      <div>{sch.date} @ {sch.time}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>{sch.mode}</div>
                    </td>
                    <td style={{ padding: '12px' }}>{sch.subject}</td>
                    <td style={{ padding: '12px', fontSize: '0.8rem', fontStyle: 'italic', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sch.notes}>{sch.notes || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={async () => { if (window.confirm("Cancel class slot?")) await deleteDoc(doc(db, 'studentSchedules', sch.id)); }} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ==================== 6. TABS: DOUBT CHATS ==================== */}
          {activePanelTab === 'chats' && (
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px' }}>Room / Match participants</th>
                  <th style={{ padding: '12px' }}>Last doubt message</th>
                  <th style={{ padding: '12px' }}>Student Unreads</th>
                  <th style={{ padding: '12px' }}>Faculty Unreads</th>
                </tr>
              </thead>
              <tbody>
                {chatRoomsList.filter(rm => rm.studentName?.toLowerCase().includes(search.toLowerCase()) || rm.facultyName?.toLowerCase().includes(search.toLowerCase())).map(rm => (
                  <tr key={rm.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700 }}>👨‍🎓 {rm.studentName} ↔ 👨‍🏫 {rm.facultyName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Room ID: {rm.id}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.82rem', fontStyle: 'italic', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rm.lastMessage}>{rm.lastMessage}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{rm.studentUnreadCount || 0}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{rm.facultyUnreadCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ==================== 7. TABS: ALERT NOTIFICATIONS LOGS ==================== */}
          {activePanelTab === 'notifications' && (
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px' }}>Recipient Parent</th>
                  <th style={{ padding: '12px' }}>Phone Contact</th>
                  <th style={{ padding: '12px' }}>Alert description notes</th>
                  <th style={{ padding: '12px' }}>Delivery status</th>
                </tr>
              </thead>
              <tbody>
                {notificationLogs.filter(n => n.studentName?.toLowerCase().includes(search.toLowerCase()) || n.parentPhone?.includes(search)).map(n => (
                  <tr key={n.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700 }}>{n.parentName || 'Parent'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Child: {n.studentName} ({n.subject})</div>
                    </td>
                    <td style={{ padding: '12px' }}>{n.parentPhone}</td>
                    <td style={{ padding: '12px', fontSize: '0.82rem', maxWidth: '300px', lineHeight: 1.4 }}>{n.message || `Student marked absent today.`}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                        background: n.status === 'sent_sms' ? 'rgba(102,187,106,0.1)' : 'rgba(83,109,254,0.1)',
                        color: n.status === 'sent_sms' ? 'var(--success)' : 'var(--primary)'
                      }}>{n.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ==================== 8. TABS: ROLES PANEL ==================== */}
          {activePanelTab === 'roles' && (
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px' }}>User email</th>
                  <th style={{ padding: '12px' }}>Full Name</th>
                  <th style={{ padding: '12px' }}>Assigned role</th>
                  <th style={{ padding: '12px' }}>Role Upgrade Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.filter(u => u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())).map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>{u.displayName}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                        background: u.role === 'admin' ? 'rgba(239,83,80,0.1)' : u.role === 'faculty' ? 'rgba(102,187,106,0.1)' : u.role === 'member' ? 'rgba(83,109,254,0.1)' : 'rgba(0,0,0,0.05)',
                        color: u.role === 'admin' ? 'var(--danger)' : u.role === 'faculty' ? 'var(--success)' : u.role === 'member' ? 'var(--primary)' : 'var(--text-muted)'
                      }}>{u.role || 'Student'}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {u.role !== 'admin' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select
                            onChange={e => setPendingRoleChanges(prev => ({ ...prev, [u.id]: e.target.value }))}
                            value={pendingRoleChanges[u.id] !== undefined ? pendingRoleChanges[u.id] : (u.role || 'student')}
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                          >
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          {pendingRoleChanges[u.id] !== undefined && pendingRoleChanges[u.id] !== (u.role || 'student') && (
                            <button
                              onClick={() => handleSaveRole(u.id)}
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer' }}
                            >
                              Save
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ==================== 9. TABS: ANALYTICS ==================== */}
          {activePanelTab === 'analytics' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', padding: '12px' }} className="grid-2-col-mobile">
              
              {/* Course densities breakdown */}
              <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', height: '320px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '20px' }}>Student Course Roster Density</h3>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseDensityData()}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis tickFormatter={val => `${val}`} />
                      <Tooltip />
                      <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Roster ratios */}
              <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '16px', height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', alignSelf: 'flex-start' }}>Staff Ratio Distribution</h3>
                <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Students', value: totalStudents },
                          { name: 'Faculty', value: totalFaculty },
                          { name: 'Members', value: totalMembers }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        dataKey="value"
                      >
                        {['var(--primary)', 'var(--success)', '#D500F9'].map((col, index) => <Cell key={`cell-${index}`} fill={col} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legends */}
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} /> Students ({totalStudents})</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} /> Faculty ({totalFaculty})</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D500F9' }} /> Members ({totalMembers})</div>
                </div>
              </div>

            </div>
          )}

        </div>
        )}
      </div>

      {/* ==================== MODAL: SCHEDULE GOOGLE MEET ==================== */}
      <Modal isOpen={isMeetModalOpen} onClose={() => setIsMeetModalOpen(false)} title="Schedule Google Meet Session">
        <form onSubmit={handleCreateMeetSession} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Session Title</label>
            <input
              type="text"
              required
              className="form-input"
              value={meetTitle}
              onChange={e => setMeetTitle(e.target.value)}
              placeholder="e.g. Orientation Call / Doubt Clearing Slot"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={meetDate}
                onChange={e => setMeetDate(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Time</label>
              <input
                type="time"
                required
                className="form-input"
                value={meetTime}
                onChange={e => setMeetTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Participants</label>
            <select
              className="form-input"
              value={meetParticipants}
              onChange={e => setMeetParticipants(e.target.value)}
              style={{ background: 'white' }}
            >
              <option value="All Students">All Students</option>
              {allUsers.filter(u => u.role === 'student').map(stud => (
                <option key={stud.id} value={stud.id}>{stud.displayName} ({stud.course})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Schedule Session</button>
            <button type="button" onClick={() => setIsMeetModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ==================== 1. MODAL: ADD STUDENT ==================== */}
      <Modal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title="Add New Student">
        <form onSubmit={handleAddStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Full Name</label>
            <input required value={newStudent.displayName} onChange={e => setNewStudent({...newStudent, displayName: e.target.value})} className="form-input" placeholder="John Doe" />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input required type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} className="form-input" placeholder="john@example.com" />
          </div>
          <div>
            <label className="form-label">Phone Number</label>
            <input required value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} className="form-input" placeholder="+91 9876543210" />
          </div>
          <div>
            <label className="form-label">Course / Program</label>
            <select required value={newStudent.course} onChange={e => setNewStudent({...newStudent, course: e.target.value})} className="form-input" style={{ background: 'white' }}>
              <option value="" disabled>Select course</option>
              {['Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11 CS', 'Class 11 App', 'Class 12 CS', 'Class 12 App', 'BCA', 'B.Tech', 'Tally Prime', 'Advanced Excel', 'Basic Computer'].map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', width: '100%' }}>Add Student</button>
        </form>
      </Modal>

      {/* ==================== 2. MODAL: ADD FACULTY (Step 10) ==================== */}
      <Modal isOpen={isAddFacultyOpen} onClose={() => setIsAddFacultyOpen(false)} title="Add New Faculty Mentor">
        <form onSubmit={handleAddFacultySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Full Name</label>
            <input required value={newFaculty.displayName} onChange={e => setNewFaculty({...newFaculty, displayName: e.target.value})} className="form-input" placeholder="Prof. Sharmistha Ghosh" />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input required type="email" value={newFaculty.email} onChange={e => setNewFaculty({...newFaculty, email: e.target.value})} className="form-input" placeholder="faculty@compution.in" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Qualifications</label>
              <input required value={newFaculty.qualification} onChange={e => setNewFaculty({...newFaculty, qualification: e.target.value})} className="form-input" placeholder="M.Tech in CS" />
            </div>
            <div>
              <label className="form-label">Years of Experience</label>
              <input required type="number" value={newFaculty.experience} onChange={e => setNewFaculty({...newFaculty, experience: e.target.value})} className="form-input" placeholder="6" />
            </div>
          </div>
          <div>
            <label className="form-label">Subjects (comma-separated list)</label>
            <input required value={newFaculty.subjects} onChange={e => setNewFaculty({...newFaculty, subjects: e.target.value})} className="form-input" placeholder="Python Mastery, Tally Prime, Basic Computer" />
          </div>
          <div>
            <label className="form-label">Availability & Timings</label>
            <input required value={newFaculty.officeTimings} onChange={e => setNewFaculty({...newFaculty, officeTimings: e.target.value})} className="form-input" placeholder="Mon-Fri 4 PM - 6 PM" />
          </div>
          <div>
            <label className="form-label">Short Biography</label>
            <textarea required rows={3} value={newFaculty.bio} onChange={e => setNewFaculty({...newFaculty, bio: e.target.value})} className="form-input" placeholder="Short introduction..." style={{ resize: 'none' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', width: '100%' }}>Add Faculty</button>
        </form>
      </Modal>

      {/* ==================== 3. MODAL: ADD MEMBER (Step 11) ==================== */}
      <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Add New Management Member">
        <form onSubmit={handleAddMemberSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Full Name</label>
            <input required value={newMember.displayName} onChange={e => setNewMember({...newMember, displayName: e.target.value})} className="form-input" placeholder="Piyali Maity" />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input required type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} className="form-input" placeholder="member@compution.in" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Department</label>
              <input required value={newMember.department} onChange={e => setNewMember({...newMember, department: e.target.value})} className="form-input" placeholder="Operations" />
            </div>
            <div>
              <label className="form-label">Role Designation</label>
              <input required value={newMember.roleName} onChange={e => setNewMember({...newMember, roleName: e.target.value})} className="form-input" placeholder="Coordinator" />
            </div>
          </div>
          <div>
            <label className="form-label">Phone Contact Number</label>
            <input required value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} className="form-input" placeholder="+91 9674035542" />
          </div>
          <div>
            <label className="form-label">Brief Biography Description</label>
            <textarea required rows={3} value={newMember.bio} onChange={e => setNewMember({...newMember, bio: e.target.value})} className="form-input" placeholder="Intro..." style={{ resize: 'none' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', width: '100%' }}>Add Member</button>
        </form>
      </Modal>

      {/* ==================== 4. MODAL: STUDENT DETAIL DRAWER ==================== */}
      <Modal isOpen={!!selectedStudentDetails} onClose={() => setSelectedStudentDetails(null)} title="Student Details">
        {selectedStudentDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'var(--dark)' }}>{selectedStudentDetails.displayName}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div><strong>Roll ID:</strong> {selectedStudentDetails.studentId || 'N/A'}</div>
                <div><strong>Role:</strong> {selectedStudentDetails.role || 'student'}</div>
                <div><strong>Email:</strong> {selectedStudentDetails.email || 'N/A'}</div>
                <div><strong>Phone:</strong> {selectedStudentDetails.phone || 'N/A'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Course:</strong> {selectedStudentDetails.course || 'N/A'}</div>
              </div>
            </div>

            {/* Fees Management Block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>Billed Fee Items</h4>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setIsAddFeeOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                    background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> Add Fee Item
                </button>
              )}
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Fee Name</th>
                    <th style={{ padding: '8px 12px' }}>Month</th>
                    <th style={{ padding: '8px 12px' }}>Billed</th>
                    <th style={{ padding: '8px 12px' }}>Paid</th>
                    <th style={{ padding: '8px 12px' }}>Remaining</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    {user?.role === 'admin' && <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedStudentFees.length === 0 ? (
                    <tr>
                      <td colSpan={user?.role === 'admin' ? 7 : 6} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No fee items. Default tuition fee will be auto-synced.
                      </td>
                    </tr>
                  ) : (
                    selectedStudentFees.map((fee) => {
                      const remaining = fee.amount - fee.paidAmount;
                      const feeStatus = fee.status || 'Pending';
                      const colorMap = { 'Paid': 'var(--success)', 'Partially Paid': '#F59E0B', 'Pending': 'var(--danger)' };
                      const bgMap = { 'Paid': 'rgba(102,187,106,0.1)', 'Partially Paid': 'rgba(245,158,11,0.1)', 'Pending': 'rgba(239,83,80,0.1)' };

                      return (
                        <tr key={fee.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>{fee.feeName}</td>
                          <td style={{ padding: '8px 12px' }}>{fee.month}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>₹{fee.amount}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--success)' }}>₹{fee.paidAmount}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: remaining > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>₹{remaining}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800,
                              color: colorMap[feeStatus] || 'var(--text-muted)',
                              background: bgMap[feeStatus] || 'var(--surface)'
                            }}>{feeStatus}</span>
                          </td>
                          {user?.role === 'admin' && (
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {remaining > 0 && (
                                  <button
                                    onClick={() => {
                                      setSelectedFeeItem(fee);
                                      setPaymentForm({ amountPaid: remaining.toString(), paymentMethod: 'Cash', notes: '' });
                                      setIsCollectPaymentOpen(true);
                                    }}
                                    style={{
                                      padding: '4px 8px', background: 'rgba(76, 175, 80, 0.1)', color: 'var(--success)',
                                      border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: '4px', fontSize: '0.72rem',
                                      fontWeight: 700, cursor: 'pointer'
                                    }}
                                  >
                                    Collect
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteFeeItem(fee)}
                                  style={{
                                    padding: '4px', background: 'none', border: 'none',
                                    color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center'
                                  }}
                                  title="Delete fee item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Overall Student Aggregates Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--surface)', padding: '12px', borderRadius: '8px', fontSize: '0.82rem', border: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 600 }}>TOTAL FEES</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>₹{(selectedStudentDetails.feesAmount || 0).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--success)', fontSize: '0.68rem', fontWeight: 600 }}>TOTAL PAID</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--success)' }}>₹{(selectedStudentDetails.paidAmount || 0).toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--danger)', fontSize: '0.68rem', fontWeight: 600 }}>TOTAL PENDING</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--danger)' }}>₹{(selectedStudentDetails.pendingAmount || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Progress Report & Academic Scores (Admin & Faculty only) */}
            {(user?.role === 'admin' || user?.role === 'faculty') && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>Academic Progress & Grade Report</h4>
                <form onSubmit={handleSaveProgressReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="grid-profile-meta">
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Attendance (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        className="form-input"
                        value={editAttendanceScore}
                        onChange={e => setEditAttendanceScore(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assignment (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        className="form-input"
                        value={editAssignmentScore}
                        onChange={e => setEditAssignmentScore(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tests (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        className="form-input"
                        value={editTestScore}
                        onChange={e => setEditTestScore(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Practicals (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        className="form-input"
                        value={editPracticalScore}
                        onChange={e => setEditPracticalScore(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Faculty Remarks</label>
                    <textarea
                      rows={2}
                      className="form-input"
                      value={editRemarks}
                      onChange={e => setEditRemarks(e.target.value)}
                      placeholder="e.g. Regular class attendance, needs practice in loops..."
                      style={{ padding: '8px 12px', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px', alignSelf: 'flex-end' }}>
                    Save Report
                  </button>
                </form>
              </div>
            )}

            {/* Faculty Team Assignment Block */}
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>Faculty Team Assignment</h4>
              
              {user?.role === 'admin' ? (
                <>
                  {/* Filters */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginBottom: '12px' }} className="grid-2-col-mobile">
                    <input
                      type="text"
                      placeholder="Search faculty..."
                      value={facSearch}
                      onChange={e => setFacSearch(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '100%' }}
                    />
                    <select
                      value={facSubjectFilter}
                      onChange={e => setFacSubjectFilter(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', background: 'white' }}
                    >
                      <option value="all">All Subjects</option>
                      {['Python', 'Data Structures', 'Class 11', 'Class 12', 'Web Development', 'Java', 'C & C++', 'Tally', 'Excel', 'Basic Computer'].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    <select
                      value={facAvailabilityFilter}
                      onChange={e => setFacAvailabilityFilter(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', background: 'white' }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                    </select>
                  </div>

                  {/* Faculty List */}
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px' }}>
                    {facultyList.filter(fac => {
                      const matchesSearch = fac.displayName?.toLowerCase().includes(facSearch.toLowerCase()) || fac.email?.toLowerCase().includes(facSearch.toLowerCase());
                      const matchesSubject = facSubjectFilter === 'all' || (fac.subjects && fac.subjects.some(sub => sub.toLowerCase().includes(facSubjectFilter.toLowerCase())));
                      const matchesAvailability = facAvailabilityFilter === 'all' || fac.availability === facAvailabilityFilter;
                      return matchesSearch && matchesSubject && matchesAvailability;
                    }).map(fac => {
                      const isAssigned = selectedStudentAssignedFaculty.some(af => af.facultyId === fac.id);
                      return (
                        <div key={fac.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', fontSize: '0.82rem' }}>
                          <img src={fac.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100'} alt={fac.displayName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{fac.displayName}</span>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: fac.availability === 'Busy' ? 'var(--warning)' : 'var(--success)' }} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fac.qualification || 'Mentor'} • {fac.officeTimings || 'Flexible'}</div>
                          </div>
                          {isAssigned ? (
                            <button
                              onClick={() => handleUnassignFaculty(fac.id)}
                              style={{
                                padding: '4px 8px', background: 'rgba(239,83,80,0.1)', color: 'var(--danger)',
                                border: '1px solid rgba(239,83,80,0.2)', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                              }}
                            >
                              Unassign
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAssignFaculty(fac.id, fac.subjects?.[0], fac.role)}
                              style={{
                                padding: '4px 8px', background: 'var(--primary-light)', color: 'var(--primary)',
                                border: '1px solid rgba(83,109,254,0.2)', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                              }}
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {facultyList.length === 0 && (
                      <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No faculty available.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedStudentAssignedFaculty.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No faculty assigned to this student.</div>
                  ) : (
                    selectedStudentAssignedFaculty.map(af => (
                      <div key={af.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--dark)', flex: 1 }}>{af.displayName || af.studentName || 'Faculty Mentor'}</div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>{af.subject}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== MODAL: ADD CUSTOM FEE ITEM ==================== */}
      <Modal isOpen={isAddFeeOpen} onClose={() => setIsAddFeeOpen(false)} title="Add Fee Item">
        <form onSubmit={handleAddFeeItemSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Fee Item Name</label>
            <select
              value={feeForm.feeName}
              onChange={e => setFeeForm({ ...feeForm, feeName: e.target.value })}
              className="form-input"
              style={{ background: 'white' }}
            >
              {['Tuition', 'Lab Fee', 'Exam Fee', 'Course Fee', 'Tally Prime Fee', 'Excel Training Fee', 'Basic CS Fee', 'Admission Fee', 'Other Fee'].map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Fee Amount (₹)</label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 1500"
              value={feeForm.amount}
              onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Billing Month</label>
            <select
              value={feeForm.month}
              onChange={e => setFeeForm({ ...feeForm, month: e.target.value })}
              className="form-input"
              style={{ background: 'white' }}
            >
              {[
                'January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
                'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026'
              ].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Fee</button>
            <button type="button" onClick={() => setIsAddFeeOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* ==================== MODAL: COLLECT PAYMENT ==================== */}
      <Modal isOpen={isCollectPaymentOpen} onClose={() => setIsCollectPaymentOpen(false)} title={`Collect Payment: ${selectedFeeItem?.feeName}`}>
        <form onSubmit={handleCollectPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Amount to Collect (₹)</label>
            <input
              type="number"
              required
              min="1"
              max={selectedFeeItem ? selectedFeeItem.amount - selectedFeeItem.paidAmount : undefined}
              placeholder="e.g. 1000"
              value={paymentForm.amountPaid}
              onChange={e => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
              className="form-input"
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Max collectable amount: <strong>₹{selectedFeeItem ? selectedFeeItem.amount - selectedFeeItem.paidAmount : 0}</strong>
            </div>
          </div>
          <div>
            <label className="form-label">Payment Method</label>
            <select
              value={paymentForm.paymentMethod}
              onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              className="form-input"
              style={{ background: 'white' }}
            >
              {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Transaction Notes (Optional)</label>
            <input
              type="text"
              placeholder="Receipt number, transaction ID, etc."
              value={paymentForm.notes}
              onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="form-input"
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Record Payment</button>
            <button type="button" onClick={() => setIsCollectPaymentOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};

export default AdminDashboard;
