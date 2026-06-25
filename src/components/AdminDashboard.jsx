import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, firebaseConfig, syncStudentFeeAggregates } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, collectionGroup, doc, getDoc, getDocs, serverTimestamp, onSnapshot, query, where, orderBy, writeBatch, deleteField, arrayUnion, arrayRemove } from 'firebase/firestore';
import { updateDoc, deleteDoc, addDoc, setDoc, runTransaction } from '../firebase';;
import { Search, Download, Plus, MoreHorizontal, Eye, ArrowUpRight, Sparkles, ShieldCheck, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Users, Bell, AlertCircle, Calendar, GraduationCap, ChevronDown, Mail, Send, Pencil, X, ShieldAlert, MessageSquare, Briefcase, UserCheck, Loader2, Check, CheckCheck, Info, UserMinus } from 'lucide-react';
import Modal from './Modal';
import SystemHealthPanel from './SystemHealthPanel';
import ThemeInspector from '../theme/ThemeInspector';
import { systemDoctorService } from '../services/systemDoctorService';
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
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [debugSearch, setDebugSearch] = useState('');

  // Real-time Database lists
  const [allUsers, setAllUsers] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [schedulesList, setSchedulesList] = useState([]);
  const [chatRoomsList, setChatRoomsList] = useState([]);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [allFees, setAllFees] = useState([]);
  const [paymentHistoryList, setPaymentHistoryList] = useState([]);
  const [paymentRequestsList, setPaymentRequestsList] = useState([]);
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
  const [facultyQueries, setFacultyQueries] = useState([]);
  const [activeReplyQueryId, setActiveReplyQueryId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
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

  // Master Fee Structure Config
  const [feeStructure, setFeeStructure] = useState(null);

  // 1. DATA LISTENERS
  useEffect(() => {
    if (!db) {
      console.error("AdminDashboard: Firestore not initialized");
      return;
    }

    let unsubLeads = () => {};
    let unsubUsers = () => {};
    let unsubAtt = () => {};
    let unsubSched = () => {};
    let unsubChats = () => {};
    let unsubNotif = () => {};
    let unsubFees = () => {};
    let unsubPaymentHist = () => {};
    let unsubMeets = () => {};
    let unsubAssignedStudentIds = () => {};
    let unsubAudit = () => {};
    let unsubQueries = () => {};
    let unsubFeeStruct = () => {};
    let unsubPaymentReq = () => {};

    // 0. Master Fee Structure listener
    try {
      unsubFeeStruct = onSnapshot(doc(db, 'settings', 'feeStructure'), (docSnap) => {
        if (docSnap.exists()) {
          setFeeStructure(docSnap.data());
        } else {
          const defaultStructure = {
            class2to5: 500, class6to8: 600, class9to10: 700, class11Science: 900, class11Application: 0, basicCourse: 700,
            registrationFee: 300, admissionFee: 0,
            gracePeriodDays: 5, lateFeeType: 'flat', lateFeeValue: 50, upiId: 'institutelogo@upi', upiName: 'Compution Institute'
          };
          setDoc(doc(db, 'settings', 'feeStructure'), defaultStructure, { merge: true });
          setFeeStructure(defaultStructure);
        }
      }, (err) => {
        console.error("AdminDashboard: fee structure listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: fee structure listener creation failed", err);
    }

    // 1. Leads real-time listener
    try {
      unsubLeads = onSnapshot(collection(db, 'leadCaptures'), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        list.sort((x, y) => {
          const dateX = x.createdAt?.toDate ? x.createdAt.toDate() : new Date(x.createdAt || 0);
          const dateY = y.createdAt?.toDate ? y.createdAt.toDate() : new Date(y.createdAt || 0);
          return dateY - dateX;
        });
        setLeadsList(list);
      }, (err) => {
        console.error("AdminDashboard: leads listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: leads listener creation failed", err);
    }

    // 2. Users real-time listener
    try {
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setAllUsers(list);
        setLoading(false);
      }, (err) => {
        console.error("AdminDashboard: users listener error:", err);
        setLoading(false);
      });
    } catch (err) {
      console.error("AdminDashboard: users listener creation failed", err);
      setLoading(false);
    }

    // 3. Attendance logs
    try {
      if (user?.role === 'admin') {
        unsubAtt = onSnapshot(query(collection(db, 'attendance'), orderBy('timestamp', 'desc')), (snap) => {
          const list = [];
          snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          setAttendanceLogs(list);
        }, (err) => {
          console.error("Error subscribing to attendance:", err);
        });
      }
    } catch (err) {
      console.error("AdminDashboard: attendance listener creation failed", err);
    }

    // 4. Schedules
    try {
      unsubSched = onSnapshot(collection(db, 'studentSchedules'), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setSchedulesList(list);
      }, (err) => {
        console.error("AdminDashboard: schedules listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: schedules listener creation failed", err);
    }

    // 5. Chats
    try {
      unsubChats = onSnapshot(collection(db, 'communityThreads'), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setChatRoomsList(list);
      }, (err) => {
        console.error("AdminDashboard: chats listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: chats listener creation failed", err);
    }

    // 6. Notifications
    try {
      unsubNotif = onSnapshot(query(collection(db, 'notificationHistory'), orderBy('timestamp', 'desc')), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setNotificationLogs(list);
      }, (err) => {
        console.error("AdminDashboard: notifications listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: notifications listener creation failed", err);
    }

    // 7. Fees collection real-time listener
    try {
      if (user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'member') {
        unsubFees = onSnapshot(collection(db, 'fees'), (snap) => {
          const list = [];
          snap.forEach(doc => {
            list.push({ id: doc.id, studentId: doc.id, ...doc.data() });
          });
          setAllFees(list);
        }, (err) => {
          console.error("Error subscribing to fees:", err);
        });
      }
    } catch (err) {
      console.error("AdminDashboard: fees listener creation failed", err);
    }

    // 8. Payment history real-time listener (sorted client-side)
    try {
      if (user?.role === 'admin') {
        unsubPaymentHist = onSnapshot(collection(db, 'paymentHistory'), (snap) => {
          const list = [];
          snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
          setPaymentHistoryList(list);
        }, (err) => {
          console.error("Error subscribing to paymentHistory:", err);
        });

        // Payment Requests
        unsubPaymentReq = onSnapshot(collection(db, 'paymentRequests'), (snap) => {
          const list = [];
          snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          list.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
          setPaymentRequestsList(list);
        }, (err) => {
          console.error("Error subscribing to paymentRequests:", err);
        });
      }
    } catch (err) {
      console.error("AdminDashboard: payments listener creation failed", err);
    }

    // 9. Google Meet sessions real-time listener
    try {
      unsubMeets = onSnapshot(query(collection(db, 'meetSessions'), orderBy('createdAt', 'desc')), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setMeetSessionsList(list);
      }, (err) => {
        console.error("AdminDashboard: meets listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: meets listener creation failed", err);
    }

    // 10. Faculty assignments listener (only for logged-in faculty to filter/view their students)
    try {
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
    } catch (err) {
      console.error("AdminDashboard: assigned students roster listener creation failed", err);
    }

    // 11. Audit Logs real-time listener
    try {
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
    } catch (err) {
      console.error("AdminDashboard: audit logs listener creation failed", err);
    }

    // 12. Faculty Queries real-time listener
    try {
      if (user?.uid) {
        let qQuery = collection(db, 'facultyQueries');
        if (user.role === 'faculty') {
          qQuery = query(collection(db, 'facultyQueries'), where('facultyId', '==', user.uid));
        }
        unsubQueries = onSnapshot(qQuery, (snap) => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          list.sort((x, y) => {
            const dateX = x.createdAt?.toDate ? x.createdAt.toDate() : new Date(x.createdAt || 0);
            const dateY = y.createdAt?.toDate ? y.createdAt.toDate() : new Date(y.createdAt || 0);
            return dateY - dateX;
          });
          setFacultyQueries(list);
        }, (err) => {
          console.error("Error subscribing to facultyQueries:", err);
        });
      }
    } catch (err) {
      console.error("AdminDashboard: faculty queries listener creation failed", err);
    }

    return () => {
      unsubUsers();
      unsubLeads();
      unsubAtt();
      unsubSched();
      unsubChats();
      unsubNotif();
      unsubFees();
      unsubPaymentHist();
      unsubMeets();
      unsubAssignedStudentIds();
      unsubAudit();
      unsubQueries();
      unsubFeeStruct();
      unsubPaymentReq();
    };
  }, [user?.uid, user?.role]);

  // ── MONTHLY RESET CHECK ──
  useEffect(() => {
    const checkAndRunMonthlyReset = async () => {
      if (user?.role?.toLowerCase() !== 'admin') return;
      if (allUsers.length === 0) return;

      try {
        const currentDate = new Date();
        const currentMonthString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        const resetDocRef = doc(db, 'settings', 'feesReset');
        const resetDocSnap = await getDoc(resetDocRef);
        let lastResetMonth = '';
        
        if (resetDocSnap.exists()) {
          lastResetMonth = resetDocSnap.data().lastResetMonth || '';
        }

        if (currentMonthString !== lastResetMonth) {
          console.log(`Starting monthly fee reset for ${currentMonthString}. Last reset was ${lastResetMonth}`);
          
          const students = allUsers.filter(u => u.role?.toLowerCase() === 'student');
          if (students.length > 0) {
            const batch = writeBatch(db);
            students.forEach(student => {
              const studentRef = doc(db, 'users', student.id);
              batch.update(studentRef, {
                feeStatus: 'pending',
                updatedAt: new Date().toISOString()
              });
            });
            await batch.commit();
          }

          await setDoc(resetDocRef, {
            lastResetMonth: currentMonthString,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          console.log(`Monthly fee reset completed for ${currentMonthString}`);
          triggerToast(`Monthly fee reset executed successfully for ${currentMonthString}!`, 'success');
        }
      } catch (err) {
        console.error("Error executing monthly fee status reset:", err);
      }
    };

    checkAndRunMonthlyReset();
  }, [allUsers, user?.role]);

  // Sync users and staff avatar URLs to local assets if they contain expired external links
  useEffect(() => {
    if (user?.role !== 'admin') return;

    const avatarMap = [
      { match: 'biswajit', photoURL: '/team/biswajit.jpg' },
      { match: 'hribhu', photoURL: '/team/hribhu.jpg' },
      { match: 'sharmistha', photoURL: '/team/sharmistha.jpeg' },
      { match: 'piyali', photoURL: '/team/piyali.jpg' },
      { match: 'rajdeep', photoURL: '/team/rajdeep.jpg' }
    ];

    // 1. Sync users collection
    if (allUsers.length > 0) {
      allUsers.forEach(async (usr) => {
        const name = (usr.displayName || usr.name || '').toLowerCase();
        const matched = avatarMap.find(item => name.includes(item.match));
        if (matched && usr.photoURL !== matched.photoURL) {
          const isExternal = !usr.photoURL || usr.photoURL.startsWith('http');
          if (isExternal) {
            try {
              console.log(`Auto-syncing user avatar for ${usr.displayName}:`, matched.photoURL);
              const userRef = doc(db, 'users', usr.id);
              await updateDoc(userRef, { photoURL: matched.photoURL });
            } catch (err) {
              console.error("Failed to sync user avatar:", err);
            }
          }
        }
      });
    }

    // 2. Sync staff collection
    if (!db) return;
    let unsubStaff = () => {};
    try {
      unsubStaff = onSnapshot(collection(db, 'staff'), (snap) => {
        snap.forEach(async (dDoc) => {
          const data = dDoc.data();
          const name = (data.name || '').toLowerCase();
          const matched = avatarMap.find(item => name.includes(item.match));
          if (matched && data.photoURL !== matched.photoURL) {
            const isExternal = !data.photoURL || data.photoURL.startsWith('http');
            if (isExternal) {
              try {
                console.log(`Auto-syncing staff avatar for ${data.name}:`, matched.photoURL);
                await updateDoc(dDoc.ref, { photoURL: matched.photoURL });
              } catch (err) {
                console.error("Failed to sync staff avatar:", err);
              }
            }
          }
        });
      }, (err) => {
        console.error("AdminDashboard: sync staff listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: sync staff listener creation failed", err);
    }

    return () => unsubStaff();
  }, [allUsers, user]);

  // Sync and listen to selected student fees, assigned faculty, and progress report
  useEffect(() => {
    if (!selectedStudentDetails?.id) {
      setSelectedStudentFees([]);
      setSelectedStudentAssignedFaculty([]);
      setSelectedStudentProgressReport(null);
      return;
    }

    if (!db) {
      console.error("AdminDashboard: Firestore not initialized");
      return;
    }

    // Trigger client-side fallback/sync immediately
    syncStudentFeeAggregates(selectedStudentDetails.id);

    let unsubStudentFees = () => {};
    let unsubAssignedFac = () => {};
    let unsubProgressReport = () => {};

    try {
      unsubStudentFees = onSnapshot(doc(db, 'fees', selectedStudentDetails.id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const history = data.paymentHistory || [];
          setSelectedStudentFees(history.map((tx, idx) => ({
            id: tx.transactionId || String(idx),
            feeName: tx.feeName || 'Tuition',
            month: new Date(tx.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            amount: tx.amount,
            paidAmount: tx.amount,
            status: 'Paid',
            ...tx
          })));
        } else {
          setSelectedStudentFees([]);
        }
      }, (err) => {
        console.error("AdminDashboard: student fees listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: student fees listener creation failed", err);
    }

    try {
      const facQuery = query(collection(db, 'assignedFaculty'), where('studentId', '==', selectedStudentDetails.id));
      unsubAssignedFac = onSnapshot(facQuery, (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setSelectedStudentAssignedFaculty(list);
      }, (err) => {
        console.error("AdminDashboard: assigned faculty listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: assigned faculty listener creation failed", err);
    }

    try {
      unsubProgressReport = onSnapshot(doc(db, 'progressReports', selectedStudentDetails.id), (docSnap) => {
        if (docSnap.exists()) {
          setSelectedStudentProgressReport(docSnap.data());
        } else {
          setSelectedStudentProgressReport(null);
        }
      }, (err) => {
        console.error("AdminDashboard: progress report listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: progress report listener creation failed", err);
    }

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

    if (!db) {
      console.error("AdminDashboard: Firestore not initialized");
      return;
    }

    const studentId = selectedStudentDetails.id;
    const threadId = user.uid < studentId ? `${user.uid}_${studentId}` : `${studentId}_${user.uid}`;

    let unsub = () => {};
    try {
      const msgQuery = query(
        collection(db, `communityThreads/${threadId}/messages`),
        orderBy('timestamp', 'asc')
      );

      unsub = onSnapshot(msgQuery, (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setDrawerMessages(list);
      }, (err) => {
        console.error("AdminDashboard: doubt drawer messages listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: doubt drawer messages listener creation failed", err);
    }

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

  // ── FACULTY QUERY MANAGEMENT HANDLERS ──
  const handleReplyQuery = async (queryId, studentId, studentEmail, studentName, question) => {
    if (!replyText.trim()) {
      triggerToast('Please write a reply', 'danger');
      return;
    }
    setSubmittingReply(true);
    try {
      // 1. Update query document
      await updateDoc(doc(db, 'facultyQueries', queryId), {
        reply: replyText.trim(),
        status: 'Replied',
        repliedAt: serverTimestamp()
      });

      // 2. Add student dashboard notification
      await addDoc(collection(db, 'users', studentId, 'notifications'), {
        title: 'New Mentor Reply',
        message: `Your mentor ${user.displayName || 'Faculty'} has replied to your query: "${replyText.slice(0, 40)}..."`,
        createdAt: serverTimestamp(),
        read: false
      });

      // 3. Email fallback (Trigger Email extension)
      if (studentEmail) {
        await addDoc(collection(db, 'mail'), {
          to: studentEmail,
          message: {
            subject: `[Compution] New doubt reply from ${user.displayName || 'Faculty Mentor'}`,
            html: `
              <h3>New Doubt Reply</h3>
              <p>Hello ${studentName || 'Student'},</p>
              <p>Your mentor <b>${user.displayName || 'Faculty Mentor'}</b> has replied to your doubt query:</p>
              <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 0; color: #555;">
                "${question}"
              </blockquote>
              <p><b>Mentor Reply:</b></p>
              <div style="background: #eef2ff; padding: 12px; border-radius: 8px; border: 1px solid #c7d2fe; color: #1e1b4b;">
                ${replyText.trim()}
              </div>
              <p>Please log in to your student dashboard to view full details.</p>
            `
          }
        });
      }

      // 4. Log in notificationHistory (audit trail)
      await addDoc(collection(db, 'notificationHistory'), {
        studentId,
        studentName,
        message: `New doubt reply sent to ${studentName} by ${user.displayName || 'Faculty'}.`,
        status: 'sent_reply',
        type: 'doubt_reply',
        subject: `New Doubt Reply from ${user.displayName || 'Faculty'}`,
        timestamp: serverTimestamp()
      });

      triggerToast('Reply submitted successfully!', 'success');
      setReplyText('');
      setActiveReplyQueryId(null);
    } catch (err) {
      console.error("Error replying to query:", err);
      triggerToast('Failed to submit reply', 'danger');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleQueryStatus = async (queryId, currentStatus) => {
    let nextStatus = 'Viewed';
    if (currentStatus === 'Viewed' || currentStatus === 'Replied') {
      nextStatus = 'Resolved';
    } else if (currentStatus === 'Resolved') {
      nextStatus = 'Pending';
    }

    try {
      await updateDoc(doc(db, 'facultyQueries', queryId), {
        status: nextStatus
      });
      triggerToast(`Query status marked as ${nextStatus}!`, 'success');
    } catch (err) {
      console.error("Error updating query status:", err);
      triggerToast(err.message || 'Failed to update status', 'danger');
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
        let assignedMonthlyFee = 0;
        if (numCat >= 2 && numCat <= 5) assignedMonthlyFee = feeStructure?.class2to5 || 500;
        else if (numCat >= 6 && numCat <= 8) assignedMonthlyFee = feeStructure?.class6to8 || 600;
        else if (numCat >= 9 && numCat <= 10) assignedMonthlyFee = feeStructure?.class9to10 || 700;
        else if (numCat === 11 || numCat === 12) {
          if (stream === 'science') assignedMonthlyFee = feeStructure?.class11Science || 900;
          else if (stream === 'application') assignedMonthlyFee = feeStructure?.class11Application || 0;
          else assignedMonthlyFee = feeStructure?.class11Science || 900;
        } else if (text.includes('basic') || text.includes('computer course')) {
          assignedMonthlyFee = feeStructure?.basicCourse || 700;
        } else if (text.includes('bca') || text.includes('b.tech') || text.includes('custom')) {
          assignedMonthlyFee = 0; // Admin manual entry
        }
        
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
          joiningDate: new Date().toISOString(),
          monthlyFee: assignedMonthlyFee,
          registrationFee: Number(feeStructure?.registrationFee) || 300,
          admissionFee: Number(feeStructure?.admissionFee) || 0,
          ...groupFields,
          ...extraFields
        };
        if (userDocPayload.studentId === undefined) {
          userDocPayload.studentId = `COMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        if (userDocPayload.feeStatus === undefined) userDocPayload.feeStatus = 'Pending';
        if (userDocPayload.feesAmount === undefined) userDocPayload.feesAmount = assignedMonthlyFee * 12; // Example static amount, to be overridden by billing engine
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
      await setDoc(doc(db, 'users', studentId), { 
        feeTarget: amount,
        monthlyFee: amount,
        feesAmount: amount
      }, { merge: true });
      await logAdminAction('fee_target_update', studentId, { feeTarget: amount });
      setEditingStudentId(null);
      triggerToast('Fee amount updated!', 'success');
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Failed to update fees', 'danger');
    }
  };

  // ── UPDATE FEE STATUS ──
  const handleUpdateFeeStatus = async (studentId, status) => {
    try {
      const userRef = doc(db, 'users', studentId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error('Student profile not found');
      }
      
      const userData = userSnap.data();
      const oldStatus = userData.feeStatus || 'pending';
      const targetStatus = status.toLowerCase();

      if (targetStatus !== 'paid' && targetStatus !== 'pending') {
        throw new Error(`Invalid feeStatus: ${status}`);
      }

      const targetAmount = userData.feeTarget !== undefined && userData.feeTarget !== null ? Number(userData.feeTarget) : (Number(userData.monthlyFee) || 500);

      await setDoc(userRef, { 
        feeStatus: targetStatus,
        pendingAmount: targetStatus === 'paid' ? 0 : targetAmount,
        paidAmount: targetStatus === 'paid' ? targetAmount : 0
      }, { merge: true });

      // Audit Logging to billingLogs/
      await addDoc(collection(db, 'billingLogs'), {
        studentId,
        oldStatus,
        newStatus: targetStatus,
        changedBy: user?.email || user?.uid || 'Admin',
        timestamp: serverTimestamp()
      });
      
      await logAdminAction('fee_status_update', studentId, { feeStatus: targetStatus });
      triggerToast(`Fee status updated to ${targetStatus}!`, 'success');
    } catch (err) {
      console.error("Error updating fee status:", err);
      triggerToast(err.message || 'Failed to update fee status', 'danger');
    }
  };

  const handleToggleStatusSource = async (studentId, currentSource) => {
    try {
      const nextSource = currentSource === 'manual' ? 'automatic' : 'manual';
      const userRef = doc(db, 'users', studentId);
      await updateDoc(userRef, {
        statusSource: nextSource,
        updatedAt: new Date().toISOString()
      });
      if (nextSource === 'automatic') {
        await syncStudentFeeAggregates(studentId);
      }
      triggerToast(`Status source updated to ${nextSource}!`, 'success');
    } catch (err) {
      console.error("Error toggling status source:", err);
      triggerToast(err.message || 'Failed to update status source', 'danger');
    }
  };

  const handleForceRecalculate = async (studentId) => {
    try {
      await syncStudentFeeAggregates(studentId);
      triggerToast('Billing aggregates recalculated successfully!', 'success');
    } catch (err) {
      console.error("Error recalculating aggregates:", err);
      triggerToast(err.message || 'Failed to recalculate aggregates', 'danger');
    }
  };

  const handleApprovePaymentRequest = async (req) => {
    try {
      // 1. Create Payment History
      await addDoc(collection(db, 'paymentHistory'), {
        studentId: req.studentId,
        studentName: req.studentName,
        amount: req.amount,
        date: new Date().toISOString(),
        mode: 'UPI',
        transactionId: req.utrNumber,
        remarks: 'Approved via Verification',
        status: 'Approved'
      });
      // 2. Resync Billing Engine
      await syncStudentFeeAggregates(req.studentId);
      // 3. Mark request as Approved
      await updateDoc(doc(db, 'paymentRequests', req.id), {
        status: 'Approved',
        verifiedAt: new Date().toISOString(),
        verifiedBy: user.displayName || 'Admin'
      });
      await logAdminAction('payment_verified', req.studentId, { utr: req.utrNumber, amount: req.amount });
      triggerToast('Payment approved & synced successfully!', 'success');
    } catch (e) {
      console.error(e);
      triggerToast(e.message || 'Failed to approve payment', 'danger');
    }
  };

  const handleRejectPaymentRequest = async (reqId) => {
    try {
      await updateDoc(doc(db, 'paymentRequests', reqId), {
        status: 'Rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user.displayName || 'Admin'
      });
      triggerToast('Payment request rejected', 'danger');
    } catch (e) {
      console.error(e);
      triggerToast(e.message || 'Failed to reject payment', 'danger');
    }
  };

  // ── SEND WHATSAPP REMINDER ──
  const handleSendWhatsAppNotification = (student) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = months[new Date().getMonth()];
    const amount = student.feeTarget !== undefined && student.feeTarget !== null ? Number(student.feeTarget) : (Number(student.monthlyFee) || 500);
    const text = encodeURIComponent(
      `Hi ${student.displayName},\n\n` +
      `This is a friendly reminder that your outstanding tuition fee of *₹${amount}* for the month of *${currentMonth}* is pending.\n\n` +
      `Please clear the balance at the earliest to prevent any platform restriction.\n\n` +
      `Payment Link: https://compution.vercel.app/dashboard/fees\n` +
      `UPI ID QR: 9674035542@ibl\n\n` +
      `Thank you,\n` +
      `Compution Academy`
    );
    const phone = student.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const num = cleanPhone ? cleanPhone : '9196740035542';
    const url = `https://wa.me/${num.startsWith('91') ? num : '91' + num}?text=${text}`;
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
    try {
      const results = await systemDoctorService.runFullAudit();
      const studentsCount = allUsers.filter(u => u.role?.toLowerCase() === 'student').length;
      setDoctorResults({
        scannedCount: studentsCount,
        issuesFound: results.issuesFound,
        repairedCount: results.repairedCount,
        logs: results.logs
      });
      await logAdminAction('system_doctor_run', '', { 
        scannedCount: studentsCount, 
        issuesFound: results.issuesFound, 
        repairedCount: results.repairedCount 
      });
      triggerToast('System Doctor completed successfully!', 'success');
    } catch (e) {
      console.error("System Doctor failure:", e);
      setDoctorResults({
        scannedCount: 0,
        issuesFound: 0,
        repairedCount: 0,
        logs: [`🚨 Critical Error: ${e.message}`]
      });
      triggerToast('System Doctor encountered an error', 'danger');
    } finally {
      setDoctorRunning(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId, nextStatus) => {
    try {
      await updateDoc(doc(db, 'leadCaptures', leadId), { status: nextStatus });
      triggerToast('Lead status updated successfully!', 'success');
    } catch (err) {
      console.error("Error updating lead status:", err);
      triggerToast('Failed to update lead status.', 'danger');
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
    if (!selectedStudentDetails || isRecordingPayment) return;

    const paymentVal = Number(paymentForm.amountPaid);
    if (isNaN(paymentVal) || paymentVal <= 0) {
      triggerToast('Please enter a valid payment amount', 'danger');
      return;
    }

    setIsRecordingPayment(true);

    try {
      // 1. Add to paymentHistory collection
      await addDoc(collection(db, 'paymentHistory'), {
        studentId: selectedStudentDetails.id,
        studentName: selectedStudentDetails.displayName,
        amount: paymentVal,
        date: new Date().toISOString(),
        mode: paymentForm.paymentMethod,
        transactionId: 'CASH-' + Date.now(),
        remarks: paymentForm.notes || 'Recorded manually by Admin',
        feeName: selectedFeeItem?.feeName || 'Tuition',
        status: 'Approved',
        timestamp: new Date().toISOString()
      });

      // 2. Recalculate aggregates
      await syncStudentFeeAggregates(selectedStudentDetails.id);

      await logAdminAction('collect_payment', selectedStudentDetails.id, { feeId: selectedFeeItem?.id || 'manual', feeName: selectedFeeItem?.feeName || 'Tuition', amountPaid: paymentVal, paymentMethod: paymentForm.paymentMethod });
      triggerToast(`Successfully collected ₹${paymentVal} for ${selectedFeeItem?.feeName || 'Tuition'}!`, 'success');
      setIsCollectPaymentOpen(false);
      setPaymentForm({ amountPaid: '', paymentMethod: 'Cash', notes: '' });
    } catch (err) {
      console.error("Error collecting payment:", err);
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
      const userRef = doc(db, 'users', selectedStudentDetails.id);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error('Student profile not found');
      }
      const userData = userSnap.data();
      const currentAdminCharges = Number(userData.adminCharges) || 0;
      const newAdminCharges = currentAdminCharges + feeAmt;

      // Update adminCharges on user profile
      await updateDoc(userRef, {
        adminCharges: newAdminCharges,
        updatedAt: new Date().toISOString()
      });

      // Recalculate billing aggregates
      await syncStudentFeeAggregates(selectedStudentDetails.id);

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
    if (feeItem.id === 'pending_tuition_balance') {
      triggerToast('Cannot delete the outstanding balance item.', 'danger');
      return;
    }
    if (window.confirm(`Delete payment transaction "${feeItem.feeName}" (Amount: ₹${feeItem.amount})? This will reduce total paid and restore student dues.`)) {
      try {
        // Find document in paymentHistory collection with this transactionId/id
        const paySnap = await getDocs(query(
          collection(db, 'paymentHistory'),
          where('studentId', '==', selectedStudentDetails.id),
          where('transactionId', '==', feeItem.id)
        ));

        const batch = writeBatch(db);
        let deletedAny = false;
        paySnap.forEach(d => {
          batch.delete(d.ref);
          deletedAny = true;
        });

        if (deletedAny) {
          await batch.commit();
        }

        // Recalculate aggregates
        await syncStudentFeeAggregates(selectedStudentDetails.id);

        await logAdminAction('fee_item_delete', selectedStudentDetails.id, { feeId: feeItem.id, feeName: feeItem.feeName, amount: feeItem.amount });
        triggerToast(`Deleted payment transaction ${feeItem.feeName}`, 'success');
      } catch (err) {
        console.error("Error deleting fee item:", err);
        triggerToast('Failed to delete fee item', 'danger');
      }
    }
  };

  // ── GET BILLING TREND DATA ──
  const getBillingTrendData = () => {
    const monthlyData = {};
    const monthsOrder = [
      'January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
      'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026'
    ];

    allFees.forEach(fee => {
      const history = fee.paymentHistory || [];
      history.forEach(tx => {
        const txDate = new Date(tx.date);
        const m = txDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // e.g. "June 2026"
        if (!monthlyData[m]) {
          monthlyData[m] = { month: m, billed: 0, collected: 0, pending: 0 };
        }
        monthlyData[m].collected += Number(tx.amount) || 0;
      });

      // Distribute billed amount based on monthlyFee for active months
      const start = fee.createdAt ? new Date(fee.createdAt) : new Date(2026, 0, 1);
      const end = new Date();
      let temp = new Date(start.getTime());
      while (temp <= end) {
        const m = temp.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (monthsOrder.includes(m)) {
          if (!monthlyData[m]) {
            monthlyData[m] = { month: m, billed: 0, collected: 0, pending: 0 };
          }
          monthlyData[m].billed += Number(fee.monthlyFee) || 500;
        }
        temp.setMonth(temp.getMonth() + 1);
      }
    });

    // Calculate pending for each month
    Object.keys(monthlyData).forEach(m => {
      monthlyData[m].pending = Math.max(0, monthlyData[m].billed - monthlyData[m].collected);
    });

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
    const isPending = (s.feeStatus || 'pending').toLowerCase() === 'pending';
    if (isPending) {
      return acc + (s.feeTarget !== undefined && s.feeTarget !== null ? Number(s.feeTarget) : (Number(s.monthlyFee) || 500));
    }
    return acc;
  }, 0);

  const totalMonthlyFees = studentsList.reduce((acc, s) => {
    return acc + (s.feeTarget !== undefined && s.feeTarget !== null ? Number(s.feeTarget) : (Number(s.monthlyFee) || 500));
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
    const totalBilled = totalMonthlyFees;
    const totalCollected = totalMonthlyFees - pendingFeesTotal;
    const totalPending = pendingFeesTotal;
    const collectionPercent = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Welcome Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: 'var(--text-on-primary)',
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
          <h2 style={{ color: 'var(--text-on-primary)', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Welcome to Admin Control, {user?.displayName || 'Administrator'}</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', maxWidth: '600px' }}>
            Monitor institutional performance, manage faculty workload, analyze student demographic batches, and track billing collections.
          </p>
        </div>

        {/* Dynamic Analytics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '24px' }} className="grid-3-col-mobile">
          
          {/* Card 1: Faculty Workload */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)', background: 'var(--white)' }}>
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
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)', background: 'var(--white)' }}>
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
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)', background: 'var(--white)', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--dark)' }}>Performance Metrics</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--surface)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'conic-gradient(var(--success) 0deg, var(--success) ' + (rate * 3.6) + 'deg, #e2e8f0 ' + (rate * 3.6) + 'deg 360deg)' }}>
                  <div style={{ position: 'absolute', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: 'var(--success)' }}>
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
                  <div style={{ position: 'absolute', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>
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

        {/* Card 4: Lead Capture Center */}
        <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', background: 'var(--surface-card)', marginTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>New Leads Capture Center</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Track parent and student consultation requests and conversion statuses.</p>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-light)', padding: '6px 14px', borderRadius: '8px' }}>
              Total Leads: {leadsList.length}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 700 }}>
                  <th style={{ padding: '12px' }}>Lead Contact</th>
                  <th style={{ padding: '12px' }}>Class / Course of Interest</th>
                  <th style={{ padding: '12px' }}>Capture Source</th>
                  <th style={{ padding: '12px' }}>Submitted Date</th>
                  <th style={{ padding: '12px' }}>Conversion Status</th>
                </tr>
              </thead>
              <tbody>
                {leadsList.slice(0, 10).map(lead => {
                  const dateStr = lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleString() : new Date(lead.createdAt || 0).toLocaleString();
                  const statusColors = {
                    new: { bg: 'rgba(83,109,254,0.08)', txt: 'var(--primary-blue, #536DFE)' },
                    contacted: { bg: 'rgba(214,168,90,0.12)', txt: 'var(--warning, #FFA726)' },
                    converted: { bg: 'rgba(110,191,139,0.12)', txt: 'var(--success, #66BB6A)' }
                  };
                  const currentColors = statusColors[lead.status] || statusColors.new;

                  return (
                    <tr key={lead.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lead.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>📞 {lead.phone}</div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {lead.course}
                      </td>
                      <td style={{ padding: '12px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                        {lead.source?.replace('_', ' ') || 'Web Enquiry'}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={lead.status || 'new'}
                          onChange={e => handleUpdateLeadStatus(lead.id, e.target.value)}
                          style={{
                            background: currentColors.bg,
                            color: currentColors.txt,
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            outline: 'none'
                          }}
                        >
                          <option value="new" style={{ color: 'var(--text-primary)', background: 'var(--surface-elevated)' }}>New</option>
                          <option value="contacted" style={{ color: 'var(--text-primary)', background: 'var(--surface-elevated)' }}>Contacted</option>
                          <option value="converted" style={{ color: 'var(--text-primary)', background: 'var(--surface-elevated)' }}>Converted</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {leadsList.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontStyle: 'italic' }}>
                      No leads captured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
    const activeQueriesCount = facultyQueries.filter(q => q.status !== 'Resolved').length;

    const getStatusStyle = (status) => {
      switch (status?.toLowerCase()) {
        case 'resolved':
          return { background: 'rgba(34,197,94,0.1)', color: '#22C55E' };
        case 'replied':
          return { background: 'rgba(37,99,235,0.1)', color: '#2563EB' };
        case 'viewed':
          return { background: 'rgba(245,158,11,0.1)', color: '#F59E0B' };
        default:
          return { background: 'rgba(100,116,139,0.1)', color: '#64748B' };
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Welcome Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981, #047857)',
          color: 'var(--text-on-primary)',
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
          <h2 style={{ color: 'var(--text-on-primary)', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Welcome, Mentor {user?.displayName}!</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', maxWidth: '600px' }}>
            Review student progress reports, respond to doubt queries instantly, and check your class schedule for the day.
          </p>
        </div>

        {/* Quick Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Allotted Students', value: `${studentsList.length} Students`, color: 'var(--primary)', icon: <Users size={20} /> },
            { label: 'Classes Scheduled Today', value: `${myClasses.length} Sessions`, color: 'var(--success)', icon: <Calendar size={20} /> },
            { label: 'Pending Doubt Queries', value: `${activeQueriesCount} Active`, color: activeQueriesCount > 0 ? 'var(--danger)' : 'var(--text-muted)', icon: <MessageSquare size={20} /> }
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
            <div className="card" style={{ padding: '20px', border: '1px solid var(--border)', background: 'var(--white)' }}>
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

            {/* Student Doubt Queries Workspace */}
            <div className="card" style={{ padding: '20px', border: '1px solid var(--border)', background: 'var(--white)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px 0' }}>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--dark)' }}>Student Doubt Queries Workspace</h3>
                <span style={{ fontSize: '0.72rem', background: 'rgba(37,99,235,0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                  {facultyQueries.filter(q => q.status !== 'Resolved').length} Active
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {facultyQueries.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.82rem', padding: '20px' }}>
                    No doubt queries assigned to you.
                  </div>
                ) : (
                  facultyQueries.map(q => {
                    const isReplying = activeReplyQueryId === q.id;
                    const studentUser = allUsers.find(u => u.id === q.studentId) || {};
                    
                    let priorityBg = 'rgba(100, 116, 139, 0.08)';
                    let priorityColor = '#64748b';
                    if (q.priority === 'High') {
                      priorityBg = 'rgba(239, 68, 68, 0.08)';
                      priorityColor = '#ef4444';
                    } else if (q.priority === 'Medium') {
                      priorityBg = 'rgba(245, 158, 11, 0.08)';
                      priorityColor = '#f59e0b';
                    }

                    return (
                      <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--dark)' }}>{q.studentName}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({q.studentClass})</span>
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: priorityBg, color: priorityColor, fontWeight: 800 }}>
                              {q.priority}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 800, 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              ...getStatusStyle(q.status)
                            }}>
                              {q.status}
                            </span>
                            
                            <button
                              onClick={() => handleToggleQueryStatus(q.id, q.status)}
                              className="btn btn-ghost"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                              title="Toggle Status"
                            >
                              {q.status === 'Resolved' ? 'Reopen' : 'Resolve'}
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--dark)', marginTop: '4px' }}>
                          Subject: {q.subject}
                        </div>
                        
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                          {q.question}
                        </p>

                        {q.attachmentUrl && (
                          <div style={{ marginTop: '2px' }}>
                            <a href={q.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 700, textDecoration: 'underline' }}>
                              📎 View Attachment
                            </a>
                          </div>
                        )}

                        {q.reply && (
                          <div style={{ marginTop: '6px', padding: '10px', background: 'var(--white)', borderRadius: '8px', borderLeft: '3px solid #2563EB', fontSize: '0.78rem' }}>
                            <span style={{ fontWeight: 700, color: '#2563EB' }}>Reply sent:</span> {q.reply}
                          </div>
                        )}

                        {isReplying ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', background: 'var(--white)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <textarea
                              rows={3}
                              placeholder="Write your answer / reply..."
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              className="form-input"
                              style={{ fontSize: '0.78rem' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                onClick={() => {
                                  setActiveReplyQueryId(null);
                                  setReplyText('');
                                }}
                                className="btn btn-ghost"
                                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleReplyQuery(q.id, q.studentId, studentUser.email, q.studentName, q.question)}
                                disabled={submittingReply}
                                className="btn btn-primary"
                                style={{ padding: '4px 12px', fontSize: '0.72rem' }}
                              >
                                {submittingReply ? 'Sending...' : 'Send Reply'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          q.status !== 'Resolved' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button
                                onClick={() => {
                                  setActiveReplyQueryId(q.id);
                                  setReplyText(q.reply || '');
                                }}
                                className="btn btn-primary"
                                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                              >
                                {q.reply ? 'Edit Reply' : 'Reply'}
                              </button>
                            </div>
                          )
                        )}

                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                          Submitted: {q.createdAt ? new Date(q.createdAt.toDate()).toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Doubt Queue */}
            <div className="card" style={{ padding: '20px', border: '1px solid var(--border)', background: 'var(--white)' }}>
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
                            <span style={{ background: 'var(--danger)', color: 'var(--text-on-primary)', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '100px' }}>
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

            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)', background: 'var(--white)' }}>
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
          color: 'var(--text-on-primary)',
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
          <h2 style={{ color: 'var(--text-on-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Welcome back, {user?.displayName || 'Management Member'}!</h2>
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

  const currentStudentDetails = selectedStudentDetails
    ? allUsers.find(u => u.id === selectedStudentDetails.id) || selectedStudentDetails
    : null;

  const feesToShow = [...selectedStudentFees];
  if (currentStudentDetails && currentStudentDetails.pendingAmount > 0) {
    feesToShow.unshift({
      id: 'pending_tuition_balance',
      feeName: 'Pending Tuition Balance',
      month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      amount: currentStudentDetails.pendingAmount,
      paidAmount: 0,
      status: 'Pending'
    });
  }

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
          { key: 'fee_config', label: 'Fee Config', roles: ['admin'] },
          { key: 'analytics', label: 'Analytics', roles: ['admin'] },
          { key: 'audit_logs', label: 'System Audits', roles: ['admin'] },
          { key: 'system_health', label: 'System Health', roles: ['admin'] },
          { key: 'theme_inspector', label: 'Theme Inspector', roles: ['admin'] }
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
      <div 
        className={activePanelTab === 'overview' ? "" : "card card-p"} 
        style={activePanelTab === 'overview' ? { display: 'flex', flexDirection: 'column', gap: '24px' } : { background: 'var(--white)', border: '1px solid var(--border)' }}
      >
        
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
                    color: 'var(--text-on-primary)',
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
                    <div style={{ padding: '20px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', borderRadius: '16px', color: 'var(--text-on-primary)', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Allotted Students</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{studentsList.length} Students</div>
                      <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '8px' }}>You are currently assigned as their primary mentor for doubt-solving & schedule tracking.</div>
                    </div>
                    <div style={{ padding: '20px', background: 'var(--white)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
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
                  const feeStatus = (student.feeStatus || 'pending').toLowerCase();
                  const currentFeesAmount = student.feeTarget !== undefined && student.feeTarget !== null ? Number(student.feeTarget) : (Number(student.monthlyFee) || 500);
                  const colorMap = {
                    'paid': 'var(--success)',
                    'pending': 'var(--danger)'
                  };
                  const bgMap = {
                    'paid': 'rgba(102,187,106,0.15)',
                    'pending': 'rgba(239,83,80,0.15)'
                  };

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
                              <button onClick={() => handleSaveFeesAmount(student.id)} style={{ background: 'var(--success)', color: 'var(--text-on-primary)', padding: '2px 6px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                              <button onClick={() => setEditingStudentId(null)} style={{ background: 'var(--danger)', color: 'var(--text-on-primary)', padding: '2px 6px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
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
                                handleUpdateFeeStatus(student.id, 'paid');
                              }}
                              style={{
                                padding: '4px 10px',
                                background: feeStatus === 'paid' ? 'rgba(102,187,106,0.15)' : 'var(--surface)',
                                color: 'var(--success)',
                                border: feeStatus === 'paid' ? '1px solid var(--success)' : '1px solid var(--border)',
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
                                handleUpdateFeeStatus(student.id, 'pending');
                              }}
                              style={{
                                padding: '4px 10px',
                                background: feeStatus === 'pending' ? 'rgba(245,158,11,0.15)' : 'var(--surface)',
                                color: '#F59E0B',
                                border: feeStatus === 'pending' ? '1px solid #F59E0B' : '1px solid var(--border)',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              Pending
                            </button>
                            {feeStatus !== 'paid' && (
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
                              background: bgMap[feeStatus] || 'var(--surface)',
                              color: colorMap[feeStatus] || 'var(--text-muted)',
                              border: `1px solid ${colorMap[feeStatus] || 'var(--border)'}`,
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>{feeStatus === 'paid' ? 'Paid' : 'Pending'}</span>
                            {feeStatus !== 'paid' && (
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
                  { label: 'Total Collected', value: `₹${activeFees.reduce((acc, f) => acc + (Number(f.totalPaid) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--success)' },
                  { label: 'Total Pending', value: `₹${activeFees.reduce((acc, f) => acc + (Number(f.remainingBalance) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--danger)' },
                  { label: 'Pending Students', value: activeFees.filter(f => f.status === 'Pending').length, color: '#F59E0B' },
                  { label: 'Total Billed', value: `₹${activeFees.reduce((acc, f) => acc + (Number(f.totalFeeDue) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--primary)' }
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
                        <div key={index} style={{ background: 'var(--white)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

              {/* Payment Verification Queue */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', color: 'var(--dark)' }}>Pending Verifications</h3>
                {paymentRequestsList.filter(r => r.status === 'Pending Verification').length === 0 ? (
                  <div style={{ padding: '20px', background: 'var(--surface)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No pending payment verifications.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {paymentRequestsList.filter(r => r.status === 'Pending Verification').map(req => (
                      <div key={req.id} style={{ padding: '16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{req.studentName} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>({req.paymentDate})</span></div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <span style={{ fontWeight: 600 }}>Amount:</span> ₹{req.amount} | <span style={{ fontWeight: 600 }}>UTR:</span> {req.utrNumber}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleApprovePaymentRequest(req)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}>Approve</button>
                          <button onClick={() => handleRejectPaymentRequest(req.id)} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', background: 'var(--surface)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Billed Roster Title & List */}
              <div style={{ marginTop: '24px' }}>
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
                        const feeStatus = (student.feeStatus || 'pending').toLowerCase();
                        const feeTarget = student.feeTarget !== undefined && student.feeTarget !== null ? Number(student.feeTarget) : (Number(student.monthlyFee) || 500);
                        const paidAmount = feeStatus === 'paid' ? feeTarget : 0;
                        const pendingAmount = feeStatus === 'pending' ? feeTarget : 0;

                        const colorMap = {
                          'paid': 'var(--success)',
                          'pending': 'var(--danger)'
                        };
                        const bgMap = {
                          'paid': 'rgba(102,187,106,0.1)',
                          'pending': 'rgba(239,83,80,0.1)'
                        };

                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: 700 }}>{student.displayName}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{student.email}</div>
                            </td>
                            <td style={{ padding: '10px' }}>{student.course}</td>
                            <td style={{ padding: '10px', fontWeight: 600 }}>₹{feeTarget.toLocaleString()}</td>
                            <td style={{ padding: '10px', fontWeight: 600, color: 'var(--success)' }}>₹{paidAmount.toLocaleString()}</td>
                            <td style={{ padding: '10px', fontWeight: 600, color: pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>₹{pendingAmount.toLocaleString()}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800,
                                color: colorMap[feeStatus] || 'var(--text-muted)',
                                background: bgMap[feeStatus] || 'var(--surface)'
                              }}>{feeStatus === 'paid' ? 'Paid' : 'Pending'}</span>
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

              {/* Admin Billing Debug Panel */}
              {user?.role?.toLowerCase() === 'admin' && (
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  padding: '20px',
                  marginTop: '24px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <div 
                    onClick={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={18} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--dark)' }}>
                        Admin Billing Debug Panel
                      </h3>
                    </div>
                    <ChevronDown 
                      size={20} 
                      style={{ 
                        transform: isDebugPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'transform 0.2s',
                        color: 'var(--text-muted)'
                      }} 
                    />
                  </div>

                  {isDebugPanelOpen && (
                    <div style={{ marginTop: '16px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        This panel allows you to monitor and control billing state directly. Recalculated directly from student records roster data (real-time listener).
                      </p>

                      {/* Debug Report Summary */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        marginBottom: '20px',
                        background: 'var(--surface-elevated)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Student Count</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)' }}>{studentsList.length}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Fee Sum</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>₹{totalMonthlyFees.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pending Fee Sum</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>₹{pendingFeesTotal.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Paid Student Count</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{studentsList.filter(s => (s.feeStatus || 'pending').toLowerCase() === 'paid').length}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pending Student Count</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B' }}>{studentsList.filter(s => (s.feeStatus || 'pending').toLowerCase() === 'pending').length}</div>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        This panel allows you to monitor and control billing state directly. You can inspect fields stored in Firestore, toggle the billing source override, and force recalculations.
                      </p>

                      <div style={{ marginBottom: '16px', maxWidth: '400px' }}>
                        <input
                          type="text"
                          placeholder="Search student by name or ID..."
                          value={debugSearch}
                          onChange={(e) => setDebugSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--white)',
                            color: 'var(--dark)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div className="table-scroll">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                              <th style={{ padding: '10px' }}>Student Info</th>
                              <th style={{ padding: '10px' }}>Student ID</th>
                              <th style={{ padding: '10px' }}>feeStatus</th>
                              <th style={{ padding: '10px' }}>statusSource</th>
                              <th style={{ padding: '10px' }}>pendingAmount</th>
                              <th style={{ padding: '10px' }}>paidAmount</th>
                              <th style={{ padding: '10px' }}>Last Update</th>
                              <th style={{ padding: '10px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentsList
                              .filter(s => 
                                !debugSearch || 
                                s.displayName?.toLowerCase().includes(debugSearch.toLowerCase()) || 
                                s.id?.toLowerCase().includes(debugSearch.toLowerCase())
                              )
                              .map(student => {
                                const feeStatus = (student.feeStatus || 'pending').toLowerCase();
                                const feeTarget = student.feeTarget !== undefined && student.feeTarget !== null ? Number(student.feeTarget) : (Number(student.monthlyFee) || 500);
                                const paidAmount = feeStatus === 'paid' ? feeTarget : 0;
                                const pendingAmount = feeStatus === 'pending' ? feeTarget : 0;
                                const lastUpdate = student.updatedAt ? new Date(student.updatedAt).toLocaleString() : 'Never';

                                const colorMap = {
                                  'paid': 'var(--success)',
                                  'pending': 'var(--danger)'
                                };
                                const bgMap = {
                                  'paid': 'rgba(102,187,106,0.1)',
                                  'pending': 'rgba(239,83,80,0.1)'
                                };

                                return (
                                  <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                                    <td style={{ padding: '10px' }}>
                                      <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{student.displayName}</div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{student.email}</div>
                                    </td>
                                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                      {student.id}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                      <span style={{
                                        padding: '3px 8px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800,
                                        color: colorMap[feeStatus] || 'var(--text-muted)',
                                        background: bgMap[feeStatus] || 'var(--surface)'
                                      }}>{feeStatus === 'paid' ? 'Paid' : 'Pending'}</span>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                      <span style={{
                                        padding: '3px 8px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800,
                                        color: 'var(--success)',
                                        background: 'rgba(102,187,106,0.1)'
                                      }}>direct</span>
                                    </td>
                                    <td style={{ padding: '10px', fontWeight: 600 }}>
                                      ₹{pendingAmount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '10px', fontWeight: 600, color: 'var(--success)' }}>
                                      ₹{paidAmount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      {lastUpdate}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        {feeStatus === 'pending' ? (
                                          <button
                                            onClick={() => handleUpdateFeeStatus(student.id, 'paid')}
                                            className="btn btn-success"
                                            style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px', background: 'var(--success)', color: 'white', border: 'none' }}
                                          >
                                            Mark Paid
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleUpdateFeeStatus(student.id, 'pending')}
                                            className="btn btn-warning"
                                            style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px', background: '#F59E0B', color: 'white', border: 'none' }}
                                          >
                                            Mark Pending
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
                    </div>
                  )}
                </div>
              )}

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
                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', outline: 'none', background: 'var(--white)' }}
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

          {/* ==================== 11b. TABS: THEME INSPECTOR ==================== */}
          {activePanelTab === 'theme_inspector' && (
            <ThemeInspector />
          )}

          {/* ==================== 12. TABS: FEE CONFIG ==================== */}
          {activePanelTab === 'fee_config' && user?.role === 'admin' && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(91, 108, 255, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--primary)' }}>
                  <Briefcase size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Fees Master Configuration</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage default class fees, grace periods, and late penalties.</p>
                </div>
              </div>

              {feeStructure ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  {/* Base Fees */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Monthly Fees (₹)</h3>
                    {Object.entries({
                      'Class 2 to 5': 'class2to5',
                      'Class 6 to 8': 'class6to8',
                      'Class 9 to 10': 'class9to10',
                      'Class 11/12 Science': 'class11Science',
                      'Class 11/12 Application': 'class11Application',
                      'Basic Computer Course': 'basicCourse',
                      'Registration Fee (One-Time)': 'registrationFee',
                      'Admission Fee (One-Time)': 'admissionFee'
                    }).map(([label, key]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{label}</span>
                        <input 
                          type="number" 
                          value={feeStructure[key]} 
                          onChange={(e) => setFeeStructure(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          style={{ width: '100px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Policies & UPI */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Late Fee Policy</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Grace Period (Days)</span>
                        <input type="number" value={feeStructure.gracePeriodDays} onChange={(e) => setFeeStructure(prev => ({ ...prev, gracePeriodDays: Number(e.target.value) }))} style={{ width: '100px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Penalty Type</span>
                        <select value={feeStructure.lateFeeType} onChange={(e) => setFeeStructure(prev => ({ ...prev, lateFeeType: e.target.value }))} style={{ width: '120px', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                          <option value="flat">Flat Amount</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Penalty Value</span>
                        <input type="number" value={feeStructure.lateFeeValue} onChange={(e) => setFeeStructure(prev => ({ ...prev, lateFeeValue: Number(e.target.value) }))} style={{ width: '100px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                      </div>
                    </div>

                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Institution UPI Detail</h3>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>UPI ID</label>
                        <input type="text" value={feeStructure.upiId} onChange={(e) => setFeeStructure(prev => ({ ...prev, upiId: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Account Name</label>
                        <input type="text" value={feeStructure.upiName} onChange={(e) => setFeeStructure(prev => ({ ...prev, upiName: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading configuration...</div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, 'settings', 'feeStructure'), feeStructure, { merge: true });
                      triggerToast('Master Fee Configuration Saved!', 'success');
                    } catch (err) {
                      triggerToast('Failed to save configuration', 'danger');
                    }
                  }}
                  className="btn btn-primary"
                >
                  <Check size={16} /> Save Changes
                </button>
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
              style={{ background: 'var(--white)' }}
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
                  style={{ background: 'var(--white)' }}
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
                    style={{ background: 'var(--white)' }}
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
                <select required value={newStudent.course} onChange={e => setNewStudent({...newStudent, course: e.target.value})} className="form-input" style={{ background: 'var(--white)' }}>
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
                background: 'var(--white)',
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
                background: 'var(--white)',
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
                              style={{ padding: '6px', fontSize: '0.8rem', background: 'var(--white)' }}
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
                              style={{ padding: '6px', fontSize: '0.8rem', background: 'var(--white)' }}
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
                              style={{ padding: '6px 12px', fontSize: '0.8rem', flex: 1, background: 'var(--white)' }}
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
                        <div style={{ marginTop: '12px', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span><strong>Computed Auto-Group:</strong> {selectedStudentDetails.autoGroup || 'None'}</span>
                          <span><strong>Active Group:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{selectedStudentDetails.studentGroup || 'None'}</span></span>
                        </div>
                      </div>
                    )}

                    {/* Fees Management Block */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>Tuition Fee Settings</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>MONTHLY TUITION TARGET</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>₹{((selectedStudentDetails.feeTarget !== undefined && selectedStudentDetails.feeTarget !== null) ? Number(selectedStudentDetails.feeTarget) : (Number(selectedStudentDetails.monthlyFee) || 500)).toLocaleString()}</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>CURRENT STATUS</div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: (selectedStudentDetails.feeStatus || 'pending').toLowerCase() === 'paid' ? 'var(--success)' : 'var(--danger)',
                              background: (selectedStudentDetails.feeStatus || 'pending').toLowerCase() === 'paid' ? 'rgba(102,187,106,0.15)' : 'rgba(239,83,80,0.15)',
                              border: `1px solid ${(selectedStudentDetails.feeStatus || 'pending').toLowerCase() === 'paid' ? 'var(--success)' : 'var(--danger)'}`
                            }}>{(selectedStudentDetails.feeStatus || 'pending').toUpperCase()}</span>
                            
                            {user?.role === 'admin' && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={async () => {
                                    await handleUpdateFeeStatus(selectedStudentDetails.id, 'paid');
                                    setSelectedStudentDetails(prev => ({ ...prev, feeStatus: 'paid' }));
                                  }}
                                  style={{ padding: '4px 8px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Paid
                                </button>
                                <button
                                  onClick={async () => {
                                    await handleUpdateFeeStatus(selectedStudentDetails.id, 'pending');
                                    setSelectedStudentDetails(prev => ({ ...prev, feeStatus: 'pending' }));
                                  }}
                                  style={{ padding: '4px 8px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Pending
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
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
                              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.78rem', background: 'var(--white)' }}
                            >
                              <option value="all">All Subjects</option>
                              {['Python', 'Data Structures', 'Class 11', 'Class 12', 'Web Development', 'Java', 'C & C++', 'Tally', 'Excel', 'Basic Computer'].map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                            <select
                              value={facAvailabilityFilter}
                              onChange={e => setFacAvailabilityFilter(e.target.value)}
                              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.78rem', background: 'var(--white)' }}
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
                                  background: isMe ? 'var(--primary)' : 'var(--surface-elevated)',
                                  color: isMe ? 'var(--text-on-primary)' : 'var(--text-primary)',
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
                              background: 'var(--white)',
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
              style={{ background: 'var(--white)' }}
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
              style={{ background: 'var(--white)' }}
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
              style={{ background: 'var(--white)' }}
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
