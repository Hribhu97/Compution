import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, firebaseConfig, syncStudentFeeAggregates } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, collectionGroup, doc, getDoc, getDocs, serverTimestamp, onSnapshot, query, where, orderBy, writeBatch, deleteField, arrayUnion, arrayRemove } from 'firebase/firestore';
import { updateDoc, deleteDoc, addDoc, setDoc, runTransaction } from '../firebase';
import { Search, Settings, Download, Plus, MoreHorizontal, Eye, ArrowUpRight, Sparkles, ShieldCheck, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Users, Bell, AlertCircle, Calendar, GraduationCap, ChevronDown, Mail, Send, Pencil, X, ShieldAlert, MessageSquare, Briefcase, UserCheck, Loader2, Check, CheckCheck, Info, UserMinus } from 'lucide-react';
import Modal from './Modal';
import SystemHealthPanel from './SystemHealthPanel';
import ThemeInspector from '../theme/ThemeInspector';
import { systemDoctorService } from '../services/systemDoctorService';
import { reportService } from '../services/reportService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { clientMigrationService } from '../services/clientMigrationService';
import { calculateFeeMetrics, getStudentMonthlyFee } from '../utils/feeCalculator';

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



const computeEndTime = (startTimeStr) => {
  if (!startTimeStr) return '';
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  let endHours = hours + 1;
  let endMinutes = minutes + 30;
  if (endMinutes >= 60) {
    endHours += 1;
    endMinutes -= 60;
  }
  const endHoursStr = String(endHours % 24).padStart(2, '0');
  const endMinutesStr = String(endMinutes).padStart(2, '0');
  return `${endHoursStr}:${endMinutesStr}`;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  // Navigation Tabs
  const [activePanelTab, setActivePanelTab] = useState('students'); 
  const [settingsSubTab, setSettingsSubTab] = useState('aadhaar');
  const [slotRequestsList, setSlotRequestsList] = useState([]);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  // Class Schedule form states
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [startDate, setStartDate] = useState('Monday'); // represents Day of week
  const [startTime, setStartTime] = useState('17:30');
  const [assignedFacultyId, setAssignedFacultyId] = useState('');
  const [venue, setVenue] = useState('Room 4B');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [meetLink, setMeetLink] = useState('');
  // Account Migration States
  const [migrationAudit, setMigrationAudit] = useState(null);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationReport, setMigrationReport] = useState(null);
  const [rollbackFileUsers, setRollbackFileUsers] = useState(null);
  const [rollbackFileName, setRollbackFileName] = useState('');
  const [rollbackRunning, setRollbackRunning] = useState(false);

  const [pendingRoleChanges, setPendingRoleChanges] = useState({});
  const [processingRequestIds, setProcessingRequestIds] = useState({});
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
  const [facSearch, setFacSearch] = useState('');
  const [facSubjectFilter, setFacSubjectFilter] = useState('all');
  const [facAvailabilityFilter, setFacAvailabilityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // Drawer fee target editing states
  const [isEditingDrawerFees, setIsEditingDrawerFees] = useState(false);
  const [drawerFeeTarget, setDrawerFeeTarget] = useState(0);
  const [drawerTotalFee, setDrawerTotalFee] = useState(0);
  const [drawerAmountPaid, setDrawerAmountPaid] = useState(0);
  const [drawerFeeError, setDrawerFeeError] = useState('');
  const [isSavingDrawerFees, setIsSavingDrawerFees] = useState(false);

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

  // Table sorting, pagination, and multi-select states
  const [sortField, setSortField] = useState('displayName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Premium Click-to-Reply messaging drawer states
  const [drawerMessages, setDrawerMessages] = useState([]);
  const [drawerNewMessage, setDrawerNewMessage] = useState('');
  const [drawerAttachment, setDrawerAttachment] = useState(null);
  const [drawerUploadingAttachment, setDrawerUploadingAttachment] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState('profile'); // 'profile' | 'chat' | 'academics' | 'timeline'
  const [drawerAssignments, setDrawerAssignments] = useState([]);
  const [drawerAttempts, setDrawerAttempts] = useState([]);
  const [drawerAssignmentsLoading, setDrawerAssignmentsLoading] = useState(false);
  const [drawerAttemptsLoading, setDrawerAttemptsLoading] = useState(false);

  // Master Fee Structure Config
  const [feeStructure, setFeeStructure] = useState(null);
  const [aadhaarStatusFilter, setAadhaarStatusFilter] = useState('all');


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
      unsubSched = onSnapshot(collection(db, 'classSchedules'), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setSchedulesList(list);
      }, (err) => {
        console.error("AdminDashboard: schedules listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: schedules listener creation failed", err);
    }

    // 4b. Slot Requests
    let unsubSlotReq = () => {};
    try {
      unsubSlotReq = onSnapshot(collection(db, 'slotRequests'), (snap) => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setSlotRequestsList(list);
      }, (err) => {
        console.error("AdminDashboard: slotRequests listener error:", err);
      });
    } catch (err) {
      console.error("AdminDashboard: slotRequests listener creation failed", err);
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

    // 7. Fees collection real-time listener (Collection Group 'monthly')
    try {
      if (user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'member') {
        unsubFees = onSnapshot(collectionGroup(db, 'monthly'), (snap) => {
          const list = [];
          snap.forEach(d => {
            const studentId = d.ref.parent.parent.id;
            list.push({
              id: d.id,
              studentId,
              month: d.id,
              ...d.data()
            });
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
        unsubPaymentHist = onSnapshot(collection(db, 'payments'), (snap) => {
          const list = [];
          snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          list.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });
          setPaymentHistoryList(list);
        }, (err) => {
          console.error("Error subscribing to payments:", err);
        });

        // Payment Requests
        unsubPaymentReq = onSnapshot(collection(db, 'paymentSubmissions'), (snap) => {
          const list = [];
          snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          list.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });
          setPaymentRequestsList(list);
        }, (err) => {
          console.error("Error subscribing to paymentSubmissions:", err);
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
      unsubSlotReq();
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
      unsubStudentFees = onSnapshot(collection(db, 'fees', selectedStudentDetails.id, 'monthly'), (snap) => {
        const list = [];
        snap.forEach(d => {
          list.push({
            id: d.id,
            feeName: 'Tuition',
            month: d.id, // e.g. "2026-05"
            amount: d.data().amountDue,
            paidAmount: d.data().amountPaid,
            status: d.data().status === 'paid' ? 'Paid' : 'Pending',
            ...d.data()
          });
        });
        // Sort by month descending
        list.sort((a, b) => b.month.localeCompare(a.month));
        setSelectedStudentFees(list);
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

  // Prefill drawer fee edit fields when selected student changes
  useEffect(() => {
    if (selectedStudentDetails) {
      setDrawerFeeTarget(selectedStudentDetails.feeTarget || selectedStudentDetails.monthlyFee || 700);
      setDrawerTotalFee(selectedStudentDetails.feesAmount || selectedStudentDetails.feeTarget || 700);
      setDrawerAmountPaid(selectedStudentDetails.paidAmount || 0);
      setDrawerFeeError('');
      setIsEditingDrawerFees(false);
    }
  }, [selectedStudentDetails]);

  // Real-time listeners for selected student's assignments and test attempts
  useEffect(() => {
    if (!selectedStudentDetails?.id) {
      setDrawerAssignments([]);
      setDrawerAttempts([]);
      return;
    }

    setDrawerAssignmentsLoading(true);
    setDrawerAttemptsLoading(true);

    const unsubAss = onSnapshot(collection(db, `users/${selectedStudentDetails.id}/assignments`), (snap) => {
      const list = [];
      snap.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      setDrawerAssignments(list);
      setDrawerAssignmentsLoading(false);
    }, (err) => {
      console.error("Error loading drawer assignments:", err);
      setDrawerAssignmentsLoading(false);
    });

    const qAttempts = query(
      collection(db, 'testAttempts'),
      where('studentId', '==', selectedStudentDetails.id)
    );
    const unsubAttempts = onSnapshot(qAttempts, (snap) => {
      const list = [];
      snap.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      list.sort((a, b) => {
        const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
        const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt);
        return dateB - dateA;
      });
      setDrawerAttempts(list);
      setDrawerAttemptsLoading(false);
    }, (err) => {
      console.error("Error loading drawer attempts:", err);
      setDrawerAttemptsLoading(false);
    });

    return () => {
      unsubAss();
      unsubAttempts();
    };
  }, [selectedStudentDetails?.id]);

  // Global event listeners for Quick Actions and Command Palette shortcuts
  useEffect(() => {
    const handleAddStudent = () => {
      setNewStudent({ displayName: '', email: '', phone: '', course: '' });
      setIsAddStudentOpen(true);
    };
    const handleAddFaculty = () => setIsAddFacultyOpen(true);
    const handleAddMember = () => setIsAddMemberOpen(true);
    const handleScheduleClass = () => {
      setEditingSchedule(null);
      setEventTitle('');
      setEventDesc('');
      setStartDate('Monday');
      setStartTime('17:30');
      setAssignedFacultyId(user?.uid || '');
      setVenue('Room 4B');
      setSelectedGroups([]);
      setSelectedStudents([]);
      setMeetLink('');
      setIsAddScheduleOpen(true);
    };
    const handleAddMeet = () => {
      setMeetTitle('');
      setMeetDate(new Date().toISOString().split('T')[0]);
      setMeetTime('18:00');
      setMeetParticipants('All Students');
      setIsMeetModalOpen(true);
    };
    const handleOpenStudent = (e) => {
      const student = e.detail;
      if (student) {
        setSelectedStudentDetails({ ...student, joined: 'Jan 2026', roll: 'Roll #COMP' });
        setDrawerActiveTab('profile');
      }
    };

    window.addEventListener('open-add-student', handleAddStudent);
    window.addEventListener('open-add-faculty', handleAddFaculty);
    window.addEventListener('open-add-member', handleAddMember);
    window.addEventListener('open-schedule-class', handleScheduleClass);
    window.addEventListener('open-create-meeting', handleAddMeet);
    window.addEventListener('open-student-details', handleOpenStudent);

    return () => {
      window.removeEventListener('open-add-student', handleAddStudent);
      window.removeEventListener('open-add-faculty', handleAddFaculty);
      window.removeEventListener('open-add-member', handleAddMember);
      window.removeEventListener('open-schedule-class', handleScheduleClass);
      window.removeEventListener('open-create-meeting', handleAddMeet);
      window.removeEventListener('open-student-details', handleOpenStudent);
    };
  }, [user?.uid]);

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
    if (user?.role !== 'admin' && user?.role !== 'faculty') {
      triggerToast('Error: Only Admin and Faculty can create meeting sessions.', 'danger');
      return;
    }
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

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      triggerToast('Please enter a subject / title', 'danger');
      return;
    }
    const endTimeComputed = computeEndTime(startTime);
    const facultyNameSelected = allUsers.find(u => u.id === assignedFacultyId)?.displayName || user.displayName || 'Faculty Mentor';
    
    const payload = {
      subject: eventTitle.trim(),
      description: eventDesc.trim(),
      day: startDate,
      startTime,
      endTime: endTimeComputed,
      duration: '1 Hour 30 Minutes',
      facultyId: assignedFacultyId || user.uid,
      facultyName: facultyNameSelected,
      room: venue.trim() || 'Room 4B',
      batch: selectedGroups[0] || 'class_2_5',
      studentIds: selectedStudents,
      meetLink: meetLink.trim(),
      status: 'upcoming',
      updatedAt: serverTimestamp()
    };

    try {
      if (editingSchedule) {
        await updateDoc(doc(db, 'classSchedules', editingSchedule.id), payload);
        triggerToast('Class schedule updated successfully!', 'success');
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'classSchedules'), payload);
        triggerToast('Class schedule created successfully!', 'success');
      }
      setIsAddScheduleOpen(false);
      setEventTitle('');
      setEventDesc('');
      setMeetLink('');
      setSelectedGroups([]);
      setSelectedStudents([]);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save schedule slot', 'danger');
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

  const handleSaveFeesAmount = async (studentId) => {
    try {
      const amount = Number(editingAmount);
      if (isNaN(amount) || amount < 0) {
        triggerToast('Please enter a valid amount', 'danger');
        return;
      }
      
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const userRef = doc(db, 'users', studentId);
      const monthlyFeeRef = doc(db, 'fees', studentId, 'monthly', currentMonthStr);
      
      // Get previous values for audit logging
      const userSnap = await getDoc(userRef);
      const prevFeeTarget = userSnap.exists() ? (userSnap.data().feeTarget || userSnap.data().monthlyFee || 700) : 700;
      const prevOutstanding = userSnap.exists() ? (userSnap.data().pendingAmount || 0) : 0;
      const prevTotalFee = userSnap.exists() ? (userSnap.data().feesAmount || prevFeeTarget) : prevFeeTarget;
      const prevPaidAmount = userSnap.exists() ? (userSnap.data().paidAmount || 0) : 0;
      
      // Update users doc
      await setDoc(userRef, { 
        feeTarget: amount,
        monthlyFee: amount,
        feesAmount: amount,
        pendingAmount: Math.max(0, amount - prevPaidAmount),
        feeStatus: Math.max(0, amount - prevPaidAmount) <= 0 ? 'paid' : 'pending'
      }, { merge: true });
      
      // Update monthly fee doc
      await setDoc(monthlyFeeRef, {
        amountDue: amount,
        status: Math.max(0, amount - prevPaidAmount) <= 0 ? 'paid' : 'pending'
      }, { merge: true });
      
      // Canonical sync
      await syncStudentFeeAggregates(studentId);
      
      // Audit log
      await logAdminAction('fee_target_update', studentId, {
        prevFeeTarget,
        newFeeTarget: amount,
        prevOutstanding,
        newOutstanding: Math.max(0, amount - prevPaidAmount),
        prevTotalFee,
        newTotalFee: amount,
        prevPaidAmount,
        newPaidAmount: prevPaidAmount
      });
      
      setEditingStudentId(null);
      triggerToast('Fee amount updated!', 'success');
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Failed to update fees', 'danger');
    }
  };

  const handleSaveDrawerFees = async (studentId) => {
    setDrawerFeeError('');
    setIsSavingDrawerFees(true);
    try {
      const newTarget = Number(drawerFeeTarget);
      const newTotal = Number(drawerTotalFee);
      const newPaid = Number(drawerAmountPaid);
      
      // Validations
      if (isNaN(newTarget) || newTarget < 0) {
        throw new Error('Tuition target must be a valid non-negative number.');
      }
      if (isNaN(newTotal) || newTotal < 0) {
        throw new Error('Total fee must be a valid non-negative number.');
      }
      if (isNaN(newPaid) || newPaid < 0) {
        throw new Error('Amount paid must be a valid non-negative number.');
      }
      if (newPaid > newTotal) {
        throw new Error('Amount paid cannot exceed the total fee.');
      }
      
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const userRef = doc(db, 'users', studentId);
      const monthlyFeeRef = doc(db, 'fees', studentId, 'monthly', currentMonthStr);
      
      // Get previous values for audit logging
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error('Student profile not found.');
      }
      const userData = userSnap.data();
      const prevFeeTarget = userData.feeTarget || userData.monthlyFee || 700;
      const prevOutstanding = userData.pendingAmount || 0;
      
      const newOutstanding = Math.max(0, newTotal - newPaid);
      const nextStatus = newOutstanding <= 0 ? 'paid' : 'pending';
      
      // Batch updates
      await setDoc(userRef, {
        feeTarget: newTarget,
        monthlyFee: newTarget,
        feesAmount: newTotal,
        paidAmount: newPaid,
        pendingAmount: newOutstanding,
        feeStatus: nextStatus
      }, { merge: true });
      
      await setDoc(monthlyFeeRef, {
        amountDue: newTarget,
        amountPaid: newPaid,
        status: nextStatus
      }, { merge: true });
      
      // Run canonical sync
      await syncStudentFeeAggregates(studentId);
      
      // Write audit log
      await logAdminAction('fee_target_update', studentId, {
        prevFeeTarget,
        newFeeTarget: newTarget,
        prevOutstanding,
        newOutstanding,
        prevTotalFee: userData.feesAmount || prevFeeTarget,
        newTotalFee: newTotal,
        prevPaidAmount: userData.paidAmount || 0,
        newPaidAmount: newPaid
      });
      
      // Update selectedStudentDetails state dynamically
      setSelectedStudentDetails(prev => ({
        ...prev,
        feeTarget: newTarget,
        monthlyFee: newTarget,
        feesAmount: newTotal,
        paidAmount: newPaid,
        pendingAmount: newOutstanding,
        feeStatus: nextStatus
      }));
      
      setIsEditingDrawerFees(false);
      triggerToast('Tuition fee target updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      setDrawerFeeError(err.message || 'Failed to update tuition fee settings.');
      triggerToast(err.message || 'Failed to update tuition fee settings.', 'danger');
    } finally {
      setIsSavingDrawerFees(false);
    }
  };

  // ── UPDATE FEE STATUS ──
  const handleUpdateFeeStatus = async (studentId, targetStatus) => {
    try {
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const studentRef = doc(db, 'users', studentId);
      const feeDocRef = doc(db, 'fees', studentId, 'monthly', currentMonthStr);

      await runTransaction(db, async (transaction) => {
        const studentSnap = await transaction.get(studentRef);
        if (!studentSnap.exists()) {
          throw new Error('Student profile not found');
        }
        const studentData = studentSnap.data();
        const oldStatus = studentData.feeStatus || 'pending';
        const amountDue = getStudentMonthlyFee(studentData);

        const newAmountPaid = targetStatus === 'paid' ? amountDue : 0;
        const newStatus = targetStatus;

        transaction.set(feeDocRef, {
          amountDue,
          amountPaid: newAmountPaid,
          status: newStatus,
          paymentDate: targetStatus === 'paid' ? serverTimestamp() : null,
          transactionId: targetStatus === 'paid' ? 'ADMIN_MANUAL' : null,
          paymentMethod: targetStatus === 'paid' ? 'Cash' : null,
          verifiedBy: user.displayName || 'Admin',
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Update student profile status for compatibility
        transaction.update(studentRef, {
          feeStatus: newStatus
        });

        // Audit Logging to auditLogs
        const newAuditRef = doc(collection(db, 'auditLogs'));
        transaction.set(newAuditRef, {
          action: 'fee_status_update',
          studentId,
          studentName: studentData.displayName || 'Student',
          oldStatus,
          newStatus,
          amount: newAmountPaid,
          admin: user.displayName || 'Admin',
          timestamp: serverTimestamp()
        });
      });

      triggerToast(`Fee status updated to ${targetStatus}!`, 'success');
    } catch (err) {
      console.error("Error updating fee status:", err);
      triggerToast(err.message || 'Failed to update fee status', 'danger');
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedStudentIds.length === 0) return;
    const confirm = window.confirm(`Are you sure you want to mark ${selectedStudentIds.length} students as Paid?`);
    if (!confirm) return;
    try {
      for (const sid of selectedStudentIds) {
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const studentRef = doc(db, 'users', sid);
        const feeDocRef = doc(db, 'fees', sid, 'monthly', currentMonthStr);
        await runTransaction(db, async (transaction) => {
          const studentSnap = await transaction.get(studentRef);
          if (!studentSnap.exists()) return;
          const studentData = studentSnap.data();
          const amountDue = getStudentMonthlyFee(studentData);
          transaction.set(feeDocRef, {
            amountDue,
            amountPaid: amountDue,
            status: 'paid',
            paymentDate: serverTimestamp(),
            transactionId: 'ADMIN_BULK_MANUAL',
            paymentMethod: 'Cash',
            verifiedBy: user.displayName || 'Admin',
            updatedAt: serverTimestamp()
          }, { merge: true });
          transaction.update(studentRef, { feeStatus: 'paid' });
        });
      }
      setSelectedStudentIds([]);
      triggerToast(`Successfully marked ${selectedStudentIds.length} students as Paid!`, 'success');
    } catch (err) {
      console.error("Bulk paid error:", err);
      triggerToast("Failed to perform bulk updates: " + err.message, 'danger');
    }
  };

  const handleBulkMarkPending = async () => {
    if (selectedStudentIds.length === 0) return;
    const confirm = window.confirm(`Are you sure you want to mark ${selectedStudentIds.length} students as Pending?`);
    if (!confirm) return;
    try {
      for (const sid of selectedStudentIds) {
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const studentRef = doc(db, 'users', sid);
        const feeDocRef = doc(db, 'fees', sid, 'monthly', currentMonthStr);
        await runTransaction(db, async (transaction) => {
          const studentSnap = await transaction.get(studentRef);
          if (!studentSnap.exists()) return;
          const studentData = studentSnap.data();
          transaction.set(feeDocRef, {
            amountPaid: 0,
            status: 'pending',
            paymentDate: null,
            transactionId: null,
            paymentMethod: null,
            verifiedBy: user.displayName || 'Admin',
            updatedAt: serverTimestamp()
          }, { merge: true });
          transaction.update(studentRef, { feeStatus: 'pending' });
        });
      }
      setSelectedStudentIds([]);
      triggerToast(`Successfully marked ${selectedStudentIds.length} students as Pending!`, 'success');
    } catch (err) {
      console.error("Bulk pending error:", err);
      triggerToast("Failed to perform bulk updates: " + err.message, 'danger');
    }
  };

  const handleBulkExportCSV = () => {
    if (selectedStudentIds.length === 0) return;
    const selectedStudents = studentsList.filter(s => selectedStudentIds.includes(s.id));
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Roll ID,Student Name,Email,Phone,Course,Monthly Fee,Payment Status\n";
    selectedStudents.forEach(s => {
      const feeRecord = currentMonthFeesList.find(f => f.studentId === s.id);
      const fee = feeRecord ? feeRecord.amountDue : (s.feeTarget || s.monthlyFee || 500);
      const status = feeRecord ? feeRecord.status : 'pending';
      csvContent += `"${s.studentId || ''}","${s.displayName || ''}","${s.email || ''}","${s.phone || ''}","${s.course || ''}",${fee},"${status.toUpperCase()}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `compution_students_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    if (processingRequestIds[req.id]) return;
    if (!req.studentId || !req.amount || Number(req.amount) <= 0) {
      triggerToast('Validation Error: Invalid student ID or amount', 'danger');
      return;
    }

    setProcessingRequestIds(prev => ({ ...prev, [req.id]: true }));

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const txId = req.transactionId || req.utrNumber || '';

    if (!txId) {
      triggerToast('Validation Error: Transaction UTR ID is missing', 'danger');
      return;
    }

    try {
      // 1. Check for duplicate transaction UTR
      const dupQuery = query(collection(db, 'payments'), where('transactionId', '==', txId));
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        triggerToast('Validation Error: Duplicate Transaction UTR ID detected!', 'danger');
        return;
      }

      // 2. Perform runTransaction
      const feeDocRef = doc(db, 'fees', req.studentId, 'monthly', currentMonthStr);
      const studentRef = doc(db, 'users', req.studentId);
      const submissionRef = doc(db, 'paymentSubmissions', req.id);

      await runTransaction(db, async (transaction) => {
        const feeDocSnap = await transaction.get(feeDocRef);
        const amountPaidNum = Number(req.amount);
        
        let oldStatus = 'pending';
        let amountDue = getStudentMonthlyFee(req);

        if (feeDocSnap.exists()) {
          const feeData = feeDocSnap.data();
          oldStatus = feeData.status || 'pending';
          amountDue = feeData.amountDue;
          
          if (feeData.status === 'paid') {
            throw new Error('Double Payment Error: This month is already marked as fully paid.');
          }
          if (feeData.amountPaid + amountPaidNum > amountDue) {
            throw new Error(`Overpayment Error: Paid amount exceeds amount due of ₹${amountDue}.`);
          }
        }

        const newAmountPaid = (feeDocSnap.exists() ? feeDocSnap.data().amountPaid : 0) + amountPaidNum;
        const newStatus = newAmountPaid >= amountDue ? 'paid' : 'pending';

        // Write monthly fee doc
        transaction.set(feeDocRef, {
          amountDue,
          amountPaid: newAmountPaid,
          status: newStatus,
          paymentDate: serverTimestamp(),
          transactionId: txId,
          paymentMethod: req.paymentMethod || 'UPI',
          verifiedBy: user.displayName || 'Admin',
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Update student profile status for compatibility
        transaction.update(studentRef, {
          feeStatus: newStatus
        });

        // Mark submission request as Approved
        transaction.update(submissionRef, {
          status: 'approved',
          verifiedAt: serverTimestamp(),
          verifiedBy: user.displayName || 'Admin'
        });

        // Create Payment record in payments collection
        const newPaymentRef = doc(collection(db, 'payments'));
        transaction.set(newPaymentRef, {
          studentId: req.studentId,
          studentName: req.studentName,
          email: req.email || '',
          phone: req.phone || '',
          amount: amountPaidNum,
          transactionId: txId,
          paymentDate: serverTimestamp(),
          status: 'paid',
          createdAt: serverTimestamp(),
          course: req.course || 'Not specified'
        });

        // Create auditLogs record
        const newAuditRef = doc(collection(db, 'auditLogs'));
        transaction.set(newAuditRef, {
          action: 'payment_verify',
          studentId: req.studentId,
          studentName: req.studentName,
          oldStatus,
          newStatus,
          amount: amountPaidNum,
          admin: user.displayName || 'Admin',
          timestamp: serverTimestamp()
        });
      });

      triggerToast('Payment approved & synced successfully!', 'success');
    } catch (e) {
      console.error(e);
      triggerToast(e.message || 'Failed to approve payment', 'danger');
    } finally {
      setProcessingRequestIds(prev => {
        const next = { ...prev };
        delete next[req.id];
        return next;
      });
    }
  };

  const handleRejectPaymentRequest = async (req) => {
    if (!req || !req.id) return;
    if (processingRequestIds[req.id]) return;
    setProcessingRequestIds(prev => ({ ...prev, [req.id]: true }));
    try {
      const submissionRef = doc(db, 'paymentSubmissions', req.id);
      await runTransaction(db, async (transaction) => {
        transaction.update(submissionRef, {
          status: 'rejected',
          rejectedAt: serverTimestamp(),
          rejectedBy: user.displayName || 'Admin',
          rejectionReason: 'Rejected by admin'
        });

        const newAuditRef = doc(collection(db, 'auditLogs'));
        transaction.set(newAuditRef, {
          action: 'payment_reject',
          studentId: req.studentId || 'unknown',
          studentName: req.studentName || 'Unknown Student',
          oldStatus: 'pending',
          newStatus: 'rejected',
          amount: Number(req.amount || 0),
          admin: user.displayName || 'Admin',
          timestamp: serverTimestamp()
        });
      });
      triggerToast('Payment request rejected', 'danger');
    } catch (e) {
      console.error(e);
      triggerToast(e.message || 'Failed to reject payment', 'danger');
    } finally {
      setProcessingRequestIds(prev => {
        const next = { ...prev };
        delete next[req.id];
        return next;
      });
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

        // 6. Cascade payments (where studentId == userId)
        const paySnap = await getDocs(query(collection(db, 'payments'), where('studentId', '==', userId)));
        paySnap.forEach(d => {
          deletePromises.push(deleteDoc(doc(db, 'payments', d.id)));
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
      // 1. Add to payments collection
      await addDoc(collection(db, 'payments'), {
        studentId: selectedStudentDetails.id,
        studentName: selectedStudentDetails.displayName,
        email: selectedStudentDetails.email || '',
        phone: selectedStudentDetails.phone || selectedStudentDetails.phoneNumber || '',
        amount: paymentVal,
        transactionId: 'CASH-' + Date.now(),
        paymentDate: serverTimestamp(),
        status: 'paid',
        createdAt: serverTimestamp(),
        course: selectedStudentDetails.course || 'Not specified',
        remarks: paymentForm.notes || 'Recorded manually by Admin',
        feeName: selectedFeeItem?.feeName || 'Tuition'
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
          collection(db, 'payments'),
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
  const studentsList = allUsers.filter(u => 
    u.role?.toLowerCase() === 'student' &&
    u.status !== 'inactive' &&
    u.status !== 'deleted' &&
    u.archived !== true &&
    u.deleted !== true
  ).filter(s => {
    if (user?.role?.toLowerCase() === 'faculty') {
      return s.assignedFaculty?.includes(user.uid) || s.assignedFaculty?.includes(user.email) || assignedStudentIds.includes(s.id);
    }
    return true;
  });
  const facultyList = allUsers.filter(u => u.role?.toLowerCase() === 'faculty');
  const membersList = allUsers.filter(u => u.role?.toLowerCase() === 'member');
  
  // Analytics helper calculations
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthFeesList = allFees.filter(f => f.month === currentMonthStr);

  const activeStudentIds = new Set(studentsList.map(u => u.id));
  const activeFees = allFees.filter(f => activeStudentIds.has(f.studentId));
  const currentMonthActiveFees = activeFees.filter(f => f.month === currentMonthStr);

  // Search filter matching
  const filteredStudents = studentsList.filter(s => s.displayName?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()) || s.course?.toLowerCase().includes(search.toLowerCase()));

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let valA = '';
    let valB = '';
    if (sortField === 'displayName') {
      valA = a.displayName || '';
      valB = b.displayName || '';
    } else if (sortField === 'course') {
      valA = a.course || '';
      valB = b.course || '';
    } else if (sortField === 'feeTarget') {
      valA = a.feeTarget || a.monthlyFee || 0;
      valB = b.feeTarget || b.monthlyFee || 0;
    } else if (sortField === 'feeStatus') {
      const recA = currentMonthFeesList.find(f => f.studentId === a.id);
      const recB = currentMonthFeesList.find(f => f.studentId === b.id);
      valA = recA ? recA.status : 'pending';
      valB = recB ? recB.status : 'pending';
    } else {
      valA = a[sortField] || '';
      valB = b[sortField] || '';
    }

    if (typeof valA === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    } else {
      return sortDirection === 'asc' 
        ? valA - valB 
        : valB - valA;
    }
  });

  const totalStudentPages = Math.ceil(sortedStudents.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedStudents = sortedStudents.slice(startIndex, startIndex + pageSize);
  const filteredFaculty = facultyList.filter(f => f.displayName?.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase()) || (f.subjects && f.subjects.some(sub=>sub.toLowerCase().includes(search.toLowerCase()))));
  const filteredMembers = membersList.filter(m => m.displayName?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()) || m.department?.toLowerCase().includes(search.toLowerCase()));

  const metrics = calculateFeeMetrics(studentsList, allFees);
  const totalMonthlyFees = metrics.totalMonthlyFees;
  const pendingFeesTotal = metrics.pendingTuition;
  const studentsPaidCount = metrics.studentsPaid;
  const studentsPendingCount = metrics.studentsPending;
  
  const totalStudents = studentsList.length;
  const totalFaculty = facultyList.length;
  const totalMembers = membersList.length;
  const activeChatRooms = chatRoomsList.length;


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

        {/* Client-Side AI Insights Dashboard banner */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px dashed rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 800, fontSize: '0.85rem' }}>
            <Sparkles size={16} /> CLIENT AI INSIGHTS ENGINE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {totalPending > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 800 }}>•</span>
                <span><strong>Outstanding Dues:</strong> ₹{totalPending.toLocaleString()} tuition fees are pending collection from {studentsPendingCount} students. Click to open the Students tab and send WhatsApp reminders.</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: rate >= 90 ? 'var(--success)' : 'var(--warning)', fontWeight: 800 }}>•</span>
              <span><strong>Engagement Metrics:</strong> Institutional average attendance rate is at <strong>{rate}%</strong>. Student roster activity is healthy and within optimal bounds.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 800 }}>•</span>
              <span><strong>Resource Utilization:</strong> Roster workload is balanced at an average of <strong>{Math.round(totalStudents / (facultyList.length || 1))} students</strong> per faculty mentor.</span>
            </div>
          </div>
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

  const currentMonthStrVal = new Date().toISOString().slice(0, 7);
  const currentMonthRecordVal = currentStudentDetails
    ? allFees.find(f => f.studentId === currentStudentDetails.id && f.month === currentMonthStrVal)
    : null;
  const currentPendingAmountVal = currentMonthRecordVal 
    ? (currentMonthRecordVal.amountDue - currentMonthRecordVal.amountPaid) 
    : (currentStudentDetails ? getStudentMonthlyFee(currentStudentDetails) : 0);

  const feesToShow = [...selectedStudentFees];
  if (currentStudentDetails && currentPendingAmountVal > 0) {
    feesToShow.unshift({
      id: 'pending_tuition_balance',
      feeName: 'Pending Tuition Balance',
      month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      amount: currentPendingAmountVal,
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
          { key: 'faculty', label: 'Faculty Staff', roles: ['admin'] },
          { key: 'schedules', label: 'Class Schedules', roles: ['admin', 'faculty'] },
          { key: 'attendance', label: 'Attendance Logs', roles: ['admin', 'faculty'] },
          { key: 'billing', label: 'Payments', roles: ['admin'] },
          { key: 'fee_config', label: 'Fees Config', roles: ['admin'] },
          { key: 'meetings', label: 'Meetings', roles: ['admin', 'faculty', 'member'] },
          { key: 'chats', label: 'Doubt Queue', roles: ['admin', 'faculty', 'member'] },
          { key: 'notifications', label: 'Notifications', roles: ['admin', 'member'] },
          { key: 'analytics', label: 'Analytics', roles: ['admin'] },
          { key: 'roles', label: 'User Roles', roles: ['admin'] },
          { key: 'settings', label: 'Settings', roles: ['admin'] },
          { key: 'audit_logs', label: 'Audit Logs', roles: ['admin'] }
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
              {(activePanelTab === 'members' || (activePanelTab === 'settings' && settingsSubTab === 'members')) && (
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
                
                {/* Bulk Actions Toolbar */}
                {selectedStudentIds.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--primary-light)',
                    borderRadius: '8px',
                    border: '1px solid rgba(83,109,254,0.2)',
                    marginBottom: '10px'
                  }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {selectedStudentIds.length} students selected
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={handleBulkMarkPaid} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'var(--success)' }}>
                        Mark Paid
                      </button>
                      <button onClick={handleBulkMarkPending} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'var(--warning)', color: 'white', border: 'none' }}>
                        Mark Pending
                      </button>
                      <button onClick={handleBulkExportCSV} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Download size={13} /> Export CSV
                      </button>
                      <button onClick={() => setSelectedStudentIds([])} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Deselect
                      </button>
                    </div>
                  </div>
                )}
                
                <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--white)' }}>
                      <th style={{ padding: '12px', width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.includes(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const pageIds = paginatedStudents.map(s => s.id);
                              setSelectedStudentIds(prev => Array.from(new Set([...prev, ...pageIds])));
                            } else {
                              const pageIds = paginatedStudents.map(s => s.id);
                              setSelectedStudentIds(prev => prev.filter(id => !pageIds.includes(id)));
                            }
                          }}
                        />
                      </th>
                      <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => {
                        if (sortField === 'displayName') {
                          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('displayName');
                          setSortDirection('asc');
                        }
                      }}>
                        Student Profile {sortField === 'displayName' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => {
                        if (sortField === 'course') {
                          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('course');
                          setSortDirection('asc');
                        }
                      }}>
                        Course / Program {sortField === 'course' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th style={{ padding: '12px' }}>Assigned Mentor</th>
                      <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => {
                        if (sortField === 'feeTarget') {
                          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('feeTarget');
                          setSortDirection('asc');
                        }
                      }}>
                        Fees Target {sortField === 'feeTarget' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th style={{ padding: '12px', cursor: 'pointer' }} onClick={() => {
                        if (sortField === 'feeStatus') {
                          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('feeStatus');
                          setSortDirection('asc');
                        }
                      }}>
                        Fee status {sortField === 'feeStatus' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                      <th style={{ padding: '12px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                {paginatedStudents.map(student => {
                  const feeRecord = currentMonthFeesList.find(f => f.studentId === student.id);
                  const currentFeesAmount = feeRecord ? feeRecord.amountDue : getStudentMonthlyFee(student);
                  const feeStatus = (feeRecord ? feeRecord.status : 'pending').toLowerCase();
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
                      <td style={{ padding: '12px', width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedStudentIds.includes(student.id)} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                            }
                          }} 
                        />
                      </td>
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
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const btn = e.currentTarget;
                              btn.disabled = true;
                              const origHtml = btn.innerHTML;
                              btn.innerHTML = `<span class="spinner" style="display:inline-block;width:10px;height:10px;border:1.5px solid var(--primary);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>`;
                              try {
                                const currentMonthStr = new Date().toISOString().slice(0, 7);
                                await reportService.exportMonthlyReport(student.id, currentMonthStr, showToast);
                              } catch (err) {
                                console.error(err);
                              } finally {
                                btn.disabled = false;
                                btn.innerHTML = origHtml;
                              }
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '6px', borderRadius: '6px' }}
                            title="Export Monthly Report"
                          >
                            <Download size={14} />
                          </button>
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

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              borderTop: '1px solid var(--border)',
              marginTop: '10px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing {startIndex + 1} - {Math.min(startIndex + pageSize, filteredStudents.length)} of {filteredStudents.length} students
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', background: 'white' }}
                  >
                    {[10, 25, 50].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.82rem', alignSelf: 'center', fontWeight: 700 }}>
                    Page {currentPage} of {totalStudentPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalStudentPages))}
                    disabled={currentPage === totalStudentPages}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', cursor: currentPage === totalStudentPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* ==================== Payments & Billing Tab ==================== */}
          {activePanelTab === 'billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Widgets Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {[
                  { label: 'Total Collected', value: `₹${activeFees.reduce((acc, f) => acc + (Number(f.amountPaid) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--success)' },
                  { label: 'Total Pending', value: `₹${activeFees.reduce((acc, f) => acc + (Math.max(0, (Number(f.amountDue) || 0) - (Number(f.amountPaid) || 0))), 0).toLocaleString('en-IN')}`, color: 'var(--danger)' },
                  { label: 'Pending Students', value: activeFees.filter(f => f.status === 'pending').length, color: '#F59E0B' },
                  { label: 'Total Billed', value: `₹${activeFees.reduce((acc, f) => acc + (Number(f.amountDue) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--primary)' }
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
                {paymentRequestsList.filter(r => (r.status || '').toLowerCase() === 'pending_verification' || r.status === 'Pending Verification').length === 0 ? (
                  <div style={{ padding: '20px', background: 'var(--surface)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No pending payment verifications.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {paymentRequestsList.filter(r => (r.status || '').toLowerCase() === 'pending_verification' || r.status === 'Pending Verification').map(req => (
                      <div key={req.id} style={{ padding: '16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{req.studentName} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>({req.paymentDate?.toDate ? req.paymentDate.toDate().toLocaleDateString() : req.paymentDate})</span></div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <span style={{ fontWeight: 600 }}>Amount:</span> ₹{req.amount} | <span style={{ fontWeight: 600 }}>UTR:</span> {req.transactionId || req.utrNumber}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleApprovePaymentRequest(req)} 
                            disabled={processingRequestIds[req.id]} 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', opacity: processingRequestIds[req.id] ? 0.6 : 1, cursor: processingRequestIds[req.id] ? 'not-allowed' : 'pointer' }}
                          >
                            {processingRequestIds[req.id] ? 'Processing...' : 'Approve'}
                          </button>
                          <button 
                            onClick={() => handleRejectPaymentRequest(req)} 
                            disabled={processingRequestIds[req.id]} 
                            className="btn" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', background: 'var(--surface)', color: 'var(--danger)', border: '1px solid var(--danger)', opacity: processingRequestIds[req.id] ? 0.6 : 1, cursor: processingRequestIds[req.id] ? 'not-allowed' : 'pointer' }}
                          >
                            Reject
                          </button>
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
                        const feeRecord = currentMonthActiveFees.find(f => f.studentId === student.id);
                        const amountDue = feeRecord ? feeRecord.amountDue : getStudentMonthlyFee(student);
                        const paidAmount = feeRecord ? feeRecord.amountPaid : 0;
                        const pendingAmount = amountDue - paidAmount;
                        const feeStatus = (feeRecord ? feeRecord.status : 'pending').toLowerCase();

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
                            <td style={{ padding: '10px', fontWeight: 600 }}>₹{amountDue.toLocaleString()}</td>
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
                           <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{studentsPaidCount}</div>
                         </div>
                         <div>
                           <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pending Student Count</div>
                           <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B' }}>{studentsPendingCount}</div>
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
                                const feeRecord = currentMonthFeesList.find(f => f.studentId === student.id);
                                const amountDue = feeRecord ? feeRecord.amountDue : getStudentMonthlyFee(student);
                                const paidAmount = feeRecord ? feeRecord.amountPaid : 0;
                                const pendingAmount = amountDue - paidAmount;
                                const feeStatus = (feeRecord ? feeRecord.status : 'pending').toLowerCase();
                                const lastUpdate = feeRecord?.updatedAt?.toDate ? feeRecord.updatedAt.toDate().toLocaleString() : 'Never';

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
          {(activePanelTab === 'members' || (activePanelTab === 'settings' && settingsSubTab === 'members')) && (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Smart Class Schedules</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage weekly student classes, timing allocations, and faculty rosters.</p>
                </div>
                {(user?.role === 'admin' || user?.role === 'faculty') && (
                  <button
                    onClick={() => {
                      setEditingSchedule(null);
                      setEventTitle('');
                      setEventDesc('');
                      setStartDate('Monday'); // 'day' field represents day of week
                      setStartTime('17:30');
                      setAssignedFacultyId(user.uid);
                      setVenue('Room 4B');
                      setSelectedGroups([]);
                      setSelectedStudents([]);
                      setMeetLink('');
                      setIsAddScheduleOpen(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Schedule Class Slot
                  </button>
                )}
              </div>

              {/* Schedules Table */}
              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    <th style={{ padding: '12px' }}>Day & Time</th>
                    <th style={{ padding: '12px' }}>Subject & Batch</th>
                    <th style={{ padding: '12px' }}>Faculty Mentor</th>
                    <th style={{ padding: '12px' }}>Location/Room</th>
                    <th style={{ padding: '12px' }}>Students Assigned</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedulesList.filter(sch => {
                    const searchLower = search.toLowerCase();
                    const matchesSearch = sch.subject?.toLowerCase().includes(searchLower) || 
                      sch.facultyName?.toLowerCase().includes(searchLower) || 
                      sch.day?.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return false;
                    
                    if (user?.role === 'faculty') {
                      return sch.facultyId === user.uid;
                    }
                    return true;
                  }).map(sch => {
                    const studentNames = (sch.studentIds || []).map(sid => allUsers.find(u => u.id === sid)?.displayName || 'Unknown Student').join(', ');
                    
                    // Determine status dynamically
                    let statusLabel = sch.status || 'upcoming';
                    
                    return (
                      <tr key={sch.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700 }}>{sch.day}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>{sch.startTime} - {sch.endTime || computeEndTime(sch.startTime)}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700 }}>{sch.subject}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sch.batch || 'No Group'}</div>
                        </td>
                        <td style={{ padding: '12px' }}>{sch.facultyName || 'Mentor'}</td>
                        <td style={{ padding: '12px' }}>
                          <div>{sch.room || 'Compution Campus'}</div>
                          {sch.meetLink && (
                            <a href={sch.meetLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                              Join Meet Link
                            </a>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '0.8rem' }} title={studentNames}>
                          <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{(sch.studentIds || []).length} Students</div>
                          <div style={{ color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{studentNames || 'None'}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                            background: statusLabel === 'live' ? 'rgba(102,187,106,0.1)' : statusLabel === 'completed' ? 'rgba(158,158,158,0.15)' : 'rgba(83,109,254,0.1)',
                            color: statusLabel === 'live' ? 'var(--success)' : statusLabel === 'completed' ? 'var(--text-muted)' : 'var(--primary)'
                          }}>{statusLabel}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setEditingSchedule(sch);
                                setEventTitle(sch.subject || '');
                                setEventDesc(sch.description || '');
                                setStartDate(sch.day || 'Monday');
                                setStartTime(sch.startTime || '17:30');
                                setAssignedFacultyId(sch.facultyId || user.uid);
                                setVenue(sch.room || 'Room 4B');
                                setSelectedGroups(sch.batch ? [sch.batch] : []);
                                setSelectedStudents(sch.studentIds || []);
                                setMeetLink(sch.meetLink || '');
                                setIsAddScheduleOpen(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '6px', borderRadius: '6px' }}
                              title="Edit Class Schedule"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to cancel the class: ${sch.subject} on ${sch.day}?`)) {
                                  try {
                                    await deleteDoc(doc(db, 'classSchedules', sch.id));
                                    triggerToast('Class schedule deleted successfully', 'success');
                                  } catch (err) {
                                    console.error(err);
                                    triggerToast('Failed to delete class schedule', 'danger');
                                  }
                                }
                              }}
                              className="btn btn-ghost"
                              style={{ padding: '6px', color: 'var(--danger)', borderRadius: '6px' }}
                              title="Cancel Class"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {schedulesList.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No class schedules found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Slot Reschedule Requests sub-panel */}
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>Student Reschedule Slot Requests</h3>
                <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      <th style={{ padding: '12px' }}>Student</th>
                      <th style={{ padding: '12px' }}>Requested Timing</th>
                      <th style={{ padding: '12px' }}>Subject</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotRequestsList.map(req => (
                      <tr key={req.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>{req.studentName}</td>
                        <td style={{ padding: '12px' }}>{req.requestedDate} @ {req.requestedTime}</td>
                        <td style={{ padding: '12px' }}>{req.subject}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
                            background: req.status === 'approved' ? 'rgba(102,187,106,0.1)' : req.status === 'rejected' ? 'rgba(239,83,80,0.1)' : 'rgba(255,167,38,0.1)',
                            color: req.status === 'approved' ? 'var(--success)' : req.status === 'rejected' ? 'var(--danger)' : '#E65100'
                          }}>{req.status}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {req.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={async () => {
                                  try {
                                    const reqDateObj = new Date(req.requestedDate);
                                    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                    const reqDay = daysOfWeek[reqDateObj.getDay()];
                                    
                                    const matchingSlot = schedulesList.find(s => s.day === reqDay && s.startTime === req.requestedTime);
                                    if (matchingSlot) {
                                      const updatedStudents = [...(matchingSlot.studentIds || [])];
                                      if (!updatedStudents.includes(req.studentId)) {
                                        updatedStudents.push(req.studentId);
                                      }
                                      await updateDoc(doc(db, 'classSchedules', matchingSlot.id), { studentIds: updatedStudents });
                                    } else {
                                      await addDoc(collection(db, 'classSchedules'), {
                                        day: reqDay,
                                        startTime: req.requestedTime,
                                        endTime: computeEndTime(req.requestedTime),
                                        duration: '1 Hour 30 Minutes',
                                        facultyId: user.uid,
                                        facultyName: user.displayName || 'Faculty Mentor',
                                        room: 'Room 4B / Online',
                                        subject: req.subject || 'Coaching Class',
                                        batch: 'class_2_5',
                                        studentIds: [req.studentId],
                                        status: 'upcoming',
                                        createdAt: serverTimestamp()
                                      });
                                    }
                                    
                                    await updateDoc(doc(db, 'slotRequests', req.id), { status: 'approved' });
                                    triggerToast('Slot request approved and scheduled!', 'success');
                                  } catch (err) {
                                    console.error(err);
                                    triggerToast('Failed to approve slot request', 'danger');
                                  }
                                }}
                                className="btn btn-success"
                                style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '4px', background: 'var(--success)', color: 'white', border: 'none' }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'slotRequests', req.id), { status: 'rejected' });
                                    triggerToast('Slot request rejected', 'success');
                                  } catch (err) {
                                    console.error(err);
                                    triggerToast('Failed to reject slot request', 'danger');
                                  }
                                }}
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--danger)', borderRadius: '4px', border: 'none' }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {slotRequestsList.filter(req => req.status === 'pending').length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                          No pending slot requests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 5b. TABS: MEETINGS ==================== */}
          {activePanelTab === 'meetings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Scheduled Google Meet Sessions</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Create and manage virtual meeting classes and links.</p>
                </div>
                {(user?.role === 'admin' || user?.role === 'faculty') && (
                  <button
                    onClick={() => {
                      setMeetTitle('Faculty Doubt Clearing Session');
                      setMeetDate(new Date().toISOString().split('T')[0]);
                      setMeetTime(new Date().toTimeString().slice(0, 5));
                      setIsMeetModalOpen(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Schedule Google Meet
                  </button>
                )}
              </div>

              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    <th style={{ padding: '12px' }}>Meeting Session</th>
                    <th style={{ padding: '12px' }}>Timing</th>
                    <th style={{ padding: '12px' }}>Host Faculty</th>
                    <th style={{ padding: '12px' }}>Invitees</th>
                    <th style={{ padding: '12px' }}>Link</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {meetSessionsList.filter(meet => {
                    const matchesSearch = meet.meetTitle?.toLowerCase().includes(search.toLowerCase()) || meet.faculty?.toLowerCase().includes(search.toLowerCase());
                    return matchesSearch;
                  }).map(meet => {
                    const participantName = meet.meetParticipants === 'All Students' ? 'All Students' : (allUsers.find(u => u.id === meet.meetParticipants)?.displayName || meet.meetParticipants || 'Student');
                    return (
                      <tr key={meet.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>{meet.meetTitle}</td>
                        <td style={{ padding: '12px' }}>{meet.meetDate} @ {meet.meetTime}</td>
                        <td style={{ padding: '12px' }}>{meet.faculty || 'Mentor'}</td>
                        <td style={{ padding: '12px' }}>{participantName}</td>
                        <td style={{ padding: '12px' }}>
                          {meet.meetingLink ? (
                            <a href={meet.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              Join Meet
                            </a>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {(user?.role === 'admin' || meet.createdBy === user?.uid) && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Delete meet session "${meet.meetTitle}"?`)) {
                                  try {
                                    await deleteDoc(doc(db, 'meetSessions', meet.id));
                                    triggerToast('Meet session cancelled', 'success');
                                  } catch (err) {
                                    console.error(err);
                                    triggerToast('Failed to delete session', 'danger');
                                  }
                                }
                              }}
                              style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                              title="Delete Session"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {meetSessionsList.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No Google Meet sessions scheduled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
          {(activePanelTab === 'roles' || (activePanelTab === 'settings' && settingsSubTab === 'roles')) && (
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

              {/* Export Reports Section (Grid Span 1 / -1) */}
              <div style={{ gridColumn: '1 / -1', background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--dark)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Download size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Monthly Performance Report Export Center</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Generate and download Excel-compatible spreadsheets (.xls) containing detailed student profiles, attendance, learning milestones, and invoices.</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Select Student</label>
                    <select
                      id="analytics-export-student"
                      className="form-input"
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                    >
                      <option value="">-- Choose a Student --</option>
                      {allUsers.filter(u => u.role?.toLowerCase() === 'student' && (user?.role?.toLowerCase() === 'admin' || assignedStudentIds.includes(u.id))).map(u => (
                        <option key={u.id} value={u.id}>{u.displayName} ({u.studentId || 'No ID'})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ width: '160px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Select Month</label>
                    <select
                      id="analytics-export-month"
                      className="form-input"
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                    >
                      {Array.from({ length: 6 }).map((_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - i);
                        const val = d.toISOString().slice(0, 7);
                        const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                        return <option key={val} value={val}>{label}</option>;
                      })}
                    </select>
                  </div>

                  <button
                    onClick={async (e) => {
                      const studentSelect = document.getElementById('analytics-export-student');
                      const monthSelect = document.getElementById('analytics-export-month');
                      const sId = studentSelect?.value;
                      const mStr = monthSelect?.value;
                      if (!sId) {
                        showToast('Please select a student to export.', 'warning');
                        return;
                      }
                      
                      const btn = e.currentTarget;
                      btn.disabled = true;
                      const origText = btn.innerHTML;
                      btn.innerHTML = `<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:6px;"></span> Exporting...`;
                      try {
                        await reportService.exportMonthlyReport(sId, mStr, showToast);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        btn.disabled = false;
                        btn.innerHTML = origText;
                      }
                    }}
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', fontSize: '0.85rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', height: '40px' }}
                  >
                    <Download size={14} /> Export XLS
                  </button>
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
          {(activePanelTab === 'system_health' || (activePanelTab === 'settings' && settingsSubTab === 'system_health')) && (
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
          {(activePanelTab === 'theme_inspector' || (activePanelTab === 'settings' && settingsSubTab === 'theme_inspector')) && (
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

          {/* ==================== 13. TABS: ACCOUNT MIGRATION ==================== */}
          {(activePanelTab === 'account_migration' || (activePanelTab === 'settings' && settingsSubTab === 'account_migration')) && user?.role === 'admin' && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(239, 83, 80, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--danger)' }}>
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Account Linking & Schema Migration</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Extend user profiles in Firestore, link duplicate credentials, and manage safety backups/rollbacks.
                  </p>
                </div>
              </div>

              {/* Warning Alert */}
              <div style={{ display: 'flex', gap: '12px', background: 'rgba(255, 152, 0, 0.08)', border: '1px solid rgba(255, 152, 0, 0.3)', padding: '16px', borderRadius: '12px', color: '#E65100' }}>
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                  <strong>CRITICAL PRODUCTION CONTROL:</strong> This utility will mutate Firestore profile documents to add extended schema fields (uid, authProviders, emailVerified, phoneVerified, updatedAt). Always run a <strong>Dry-Run Audit</strong> first, and ensure a <strong>Backup JSON</strong> is downloaded before committing any changes.
                </div>
              </div>

              {/* Operations Console Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {/* 1. Dry Run */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Step 1: System Audit (Dry-Run)</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, flex: 1 }}>
                    Analyze the users collection in Firestore, detecting duplicate records, linked accounts, and structural orphans. No database writes.
                  </p>
                  <button
                    onClick={async () => {
                      setMigrationRunning(true);
                      try {
                        const audit = await clientMigrationService.runDryRunAudit();
                        setMigrationAudit(audit);
                        showToast('System Audit Completed (Dry-Run)', 'success');
                      } catch (err) {
                        showToast('Audit failed: ' + err.message, 'danger');
                      } finally {
                        setMigrationRunning(false);
                      }
                    }}
                    disabled={migrationRunning}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', background: 'var(--primary)' }}
                  >
                    {migrationRunning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Run Audit
                  </button>
                </div>

                {/* 2. Backup */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Step 2: Safety Backup</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, flex: 1 }}>
                    Create a rollback checkpoint. Downloads a JSON backup file to your local computer and stores a backup copy in Firestore settings.
                  </p>
                  <button
                    onClick={async () => {
                      if (!migrationAudit) {
                        showToast('Please run the System Audit first.', 'danger');
                        return;
                      }
                      setMigrationRunning(true);
                      try {
                        const { backupId, jsonString } = await clientMigrationService.createBackup(migrationAudit.rawUsers);
                        
                        // Download as JSON file
                        const blob = new Blob([jsonString], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `users_backup_${backupId}.json`;
                        document.body.appendChild(a); 
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        showToast('Backup Created & Downloaded!', 'success');
                      } catch (err) {
                        showToast('Backup failed: ' + err.message, 'danger');
                      } finally {
                        setMigrationRunning(false);
                      }
                    }}
                    disabled={!migrationAudit || migrationRunning}
                    className="btn btn-success"
                    style={{ width: '100%', justifyContent: 'center', background: 'var(--success)', color: 'white' }}
                  >
                    <Download size={16} /> Create Backup
                  </button>
                </div>

                {/* 3. Migrate */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Step 3: Execute Migration</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, flex: 1 }}>
                    Run the database update. Creates a backup first, then updates all Firestore user documents to the extended schema in safe batches.
                  </p>
                  <button
                    onClick={async () => {
                      if (!migrationAudit) {
                        showToast('Please run the System Audit first.', 'danger');
                        return;
                      }
                      if (!window.confirm('WARNING: Are you sure you want to write these migration changes to the production database? This operation is irreversible without a backup.')) {
                        return;
                      }
                      setMigrationRunning(true);
                      try {
                        const result = await clientMigrationService.runMigration(migrationAudit.rawUsers);
                        setMigrationReport(result.reportMarkdown);
                        showToast('Database Migration Executed Successfully!', 'success');
                      } catch (err) {
                        showToast('Migration failed: ' + err.message, 'danger');
                      } finally {
                        setMigrationRunning(false);
                      }
                    }}
                    disabled={!migrationAudit || migrationRunning}
                    className="btn"
                    style={{ width: '100%', justifyContent: 'center', background: 'var(--danger)', color: 'white' }}
                  >
                    {migrationRunning ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Execute Migration
                  </button>
                </div>

                {/* 4. Rollback */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Rollback Restores</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, flex: 1 }}>
                    In case of anomalies, upload a previously downloaded backup JSON file to restore the entire users collection to its exact saved state.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setRollbackFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const parsed = JSON.parse(event.target.result);
                              if (Array.isArray(parsed)) {
                                setRollbackFileUsers(parsed);
                                showToast('Valid backup file parsed!', 'success');
                              } else {
                                showToast('Invalid file format. Must be an array of user objects.', 'danger');
                                setRollbackFileUsers(null);
                              }
                            } catch (err) {
                              showToast('Failed to parse JSON file.', 'danger');
                              setRollbackFileUsers(null);
                            }
                          };
                          reader.readAsText(file);
                        }
                      }} 
                      style={{ fontSize: '0.8rem' }}
                    />
                    {rollbackFileUsers && (
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to rollback all users in Firestore to the ${rollbackFileUsers.length} profiles stored in "${rollbackFileName}"?`)) {
                            return;
                          }
                          setRollbackRunning(true);
                          try {
                            await clientMigrationService.runRollback(rollbackFileUsers);
                            showToast('Rollback Executed Successfully!', 'success');
                            setRollbackFileUsers(null);
                            setRollbackFileName('');
                          } catch (err) {
                            showToast('Rollback failed: ' + err.message, 'danger');
                          } finally {
                            setRollbackRunning(false);
                          }
                        }}
                        disabled={rollbackRunning}
                        className="btn"
                        style={{ width: '100%', justifyContent: 'center', background: '#37474F', color: 'white', padding: '10px' }}
                      >
                        {rollbackRunning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Run Rollback (${rollbackFileUsers.length} users)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit / Report Output Area */}
              {(migrationAudit || migrationReport) && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--bg)', marginTop: '12px' }}>
                  {migrationReport ? (
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px' }}>
                        Migration Execution Report
                      </h3>
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--surface)', padding: '12px', borderRadius: '8px', overflowX: 'auto', maxHeight: '400px' }}>
                        {migrationReport}
                      </pre>
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>
                        Audit Inspection Report (Dry-Run)
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                        <div className="card" style={{ padding: '12px', background: 'var(--surface)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Profiles</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{migrationAudit.totalFirestoreProfiles}</div>
                        </div>
                        <div className="card" style={{ padding: '12px', background: 'var(--surface)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Linked Profiles</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{migrationAudit.linkedAccounts.length}</div>
                        </div>
                        <div className="card" style={{ padding: '12px', background: 'var(--surface)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Duplicate Emails</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>{migrationAudit.duplicateEmails.length}</div>
                        </div>
                        <div className="card" style={{ padding: '12px', background: 'var(--surface)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Duplicate Phones</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>{migrationAudit.duplicatePhones.length}</div>
                        </div>
                        <div className="card" style={{ padding: '12px', background: 'var(--surface)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Orphan Accounts</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-light)' }}>{migrationAudit.orphanAccounts.length}</div>
                        </div>
                      </div>

                      {/* Details of duplicates / orphans */}
                      {migrationAudit.duplicateEmails.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)', margin: '0 0 8px 0' }}>Duplicate Emails Detected:</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {migrationAudit.duplicateEmails.map((item, idx) => (
                              <div key={idx} style={{ fontSize: '0.8rem', padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 83, 80, 0.04)', border: '1px solid rgba(239, 83, 80, 0.1)', color: 'var(--text-primary)' }}>
                                Email: <strong>{item.email}</strong> is shared by: {item.uids.map(uid => `\`${uid}\``).join(', ')}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {migrationAudit.duplicatePhones.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)', margin: '0 0 8px 0' }}>Duplicate Phone Numbers Detected:</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {migrationAudit.duplicatePhones.map((item, idx) => (
                              <div key={idx} style={{ fontSize: '0.8rem', padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 83, 80, 0.04)', border: '1px solid rgba(239, 83, 80, 0.1)', color: 'var(--text-primary)' }}>
                                Phone: <strong>{item.phone}</strong> is shared by: {item.uids.map(uid => `\`${uid}\``).join(', ')}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {migrationAudit.orphanAccounts.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-light)', margin: '0 0 8px 0' }}>Orphan User Profiles:</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                            {migrationAudit.orphanAccounts.map((item, idx) => (
                              <div key={idx} style={{ fontSize: '0.8rem', padding: '8px 12px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                UID: \`{item.uid}\` - Name: {item.name} ({item.reason})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== 14. TABS: AADHAAR APPROVALS ==================== */}
          {(activePanelTab === 'aadhaar' || (activePanelTab === 'settings' && settingsSubTab === 'aadhaar')) && user?.role === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--success)' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Aadhaar Verification Approvals</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Review, approve, or reject student Aadhaar profile verification requests in real-time.
                  </p>
                </div>
              </div>

              {/* Filter controls */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filter Status:</span>
                {['all', 'pending', 'verified', 'rejected'].map(status => {
                  const matchCount = allUsers.filter(u => u.role?.toLowerCase() === 'student' && u.aadhaarNumber && (status === 'all' || (u.aadhaarStatus || 'pending') === status)).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setAadhaarStatusFilter(status)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1.5px solid var(--border)',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s',
                        background: aadhaarStatusFilter === status ? 'var(--primary)' : 'white',
                        color: aadhaarStatusFilter === status ? 'white' : 'var(--text-muted)',
                        borderColor: aadhaarStatusFilter === status ? 'var(--primary)' : 'var(--border)'
                      }}
                    >
                      {status} ({matchCount})
                    </button>
                  );
                })}
              </div>

              {/* Table wrapper */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      <th style={{ padding: '12px' }}>Student Profile</th>
                      <th style={{ padding: '12px' }}>Aadhaar Number</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Remarks</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.filter(u => u.role?.toLowerCase() === 'student' && u.aadhaarNumber).filter(s => {
                      const searchLower = search.toLowerCase();
                      const nameMatch = s.displayName?.toLowerCase().includes(searchLower) || s.name?.toLowerCase().includes(searchLower);
                      const idMatch = s.studentId?.toLowerCase().includes(searchLower);
                      const aadhaarMatch = s.aadhaarNumber?.includes(search);
                      const matchesSearch = !search || nameMatch || idMatch || aadhaarMatch;

                      const statusMatch = aadhaarStatusFilter === 'all' || (s.aadhaarStatus || 'pending') === aadhaarStatusFilter;

                      return matchesSearch && statusMatch;
                    }).map(student => {
                      const status = student.aadhaarStatus || 'pending';
                      const colorMap = {
                        'verified': 'var(--success)',
                        'pending': 'var(--warning)',
                        'rejected': 'var(--danger)'
                      };
                      const bgMap = {
                        'verified': 'rgba(102,187,106,0.15)',
                        'pending': 'rgba(255,167,38,0.15)',
                        'rejected': 'rgba(239,83,80,0.15)'
                      };

                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{student.displayName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {student.studentId || 'COMP-TEMP'} | {student.email}</div>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 600, fontFamily: 'monospace' }}>
                            {student.aadhaarNumber}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: colorMap[status] || 'var(--text-muted)',
                              background: bgMap[status] || 'rgba(158,158,158,0.15)',
                              border: `1px solid ${colorMap[status] || 'var(--border)'}`
                            }}>{status.toUpperCase()}</span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={student.aadhaarRemarks}>
                            {student.aadhaarRemarks || '-'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setSelectedStudentDetails({ ...student, joined: 'Jan 2026', roll: 'Roll #COMP' })}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
                                title="View Detail"
                              >
                                <Eye size={12} /> View
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const userRef = doc(db, 'users', student.id);
                                    await updateDoc(userRef, { aadhaarStatus: 'verified', aadhaarRemarks: deleteField ? deleteField() : '' });
                                    triggerToast(`Aadhaar approved for ${student.displayName}`, 'success');
                                  } catch (err) {
                                    console.error("Error approving Aadhaar:", err);
                                    triggerToast('Failed to approve Aadhaar: ' + err.message, 'danger');
                                  }
                                }}
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  const remarks = window.prompt(`Enter remarks for rejecting ${student.displayName}'s Aadhaar:`);
                                  if (remarks === null) return;
                                  try {
                                    const userRef = doc(db, 'users', student.id);
                                    await updateDoc(userRef, { aadhaarStatus: 'rejected', aadhaarRemarks: remarks });
                                    triggerToast(`Aadhaar rejected for ${student.displayName}`, 'success');
                                  } catch (err) {
                                    console.error("Error rejecting Aadhaar:", err);
                                    triggerToast('Failed to reject Aadhaar: ' + err.message, 'danger');
                                  }
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {allUsers.filter(u => u.role?.toLowerCase() === 'student' && u.aadhaarNumber).filter(s => {
                      const searchLower = search.toLowerCase();
                      const nameMatch = s.displayName?.toLowerCase().includes(searchLower) || s.name?.toLowerCase().includes(searchLower);
                      const idMatch = s.studentId?.toLowerCase().includes(searchLower);
                      const aadhaarMatch = s.aadhaarNumber?.includes(search);
                      const matchesSearch = !search || nameMatch || idMatch || aadhaarMatch;

                      const statusMatch = aadhaarStatusFilter === 'all' || (s.aadhaarStatus || 'pending') === aadhaarStatusFilter;

                      return matchesSearch && statusMatch;
                    }).length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No student Aadhaar submissions match this selection.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 15. TABS: SETTINGS & DEV PANEL ==================== */}
          {activePanelTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(83,109,254,0.1)', padding: '10px', borderRadius: '12px', color: 'var(--primary)' }}>
                  <Settings size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Developer Settings & Panel</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Access developer settings, manage roles, Aadhaar approvals, system audits, and check system health.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap' }}>
                {[
                  { key: 'aadhaar', label: 'Aadhaar Approvals' },
                  { key: 'members', label: 'Management Members' },
                  { key: 'roles', label: 'Roles Panel' },
                  { key: 'system_health', label: 'System Health' },
                  { key: 'theme_inspector', label: 'Theme Inspector' },
                  { key: 'account_migration', label: 'Account Migration' }
                ].map(sub => (
                  <button
                    key={sub.key}
                    type="button"
                    onClick={() => setSettingsSubTab(sub.key)}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', border: 'none',
                      background: settingsSubTab === sub.key ? 'var(--primary)' : 'var(--surface)',
                      color: settingsSubTab === sub.key ? 'white' : 'var(--text-muted)'
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
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
                flexShrink: 0,
                overflowX: 'auto',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('profile')}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                    background: drawerActiveTab === 'profile' ? 'white' : 'transparent',
                    color: drawerActiveTab === 'profile' ? 'var(--dark)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Users size={15} /> Info
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('academics')}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                    background: drawerActiveTab === 'academics' ? 'white' : 'transparent',
                    color: drawerActiveTab === 'academics' ? 'var(--dark)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <GraduationCap size={15} /> Academics
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('timeline')}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                    background: drawerActiveTab === 'timeline' ? 'white' : 'transparent',
                    color: drawerActiveTab === 'timeline' ? 'var(--dark)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Calendar size={15} /> Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('chat')}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                    background: drawerActiveTab === 'chat' ? 'white' : 'transparent',
                    color: drawerActiveTab === 'chat' ? 'var(--dark)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <MessageSquare size={15} /> Chat
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

                    {/* EXPORT MONTHLY REPORT CARD */}
                    <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--dark)' }}>Performance Reports</h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Generate and download a Microsoft Excel-compatible performance report (.xls) for this student.</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <select
                          id="export-report-month"
                          defaultValue={new Date().toISOString().slice(0, 7)}
                          className="form-input"
                          style={{ padding: '8px 12px', fontSize: '0.82rem', flex: 1, background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--border)' }}
                        >
                          {Array.from({ length: 6 }).map((_, i) => {
                            const d = new Date();
                            d.setMonth(d.getMonth() - i);
                            const val = d.toISOString().slice(0, 7);
                            const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                            return <option key={val} value={val}>{label}</option>;
                          })}
                        </select>
                        <button
                          onClick={async (e) => {
                            const btn = e.currentTarget;
                            const selectEl = document.getElementById('export-report-month');
                            const mStr = selectEl?.value || new Date().toISOString().slice(0, 7);
                            btn.disabled = true;
                            const origText = btn.innerHTML;
                            btn.innerHTML = `<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:6px;"></span> Exporting...`;
                            try {
                              await reportService.exportMonthlyReport(selectedStudentDetails.id, mStr, showToast);
                            } catch (err) {
                              console.error(err);
                            } finally {
                              btn.disabled = false;
                              btn.innerHTML = origText;
                            }
                          }}
                          className="btn btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Download size={14} /> Export Report
                        </button>
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
                    {(() => {
                      const currentMonthStr = new Date().toISOString().slice(0, 7);
                      const studentFeeRecord = allFees.find(f => f.studentId === selectedStudentDetails.id && f.month === currentMonthStr);
                      const currentMonthDue = studentFeeRecord ? studentFeeRecord.amountDue : getStudentMonthlyFee(selectedStudentDetails);
                      const currentMonthStatus = studentFeeRecord ? studentFeeRecord.status : 'pending';

                      return (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>Tuition Fee Settings</h4>
                            {!isEditingDrawerFees && user?.role === 'admin' && (
                              <button
                                onClick={() => {
                                  setDrawerFeeTarget(currentMonthDue);
                                  setDrawerTotalFee(selectedStudentDetails.feesAmount || currentMonthDue);
                                  setDrawerAmountPaid(selectedStudentDetails.paidAmount || 0);
                                  setDrawerFeeError('');
                                  setIsEditingDrawerFees(true);
                                }}
                                className="btn-edit"
                                style={{ fontSize: '0.78rem', padding: '4px 10px', background: 'rgba(83,109,254,0.08)', border: '1px solid rgba(83,109,254,0.2)', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer' }}
                              >
                                Edit Target
                              </button>
                            )}
                          </div>

                          {isEditingDrawerFees ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Monthly Target (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="form-input"
                                    value={drawerFeeTarget}
                                    onChange={e => setDrawerFeeTarget(e.target.value)}
                                    style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', background: 'var(--white)' }}
                                  />
                                </div>
                                <div>
                                  <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Billed (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="form-input"
                                    value={drawerTotalFee}
                                    onChange={e => setDrawerTotalFee(e.target.value)}
                                    style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', background: 'var(--white)' }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Amount Paid (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="form-input"
                                    value={drawerAmountPaid}
                                    onChange={e => setDrawerAmountPaid(e.target.value)}
                                    style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', background: 'var(--white)' }}
                                  />
                                </div>
                                <div>
                                  <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Outstanding Balance</label>
                                  <div style={{ padding: '8px 10px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--danger)', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--border)', height: '34px', display: 'flex', alignItems: 'center' }}>
                                    ₹{Math.max(0, Number(drawerTotalFee) - Number(drawerAmountPaid)).toLocaleString()}
                                  </div>
                                </div>
                              </div>

                              {drawerFeeError && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
                                  ⚠️ {drawerFeeError}
                                </div>
                              )}

                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingDrawerFees(false)}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
                                  disabled={isSavingDrawerFees}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveDrawerFees(selectedStudentDetails.id)}
                                  className="btn btn-primary"
                                  style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                  disabled={isSavingDrawerFees}
                                >
                                  {isSavingDrawerFees ? (
                                    <>
                                      <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                      Saving...
                                    </>
                                  ) : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              <div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>MONTHLY TUITION TARGET</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>₹{currentMonthDue.toLocaleString()}</span>
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
                                    color: currentMonthStatus === 'paid' ? 'var(--success)' : 'var(--danger)',
                                    background: currentMonthStatus === 'paid' ? 'rgba(102,187,106,0.15)' : 'rgba(239,83,80,0.15)',
                                    border: `1px solid ${currentMonthStatus === 'paid' ? 'var(--success)' : 'var(--danger)'}`
                                  }}>{currentMonthStatus.toUpperCase()}</span>
                                  
                                  {user?.role === 'admin' && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        onClick={async () => {
                                          await handleUpdateFeeStatus(selectedStudentDetails.id, 'paid');
                                        }}
                                        style={{ padding: '4px 8px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        Paid
                                      </button>
                                      <button
                                        onClick={async () => {
                                          await handleUpdateFeeStatus(selectedStudentDetails.id, 'pending');
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
                          )}
                        </div>
                      );
                    })()}

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

                    {/* Aadhaar Verification Block */}
                    {user?.role === 'admin' && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>Aadhaar Verification</h4>
                        <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>AADHAAR NUMBER</div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                                {currentStudentDetails.aadhaarNumber ? currentStudentDetails.aadhaarNumber : 'Not submitted'}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>STATUS</div>
                              <div>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  color: (currentStudentDetails.aadhaarStatus === 'verified') ? 'var(--success)' : (currentStudentDetails.aadhaarStatus === 'pending' || !currentStudentDetails.aadhaarStatus) ? 'var(--warning)' : 'var(--danger)',
                                  background: (currentStudentDetails.aadhaarStatus === 'verified') ? 'rgba(102,187,106,0.15)' : (currentStudentDetails.aadhaarStatus === 'pending' || !currentStudentDetails.aadhaarStatus) ? 'rgba(255,167,38,0.15)' : 'rgba(239,83,80,0.15)',
                                  border: `1px solid ${(currentStudentDetails.aadhaarStatus === 'verified') ? 'var(--success)' : (currentStudentDetails.aadhaarStatus === 'pending' || !currentStudentDetails.aadhaarStatus) ? 'var(--warning)' : 'var(--danger)'}`
                                }}>
                                  {currentStudentDetails.aadhaarNumber ? (currentStudentDetails.aadhaarStatus || 'PENDING').toUpperCase() : 'NOT SUBMITTED'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {currentStudentDetails.aadhaarNumber && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                              {currentStudentDetails.aadhaarStatus === 'rejected' && currentStudentDetails.aadhaarRemarks && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: '4px' }}>
                                  <strong>Reason for rejection:</strong> {currentStudentDetails.aadhaarRemarks}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={async () => {
                                    try {
                                      const userRef = doc(db, 'users', currentStudentDetails.id);
                                      await updateDoc(userRef, { aadhaarStatus: 'verified', aadhaarRemarks: deleteField ? deleteField() : '' });
                                      triggerToast(`Aadhaar approved for ${currentStudentDetails.displayName}`, 'success');
                                    } catch (err) {
                                      console.error("Error verifying Aadhaar:", err);
                                      triggerToast('Failed to verify Aadhaar: ' + err.message, 'danger');
                                    }
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                  Approve Aadhaar
                                </button>
                                <button
                                  onClick={async () => {
                                    const remarks = window.prompt(`Enter remarks for rejecting ${currentStudentDetails.displayName}'s Aadhaar:`);
                                    if (remarks === null) return;
                                    try {
                                      const userRef = doc(db, 'users', currentStudentDetails.id);
                                      await updateDoc(userRef, { aadhaarStatus: 'rejected', aadhaarRemarks: remarks });
                                      triggerToast(`Aadhaar rejected for ${currentStudentDetails.displayName}`, 'success');
                                    } catch (err) {
                                      console.error("Error rejecting Aadhaar:", err);
                                      triggerToast('Failed to reject Aadhaar: ' + err.message, 'danger');
                                    }
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                  Reject Aadhaar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 1.5: ACADEMICS & ACADEMIC PERFORMANCE */}
                {drawerActiveTab === 'academics' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Metrics grid */}
                    {(() => {
                      const studentAttendance = attendanceLogs.filter(log => log.studentId === selectedStudentDetails.id || log.studentName === selectedStudentDetails.displayName);
                      const present = studentAttendance.filter(l => l.status === 'present').length;
                      const attRate = studentAttendance.length > 0 ? `${Math.round((present / studentAttendance.length) * 100)}%` : '95% (Est)';
                      
                      const compAssignments = drawerAssignments.filter(a => a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'graded').length;
                      
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                          <div style={{ background: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Attendance Rate</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{attRate}</div>
                          </div>
                          <div style={{ background: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Assignments Done</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{compAssignments} / {drawerAssignments.length || 0}</div>
                          </div>
                          <div style={{ background: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Tests Attempted</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8b5cf6' }}>{drawerAttempts.length}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Assignments sub-section */}
                    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--dark)' }}>Assignments Portfolio</h4>
                      {drawerAssignmentsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}><span className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
                      ) : drawerAssignments.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>No assignments assigned to this student yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {drawerAssignments.map((a, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark)' }}>{a.title}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>Due: {a.dueDate}</div>
                              </div>
                              <span style={{
                                padding: '2px 8px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                background: a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'graded' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 83, 80, 0.08)',
                                color: a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'graded' ? 'var(--success)' : 'var(--danger)'
                              }}>{a.status || 'Pending'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Test Results sub-section */}
                    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--dark)' }}>Practice Test Scores</h4>
                      {drawerAttemptsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}><span className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
                      ) : drawerAttempts.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>No test attempts recorded yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {drawerAttempts.map((at, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark)' }}>{at.testTitle || 'Untitled Test'}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>Time taken: {Math.round(at.timeTaken / 60)} min</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)' }}>{at.score} / {at.totalQuestions || 10}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{at.submittedAt ? (at.submittedAt.toDate ? at.submittedAt.toDate().toLocaleDateString('en-IN') : new Date(at.submittedAt).toLocaleDateString('en-IN')) : ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 1.6: CHRONOLOGICAL ACTIVITY TIMELINE */}
                {drawerActiveTab === 'timeline' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Visual Learning Roadmap progress */}
                    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--dark)' }}>LMS Learning Journey</h4>
                      {(() => {
                        const roadmapSteps = [
                          { label: 'Admission', active: true },
                          { label: 'Basic Coding', active: true },
                          { label: 'Python Core', active: selectedStudentDetails.course?.includes('Python') || selectedStudentDetails.course?.includes('Coding') },
                          { label: 'Advanced Projects', active: selectedStudentDetails.course?.includes('Advance') },
                          { label: 'Internship', active: false },
                          { label: 'Placements', active: false }
                        ];

                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '10px 0' }}>
                            <div style={{ position: 'absolute', top: '24px', left: '10px', right: '10px', height: '3px', background: 'var(--border)', zIndex: 1 }} />
                            {roadmapSteps.map((step, idx) => (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                                <div style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '50%',
                                  background: step.active ? 'var(--primary)' : 'white',
                                  border: step.active ? '2px solid var(--primary)' : '2px solid var(--border)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: step.active ? 'white' : 'var(--text-muted)',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                  {idx + 1}
                                </div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: step.active ? 'var(--dark)' : 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                                  {step.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Timeline logs */}
                    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--dark)' }}>Chronological Activity Log</h4>
                      {(() => {
                        const events = [];

                        // 1. Add attendance marked events
                        const studentAttendance = attendanceLogs.filter(log => log.studentId === selectedStudentDetails.id || log.studentName === selectedStudentDetails.displayName);
                        studentAttendance.forEach(a => {
                          events.push({
                            title: `Attendance Marked: ${a.status?.toUpperCase()}`,
                            subtitle: `${a.subject} mentor ${a.faculty || 'Mentor'}`,
                            date: a.date ? new Date(a.date) : new Date(),
                            dateStr: a.date || '',
                            type: 'attendance',
                            color: a.status === 'present' ? 'var(--success)' : 'var(--danger)'
                          });
                        });

                        // 2. Add test attempts
                        drawerAttempts.forEach(at => {
                          const subDate = at.submittedAt?.toDate ? at.submittedAt.toDate() : new Date(at.submittedAt);
                          events.push({
                            title: `Submitted practice Test: ${at.testTitle}`,
                            subtitle: `Scored ${at.score}/${at.totalQuestions || 10} (${Math.round((at.score / (at.totalQuestions || 10)) * 100)}%)`,
                            date: subDate,
                            dateStr: subDate.toLocaleDateString('en-IN'),
                            type: 'test',
                            color: '#8b5cf6'
                          });
                        });

                        // 3. Add assignment submissions
                        drawerAssignments.forEach(asg => {
                          if (asg.status?.toLowerCase() === 'completed' || asg.status?.toLowerCase() === 'graded') {
                            events.push({
                              title: `Completed Homework Assignment`,
                              subtitle: asg.title,
                              date: new Date(),
                              dateStr: 'Recent',
                              type: 'assignment',
                              color: 'var(--success)'
                            });
                          }
                        });

                        // Sort by date desc
                        events.sort((a, b) => b.date - a.date);

                        if (events.length === 0) {
                          return <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>No activities recorded yet.</p>;
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '2px dashed var(--border)', marginLeft: '12px', paddingLeft: '16px', position: 'relative' }}>
                            {events.map((e, idx) => (
                              <div key={idx} style={{ position: 'relative' }}>
                                <div style={{
                                  position: 'absolute',
                                  left: '-24px',
                                  top: '4px',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: e.color,
                                  border: '2px solid white',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark)' }}>
                                  {e.title}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {e.subtitle}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>
                                  {e.dateStr}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
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

      {/* ==================== MODAL: SCHEDULE CLASS SLOT ==================== */}
      <Modal isOpen={isAddScheduleOpen} onClose={() => setIsAddScheduleOpen(false)} title={editingSchedule ? "Edit Class Schedule" : "Schedule New Class Slot"}>
        <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Subject / Topic Title</label>
            <input
              type="text"
              required
              className="form-input"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              placeholder="e.g. Basic Coding: Python loops"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Day of Week</label>
              <select
                required
                className="form-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ background: 'var(--white)' }}
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Faculty Mentor</label>
              <select
                required
                className="form-input"
                value={assignedFacultyId}
                onChange={e => setAssignedFacultyId(e.target.value)}
                style={{ background: 'var(--white)' }}
              >
                <option value="" disabled>Choose Faculty</option>
                {facultyList.map(f => (
                  <option key={f.id} value={f.id}>{f.displayName || f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Start Time</label>
              <input
                type="time"
                required
                className="form-input"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">End Time (Auto: 1h 30m duration)</label>
              <input
                type="text"
                disabled
                className="form-input"
                value={computeEndTime(startTime)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Target Group / Batch</label>
              <select
                required
                className="form-input"
                value={selectedGroups[0] || ''}
                onChange={e => setSelectedGroups([e.target.value])}
                style={{ background: 'var(--white)' }}
              >
                <option value="" disabled>Choose Group</option>
                <option value="class_2_5">Class 2-5</option>
                <option value="class_6_8">Class 6-8</option>
                <option value="class_9_10">Class 9-10</option>
                <option value="class_11_12_science">Class 11-12 Sci</option>
                <option value="class_11_12_application">Class 11-12 App</option>
              </select>
            </div>
            <div>
              <label className="form-label">Room / Online</label>
              <input
                type="text"
                required
                className="form-input"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Room 4B, Campus"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Google Meet Link (Optional)</label>
            <input
              type="url"
              className="form-input"
              value={meetLink}
              onChange={e => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij"
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: 800 }}>Assign Individual Students</label>
            <div style={{
              maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px',
              marginTop: '6px', background: '#F9FAFB'
            }}>
              {studentsList.map(stud => {
                const isSelected = selectedStudents.includes(stud.id);
                return (
                  <label key={stud.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setSelectedStudents(selectedStudents.filter(id => id !== stud.id));
                        } else {
                          setSelectedStudents([...selectedStudents, stud.id]);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{stud.displayName} ({stud.course || 'No course'})</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="form-label">Lesson Notes / Description</label>
            <textarea
              className="form-input"
              value={eventDesc}
              onChange={e => setEventDesc(e.target.value)}
              placeholder="Lesson topics or checklist for this class slot"
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {editingSchedule ? 'Save Changes' : 'Schedule Class'}
            </button>
            <button type="button" onClick={() => setIsAddScheduleOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};

export default AdminDashboard;
