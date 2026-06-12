import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, firebaseConfig, syncStudentFeeAggregates } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, collectionGroup, doc, getDoc, updateDoc, deleteDoc, getDocs, addDoc, setDoc, serverTimestamp, onSnapshot, query, where, orderBy, runTransaction, writeBatch, deleteField, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Search, Download, Plus, MoreHorizontal, Eye, ArrowUpRight, Sparkles, ShieldCheck, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Users, Bell, AlertCircle, Calendar, GraduationCap, ChevronDown, Mail, Send, Pencil, X, ShieldAlert, MessageSquare, Briefcase, UserCheck, Loader2, Check, CheckCheck, Info, UserMinus } from 'lucide-react';
import Modal from './Modal';
import SystemHealthPanel from './SystemHealthPanel';
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
  const { showToast } = useToast();
  // Navigation Tabs
  const [activePanelTab, setActivePanelTab] = useState('students'); 
  const [pendingRoleChanges, setPendingRoleChanges] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [doctorRunning, setDoctorRunning] = useState(false);
  const [doctorResults, setDoctorResults] = useState(null);
  const [isRepairingFinancial, setIsRepairingFinancial] = useState(false);
  const [activeListenersCount, setActiveListenersCount] = useState(9); // Pooled listener count
  const [lastDrawerMsgTime, setLastDrawerMsgTime] = useState(0);

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
  const [assignedStudentIds, setAssignedStudentIds] = useState([]);
  const [rosterMode, setRosterMode] = useState('assign'); // 'assign' | 'create'
  const [isRosterSubmitting, setIsRosterSubmitting] = useState(false);
  const [rosterForm, setRosterForm] = useState({ studentId: '', facultyId: '', displayName: '', email: '', phone: '', course: '' });

  // Inline edits
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');

  // Premium Click-to-Reply messaging drawer states
  const [drawerMessages, setDrawerMessages] = useState([]);
  const [drawerNewMessage, setDrawerNewMessage] = useState('');
  const [drawerAttachment, setDrawerAttachment] = useState(null);
  const [drawerUploadingAttachment, setDrawerUploadingAttachment] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState('profile'); // 'profile' | 'chat'

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
    const unsubChats = onSnapshot(collection(db, 'communityThreads'), (snap) => {
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

    // 9. Faculty assignments listener (only for logged-in faculty to filter/view their students)
    let unsubAssignedStudentIds = () => {};
    if (user?.uid && user?.role?.toLowerCase() === 'faculty') {
      const docRef = doc(db, 'facultyStudentRoster', user.uid);
      unsubAssignedStudentIds = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setAssignedStudentIds(docSnap.data().studentIds || []);
        } else {
          setAssignedStudentIds([]);
        }
      }, (err) => {
        console.error("Error subscribing to facultyStudentRoster:", err);
      });
    }

    // 10. Audit Logs real-time listener
    let unsubAudit = () => {};
    if (user?.role === 'admin') {
      const auditQuery = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
      unsubAudit = onSnapshot(auditQuery, (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setAuditLogs(list);
      }, (err) => {
        console.error("Error subscribing to auditLogs:", err);
      });
    }

    return () => {
      unsubUsers();
      unsubAtt();
      unsubSched();
      unsubChats();
      unsubNotif();
      unsubFees();
      unsubPaymentHist();
      unsubMeets();
      unsubAssignedStudentIds();
      unsubAudit();
    };
  }, [user?.uid, user?.role]);

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

  // Real-time listener for student doubts stream in Drawer
  useEffect(() => {
    if (!selectedStudentDetails?.id || !user?.uid) {
      setDrawerMessages([]);
      return;
    }

    const studentId = selectedStudentDetails.id;
    const threadId = user.uid < studentId ? `${user.uid}_${studentId}` : `${studentId}_${user.uid}`;

    const msgQuery = query(
      collection(db, `communityThreads/${threadId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(msgQuery, (snap) => {
      const list = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setDrawerMessages(list);
    });

    return () => unsub();
  }, [selectedStudentDetails?.id, user?.uid]);

  const handleDrawerFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      triggerToast('❌ File is too large. Keep it under 1MB for Firestore upload.', 'danger');
      return;
    }

    setDrawerUploadingAttachment(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const type = file.type.startsWith('image/') ? 'image' : 'pdf';
      setDrawerAttachment({
        data: reader.result,
        type: type,
        name: file.name
      });
      setDrawerUploadingAttachment(false);
    };
    reader.onerror = () => {
      triggerToast('❌ Failed to read file', 'danger');
      setDrawerUploadingAttachment(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrawerSendMessage = async (e, textOverride = '') => {
    if (e) e.preventDefault();
    const textToSend = textOverride || drawerNewMessage.trim();
    if (!textToSend && !drawerAttachment) return;

    const now = Date.now();
    if (now - lastDrawerMsgTime < 3000) {
      triggerToast('Slow down! Please wait a few seconds between messages.', 'danger');
      return;
    }
    setLastDrawerMsgTime(now);

    const currentText = textToSend;
    const currentAttachment = drawerAttachment;

    setDrawerNewMessage('');
    setDrawerAttachment(null);

    const studentId = selectedStudentDetails.id;
    const threadId = user.uid < studentId ? `${user.uid}_${studentId}` : `${studentId}_${user.uid}`;
    const isFacultyMsg = user.role?.toLowerCase() === 'faculty' || user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'member';

    try {
      const msgObj = {
        senderId: user.uid,
        senderName: user.displayName || 'Faculty Mentor',
        senderRole: user.role || 'faculty',
        receiverId: studentId,
        message: currentText,
        text: currentText, // legacy compatibility
        readStatus: false,
        seen: false, // legacy compatibility
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(), // legacy compatibility
        attachments: currentAttachment ? [currentAttachment] : [],
        messageType: currentAttachment ? currentAttachment.type : 'text'
      };

      // 1. Write message doc
      await addDoc(collection(db, `communityThreads/${threadId}/messages`), msgObj);

      // 2. Set/Update thread parent doc metadata
      await setDoc(doc(db, 'communityThreads', threadId), {
        id: threadId,
        participants: [user.uid, studentId],
        studentId: studentId,
        studentName: selectedStudentDetails.displayName,
        studentPhoto: selectedStudentDetails.photoURL || '',
        facultyId: user.uid,
        facultyName: user.displayName || 'Faculty Mentor',
        facultyPhoto: user.photoURL || '',
        lastMessage: currentAttachment ? `Sent a ${currentAttachment.type}` : currentText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        typing: { [user.uid]: false, [studentId]: false }
      }, { merge: true });

      const updateObj = {
        lastMessage: currentAttachment ? `Sent a ${currentAttachment.type}` : currentText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid
      };

      if (isFacultyMsg) {
        updateObj.studentUnreadCount = increment(1);
      } else {
        updateObj.facultyUnreadCount = increment(1);
      }

      await setDoc(doc(db, 'communityThreads', threadId), updateObj, { merge: true });

      // 3. Write mock email trigger to notificationHistory
      const studentEmail = selectedStudentDetails.email || '';
      const studentName = selectedStudentDetails.displayName || 'Student';
      const studentPhone = selectedStudentDetails.phone || 'N/A';

      const emailHeader = `From: Compution Academy <notifications@compution.in>\nTo: ${studentEmail}\nSubject: New doubt reply from your mentor ${user.displayName}`;
      const mockEmailBody = `Hi ${studentName},\n\nYour assigned mentor ${user.displayName} has posted a new reply to your doubt thread:\n\n"${currentText}"\n\nLog in to your dashboard to view the full discussion and reply.\n\nBest Regards,\nCompution Support Team`;

      await addDoc(collection(db, 'notificationHistory'), {
        studentId: studentId,
        studentName: studentName,
        parentName: `${studentName} Parent`,
        parentPhone: studentPhone,
        message: `${emailHeader}\n\n${mockEmailBody}`,
        status: 'sent_email',
        type: 'email',
        subject: `New Doubt Reply from ${user.displayName}`,
        timestamp: serverTimestamp()
      });

      triggerToast('Message sent and email copy logged! ✉️', 'success');

    } catch (err) {
      console.error("Error sending drawer message:", err);
      triggerToast('Failed to send message', 'danger');
    }
  };

  // Handle student grouping updates & manual exceptions (Phase 2)
  const handleUpdateStudentGrouping = async (studentId, classCategory, stream, customGroupException) => {
    try {
      let autoGroup = '';
      const numCat = parseInt(classCategory) || 0;
      if (numCat >= 2 && numCat <= 5) {
        autoGroup = 'class_2_5';
      } else if (numCat >= 6 && numCat <= 8) {
        autoGroup = 'class_6_8';
      } else if (numCat >= 9 && numCat <= 10) {
        autoGroup = 'class_9_10';
      } else if (numCat === 11 || numCat === 12) {
        if (stream === 'science') {
          autoGroup = 'class_11_12_science';
        } else if (stream === 'application') {
          autoGroup = 'class_11_12_application';
        } else {
          autoGroup = 'class_11_12_science'; // fallback
        }
      }
      
      const studentGroup = customGroupException ? customGroupException : autoGroup;
      
      await setDoc(doc(db, 'users', studentId), {
        classCategory: classCategory || '',
        stream: stream || '',
        autoGroup: autoGroup || '',
        customGroupException: customGroupException || '',
        studentGroup: studentGroup || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setSelectedStudentDetails(prev => ({
        ...prev,
        classCategory: classCategory || '',
        stream: stream || '',
        autoGroup: autoGroup || '',
        customGroupException: customGroupException || '',
        studentGroup: studentGroup || ''
      }));
      
      await logAdminAction('grouping_update', studentId, { classCategory, stream, customGroupException, studentGroup });
      triggerToast('Grouping overrides updated successfully!', 'success');
    } catch (err) {
      console.error("Error updating grouping overrides:", err);
      triggerToast('Failed to update grouping overrides', 'danger');
    }
  };

  // Helper to sync Faculty-Student relations in real-time across multiple collections using atomic write batches
  const syncFacultyStudentAssignment = async (studentId, facultyId, subject, action = 'assign') => {
    try {
      const studentRef = doc(db, 'users', studentId);
      const facultyRef = doc(db, 'users', facultyId);
      const studentSnap = await getDoc(studentRef);
      const facultySnap = await getDoc(facultyRef);
      
      if (!studentSnap.exists() || !facultySnap.exists()) return;
      
      const studentData = studentSnap.data();
      const facultyData = facultySnap.data();
      
      let studentFacultyIds = studentData.assignedFacultyIds || [];
      let facultyStudentIds = facultyData.assignedStudentIds || [];
      
      if (action === 'assign') {
        if (!studentFacultyIds.includes(facultyId)) studentFacultyIds.push(facultyId);
        if (!facultyStudentIds.includes(studentId)) facultyStudentIds.push(studentId);
      } else {
        studentFacultyIds = studentFacultyIds.filter(id => id !== facultyId);
        facultyStudentIds = facultyStudentIds.filter(id => id !== studentId);
      }
      
      const studMapRef = doc(db, 'studentFacultyMap', studentId);
      const studMapSnap = await getDoc(studMapRef);
      let assignedFacultyList = [];
      if (studMapSnap.exists()) {
        assignedFacultyList = studMapSnap.data().assignedFaculty || [];
      }
      
      if (action === 'assign') {
        assignedFacultyList = assignedFacultyList.filter(f => f.facultyId !== facultyId);
        assignedFacultyList.push({
          facultyId,
          facultyName: facultyData.displayName || facultyData.name || 'Faculty Mentor',
          facultyPhoto: facultyData.photoURL || '',
          subject: subject || studentData.course || 'Python Mastery',
          assignedAt: new Date().toISOString()
        });
      } else {
        assignedFacultyList = assignedFacultyList.filter(f => f.facultyId !== facultyId);
      }
      
      const batch = writeBatch(db);
      
      batch.set(studentRef, {
        assignedFacultyIds: studentFacultyIds,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      batch.set(facultyRef, {
        assignedStudentIds: facultyStudentIds,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      batch.set(doc(db, 'facultyAssignments', facultyId), {
        assignedStudents: facultyStudentIds,
        totalStudents: facultyStudentIds.length,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      batch.set(studMapRef, {
        assignedFaculty: assignedFacultyList
      }, { merge: true });
      
      await batch.commit();
    } catch (err) {
      console.error("Error in syncFacultyStudentAssignment:", err);
    }
  };

  // Handle Faculty Assignment
  const handleAssignFaculty = async (facultyId, subjectName, roleName) => {
    if (!selectedStudentDetails) return;
    const studentId = selectedStudentDetails.id;
    const studentName = selectedStudentDetails.displayName;
    const docId = `${studentId}_${facultyId}`;

    const facultyUser = allUsers.find(u => u.id === facultyId);
    if (!facultyUser) {
      triggerToast('❌ Selected faculty mentor does not exist in the database.', 'error');
      return;
    }

    try {
      const [studentSnap, facultySnap, studMapSnap, rosterSnap] = await Promise.all([
        getDoc(doc(db, 'users', studentId)),
        getDoc(doc(db, 'users', facultyId)),
        getDoc(doc(db, 'studentFacultyMap', studentId)),
        getDoc(doc(db, 'facultyStudentRoster', facultyId))
      ]);

      let studentFacultyIds = studentSnap.exists() ? (studentSnap.data().assignedFacultyIds || []) : [];
      if (!studentFacultyIds.includes(facultyId)) studentFacultyIds = [...studentFacultyIds, facultyId];

      let facultyStudentIds = rosterSnap.exists() ? (rosterSnap.data().studentIds || []) : [];
      if (!facultyStudentIds.includes(studentId)) facultyStudentIds = [...facultyStudentIds, studentId];

      let currentAssigned = studentSnap.exists() ? (studentSnap.data().assignedFaculty || []) : [];
      const cleanAssigned = currentAssigned.filter(item => typeof item === 'object' && item !== null && item.facultyId !== facultyId);
      
      const newAssignment = {
        facultyId,
        facultyName: facultyUser.displayName || 'Faculty Mentor',
        mentorName: facultyUser.displayName || 'Faculty Mentor',
        mentorEmail: facultyUser.email || '',
        mentorPhone: facultyUser.phone || '',
        assignedDate: new Date().toISOString()
      };
      const updatedAssignedFaculty = [...cleanAssigned, newAssignment];

      let assignedFacultyList = studMapSnap.exists() ? (studMapSnap.data().assignedFaculty || []) : [];
      assignedFacultyList = assignedFacultyList.filter(f => f.facultyId !== facultyId);
      assignedFacultyList.push({
        facultyId,
        facultyName: facultyUser.displayName || facultyUser.name || 'Faculty Mentor',
        facultyPhoto: facultyUser.photoURL || '',
        subject: subjectName || selectedStudentDetails.course || 'Python Mastery',
        assignedAt: new Date().toISOString()
      });

      const batch = writeBatch(db);

      // 1. Write to assignedFaculty (legacy compatibility)
      batch.set(doc(db, 'assignedFaculty', docId), {
        studentId,
        studentName,
        facultyId,
        subject: subjectName || selectedStudentDetails.course || 'Python Mastery',
        role: roleName || 'Faculty Mentor',
        priority: 1
      });

      // 2. Write to facultyAssignments (legacy compatibility)
      batch.set(doc(db, 'facultyAssignments', docId), {
        studentId,
        facultyId,
        assignedAt: new Date().toISOString(),
        assignedBy: user.displayName || 'Admin'
      });

      // 3. Update student user document's assignedFaculty array
      batch.set(doc(db, 'users', studentId), {
        assignedFacultyIds: studentFacultyIds,
        assignedFaculty: updatedAssignedFaculty,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 4. Update facultyStudentRoster document (atomic union)
      batch.set(doc(db, 'facultyStudentRoster', facultyId), {
        facultyUid: facultyId,
        studentIds: arrayUnion(studentId),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 5. Update facultyAssignments/{facultyId}
      batch.set(doc(db, 'facultyAssignments', facultyId), {
        assignedStudents: facultyStudentIds,
        totalStudents: facultyStudentIds.length,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 6. Update studentFacultyMap/{studentId}
      batch.set(doc(db, 'studentFacultyMap', studentId), {
        assignedFaculty: assignedFacultyList
      }, { merge: true });

      // 8. Add notification to history
      const notifRef = doc(collection(db, 'notificationHistory'));
      batch.set(notifRef, {
        studentId,
        title: 'Mentor Assigned',
        message: `You have been assigned to ${facultyUser.displayName || 'a faculty mentor'} for ${subjectName || 'your course'}.`,
        timestamp: serverTimestamp(),
        read: false,
        type: 'system',
        sender: 'System'
      });

      await batch.commit();

      await logAdminAction('faculty_assign', studentId, { facultyId, facultyName: facultyUser.displayName, subjectName, roleName });
      setSelectedStudentDetails(prev => ({ ...prev, assignedFaculty: updatedAssignedFaculty }));
      triggerToast('✅ Faculty assigned successfully!', 'success');
    } catch (err) {
      console.error("Error assigning faculty:", err);
      triggerToast('❌ Failed to assign faculty', 'danger');
    }
  };

  // Handle Faculty Unassignment
  const handleUnassignFaculty = async (facultyId) => {
    if (!selectedStudentDetails) return;
    const studentId = selectedStudentDetails.id;
    const docId = `${studentId}_${facultyId}`;

    try {
      const [studentSnap, facultySnap, studMapSnap, rosterSnap] = await Promise.all([
        getDoc(doc(db, 'users', studentId)),
        getDoc(doc(db, 'users', facultyId)),
        getDoc(doc(db, 'studentFacultyMap', studentId)),
        getDoc(doc(db, 'facultyStudentRoster', facultyId))
      ]);

      let studentFacultyIds = studentSnap.exists() ? (studentSnap.data().assignedFacultyIds || []) : [];
      studentFacultyIds = studentFacultyIds.filter(id => id !== facultyId);

      let facultyStudentIds = rosterSnap.exists() ? (rosterSnap.data().studentIds || []) : [];
      facultyStudentIds = facultyStudentIds.filter(id => id !== studentId);

      let currentAssigned = studentSnap.exists() ? (studentSnap.data().assignedFaculty || []) : [];
      const updatedAssignedFaculty = currentAssigned.filter(item => typeof item === 'object' && item !== null && item.facultyId !== facultyId);

      let assignedFacultyList = studMapSnap.exists() ? (studMapSnap.data().assignedFaculty || []) : [];
      assignedFacultyList = assignedFacultyList.filter(f => f.facultyId !== facultyId);

      const batch = writeBatch(db);

      // 1. Delete legacy assignment records
      batch.delete(doc(db, 'assignedFaculty', docId));
      batch.delete(doc(db, 'facultyAssignments', docId));

      // 3. Update student user document
      batch.set(doc(db, 'users', studentId), {
        assignedFacultyIds: studentFacultyIds,
        assignedFaculty: updatedAssignedFaculty,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 4. Update facultyStudentRoster document (atomic remove)
      batch.set(doc(db, 'facultyStudentRoster', facultyId), {
        facultyUid: facultyId,
        studentIds: facultyStudentIds,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 5. Update facultyAssignments/{facultyId}
      batch.set(doc(db, 'facultyAssignments', facultyId), {
        assignedStudents: facultyStudentIds,
        totalStudents: facultyStudentIds.length,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 6. Update studentFacultyMap/{studentId}
      batch.set(doc(db, 'studentFacultyMap', studentId), {
        assignedFaculty: assignedFacultyList
      }, { merge: true });

      await batch.commit();

      await logAdminAction('faculty_unassign', studentId, { facultyId });
      setSelectedStudentDetails(prev => ({ ...prev, assignedFaculty: updatedAssignedFaculty }));
      triggerToast('✅ Faculty unassigned successfully!', 'success');
    } catch (err) {
      console.error("Error unassigning faculty:", err);
      triggerToast('❌ Failed to unassign faculty', 'danger');
    }
  };

  const handleRemoveStudentFromRoster = async (studentId) => {
    try {
      const studentSnap = await getDoc(doc(db, 'users', studentId));
      if (!studentSnap.exists()) {
        triggerToast('❌ Student not found.', 'error');
        return;
      }
      
      const studentData = studentSnap.data();
      let studentFacultyIds = studentData.assignedFacultyIds || [];
      studentFacultyIds = studentFacultyIds.filter(id => id !== user.uid);
      
      let currentAssigned = studentData.assignedFaculty || [];
      const updatedAssignedFaculty = currentAssigned.filter(item => typeof item === 'object' && item !== null && item.facultyId !== user.uid);
      
      const studMapRef = doc(db, 'studentFacultyMap', studentId);
      const studMapSnap = await getDoc(studMapRef);
      let assignedFacultyList = studMapSnap.exists() ? (studMapSnap.data().assignedFaculty || []) : [];
      assignedFacultyList = assignedFacultyList.filter(f => f.facultyId !== user.uid);
      
      const docId = `${studentId}_${user.uid}`;
      const batch = writeBatch(db);
      
      // 1. Delete legacy assignment records
      batch.delete(doc(db, 'assignedFaculty', docId));
      batch.delete(doc(db, 'facultyAssignments', docId));
      
      // 2. Update facultyStudentRoster document (atomic remove)
      batch.set(doc(db, 'facultyStudentRoster', user.uid), {
        studentIds: arrayRemove(studentId),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // 3. Update student user document
      batch.set(doc(db, 'users', studentId), {
        assignedFacultyIds: studentFacultyIds,
        assignedFaculty: updatedAssignedFaculty,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // 4. Update studentFacultyMap
      batch.set(studMapRef, {
        assignedFaculty: assignedFacultyList
      }, { merge: true });
      
      await batch.commit();
      
      await logAdminAction('faculty_student_roster_remove', studentId, { facultyId: user.uid });
      triggerToast('✅ Student removed from roster successfully!', 'success');
    } catch (err) {
      console.error("Error removing student from roster:", err);
      triggerToast('❌ Failed to remove student from roster.', 'error');
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
      await logAdminAction('progress_report_save', studentId, { attendanceScore: attendanceVal, assignmentScore: assignmentVal, testScore: testVal, practicalScore: practicalVal });
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

      await logAdminAction('meet_session_create', '', { meetTitle, meetDate, meetTime, meetParticipants, meetingLink });
      triggerToast('Google Meet session scheduled!', 'success');
      setIsMeetModalOpen(false);
      setMeetTitle('');
      setMeetParticipants('All Students');
    } catch (err) {
      console.error("Error creating meet session:", err);
      triggerToast('Failed to schedule Meet session', 'danger');
    }
  };

  // Set default tab to overview on login for member and faculty role
  useEffect(() => {
    if (user?.role === 'member' || user?.role === 'faculty') {
      setActivePanelTab('overview');
    }
  }, [user]);

  // Real-time tab security enforcement based on user role
  useEffect(() => {
    const currentTabObj = [
      { key: 'overview', roles: ['admin', 'faculty', 'member'] },
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
      setActivePanelTab(user?.role === 'member' || user?.role === 'faculty' ? 'overview' : 'students');
    }
  }, [user?.role, activePanelTab]);
  const triggerToast = (message, type = 'success') => {
    const mappedType = type === 'danger' ? 'error' : type;
    showToast(message, mappedType);
  };

  const logAdminAction = async (actionType, targetUser = '', metadata = {}) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        actionType,
        performedBy: user?.uid || 'system',
        performedByName: user?.displayName || user?.email || 'System / Admin',
        targetUser,
        timestamp: serverTimestamp(),
        metadata
      });
    } catch (e) {
      console.error("Failed to write audit log:", e);
    }
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

      let groupFields = {};
      if (role === 'student') {
        let classCategory = '';
        let stream = '';
        let autoGroup = '';
        
        const courseName = extraFields.course || '';
        const gradeName = extraFields.grade || courseName || '';
        const text = `${gradeName} ${courseName}`.toLowerCase();
        
        if (text.includes('class 2') || text.includes('grade 2') || text.includes('class 3') || text.includes('grade 3') || text.includes('class 4') || text.includes('grade 4') || text.includes('class 5') || text.includes('grade 5')) {
          const match = text.match(/class\s+(\d)|grade\s+(\d)/);
          classCategory = match ? (match[1] || match[2]) : '2';
        } else if (text.includes('class 6') || text.includes('grade 6') || text.includes('class 7') || text.includes('grade 7') || text.includes('class 8') || text.includes('grade 8')) {
          const match = text.match(/class\s+(\d)|grade\s+(\d)/);
          classCategory = match ? (match[1] || match[2]) : '6';
        } else if (text.includes('class 9') || text.includes('grade 9') || text.includes('class 10') || text.includes('grade 10')) {
          const match = text.match(/class\s+(\d+)|grade\s+(\d+)/);
          classCategory = match ? (match[1] || match[2]) : '9';
        } else if (text.includes('class 11') || text.includes('grade 11') || text.includes('11th')) {
          classCategory = '11';
          if (text.includes('science') || text.includes('cs')) stream = 'science';
          else if (text.includes('app') || text.includes('application')) stream = 'application';
        } else if (text.includes('class 12') || text.includes('grade 12') || text.includes('12th')) {
          classCategory = '12';
          if (text.includes('science') || text.includes('cs')) stream = 'science';
          else if (text.includes('app') || text.includes('application')) stream = 'application';
        } else {
          const numMatch = text.match(/\b(\d+)\b/);
          if (numMatch) {
            const num = parseInt(numMatch[1]);
            if (num >= 2 && num <= 5) classCategory = String(num);
            else if (num >= 6 && num <= 8) classCategory = String(num);
            else if (num >= 9 && num <= 10) classCategory = String(num);
            else if (num === 11 || num === 12) {
              classCategory = String(num);
              if (text.includes('science') || text.includes('cs')) stream = 'science';
              else if (text.includes('app') || text.includes('application')) stream = 'application';
            }
          }
        }
        
        const numCat = parseInt(classCategory) || 0;
        if (numCat >= 2 && numCat <= 5) {
          autoGroup = 'class_2_5';
        } else if (numCat >= 6 && numCat <= 8) {
          autoGroup = 'class_6_8';
        } else if (numCat >= 9 && numCat <= 10) {
          autoGroup = 'class_9_10';
        } else if (numCat === 11 || numCat === 12) {
          if (stream === 'science') {
            autoGroup = 'class_11_12_science';
          } else if (stream === 'application') {
            autoGroup = 'class_11_12_application';
          } else {
            autoGroup = 'class_11_12_science';
          }
        }
        
        groupFields = {
          classCategory,
          stream,
          autoGroup,
          studentGroup: autoGroup,
          customGroupException: ''
        };
      }

      let userDocPayload = {};
      if (role === 'student') {
        userDocPayload = {
          uid: newUserId,
          name: displayName,
          displayName,
          email: email.toLowerCase(),
          role,
          assignedFacultyIds: [],
          studentGroup: '',
          classCategory: '',
          stream: '',
          autoGroup: '',
          customGroupException: '',
          permissions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...groupFields,
          ...extraFields
        };
        if (userDocPayload.studentId === undefined) {
          userDocPayload.studentId = `COMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        if (userDocPayload.feeStatus === undefined) userDocPayload.feeStatus = 'Pending';
        if (userDocPayload.feesAmount === undefined) userDocPayload.feesAmount = 2400;
      } else if (role === 'faculty') {
        userDocPayload = {
          uid: newUserId,
          name: displayName,
          email: email.toLowerCase(),
          phone: extraFields.phone || '',
          role,
          permissions,
          photoURL: extraFields.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (extraFields.assignedFacultyIds) {
          userDocPayload.assignedFacultyIds = extraFields.assignedFacultyIds;
        }
      } else { // admin or member
        userDocPayload = {
          uid: newUserId,
          name: displayName,
          displayName,
          email: email.toLowerCase(),
          phone: extraFields.phone || '',
          role,
          permissions,
          photoURL: extraFields.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...extraFields
        };
        const prohibitedFields = ['studentId', 'studentGroup', 'feeStatus', 'feesAmount', 'paidAmount', 'pendingAmount', 'assignedStudentIds', 'classCategory', 'stream', 'autoGroup', 'customGroupException'];
        prohibitedFields.forEach(f => {
          delete userDocPayload[f];
        });
      }

      await setDoc(doc(db, 'users', newUserId), userDocPayload);

      await logAdminAction('account_create', newUserId, { email, displayName, role });
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

  const handleRosterStudentSelect = (e) => {
    const studentId = e.target.value;
    const selectedStudent = allUsers.find(u => u.id === studentId);
    if (selectedStudent) {
      setRosterForm(prev => ({
        ...prev,
        studentId: selectedStudent.id,
        displayName: selectedStudent.displayName || '',
        email: selectedStudent.email || '',
        phone: selectedStudent.phone || '',
        course: selectedStudent.course || ''
      }));
    }
  };

  // ── ADD STUDENT SUBMIT ──
  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (isRosterSubmitting) return;

    const userRoleLower = user?.role?.toLowerCase();

    // If Admin is in 'create' mode, use the original handleCreateAccount
    if (userRoleLower === 'admin' && rosterMode === 'create') {
      setIsRosterSubmitting(true);
      const success = await handleCreateAccount(newStudent.email, newStudent.displayName, 'student', {
        phone: newStudent.phone,
        course: newStudent.course,
        studentId: `COMP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        verified: true,
        feeStatus: 'Pending',
        feesAmount: 2400
      });
      setIsRosterSubmitting(false);
      if (success) {
        setIsAddStudentOpen(false);
        setNewStudent({ displayName: '', email: '', phone: '', course: '' });
      }
      return;
    }

    // Otherwise, we are in 'assign' mode (for Faculty or Admin assigning a student)
    // Prefill facultyId if logged in user is faculty
    const facultyId = userRoleLower === 'faculty' ? user.uid : rosterForm.facultyId;
    const { studentId, displayName, email, phone, course } = rosterForm;

    // STEP 1 — VALIDATE INPUTS
    // 1. Prevent empty fields
    if (!studentId || !facultyId) {
      triggerToast('❌ Please select both a student and a faculty mentor.', 'error');
      return;
    }

    // 2. Validate student exists
    const studentUser = allUsers.find(u => u.id === studentId);
    if (!studentUser) {
      triggerToast('❌ Selected student does not exist in the database.', 'error');
      return;
    }

    // 3. Validate email valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      triggerToast('❌ Student email address is invalid.', 'error');
      return;
    }

    // 4. Validate course exists
    if (!course) {
      triggerToast('❌ Selected student does not have an active course.', 'error');
      return;
    }

    // 5. Validate faculty exists
    const facultyUser = allUsers.find(u => u.id === facultyId);
    if (!facultyUser) {
      triggerToast('❌ Selected faculty mentor does not exist in the database.', 'error');
      return;
    }

    // 6. Prevent duplicates
    const docId = `${studentId}_${facultyId}`;
    setIsRosterSubmitting(true);

    try {
      // Check existing relation
      const assDocRef = doc(db, 'assignedFaculty', docId);
      const assDocSnap = await getDoc(assDocRef);
      if (assDocSnap.exists()) {
        triggerToast('⚠️ This student is already assigned to this faculty mentor.', 'warning');
        setIsRosterSubmitting(false);
        return;
      }

      // Fetch snapshot data for atomic consistency
      const [studentSnap, facultySnap, studMapSnap, rosterSnap] = await Promise.all([
        getDoc(doc(db, 'users', studentId)),
        getDoc(doc(db, 'users', facultyId)),
        getDoc(doc(db, 'studentFacultyMap', studentId)),
        getDoc(doc(db, 'facultyStudentRoster', facultyId))
      ]);

      let studentFacultyIds = studentSnap.exists() ? (studentSnap.data().assignedFacultyIds || []) : [];
      if (!studentFacultyIds.includes(facultyId)) studentFacultyIds = [...studentFacultyIds, facultyId];

      let facultyStudentIds = rosterSnap.exists() ? (rosterSnap.data().studentIds || []) : [];
      if (!facultyStudentIds.includes(studentId)) facultyStudentIds = [...facultyStudentIds, studentId];

      let currentAssigned = studentSnap.exists() ? (studentSnap.data().assignedFaculty || []) : [];
      const cleanAssigned = currentAssigned.filter(item => typeof item === 'object' && item !== null && item.facultyId !== facultyId);

      const newAssignment = {
        facultyId,
        facultyName: facultyUser.displayName || 'Faculty Mentor',
        mentorName: facultyUser.displayName || 'Faculty Mentor',
        mentorEmail: facultyUser.email || '',
        mentorPhone: facultyUser.phone || '',
        assignedDate: new Date().toISOString()
      };
      const updatedAssignedFaculty = [...cleanAssigned, newAssignment];

      let assignedFacultyList = studMapSnap.exists() ? (studMapSnap.data().assignedFaculty || []) : [];
      assignedFacultyList = assignedFacultyList.filter(f => f.facultyId !== facultyId);
      assignedFacultyList.push({
        facultyId,
        facultyName: facultyUser.displayName || facultyUser.name || 'Faculty Mentor',
        facultyPhoto: facultyUser.photoURL || '',
        subject: course || studentUser.course || 'Python Mastery',
        assignedAt: new Date().toISOString()
      });

      const batch = writeBatch(db);

      // 1. Update facultyStudentRoster document (atomic union)
      batch.set(doc(db, 'facultyStudentRoster', facultyId), {
        facultyUid: facultyId,
        studentIds: arrayUnion(studentId),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Write to assignedFaculty (legacy compatibility)
      batch.set(doc(db, 'assignedFaculty', docId), {
        studentId,
        studentName: displayName,
        facultyId,
        subject: course || 'Python Mastery',
        role: 'Faculty Mentor',
        priority: 1
      });

      // 3. Write to facultyAssignments (legacy compatibility)
      batch.set(doc(db, 'facultyAssignments', docId), {
        studentId,
        facultyId,
        assignedAt: new Date().toISOString(),
        assignedBy: user.displayName || user.email || 'System'
      });

      // 4. Update student user document
      batch.set(doc(db, 'users', studentId), {
        assignedFacultyIds: studentFacultyIds,
        assignedFaculty: updatedAssignedFaculty,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 5. Update facultyAssignments/{facultyId}
      batch.set(doc(db, 'facultyAssignments', facultyId), {
        assignedStudents: facultyStudentIds,
        totalStudents: facultyStudentIds.length,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 6. Update studentFacultyMap/{studentId}
      batch.set(doc(db, 'studentFacultyMap', studentId), {
        assignedFaculty: assignedFacultyList
      }, { merge: true });

      // 8. Create notification entry in history
      const notifRef = doc(collection(db, 'notificationHistory'));
      batch.set(notifRef, {
        studentId,
        title: 'Mentor Assigned',
        message: `You have been assigned to ${facultyUser.displayName || 'a faculty mentor'} for ${course || 'your course'}.`,
        timestamp: serverTimestamp(),
        read: false,
        type: 'system',
        sender: 'System'
      });

      await batch.commit();

      await logAdminAction('student_roster_assign', studentId, { facultyId, course });
      triggerToast('✅ Student assigned to faculty roster successfully!', 'success');
      setIsAddStudentOpen(false);
      setRosterForm({ studentId: '', facultyId: '', displayName: '', email: '', phone: '', course: '' });

    } catch (err) {
      console.error("Error adding student roster:", err);
      triggerToast(`❌ Failed to add student: ${err.message || 'unknown error'}`, 'error');
    } finally {
      setIsRosterSubmitting(false);
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
      await setDoc(doc(db, 'users', studentId), { feesAmount: amount }, { merge: true });
      await logAdminAction('fees_amount_update', studentId, { feesAmount: amount });
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
      const feesRef = collection(db, 'users', studentId, 'fees');
      const feesSnap = await getDocs(feesRef);
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', studentId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error('Student profile not found');
        }
        
        const userData = userSnap.data();
        const feesAmount = Number(userData.feesAmount) || 0;
        let paidAmount = Number(userData.paidAmount) || 0;
        let pendingAmount = Number(userData.pendingAmount) || 0;
        
        let targetStatus = status;
        if (status === 'Paid') {
          paidAmount = feesAmount;
          pendingAmount = 0;
        } else {
          if (paidAmount > feesAmount) {
            paidAmount = feesAmount;
          }
          pendingAmount = Math.max(0, feesAmount - paidAmount);
          if (pendingAmount === 0 && feesAmount > 0) {
            targetStatus = 'Paid';
            paidAmount = feesAmount;
          }
        }
        
        // Validation rules
        if (paidAmount > feesAmount) {
          paidAmount = feesAmount;
        }
        pendingAmount = Math.max(0, feesAmount - paidAmount);
        if (targetStatus === 'Paid') {
          pendingAmount = 0;
          paidAmount = feesAmount;
        }
        
        transaction.update(userRef, {
          feeStatus: targetStatus,
          paidAmount,
          pendingAmount,
          updatedAt: new Date().toISOString()
        });
        
        if (targetStatus === 'Paid') {
          feesSnap.forEach(feeDoc => {
            const feeData = feeDoc.data();
            const amount = Number(feeData.amount) || 0;
            transaction.update(feeDoc.ref, {
              status: 'Paid',
              paidAmount: amount
            });
          });
        }
      });
      
      await logAdminAction('fee_status_update', studentId, { feeStatus: status });
      triggerToast(`Fee status updated to ${status}!`, 'success');
    } catch (err) {
      console.error("Error updating fee status in transaction:", err);
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
      await setDoc(doc(db, 'users', userId), { role: newRole, permissions: permissions }, { merge: true });
      await logAdminAction('role_update', userId, { role: newRole });
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

  // ── SYSTEM DOCTOR & INTEGRITY SWEEP ──
  const runSystemDoctor = async () => {
    if (doctorRunning) return;
    setDoctorRunning(true);
    setDoctorResults(null);
    
    const logs = [];
    let scannedCount = 0;
    let issuesFound = 0;
    let repairedCount = 0;
    
    try {
      logs.push("🚀 Starting System Doctor & Database Consistency Suite...");
      
      const studentsToScan = allUsers.filter(u => u.role?.toLowerCase() === 'student');
      const facultyList = allUsers.filter(u => u.role?.toLowerCase() === 'faculty');
      
      logs.push(`🔍 Found ${studentsToScan.length} student accounts and ${facultyList.length} faculty members to scan.`);
      
      // Find fallback faculty mentor
      let fallbackFaculty = facultyList.find(f => f.email?.toLowerCase() === 'sharmisthaghosh855@gmail.com' || f.email?.toLowerCase() === 'tapadarhribhu350@gmail.com');
      if (!fallbackFaculty && facultyList.length > 0) {
        fallbackFaculty = facultyList[0];
      }
      
      if (fallbackFaculty) {
        logs.push(`ℹ️ Using fallback faculty mentor: ${fallbackFaculty.displayName} (${fallbackFaculty.email})`);
      } else {
        logs.push("⚠️ Warning: No faculty mentors found in database. Automated mentor assignment will be skipped.");
      }
      
      for (const student of studentsToScan) {
        scannedCount++;
        let studentIssues = 0;
        let updatePayload = {};
        
        // 1. Verify student grouping and category metadata
        if (!student.classCategory || !student.studentGroup) {
          studentIssues++;
          issuesFound++;
          logs.push(`❌ [Issue] Student ${student.displayName} (${student.email}) has missing class category or student group.`);
          
          const defaultCategory = student.classCategory || '10';
          const defaultStream = student.stream || 'science';
          let defaultGroup = 'class_9_10';
          if (defaultCategory === '11' || defaultCategory === '12') {
            defaultGroup = defaultStream === 'science' ? 'class_11_12_science' : 'class_11_12_application';
          }
          
          updatePayload.classCategory = defaultCategory;
          updatePayload.stream = defaultStream;
          updatePayload.studentGroup = defaultGroup;
          updatePayload.autoGroup = defaultGroup;
          
          logs.push(`🔧 [Repair] Queueing metadata fix: Category=${defaultCategory}, Group=${defaultGroup}`);
        }
        
        // 2. Verify faculty mentor assignment
        const hasFaculty = (student.assignedFacultyIds && student.assignedFacultyIds.length > 0) || 
                            (student.assignedFaculty && student.assignedFaculty.length > 0);
                            
        if (!hasFaculty && fallbackFaculty) {
          studentIssues++;
          issuesFound++;
          logs.push(`❌ [Issue] Orphan Student: ${student.displayName} has no assigned faculty mentor.`);
          
          // Reassign mentor
          const docId = `${student.id}_${fallbackFaculty.id}`;
          const newAssignment = {
            facultyId: fallbackFaculty.id,
            facultyName: fallbackFaculty.displayName || 'Faculty Mentor',
            mentorName: fallbackFaculty.displayName || 'Faculty Mentor',
            mentorEmail: fallbackFaculty.email || '',
            mentorPhone: fallbackFaculty.phone || '',
            assignedDate: new Date().toISOString()
          };
          
          const studMapRef = doc(db, 'studentFacultyMap', student.id);
          const studMapSnap = await getDoc(studMapRef);
          let assignedFacultyList = studMapSnap.exists() ? (studMapSnap.data().assignedFaculty || []) : [];
          assignedFacultyList = assignedFacultyList.filter(f => f.facultyId !== fallbackFaculty.id);
          assignedFacultyList.push({
            facultyId: fallbackFaculty.id,
            facultyName: fallbackFaculty.displayName || fallbackFaculty.name || 'Faculty Mentor',
            facultyPhoto: fallbackFaculty.photoURL || '',
            subject: student.course || 'Python Mastery',
            assignedAt: new Date().toISOString()
          });
          
          await setDoc(doc(db, 'assignedFaculty', docId), {
            studentId: student.id,
            studentName: student.displayName,
            facultyId: fallbackFaculty.id,
            subject: student.course || 'Python Mastery',
            role: 'Faculty Mentor',
            priority: 1
          });
          
          await setDoc(doc(db, 'studentFacultyMap', student.id), {
            assignedFaculty: assignedFacultyList
          }, { merge: true });
          
          updatePayload.assignedFacultyIds = [fallbackFaculty.id];
          updatePayload.assignedFaculty = [newAssignment];
          
          // Update fallback faculty student roster document
          const rosterRef = doc(db, 'facultyStudentRoster', fallbackFaculty.id);
          const rosterSnap = await getDoc(rosterRef);
          let fallbackStudentIds = rosterSnap.exists() ? (rosterSnap.data().studentIds || []) : [];
          if (!fallbackStudentIds.includes(student.id)) {
            fallbackStudentIds = [...fallbackStudentIds, student.id];
            await setDoc(rosterRef, {
              facultyUid: fallbackFaculty.id,
              studentIds: fallbackStudentIds,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
          
          logs.push(`🔧 [Repair] Assigned Student ${student.displayName} to faculty mentor ${fallbackFaculty.displayName}`);
        }
        
        // 3. Scan fees subcollection and recalculate aggregates
        const feesRef = collection(db, 'users', student.id, 'fees');
        const feesSnap = await getDocs(feesRef);
        let feesList = [];
        feesSnap.forEach(d => {
          feesList.push({ id: d.id, ...d.data() });
        });
        
        let totalAmount = 0;
        let totalPaid = 0;
        
        feesList.forEach(fee => {
          totalAmount += Number(fee.amount) || 0;
          totalPaid += Number(fee.paidAmount) || 0;
        });
        
        const totalPending = totalAmount - totalPaid;
        let computedStatus = 'Pending';
        if (totalPending <= 0 && totalAmount > 0) {
          computedStatus = 'Paid';
        } else if (totalPaid > 0) {
          computedStatus = 'Partially Paid';
        }
        
        const finalPending = Math.max(0, totalPending);
        
        const feesMismatch = student.feesAmount !== totalAmount || 
                              student.paidAmount !== totalPaid || 
                              student.pendingAmount !== finalPending || 
                              student.feeStatus !== computedStatus;
                              
        if (feesMismatch && feesList.length > 0) {
          studentIssues++;
          issuesFound++;
          logs.push(`❌ [Issue] Fee aggregate mismatch for student ${student.displayName}. Profile claims Billed=${student.feesAmount || 0}, Paid=${student.paidAmount || 0}, Pending=${student.pendingAmount || 0}, Status=${student.feeStatus || 'Pending'}. Subcollection total: Billed=${totalAmount}, Paid=${totalPaid}, Pending=${finalPending}, Status=${computedStatus}.`);
          
          updatePayload.feesAmount = totalAmount;
          updatePayload.paidAmount = totalPaid;
          updatePayload.pendingAmount = finalPending;
          updatePayload.feeStatus = computedStatus;
          
          logs.push(`🔧 [Repair] Syncing fee totals to: Billed=${totalAmount}, Paid=${totalPaid}, Pending=${finalPending}, Status=${computedStatus}`);
        }
        
        // Apply student repairs
        if (Object.keys(updatePayload).length > 0) {
          updatePayload.updatedAt = serverTimestamp();
          await updateDoc(doc(db, 'users', student.id), updatePayload);
          repairedCount += studentIssues;
          logs.push(`✅ Saved repairs successfully for student: ${student.displayName}`);
        }
      }

      // 4. Orphan subcollection fees scan (deleted students whose nested fee documents still exist)
      logs.push("🔍 Scanning for orphaned fee subcollection records...");
      const allFeesSnap = await getDocs(collectionGroup(db, 'fees'));
      const activeUserIds = new Set(allUsers.map(u => u.id));
      
      let orphanFeesCount = 0;
      for (const feeDoc of allFeesSnap.docs) {
        const studentId = feeDoc.ref.parent.parent.id;
        if (!activeUserIds.has(studentId)) {
          orphanFeesCount++;
          issuesFound++;
          logs.push(`❌ [Issue] Orphan Fee item found: FeeID=${feeDoc.id} belongs to deleted student ${studentId}.`);
          
          // Repair: Delete the orphan fee doc
          await deleteDoc(feeDoc.ref);
          repairedCount++;
          logs.push(`🔧 [Repair] Deleted orphan fee record: ${feeDoc.id}`);
        }
      }
      
      if (orphanFeesCount > 0) {
        logs.push(`✅ Cleaned up ${orphanFeesCount} orphaned fee records from the database.`);
      } else {
        logs.push("👍 No orphaned fee records found.");
      }
      
      // 5. Scan faculty accounts and remove student-specific/invalid fields
      logs.push("🔍 Scanning faculty accounts for student-specific fields and migrating rosters...");
      for (const fac of facultyList) {
        let facIssues = 0;
        let updateFields = {};
        
        // Check for student-only fields
        const prohibitedFields = ['studentId', 'studentGroup', 'feeStatus', 'feesAmount', 'paidAmount', 'pendingAmount', 'assignedStudentIds', 'classCategory', 'stream', 'autoGroup', 'customGroupException'];
        prohibitedFields.forEach(field => {
          if (fac[field] !== undefined) {
            facIssues++;
            updateFields[field] = deleteField();
          }
        });

        // Migrate assignedStudentIds to facultyStudentRoster if present
        if (fac.assignedStudentIds && fac.assignedStudentIds.length > 0) {
          const rosterRef = doc(db, 'facultyStudentRoster', fac.id);
          const rosterSnap = await getDoc(rosterRef);
          let studentIds = rosterSnap.exists() ? (rosterSnap.data().studentIds || []) : [];
          
          let modified = false;
          fac.assignedStudentIds.forEach(sid => {
            if (!studentIds.includes(sid)) {
              studentIds.push(sid);
              modified = true;
            }
          });
          
          if (modified || !rosterSnap.exists()) {
            await setDoc(rosterRef, {
              facultyUid: fac.id,
              studentIds,
              updatedAt: serverTimestamp()
            }, { merge: true });
            logs.push(`🔧 [Repair] Migrated roster for faculty ${fac.displayName || fac.name}: ${studentIds.length} students.`);
            repairedCount++;
          }
        }
        
        if (facIssues > 0) {
          issuesFound += facIssues;
          await updateDoc(doc(db, 'users', fac.id), updateFields);
          repairedCount += facIssues;
          logs.push(`✅ Sanitized faculty profile: ${fac.displayName || fac.name} (removed student-specific fields)`);
        }
      }

      logs.push("🎉 Integrity sweep complete.");
      logs.push(`📊 Summary: Scanned ${scannedCount} accounts. Found ${issuesFound} issues. Repaired ${repairedCount} issues.`);
      
      setDoctorResults({
        scannedCount,
        issuesFound,
        repairedCount,
        logs
      });
      
      await logAdminAction('system_doctor_run', '', { scannedCount, issuesFound, repairedCount });
      triggerToast('System Doctor completed successfully!', 'success');
    } catch (e) {
      console.error("System Doctor failure:", e);
      logs.push(`🚨 Critical Error: ${e.message}`);
      setDoctorResults({
        scannedCount,
        issuesFound,
        repairedCount,
        logs
      });
      triggerToast('System Doctor encountered an error', 'danger');
    } finally {
      setDoctorRunning(false);
    }
  };
  
  // ── REPAIR FINANCIAL RECORDS ──
  const handleRepairFinancialRecords = async () => {
    if (isRepairingFinancial) return;
    setIsRepairingFinancial(true);
    try {
      const studentsToScan = allUsers.filter(u => u.role?.toLowerCase() === 'student');
      
      // Perform transaction-safe sync for all students
      const repairPromises = studentsToScan.map(student => syncStudentFeeAggregates(student.id));
      await Promise.all(repairPromises);
      
      await logAdminAction('financial_records_repair', '', { count: studentsToScan.length });
      triggerToast("Financial records repaired successfully", "success");
    } catch (err) {
      console.error("Financial records repair failed:", err);
      triggerToast("Financial repair failed", "danger");
    } finally {
      setIsRepairingFinancial(false);
    }
  };

  // ── DELETE USER ACCOUNT ──
  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Delete user "${userName}" permanently? This will cascade delete all their attendance records, class schedules, payments history, and chat logs.`)) {
      try {
        const deletePromises = [];
        const userToDelete = allUsers.find(u => u.id === userId);
        const isFacultyUser = userToDelete?.role?.toLowerCase() === 'faculty';

        if (isFacultyUser) {
          const assignedStudents = allUsers.filter(u => u.role?.toLowerCase() === 'student' && 
            (u.assignedFacultyIds?.includes(userId) || (u.assignedFaculty && u.assignedFaculty.some(f => f.facultyId === userId)))
          );
          const otherFacultyList = allUsers.filter(u => u.role?.toLowerCase() === 'faculty' && u.id !== userId);
          
          if (otherFacultyList.length > 0) {
            const newFaculty = otherFacultyList[0];
            const rosterRef = doc(db, 'facultyStudentRoster', newFaculty.id);
            const rosterSnap = await getDoc(rosterRef);
            let facultyStudentIds = rosterSnap.exists() ? (rosterSnap.data().studentIds || []) : [];

            for (const student of assignedStudents) {
              const docId = `${student.id}_${newFaculty.id}`;
              
              let studentFacultyIds = student.assignedFacultyIds || [];
              studentFacultyIds = studentFacultyIds.filter(id => id !== userId);
              if (!studentFacultyIds.includes(newFaculty.id)) studentFacultyIds.push(newFaculty.id);

              if (!facultyStudentIds.includes(student.id)) facultyStudentIds.push(student.id);

              let currentAssigned = student.assignedFaculty || [];
              const cleanAssigned = currentAssigned.filter(item => typeof item === 'object' && item !== null && item.facultyId !== userId && item.facultyId !== newFaculty.id);
              
              const newAssignment = {
                facultyId: newFaculty.id,
                facultyName: newFaculty.displayName || 'Faculty Mentor',
                mentorName: newFaculty.displayName || 'Faculty Mentor',
                mentorEmail: newFaculty.email || '',
                mentorPhone: newFaculty.phone || '',
                assignedDate: new Date().toISOString()
              };
              const updatedAssignedFaculty = [...cleanAssigned, newAssignment];

              const studMapRef = doc(db, 'studentFacultyMap', student.id);
              const studMapSnap = await getDoc(studMapRef);
              let assignedFacultyList = studMapSnap.exists() ? (studMapSnap.data().assignedFaculty || []) : [];
              assignedFacultyList = assignedFacultyList.filter(f => f.facultyId !== userId && f.facultyId !== newFaculty.id);
              assignedFacultyList.push({
                facultyId: newFaculty.id,
                facultyName: newFaculty.displayName || newFaculty.name || 'Faculty Mentor',
                facultyPhoto: newFaculty.photoURL || '',
                subject: student.course || 'Python Mastery',
                assignedAt: new Date().toISOString()
              });

              deletePromises.push(setDoc(doc(db, 'assignedFaculty', docId), {
                studentId: student.id,
                studentName: student.displayName,
                facultyId: newFaculty.id,
                subject: student.course || 'Python Mastery',
                role: 'Faculty Mentor',
                priority: 1
              }));
              
              deletePromises.push(setDoc(doc(db, 'users', student.id), {
                assignedFacultyIds: studentFacultyIds,
                assignedFaculty: updatedAssignedFaculty,
                updatedAt: serverTimestamp()
              }, { merge: true }));

              deletePromises.push(setDoc(doc(db, 'studentFacultyMap', student.id), {
                assignedFaculty: assignedFacultyList
              }, { merge: true }));
            }

            deletePromises.push(setDoc(rosterRef, {
              facultyUid: newFaculty.id,
              studentIds: facultyStudentIds,
              updatedAt: serverTimestamp()
            }, { merge: true }));
          }

          deletePromises.push(deleteDoc(doc(db, 'facultyStudentRoster', userId)));
        }

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

        // 7. Write Audit Log
        deletePromises.push(addDoc(collection(db, 'auditLogs'), {
          actionType: 'user_delete',
          performedBy: user.uid,
          performedByName: user.displayName || 'Admin',
          targetUser: userId,
          timestamp: serverTimestamp(),
          metadata: { deletedUserName: userName, deletedUserRole: userToDelete?.role || 'unknown' }
        }));

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
        await logAdminAction('bulk_delete', '', { role, count: targets.length });
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

      await logAdminAction('collect_payment', selectedStudentDetails.id, { feeId: selectedFeeItem.id, feeName: selectedFeeItem.feeName, amountPaid: paymentVal, paymentMethod: paymentForm.paymentMethod });
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

      await logAdminAction('fee_item_add', selectedStudentDetails.id, { feeName: feeForm.feeName, amount: feeAmt, month: feeForm.month });
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

        await logAdminAction('fee_item_delete', selectedStudentDetails.id, { feeId: feeItem.id, feeName: feeItem.feeName, amount: feeItem.amount });
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
    activeFees.forEach(fee => {
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
  const studentsList = allUsers.filter(u => u.role?.toLowerCase() === 'student').filter(s => {
    if (user?.role?.toLowerCase() === 'faculty') {
      return s.assignedFaculty?.includes(user.uid) || s.assignedFaculty?.includes(user.email) || assignedStudentIds.includes(s.id);
    }
    return true;
  });
  const facultyList = allUsers.filter(u => u.role?.toLowerCase() === 'faculty');
  const membersList = allUsers.filter(u => u.role?.toLowerCase() === 'member');
  
  const activeStudentIds = new Set(allUsers.filter(u => u.role?.toLowerCase() === 'student').map(u => u.id));
  const activeFees = allFees.filter(f => activeStudentIds.has(f.studentId));

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
    return acc + (Number(s.pendingAmount) || 0);
  }, 0);

  const totalMonthlyFees = studentsList.reduce((acc, s) => {
    return acc + (Number(s.feesAmount) || 0);
  }, 0);

  const courseDensityData = () => {
    const densities = {};
    studentsList.forEach(s => {
      const course = s.course || 'Unassigned';
      densities[course] = (densities[course] || 0) + 1;
    });
    return Object.entries(densities).map(([name, value]) => ({ name, value }));
  };

  const renderAdminOverview = () => {
    // Overall Attendance Rate
    const totalAtt = attendanceLogs.length;
    const presentAtt = attendanceLogs.filter(l => l.status === 'present').length;
    const rate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 92; // default high attendance representation if logs are empty

    // Revenue collections
    const totalBilled = activeFees.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
    const totalCollected = activeFees.reduce((acc, f) => acc + (Number(f.paidAmount) || 0), 0);
    const totalPending = totalBilled - totalCollected;
    const collectionPercent = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 80;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Welcome Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: 'white',
          padding: '28px',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(79, 70, 229, 0.15)'
        }}>
          <div style={{
            position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Executive Panel</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>System Administrator</span>
          </div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Welcome to Admin Control, {user?.displayName || 'Administrator'}</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', maxWidth: '600px' }}>
            Monitor institutional performance, manage faculty workload, analyze student demographic batches, and track billing collections.
          </p>
        </div>

        {/* Dynamic Analytics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '24px' }} className="grid-3-col-mobile">
          
          {/* Card 1: Faculty Workload */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--dark)' }}>Faculty Workload Distribution</h3>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px' }}>Utilization Rate</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
              {facultyList.map(fac => {
                const studentCount = allUsers.filter(u => u.role?.toLowerCase() === 'student' && (u.assignedFacultyIds?.includes(fac.id) || (u.assignedFaculty && u.assignedFaculty.some(f => f.facultyId === fac.id)))).length;
                const ratio = totalStudents > 0 ? Math.round((studentCount / totalStudents) * 100) : 0;
                
                return (
                  <div key={fac.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--dark)' }}>{fac.displayName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{studentCount} Students ({ratio}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--surface)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${ratio}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px' }} />
                    </div>
                  </div>
                );
              })}
              {facultyList.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.8rem', padding: '20px' }}>No faculty profiles found.</div>
              )}
            </div>
          </div>

          {/* Card 2: Student Batches & Groups */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)', background: 'white' }}>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--dark)' }}>Academic Groups & Roster Stats</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'class_2_5', label: 'Primary (Class 2-5)', color: '#3B82F6' },
                { key: 'class_6_8', label: 'Middle School (Class 6-8)', color: '#10B981' },
                { key: 'class_9_10', label: 'High School (Class 9-10)', color: '#F59E0B' },
                { key: 'class_11_12_science', label: 'Senior Sci (Class 11-12)', color: '#EF4444' },
                { key: 'class_11_12_application', label: 'Senior App (Class 11-12)', color: '#8B5CF6' }
              ].map(grp => {
                const count = allUsers.filter(u => u.role === 'student' && u.studentGroup === grp.key).length;
                return (
                  <div key={grp.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: grp.color }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>{grp.label}</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--dark)' }}>{count} Students</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Metrics */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)', background: 'white', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--dark)' }}>Performance Metrics</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--surface)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'conic-gradient(var(--success) 0deg, var(--success) ' + (rate * 3.6) + 'deg, #e2e8f0 ' + (rate * 3.6) + 'deg 360deg)' }}>
                  <div style={{ position: 'absolute', width: '44px', height: '44px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: 'var(--success)' }}>
                    {rate}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--dark)' }}>Overall Attendance</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Average presence rate across all doubt sessions.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--surface)', padding: '12px', borderRadius: '12px', marginTop: '4px' }}>
                <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'conic-gradient(var(--primary) 0deg, var(--primary) ' + (collectionPercent * 3.6) + 'deg, #e2e8f0 ' + (collectionPercent * 3.6) + 'deg 360deg)' }}>
                  <div style={{ position: 'absolute', width: '44px', height: '44px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>
                    {collectionPercent}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--dark)' }}>Billing Collections</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>₹{totalCollected.toLocaleString()} of ₹{totalBilled.toLocaleString()} collected.</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setActivePanelTab('billing')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', marginTop: '8px' }}
            >
              View Billing Details &gt;
            </button>
          </div>

        </div>
      </div>
    );
  };

  const renderFacultyOverview = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const myClasses = schedulesList.filter(sch => sch.date === todayStr && (sch.facultyId === user.uid || sch.faculty === user.displayName));

    const myRooms = chatRoomsList.filter(rm => rm.facultyId === user.uid);
    const unreadDoubtCount = myRooms.reduce((acc, rm) => acc + (rm.facultyUnreadCount || 0), 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Welcome Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981, #047857)',
          color: 'white',
          padding: '28px',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{
            position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faculty Portal</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Academic Mentor</span>
          </div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Welcome, Mentor {user?.displayName}!</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', maxWidth: '600px' }}>
            Review student progress reports, respond to doubt queries instantly, and check your class schedule for the day.
          </p>
        </div>

        {/* Quick Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Allotted Students', value: `${studentsList.length} Students`, color: 'var(--primary)', icon: <Users size={20} /> },
            { label: 'Classes Scheduled Today', value: `${myClasses.length} Sessions`, color: 'var(--success)', icon: <Calendar size={20} /> },
            { label: 'Unread Doubt Queries', value: `${unreadDoubtCount} Messages`, color: unreadDoubtCount > 0 ? 'var(--danger)' : 'var(--text-muted)', icon: <MessageSquare size={20} /> }
          ].map((stat, idx) => (
            <div key={idx} style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.2 }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }} className="grid-2-col-mobile">
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Student Progress */}
            <div className="card" style={{ padding: '20px', border: '1px solid var(--border)', background: 'white' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '0.98rem', fontWeight: 800, color: 'var(--dark)' }}>Assigned Students Progress</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 700 }}>
                      <th style={{ padding: '8px 4px' }}>Student</th>
                      <th style={{ padding: '8px 4px' }}>Attendance</th>
                      <th style={{ padding: '8px 4px' }}>Assignments</th>
                      <th style={{ padding: '8px 4px' }}>Tests</th>
                      <th style={{ padding: '8px 4px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.slice(0, 8).map(student => {
                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 4px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{student.displayName}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{student.course}</div>
                          </td>
                          <td style={{ padding: '10px 4px', fontWeight: 600 }}>{student.attendanceScore !== undefined ? `${student.attendanceScore}%` : '100%'}</td>
                          <td style={{ padding: '10px 4px', fontWeight: 600 }}>{student.assignmentScore !== undefined ? `${student.assignmentScore}%` : '85%'}</td>
                          <td style={{ padding: '10px 4px', fontWeight: 600 }}>{student.testScore !== undefined ? `${student.testScore}%` : '80%'}</td>
                          <td style={{ padding: '10px 4px' }}>
                            <button
                              onClick={() => {
                                setSelectedStudentDetails({ ...student, joined: 'Jan 2026', roll: 'Roll #COMP' });
                                setDrawerActiveTab('profile');
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '4px' }}
                            >
                              Grades/Remarks
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {studentsList.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic' }}>
                          No students currently allotted to your roster.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Doubt Queue */}
            <div className="card" style={{ padding: '20px', border: '1px solid var(--border)', background: 'white' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '0.98rem', fontWeight: 800, color: 'var(--dark)' }}>Active Doubt Queue</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myRooms.slice(0, 5).map(rm => {
                  const hasUnreads = (rm.facultyUnreadCount || 0) > 0;
                  const matchedStudent = allUsers.find(u => u.id === rm.studentId);
                  
                  return (
                    <div key={rm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg)', borderRadius: '10px', border: hasUnreads ? '1px solid rgba(239,83,80,0.3)' : '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--dark)' }}>{rm.studentName}</span>
                          {hasUnreads && (
                            <span style={{ background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '100px' }}>
                              {rm.facultyUnreadCount} New
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rm.lastMessageSenderId === user.uid ? 'You: ' : ''}{rm.lastMessage}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (matchedStudent) {
                            setSelectedStudentDetails({ ...matchedStudent, joined: 'Jan 2026', roll: 'Roll #COMP' });
                            setDrawerActiveTab('chat');
                          }
                        }}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.72rem', borderRadius: '6px', marginLeft: '12px' }}
                      >
                        Reply
                      </button>
                    </div>
                  );
                })}
                {myRooms.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.82rem', padding: '20px' }}>
                    No active doubt threads.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(16,185,129,0.02) 0%, rgba(4,120,87,0.04) 100%)' }}>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'var(--dark)' }}>Instant Video Support</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Coordinate virtual sessions with your assigned students. Scheduling a Google Meet immediately notifies all attendees.
              </p>
              <button
                onClick={() => {
                  setMeetTitle('Faculty Doubt Clearing Session');
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

            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)', background: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'var(--dark)' }}>My Classes Today</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myClasses.map(sch => (
                  <div key={sch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--dark)' }}>{sch.studentName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🕒 {sch.time} | Subject: {sch.subject}</span>
                    </div>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                      background: sch.mode === 'online' ? 'rgba(83,109,254,0.1)' : 'rgba(102,187,106,0.1)',
                      color: sch.mode === 'online' ? 'var(--primary)' : 'var(--success)'
                    }}>{sch.mode}</span>
                  </div>
                ))}
                {myClasses.length === 0 && (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                    No class slots scheduled for today.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  };

  const renderMemberOverview = () => {
    return (
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
          
          {/* Left Column */}
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

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
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
    );
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      


      {/* Roster Metrics Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total Students', value: totalStudents, bg: 'var(--surface)', color: 'var(--primary)' },
          { label: 'Total Monthly Fees', value: `₹${totalMonthlyFees.toLocaleString('en-IN')}`, bg: 'var(--surface)', color: 'var(--success)' },
          { label: 'Pending Tuition fees', value: `₹${pendingFeesTotal.toLocaleString('en-IN')}`, bg: 'var(--surface)', color: 'var(--danger)' },
          { label: 'Faculty Staff', value: totalFaculty, bg: 'var(--surface)', color: 'var(--primary)' },
          { label: 'Management Members', value: totalMembers, bg: 'var(--surface)', color: '#D500F9' }
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
          { key: 'overview', label: user?.role === 'admin' ? 'Admin Overview' : user?.role === 'faculty' ? 'Faculty Overview' : 'Member Overview', roles: ['admin', 'faculty', 'member'] },
          { key: 'students', label: 'Students Roster', roles: ['admin', 'faculty', 'member'] },
          { key: 'billing', label: 'Payments & Billing', roles: ['admin'] },
          { key: 'faculty', label: 'Faculty Staff', roles: ['admin'] },
          { key: 'members', label: 'Management Members', roles: ['admin'] },
          { key: 'attendance', label: 'Attendance logs', roles: ['admin'] },
          { key: 'schedules', label: 'Class Schedules', roles: ['admin', 'faculty'] },
          { key: 'chats', label: 'Doubt Chats', roles: ['admin', 'faculty', 'member'] },
          { key: 'notifications', label: 'Alert logs', roles: ['admin', 'member'] },
          { key: 'roles', label: 'Roles Panel', roles: ['admin'] },
          { key: 'analytics', label: 'Analytics', roles: ['admin'] },
          { key: 'audit_logs', label: 'System Audits', roles: ['admin'] },
          { key: 'system_health', label: 'System Health', roles: ['admin'] }
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
                  {(user?.role === 'admin' || user?.role === 'faculty') && (
                    <button onClick={() => { setNewStudent({ displayName: '', email: '', phone: '', course: '' }); setIsAddStudentOpen(true); }} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px' }}><Plus size={14} /> Add Student</button>
                  )}
                  {user?.role === 'admin' && (
                    <button onClick={() => handleBulkDelete('student')} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.82rem', color: 'var(--danger)', borderRadius: '8px' }}><Trash2 size={14} /> Bulk Delete</button>
                  )}
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
              {activePanelTab === 'billing' && user?.role === 'admin' && (
                <button
                  onClick={handleRepairFinancialRecords}
                  disabled={isRepairingFinancial}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    background: 'var(--success)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={14} style={{ animation: isRepairingFinancial ? 'spin 1.5s linear infinite' : 'none' }} />
                  {isRepairingFinancial ? 'Repairing...' : 'Repair Financial Records'}
                </button>
              )}
            </div>
          </div>
        )}

        {activePanelTab === 'overview' ? (
          /* ==================== 0. TABS: ROLE-SPECIFIC OVERVIEW ==================== */
          <div>
            {user?.role === 'admin' && renderAdminOverview()}
            {user?.role === 'faculty' && renderFacultyOverview()}
            {user?.role === 'member' && renderMemberOverview()}
          </div>
        ) : (
          <div className="table-scroll">
            
            {/* ==================== 1. TABS: STUDENTS ROSTER ==================== */}
            {activePanelTab === 'students' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {user?.role?.toLowerCase() === 'faculty' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '8px' }}>
                    <div style={{ padding: '20px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', borderRadius: '16px', color: 'white', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Allotted Students</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{studentsList.length} Students</div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '8px' }}>You are currently assigned as their primary mentor for doubt-solving & schedule tracking.</div>
                    </div>
                    <div style={{ padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Scheduled Classes</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
                        {schedulesList.filter(sch => sch.date === new Date().toISOString().split('T')[0] && (sch.facultyId === user.uid || sch.faculty === user.displayName)).length} Today
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>Classes scheduled for you today.</div>
                    </div>
                  </div>
                )}
                
                <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  <th style={{ padding: '12px' }}>Student Profile</th>
                  <th style={{ padding: '12px' }}>Course / Program</th>
                  <th style={{ padding: '12px' }}>Assigned Mentor</th>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {(() => {
                            const assignedIds = [...(student.assignedFacultyIds || [])];
                            if (user?.role?.toLowerCase() === 'faculty' && !assignedIds.includes(user.uid) && assignedStudentIds.includes(student.id)) {
                              assignedIds.push(user.uid);
                            }
                            if (assignedIds.length === 0) return <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.78rem' }}>Unassigned</span>;
                            const mentorNames = assignedIds.map(fid => {
                              const found = allUsers.find(u => u.id === fid || u.email === fid);
                              return found ? found.displayName : fid;
                            });
                            return <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--primary)' }}>{mentorNames.join(', ')}</div>;
                          })()}
                          {user?.role?.toLowerCase() === 'admin' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentDetails({ ...student, joined: 'Jan 2026', roll: 'Roll #COMP' });
                              }}
                              style={{
                                padding: '2px 6px', background: 'var(--primary-light)', color: 'var(--primary)',
                                border: '1px solid rgba(83,109,254,0.2)', borderRadius: '4px', fontSize: '0.72rem',
                                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
                            >
                              Manage
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {user?.role === 'admin' ? (
                          editingStudentId === student.id ? (
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
                          )
                        ) : (
                          <span>₹{currentFeesAmount.toLocaleString()}</span>
                        )}
                      </td>

                      <td style={{ padding: '12px' }}>
                        {user?.role === 'admin' ? (
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
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{
                              padding: '4px 10px',
                              background: feeStatus === 'Paid' ? 'rgba(102,187,106,0.15)' : feeStatus === 'Pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,83,80,0.15)',
                              color: feeStatus === 'Paid' ? 'var(--success)' : feeStatus === 'Pending' ? '#F59E0B' : 'var(--danger)',
                              border: feeStatus === 'Paid' ? '1px solid var(--success)' : feeStatus === 'Pending' ? '1px solid #F59E0B' : '1px solid var(--danger)',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>{feeStatus}</span>
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
                        )}
                      </td>
                      
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setSelectedStudentDetails({ ...student, joined: 'Jan 2026', roll: 'Roll #COMP' })} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '6px' }} title="View Detail"><Eye size={14} /></button>
                          {user?.role === 'admin' && (
                            <button onClick={() => handleDeleteUser(student.id, student.displayName)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)', borderRadius: '6px' }} title="Delete Roster"><Trash2 size={14} /></button>
                          )}
                          {user?.role?.toLowerCase() === 'faculty' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Remove student "${student.displayName}" from your roster?`)) {
                                  await handleRemoveStudentFromRoster(student.id);
                                }
                              }}
                              className="btn btn-ghost"
                              style={{ padding: '6px', color: 'var(--danger)', borderRadius: '6px' }}
                              title="Remove from Roster"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
              </div>
          )}

          {/* ==================== Payments & Billing Tab ==================== */}
          {activePanelTab === 'billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Widgets Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {[
                  { label: 'Total Collected', value: `₹${activeFees.reduce((acc, f) => acc + (Number(f.paidAmount) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--success)' },
                  { label: 'Total Pending', value: `₹${activeFees.reduce((acc, f) => acc + ((Number(f.amount) || 0) - (Number(f.paidAmount) || 0)), 0).toLocaleString('en-IN')}`, color: 'var(--danger)' },
                  { label: 'Pending Students', value: studentsList.filter(s => (s.pendingAmount || 0) > 0 || s.feeStatus !== 'Paid').length, color: '#F59E0B' },
                  { label: 'Total Billed', value: `₹${activeFees.reduce((acc, f) => acc + (Number(f.amount) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--primary)' }
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
                  <th style={{ padding: '12px' }}>Allotted Students</th>
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
                      {(() => {
                        const count = allUsers.filter(u => u.role?.toLowerCase() === 'student' && (u.assignedFaculty?.includes(fac.id) || u.assignedFaculty?.includes(fac.email))).length;
                        return <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{count} Students</span>;
                      })()}
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
                        background: n.status === 'sent_sms' ? 'rgba(102,187,106,0.1)' : 
                                    n.status?.includes('fail') ? 'rgba(239,83,80,0.1)' :
                                    n.status?.includes('whatsapp') ? 'rgba(37,211,102,0.1)' : 'rgba(83,109,254,0.1)',
                        color: n.status === 'sent_sms' ? 'var(--success)' : 
                               n.status?.includes('fail') ? '#EF5350' :
                               n.status?.includes('whatsapp') ? '#25D366' : 'var(--primary)'
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

          {/* ==================== 10. TABS: AUDIT LOGS ==================== */}
          {activePanelTab === 'audit_logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Administrative Audit History</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Showing {auditLogs.length} logged mutations
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      <th style={{ padding: '12px' }}>Timestamp</th>
                      <th style={{ padding: '12px' }}>Actor</th>
                      <th style={{ padding: '12px' }}>Action</th>
                      <th style={{ padding: '12px' }}>Target User</th>
                      <th style={{ padding: '12px' }}>Metadata / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.filter(log => {
                      const matchesSearch = log.actionType?.toLowerCase().includes(search.toLowerCase()) || 
                                            log.performedByName?.toLowerCase().includes(search.toLowerCase()) ||
                                            log.targetUser?.toLowerCase().includes(search.toLowerCase());
                      return matchesSearch;
                    }).map(log => {
                      let pillColor = 'rgba(0,0,0,0.05)';
                      let textColor = 'var(--text-muted)';
                      if (log.actionType === 'role_update') { pillColor = 'rgba(255,167,38,0.1)'; textColor = '#E65100'; }
                      else if (log.actionType === 'user_delete' || log.actionType === 'bulk_delete') { pillColor = 'rgba(239,83,80,0.1)'; textColor = 'var(--danger)'; }
                      else if (log.actionType === 'collect_payment') { pillColor = 'rgba(102,187,106,0.1)'; textColor = 'var(--success)'; }
                      else if (log.actionType === 'faculty_assign' || log.actionType === 'student_roster_assign') { pillColor = 'rgba(83,109,254,0.1)'; textColor = 'var(--primary)'; }
                      else if (log.actionType === 'system_doctor_run') { pillColor = 'rgba(213,0,249,0.1)'; textColor = '#D500F9'; }

                      const formattedDate = log.timestamp?.toDate 
                        ? log.timestamp.toDate().toLocaleString('en-IN')
                        : log.timestamp?.seconds 
                          ? new Date(log.timestamp.seconds * 1000).toLocaleString('en-IN')
                          : String(log.timestamp || 'N/A');

                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                          <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{formattedDate}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 700 }}>{log.performedByName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>UID: {log.performedBy}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                              background: pillColor, color: textColor
                            }}>{log.actionType}</span>
                          </td>
                          <td style={{ padding: '12px', fontFamily: 'monospace' }}>{log.targetUser || 'N/A'}</td>
                          <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.metadata ? JSON.stringify(log.metadata) : ''}>
                            {log.metadata ? JSON.stringify(log.metadata) : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 11. TABS: SYSTEM HEALTH ==================== */}
          {activePanelTab === 'system_health' && (
            <SystemHealthPanel
              doctorRunning={doctorRunning}
              doctorResults={doctorResults}
              onRunDoctor={runSystemDoctor}
              activeListenersCount={activeListenersCount}
              allUsersCount={allUsers.length}
              allFeesCount={allFees.length}
              auditLogsCount={auditLogs.length}
            />
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
      <Modal 
        isOpen={isAddStudentOpen} 
        onClose={() => { 
          setIsAddStudentOpen(false); 
          setRosterForm({ studentId: '', facultyId: '', displayName: '', email: '', phone: '', course: '' });
          setNewStudent({ displayName: '', email: '', phone: '', course: '' });
        }} 
        title={rosterMode === 'assign' ? "Assign Student to Faculty" : "Add New Student"}
      >
        <form onSubmit={handleAddStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {user?.role?.toLowerCase() === 'admin' && (
            <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '12px', padding: '4px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setRosterMode('assign')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
                  background: rosterMode === 'assign' ? 'white' : 'transparent',
                  color: rosterMode === 'assign' ? 'var(--dark)' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Assign Student to Faculty
              </button>
              <button
                type="button"
                onClick={() => setRosterMode('create')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
                  background: rosterMode === 'create' ? 'white' : 'transparent',
                  color: rosterMode === 'create' ? 'var(--dark)' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Create New Student
              </button>
            </div>
          )}

          {rosterMode === 'assign' ? (
            <>
              <div>
                <label className="form-label">Full Name</label>
                <select
                  required
                  value={rosterForm.studentId}
                  onChange={handleRosterStudentSelect}
                  className="form-input"
                  style={{ background: 'white' }}
                >
                  <option value="" disabled>Select Student</option>
                  {allUsers
                    .filter(u => u.role?.toLowerCase() === 'student')
                    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
                    .map(stud => (
                      <option key={stud.id} value={stud.id}>
                        {stud.displayName} ({stud.email})
                      </option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input
                  required
                  type="email"
                  value={rosterForm.email}
                  className="form-input"
                  placeholder="Student email"
                  disabled
                />
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <input
                  required
                  value={rosterForm.phone}
                  className="form-input"
                  placeholder="Student phone"
                  disabled
                />
              </div>
              <div>
                <label className="form-label">Course / Program</label>
                <input
                  required
                  value={rosterForm.course}
                  className="form-input"
                  placeholder="Student course"
                  disabled
                />
              </div>
              {user?.role?.toLowerCase() === 'admin' && (
                <div>
                  <label className="form-label">Faculty Mentor</label>
                  <select
                    required
                    value={rosterForm.facultyId}
                    onChange={e => setRosterForm({ ...rosterForm, facultyId: e.target.value })}
                    className="form-input"
                    style={{ background: 'white' }}
                  >
                    <option value="" disabled>Select Faculty Mentor</option>
                    {allUsers
                      .filter(u => u.role?.toLowerCase() === 'faculty')
                      .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
                      .map(fac => (
                        <option key={fac.id} value={fac.id}>
                          {fac.displayName} ({fac.email})
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: '10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            disabled={isRosterSubmitting}
          >
            {isRosterSubmitting ? (
              <>
                <Loader2 className="spinning" size={16} />
                <span>Processing...</span>
              </>
            ) : (
              <span>{rosterMode === 'assign' ? 'Assign Student' : 'Create Student'}</span>
            )}
          </button>
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
            <input required value={newMember.displayName} onChange={e => setNewMember({...newMember, displayName: e.target.value})} className="form-input" placeholder="Piyali Das" />
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

      {/* ==================== 4. PREMIUM DRAWER: STUDENT DETAIL & DOUBT MESSAGING ==================== */}
      <AnimatePresence>
        {selectedStudentDetails && (
          <>
            {/* Backdrop with fade-in animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedStudentDetails(null);
                setDrawerActiveTab('profile');
              }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(34, 37, 43, 0.45)',
                backdropFilter: 'blur(6px)',
                zIndex: 1100
              }}
            />
            
            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 'min(760px, 100vw)',
                background: 'white',
                boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.15)',
                zIndex: 1101,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: 'var(--font-support)'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'white',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem'
                  }}>
                    {selectedStudentDetails.displayName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'ST'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark)' }}>
                      {selectedStudentDetails.displayName}
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {selectedStudentDetails.course || 'No active course'}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setSelectedStudentDetails(null);
                    setDrawerActiveTab('profile');
                  }} 
                  style={{
                    width: 34, height: 34, borderRadius: '50%', background: 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', border: 'none', cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Tab Selector */}
              <div style={{
                display: 'flex',
                background: 'var(--surface)',
                padding: '4px',
                margin: '12px 24px',
                borderRadius: '12px',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('profile')}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
                    background: drawerActiveTab === 'profile' ? 'white' : 'transparent',
                    color: drawerActiveTab === 'profile' ? 'var(--dark)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Users size={16} /> Profile & Academics
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('chat')}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
                    background: drawerActiveTab === 'chat' ? 'white' : 'transparent',
                    color: drawerActiveTab === 'chat' ? 'var(--dark)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <MessageSquare size={16} /> Doubt Clearing Chat
                </button>
              </div>

              {/* Drawer Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
                
                {/* TAB 1: PROFILE & ACADEMIC FILE */}
                {drawerActiveTab === 'profile' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--dark)' }}>Student Information</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', fontSize: '0.82rem' }}>
                        <div><strong>Roll ID:</strong> {selectedStudentDetails.studentId || 'COMP-2026-TEMP'}</div>
                        <div><strong>Role Status:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedStudentDetails.role || 'student'}</span></div>
                        <div><strong>Email Address:</strong> {selectedStudentDetails.email || 'N/A'}</div>
                        <div><strong>Phone Number:</strong> {selectedStudentDetails.phone || 'N/A'}</div>
                        <div style={{ gridColumn: 'span 2' }}><strong>Active Course:</strong> {selectedStudentDetails.course || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Grouping & Batch Overrides (Phase 2) */}
                    {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'faculty') && (
                      <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--dark)' }}>Grouping & Batch Overrides</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Class Category</label>
                            <select
                              value={selectedStudentDetails.classCategory || ''}
                              onChange={(e) => setSelectedStudentDetails(prev => ({ ...prev, classCategory: e.target.value }))}
                              className="form-input"
                              style={{ padding: '6px', fontSize: '0.8rem', background: 'white' }}
                            >
                              <option value="">None / Auto</option>
                              <option value="2">Class 2-5</option>
                              <option value="6">Class 6-8</option>
                              <option value="9">Class 9-10</option>
                              <option value="11">Class 11</option>
                              <option value="12">Class 12</option>
                            </select>
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stream (11/12 only)</label>
                            <select
                              value={selectedStudentDetails.stream || ''}
                              disabled={!['11', '12'].includes(selectedStudentDetails.classCategory)}
                              onChange={(e) => setSelectedStudentDetails(prev => ({ ...prev, stream: e.target.value }))}
                              className="form-input"
                              style={{ padding: '6px', fontSize: '0.8rem', background: 'white' }}
                            >
                              <option value="">None</option>
                              <option value="science">Science</option>
                              <option value="application">Application</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Custom Group Exception (Manual override)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              value={selectedStudentDetails.customGroupException || ''}
                              placeholder="e.g. advanced_python_batch"
                              onChange={(e) => setSelectedStudentDetails(prev => ({ ...prev, customGroupException: e.target.value }))}
                              className="form-input"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1, background: 'white' }}
                            />
                            <button
                              onClick={() => handleUpdateStudentGrouping(
                                selectedStudentDetails.id,
                                selectedStudentDetails.classCategory,
                                selectedStudentDetails.stream,
                                selectedStudentDetails.customGroupException
                              )}
                              className="btn btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '8px' }}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span><strong>Computed Auto-Group:</strong> {selectedStudentDetails.autoGroup || 'None'}</span>
                          <span><strong>Active Group:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{selectedStudentDetails.studentGroup || 'None'}</span></span>
                        </div>
                      </div>
                    )}

                    {/* Fees Management Block */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>Billed Fee Items</h4>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => setIsAddFeeOpen(true)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                            background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          <Plus size={14} /> Add Fee Item
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
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
                                No custom fee items.
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
                                      padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800,
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
                                              border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: '4px', fontSize: '0.7rem',
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

                    {/* Overall Aggregates Card */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--surface)', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid var(--border)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700 }}>TOTAL FEES</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>₹{(selectedStudentDetails.feesAmount || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--success)', fontSize: '0.65rem', fontWeight: 700 }}>TOTAL PAID</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--success)' }}>₹{(selectedStudentDetails.paidAmount || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--danger)', fontSize: '0.65rem', fontWeight: 700 }}>TOTAL PENDING</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--danger)' }}>₹{(selectedStudentDetails.pendingAmount || 0).toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Academic Progress & Grades */}
                    {(user?.role === 'admin' || user?.role === 'faculty') && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>Academic Progress & Grade Report</h4>
                        <form onSubmit={handleSaveProgressReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Attendance (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                required
                                className="form-input"
                                value={editAttendanceScore}
                                onChange={e => setEditAttendanceScore(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                              />
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assignment (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                required
                                className="form-input"
                                value={editAssignmentScore}
                                onChange={e => setEditAssignmentScore(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                              />
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tests (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                required
                                className="form-input"
                                value={editTestScore}
                                onChange={e => setEditTestScore(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                              />
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Practicals (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                required
                                className="form-input"
                                value={editPracticalScore}
                                onChange={e => setEditPracticalScore(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Faculty Remarks</label>
                            <textarea
                              rows={2}
                              className="form-input"
                              value={editRemarks}
                              onChange={e => setEditRemarks(e.target.value)}
                              placeholder="e.g. Regular class attendance..."
                              style={{ padding: '8px 12px', fontSize: '0.8rem', resize: 'vertical' }}
                            />
                          </div>
                          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', alignSelf: 'flex-end' }}>
                            Save Report
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Faculty Assignments Block */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>Faculty Team Assignment</h4>
                      
                      {user?.role === 'admin' ? (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                            <input
                              type="text"
                              placeholder="Search faculty..."
                              value={facSearch}
                              onChange={e => setFacSearch(e.target.value)}
                              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.78rem', width: '100%' }}
                            />
                            <select
                              value={facSubjectFilter}
                              onChange={e => setFacSubjectFilter(e.target.value)}
                              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.78rem', background: 'white' }}
                            >
                              <option value="all">All Subjects</option>
                              {['Python', 'Data Structures', 'Class 11', 'Class 12', 'Web Development', 'Java', 'C & C++', 'Tally', 'Excel', 'Basic Computer'].map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                            <select
                              value={facAvailabilityFilter}
                              onChange={e => setFacAvailabilityFilter(e.target.value)}
                              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.78rem', background: 'white' }}
                            >
                              <option value="all">All Statuses</option>
                              <option value="Available">Available</option>
                              <option value="Busy">Busy</option>
                            </select>
                          </div>

                          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px' }}>
                            {facultyList.filter(fac => {
                              const matchesSearch = fac.displayName?.toLowerCase().includes(facSearch.toLowerCase()) || fac.email?.toLowerCase().includes(facSearch.toLowerCase());
                              const matchesSubject = facSubjectFilter === 'all' || (fac.subjects && fac.subjects.some(sub => sub.toLowerCase().includes(facSubjectFilter.toLowerCase())));
                              const matchesAvailability = facAvailabilityFilter === 'all' || fac.availability === facAvailabilityFilter;
                              return matchesSearch && matchesSubject && matchesAvailability;
                            }).map(fac => {
                              const isAssigned = selectedStudentAssignedFaculty.some(af => af.facultyId === fac.id);
                              return (
                                <div key={fac.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'var(--bg)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                  <img src={fac.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100'} alt={fac.displayName} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{fac.displayName}</span>
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: fac.availability === 'Busy' ? 'var(--warning)' : 'var(--success)' }} />
                                    </div>
                                  </div>
                                  {isAssigned ? (
                                    <button
                                      onClick={() => handleUnassignFaculty(fac.id)}
                                      style={{
                                        padding: '4px 8px', background: 'rgba(239,83,80,0.1)', color: 'var(--danger)',
                                        border: '1px solid rgba(239,83,80,0.2)', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                                      }}
                                    >
                                      Unassign
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleAssignFaculty(fac.id, fac.subjects?.[0], fac.role)}
                                      style={{
                                        padding: '4px 8px', background: 'var(--primary-light)', color: 'var(--primary)',
                                        border: '1px solid rgba(83,109,254,0.2)', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                                      }}
                                    >
                                      Assign
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedStudentAssignedFaculty.length === 0 ? (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No faculty assigned to this student.</div>
                          ) : (
                            selectedStudentAssignedFaculty.map(af => (
                              <div key={af.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
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
                
                {/* TAB 2: DOUBT MESSAGING STREAM */}
                {drawerActiveTab === 'chat' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
                    {/* Chat Stream Header / Info */}
                    <div style={{
                      padding: '8px 12px',
                      background: 'var(--primary-light)',
                      borderRadius: '8px',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Info size={14} /> Direct Doubt Thread between Student and You
                    </div>
                    
                    {/* Message stream panel */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '16px',
                      background: '#F8FAFC',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      maxHeight: '260px',
                      minHeight: '220px',
                      marginBottom: '12px'
                    }}>
                      {drawerMessages.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', padding: '24px', textAlign: 'center' }}>
                          <MessageSquare size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>No doubt message threads</h4>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem' }}>Send a template reply or message to initiate the discussion!</p>
                        </div>
                      ) : (
                        drawerMessages.map((msg, index) => {
                          const isMe = msg.senderId === user.uid;
                          return (
                            <div key={msg.id || index} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', width: '100%' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '85%' }}>
                                <div style={{
                                  padding: '10px 14px',
                                  borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                  background: isMe ? 'var(--primary)' : 'white',
                                  color: isMe ? 'white' : 'var(--dark)',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  border: isMe ? 'none' : '1px solid var(--border)'
                                }}>
                                  
                                  {/* Attachment */}
                                  {(msg.attachments?.[0] || msg.attachmentData) && (() => {
                                    const att = msg.attachments?.[0] || { data: msg.attachmentData, type: msg.attachmentType, name: msg.attachmentName };
                                    return (
                                      <div style={{ marginBottom: '6px', borderRadius: '6px', overflow: 'hidden' }}>
                                        {att.type === 'image' ? (
                                          <img src={att.data} alt="attachment" style={{ maxWidth: '100%', maxHeight: '140px', objectFit: 'cover' }} />
                                        ) : (
                                          <a href={att.data} download={att.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px', background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--surface)', borderRadius: '4px', color: isMe ? 'white' : 'var(--primary)', fontWeight: 700, fontSize: '0.75rem' }}>
                                            <FileText size={14} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{att.name}</span>
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  
                                  {/* Text */}
                                  {(msg.message || msg.text) && (
                                    <p style={{ fontSize: '0.8rem', margin: 0, wordBreak: 'break-word', lineHeight: 1.35 }}>
                                      {msg.message || msg.text}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Info Footer */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.65rem', color: 'var(--text-light)', padding: '0 2px' }}>
                                  <span>
                                    {msg.timestamp ? (msg.timestamp.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'sending...'}
                                  </span>
                                  {isMe && (
                                    <span>
                                      {(msg.readStatus === true || msg.seen === true) ? <CheckCheck size={11} style={{ color: 'var(--success)' }} /> : <Check size={11} />}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Pre-defined templates section */}
                    <div style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                        ⚡ Quick Templates:
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {[
                          { label: 'Graded', text: "Hi! I have graded your assignment. Please check the feedback and let me know if you have any questions." },
                          { label: 'Join Slot', text: "Hi! Please join the class slot today. Here is the meeting link: https://meet.google.com/compution" },
                          { label: 'Reminder', text: "Hi! This is a gentle reminder regarding your pending fee payment. Please clear it at the earliest." },
                          { label: 'Great Work', text: "Hi! Excellent performance in today's class. Keep up the good work!" }
                        ].map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleDrawerSendMessage(null, tpl.text)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(83,109,254,0.2)',
                              background: 'white',
                              color: 'var(--primary)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Attachment preview if selected */}
                    {drawerAttachment && (
                      <div style={{
                        padding: '6px 12px',
                        background: '#F1F5F9',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        marginBottom: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Paperclip size={14} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{drawerAttachment.name}</span>
                        </div>
                        <button type="button" onClick={() => setDrawerAttachment(null)} style={{ border: 'none', background: 'none', color: 'var(--danger)', fontWeight: 700, cursor: 'pointer' }}>Remove</button>
                      </div>
                    )}
                    
                    {/* Send box form */}
                    <form onSubmit={handleDrawerSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ position: 'relative' }}>
                        <label htmlFor="drawer-attachment" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '38px', height: '38px', borderRadius: '50%',
                          background: 'var(--surface)', color: 'var(--text-muted)',
                          cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s'
                        }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                          <Paperclip size={16} />
                        </label>
                        <input
                          id="drawer-attachment"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleDrawerFileChange}
                          disabled={drawerUploadingAttachment}
                          style={{ display: 'none' }}
                        />
                      </div>
                      
                      <input
                        type="text"
                        placeholder="Type reply to student's doubts..."
                        value={drawerNewMessage}
                        onChange={e => setDrawerNewMessage(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: '100px',
                          border: '1px solid var(--border)',
                          fontSize: '0.82rem',
                          outline: 'none'
                        }}
                      />
                      
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                          width: '38px', height: '38px', borderRadius: '50%', padding: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        disabled={!drawerNewMessage.trim() && !drawerAttachment}
                      >
                        <Send size={15} />
                      </button>
                    </form>
                  </div>
                )}
                
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
