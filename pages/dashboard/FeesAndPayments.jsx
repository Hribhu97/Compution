import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../firebase';
import { addDoc, updateDoc, runTransaction } from '../../firebase';
import { 
  collection, collectionGroup, doc, onSnapshot, query, where, 
  serverTimestamp, getDoc, getDocs, Timestamp, deleteDoc
} from 'firebase/firestore';
import { 
  CreditCard, CheckCircle, XCircle, AlertTriangle, 
  Clock, ArrowUpRight, Share2, Phone, FileText, 
  Search, RefreshCw, Send, Users, ShieldAlert,
  Download, Wallet, Calendar, AlertCircle, Eye, Check, X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { FeesSkeleton } from '../../components/SkeletonLoader';

import { calculateFeeMetrics, getStudentMonthlyFee } from '../../utils/feeCalculator';


const isCurrentMonth = (dateVal) => {
  if (!dateVal) return false;
  let date;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    date = dateVal.toDate();
  } else {
    date = new Date(dateVal);
  }
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const isPreviousMonth = (dateVal) => {
  if (!dateVal) return false;
  let date;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    date = dateVal.toDate();
  } else {
    date = new Date(dateVal);
  }
  const now = new Date();
  let prevYear = now.getFullYear();
  let prevMonth = now.getMonth() - 1;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }
  return date.getFullYear() === prevYear && date.getMonth() === prevMonth;
};

const formatDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  let date;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    date = dateVal.toDate();
  } else {
    date = new Date(dateVal);
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function FeesAndPayments() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userRoleLower = user?.role?.toLowerCase();
  const isAdmin = userRoleLower === 'admin' || userRoleLower === 'faculty' || userRoleLower === 'member';

  // --- Real-time Listeners State ---
  const [allPayments, setAllPayments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [paymentSubmissions, setPaymentSubmissions] = useState([]);
  const [studentMonthlyFeeDoc, setStudentMonthlyFeeDoc] = useState(null);
  const [allFees, setAllFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [loadingTime, setLoadingTime] = useState(0);

  // --- Admin UI States ---
  const [adminSearch, setAdminSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending'
  const [monthFilter, setMonthFilter] = useState('all'); // 'all' | 'current' | 'previous'
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // --- Student UI States ---
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotName, setScreenshotName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Loading timeout hook ---
  useEffect(() => {
    let timer;
    if (loading) {
      setLoadingTime(0);
      timer = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    } else {
      setLoadingTime(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  // --- 1. REAL-TIME DATA SYNC ---
  useEffect(() => {
    setLoading(true);
    setErrorState(null);

    // Common Student listener
    let unsubStudentPayments;
    let unsubStudentFeeDoc;
    if (!isAdmin && user?.uid) {
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const feeDocRef = doc(db, 'fees', user.uid, 'monthly', currentMonthStr);

      // Auto-initialize current month fee record for this student on load if not exists
      (async () => {
        try {
          const studentMonthlyFee = getStudentMonthlyFee(user || {});
          const docSnap = await getDoc(feeDocRef);
          if (!docSnap.exists()) {
            await setDoc(feeDocRef, {
              amountDue: studentMonthlyFee,
              amountPaid: 0,
              status: 'pending',
              paymentDate: null,
              transactionId: null,
              paymentMethod: null,
              verifiedBy: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            console.log(`[Student Init] Initialized monthly fee record for ${currentMonthStr}`);
          }
        } catch (e) {
          console.error("Error auto-initializing student monthly fee:", e);
        }
      })();

      unsubStudentFeeDoc = onSnapshot(feeDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setStudentMonthlyFeeDoc(docSnap.data());
        } else {
          setStudentMonthlyFeeDoc(null);
        }
      }, (err) => {
        console.error("Error listening to student monthly fee doc:", err);
      });

      unsubStudentPayments = onSnapshot(
        query(collection(db, 'payments'), where('studentId', '==', user.uid)),
        (snap) => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setAllPayments(list);
          setLoading(false);
        },
        (error) => {
          console.error('[Firebase Error - student payments]', error);
          setErrorState(error);
          setLoading(false);
        }
      );
    }

    // Admin Listeners
    let unsubUsers, unsubPayments, unsubSubmissions, unsubFees;
    if (isAdmin) {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setAllUsers(list);
        },
        (error) => {
          console.error('[Firebase Error - users listener]', error);
          setErrorState(error);
        }
      );

      unsubFees = onSnapshot(
        collectionGroup(db, 'monthly'),
        (snap) => {
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
        },
        (error) => {
          console.error('[Firebase Error - monthly collectionGroup listener]', error);
        }
      );

      unsubPayments = onSnapshot(
        collection(db, 'payments'),
        (snap) => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setAllPayments(list);
        },
        (error) => {
          console.error('[Firebase Error - payments listener]', error);
          setErrorState(error);
        }
      );

      unsubSubmissions = onSnapshot(
        collection(db, 'paymentSubmissions'),
        (snap) => {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setPaymentSubmissions(list);
          setLoading(false);
        },
        (error) => {
          console.error('[Firebase Error - submissions listener]', error);
          setErrorState(error);
          setLoading(false);
        }
      );
    }

    return () => {
      if (unsubStudentPayments) unsubStudentPayments();
      if (unsubStudentFeeDoc) unsubStudentFeeDoc();
      if (unsubUsers) unsubUsers();
      if (unsubFees) unsubFees();
      if (unsubPayments) unsubPayments();
      if (unsubSubmissions) unsubSubmissions();
    };
  }, [isAdmin, user?.uid, retryTrigger]);

  // --- 2. AUTOMATIC MONTHLY RESET SYNC LOGIC (Admin Only) ---
  useEffect(() => {
    if (!isAdmin || loading || allUsers.length === 0) return;

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const students = allUsers.filter(u => u.role === 'student');

    students.forEach(async (student) => {
      const monthlyFeeAmount = getStudentMonthlyFee(student);
      const feeDocRef = doc(db, 'fees', student.id, 'monthly', currentMonthStr);
      
      try {
        const docSnap = await getDoc(feeDocRef);
        if (!docSnap.exists()) {
          await setDoc(feeDocRef, {
            amountDue: monthlyFeeAmount,
            amountPaid: 0,
            status: 'pending',
            paymentDate: null,
            transactionId: null,
            paymentMethod: null,
            verifiedBy: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log(`[Monthly Reset FeesAndPayments] Created ${currentMonthStr} fee record for student ${student.id}`);
        }
      } catch (err) {
        console.error("Monthly Reset check failed for student", student.id, err);
      }
    });
  }, [allUsers, isAdmin, loading]);

  const handleRetry = () => {
    setRetryTrigger(prev => prev + 1);
    setLoadingTime(0);
    setErrorState(null);
  };

  // --- ERROR STATE UI ---
  if (errorState) {
    return (
      <div style={{ padding: '60px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <XCircle size={64} color="var(--danger)" style={{ margin: '0 auto 20px' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Unable to load payment records.</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>Please check your network connection or try again.</p>
        <button onClick={handleRetry} className="btn btn-primary" style={{ margin: '0 auto', padding: '12px 28px', borderRadius: '10px' }}>
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    );
  }

  // --- LOADING STATE UI (with 10s timeout retry button) ---
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        <FeesSkeleton />
        {loadingTime >= 10 && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--surface-elevated)', border: '1.5px solid var(--border)', padding: '28px', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', textAlign: 'center', zIndex: 100 }}>
            <AlertTriangle size={36} color="var(--warning)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '14px' }}>Loading is taking longer than usual.</div>
            <button onClick={handleRetry} className="btn btn-primary" style={{ margin: '0 auto', fontSize: '0.85rem' }}>
              Retry Now
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- STATS CALCULATIONS ---
  const activeStudents = allUsers.filter(u => 
    u.role?.toLowerCase() === 'student' &&
    u.status !== 'inactive' &&
    u.status !== 'deleted' &&
    u.archived !== true &&
    u.deleted !== true
  );
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthFeesList = allFees.filter(f => f.month === currentMonthStr);

  const metrics = calculateFeeMetrics(activeStudents, allFees);
  const totalMonthlyBilled = metrics.totalMonthlyFees;
  const totalCollectedThisMonth = metrics.collectedAmount;
  const totalPendingDues = metrics.pendingTuition;
  const studentsPaidCount = metrics.studentsPaid;
  const studentsPendingCount = metrics.studentsPending;
  const collectionPercentage = totalMonthlyBilled > 0 ? Math.round((totalCollectedThisMonth / totalMonthlyBilled) * 100) : 100;

  // --- ADMIN ACTIONS ---
  const handleApproveSubmission = async (sub) => {
    if (!sub.studentId || !sub.amount || Number(sub.amount) <= 0) {
      showToast('Validation Error: Invalid student ID or amount', 'danger');
      return;
    }

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const txId = sub.transactionId || '';

    if (!txId) {
      showToast('Validation Error: Transaction UTR ID is missing', 'danger');
      return;
    }

    try {
      // 1. Check for duplicate transaction UTR
      const dupQuery = query(collection(db, 'payments'), where('transactionId', '==', txId));
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        showToast('Validation Error: Duplicate Transaction UTR ID detected!', 'danger');
        return;
      }

      // 2. Perform runTransaction
      const feeDocRef = doc(db, 'fees', sub.studentId, 'monthly', currentMonthStr);
      const studentRef = doc(db, 'users', sub.studentId);
      const submissionRef = doc(db, 'paymentSubmissions', sub.id);

      await runTransaction(db, async (transaction) => {
        const feeDocSnap = await transaction.get(feeDocRef);
        const amountPaidNum = Number(sub.amount);
        
        let oldStatus = 'pending';
        let amountDue = getStudentMonthlyFee(sub);

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
          paymentMethod: sub.paymentMethod || 'UPI',
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
          studentId: sub.studentId,
          studentName: sub.studentName,
          email: sub.email || '',
          phone: sub.phone || '',
          amount: amountPaidNum,
          transactionId: txId,
          paymentDate: serverTimestamp(),
          status: 'paid',
          createdAt: serverTimestamp(),
          course: sub.course || 'Not specified'
        });

        // Create auditLogs record
        const newAuditRef = doc(collection(db, 'auditLogs'));
        transaction.set(newAuditRef, {
          action: 'payment_verify',
          studentId: sub.studentId,
          studentName: sub.studentName,
          oldStatus,
          newStatus,
          amount: amountPaidNum,
          admin: user.displayName || 'Admin',
          timestamp: serverTimestamp()
        });
      });

      showToast(`Payment of ₹${sub.amount} verified for ${sub.studentName}!`, 'success');
    } catch (err) {
      console.error('[Verify Approval Failed]', err);
      showToast(err.message || 'Failed to approve transaction.', 'danger');
    }
  };

  const handleRejectSubmission = async (sub) => {
    setRejectingRequest(sub);
    setRejectionReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      showToast('Please specify a rejection reason.', 'warning');
      return;
    }
    try {
      const submissionRef = doc(db, 'paymentSubmissions', rejectingRequest.id);
      await runTransaction(db, async (transaction) => {
        transaction.update(submissionRef, {
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
          rejectedAt: serverTimestamp()
        });

        const newAuditRef = doc(collection(db, 'auditLogs'));
        transaction.set(newAuditRef, {
          action: 'payment_reject',
          studentId: rejectingRequest.studentId || 'unknown',
          studentName: rejectingRequest.studentName || 'Unknown Student',
          oldStatus: 'pending',
          newStatus: 'rejected',
          amount: Number(rejectingRequest.amount || 0),
          admin: user.displayName || 'Admin',
          timestamp: serverTimestamp()
        });
      });
      showToast('Payment verification request rejected.', 'danger');
      setRejectingRequest(null);
      setRejectionReason('');
    } catch (err) {
      console.error('[Verify Rejection Failed]', err);
      showToast('Failed to reject transaction.', 'danger');
    }
  };

  // WhatsApp reminder message
  const handleSendReminder = (student) => {
    const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
    const feeAmount = getStudentMonthlyFee(student);
    const text = encodeURIComponent(
      `Dear ${student.displayName || student.name},\n\n` +
      `Your outstanding tuition fees of *₹${feeAmount}* for the month of *${currentMonthName}* is currently pending.\n\n` +
      `Please complete the payment at your earliest convenience to maintain access.\n` +
      `Direct UPI link: https://upi.pe/9674035542@ibl?pn=Biswajit+Maity\n\n` +
      `Warm regards,\n` +
      `Compution Academy`
    );
    const phone = String(student.phone || student.phoneNumber || '').replace(/\D/g, '');
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  // --- LEDGER / TABLE ITEMS BUILDER ---
  const getLedgerItems = () => {
    const items = [];
    
    // Add approved payments
    allPayments.forEach(p => {
      items.push({
        id: p.id,
        isVirtual: false,
        studentId: p.studentId,
        studentName: p.studentName,
        email: p.email || '',
        phone: p.phone || '',
        amount: p.amount,
        transactionId: p.transactionId,
        paymentDate: p.paymentDate,
        status: 'paid',
        course: p.course || ''
      });
    });

    // Add pending virtual entries for current month
    activeStudents.forEach(student => {
      const feeRecord = currentMonthFeesList.find(f => f.studentId === student.id);
      const isPaid = feeRecord && feeRecord.status === 'paid';

      if (!isPaid) {
        const amountDue = feeRecord ? feeRecord.amountDue : getStudentMonthlyFee(student);
        const amountPaid = feeRecord ? feeRecord.amountPaid : 0;

        items.push({
          id: `virtual-${student.id}`,
          isVirtual: true,
          studentId: student.id,
          studentName: student.displayName || student.name || 'Student',
          email: student.email || '',
          phone: student.phone || student.phoneNumber || '',
          amount: amountDue - amountPaid,
          transactionId: '—',
          paymentDate: null,
          status: 'pending',
          course: student.course || ''
        });
      }
    });

    return items;
  };

  // --- FILTERED AND SEARCHED LEDGER ---
  const getFilteredLedger = () => {
    let list = getLedgerItems();

    // Search filter
    if (adminSearch.trim()) {
      const queryStr = adminSearch.toLowerCase().trim();
      list = list.filter(item => 
        item.studentName.toLowerCase().includes(queryStr) ||
        (item.studentId && item.studentId.toLowerCase().includes(queryStr)) ||
        item.email.toLowerCase().includes(queryStr) ||
        (item.transactionId && item.transactionId.toLowerCase().includes(queryStr))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(item => item.status === statusFilter);
    }

    // Month filter
    if (monthFilter !== 'all') {
      list = list.filter(item => {
        if (item.isVirtual) {
          // Virtual items represent current month pending dues
          return monthFilter === 'current';
        }
        if (monthFilter === 'current') {
          return isCurrentMonth(item.paymentDate);
        } else if (monthFilter === 'previous') {
          return isPreviousMonth(item.paymentDate);
        }
        return true;
      });
    }

    // Sort: actual payments descending, pending virtual items grouped at end
    return list.sort((a, b) => {
      if (a.isVirtual && !b.isVirtual) return 1;
      if (!a.isVirtual && b.isVirtual) return -1;
      if (a.isVirtual && b.isVirtual) return a.studentName.localeCompare(b.studentName);
      
      const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(a.paymentDate || 0);
      const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(b.paymentDate || 0);
      return dateB - dateA;
    });
  };

  const filteredLedger = getFilteredLedger();

  // --- STUDENT STATUS CALCULATIONS ---
  // Student status derived dynamically from canonical Monthly Fee record
  const studentHasPaidCurrentMonth = studentMonthlyFeeDoc 
    ? studentMonthlyFeeDoc.status === 'paid'
    : false;
  const studentStatus = studentHasPaidCurrentMonth ? 'Paid' : 'Pending';
  const studentMonthlyFee = studentMonthlyFeeDoc
    ? studentMonthlyFeeDoc.amountDue
    : getStudentMonthlyFee(user || {});
  const studentAmountDue = studentMonthlyFeeDoc
    ? (studentMonthlyFeeDoc.amountDue - studentMonthlyFeeDoc.amountPaid)
    : studentMonthlyFee;

  // Get date of last payment
  const studentPayments = allPayments
    .filter(p => p.studentId === user?.uid && p.status === 'paid')
    .sort((a, b) => {
      const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(a.paymentDate || 0);
      const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(b.paymentDate || 0);
      return dateB - dateA;
    });
  
  const studentLastPaymentDate = studentPayments.length > 0 ? studentPayments[0].paymentDate : null;

  // Check if student has a submission currently pending verification
  const studentPendingSubmission = paymentSubmissions.find(sub => 
    sub.studentId === user?.uid && sub.status === 'pending_verification'
  );

  // --- STUDENT ACTION: SUBMIT RECEIPT PROOF ---
  const handleStudentPaySubmit = async (e) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      showToast('Please enter a valid Transaction ID.', 'warning');
      return;
    }
    if (!payAmount || Number(payAmount) <= 0) {
      showToast('Please enter a valid Amount.', 'warning');
      return;
    }
    if (!screenshotName) {
      showToast('Please attach a screenshot of the payment.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Check for duplicate Transaction ID in processed payments
      const paymentsRef = collection(db, 'payments');
      const dupQuery = query(paymentsRef, where('transactionId', '==', utrNumber.trim()));
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        showToast('This Transaction ID has already been verified and processed.', 'danger');
        setIsSubmitting(false);
        return;
      }

      // 2. Check for duplicate Transaction ID in pending submissions
      const submissionsRef = collection(db, 'paymentSubmissions');
      const subQuery = query(submissionsRef, where('transactionId', '==', utrNumber.trim()), where('status', '==', 'pending_verification'));
      const subSnap = await getDocs(subQuery);
      if (!subSnap.empty) {
        showToast('This Transaction ID is already pending verification.', 'warning');
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'paymentSubmissions'), {
        studentId: user.uid,
        studentName: user.displayName || user.name || 'Student',
        email: user.email || '',
        phone: user.phone || user.phoneNumber || '',
        course: user.course || 'Not specified',
        amount: Number(payAmount),
        transactionId: utrNumber.trim(),
        paymentDate: Timestamp.fromDate(new Date(paymentDate)),
        screenshotUrl: 'receipt_uploaded.png', // stored as standard mock filename
        status: 'pending_verification',
        createdAt: serverTimestamp()
      });

      showToast('Payment submitted successfully! Pending verification.', 'success');
      setIsPayModalOpen(false);
      setUtrNumber('');
      setPayAmount('');
      setScreenshotName('');
    } catch (err) {
      console.error('[Submit Proof Failed]', err);
      showToast('Failed to submit proof. Please try again.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // RENDER: ADMIN DASHBOARD
  // ========================================================
  if (isAdmin) {
    const pendingVerifications = paymentSubmissions.filter(s => s.status === 'pending_verification');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: 'var(--text-primary)' }}>
        
        {/* Title */}
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-heading)' }}>Fees & Payments</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Track billing collections, verify receipts, and manage student fee statuses.</p>
        </div>

        {/* 1. Statistics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {[
            { label: 'Total Collected This Month', value: `₹${totalCollectedThisMonth.toLocaleString('en-IN')}`, sub: `${collectionPercentage}% of total billed`, color: 'var(--success)' },
            { label: 'Total Pending', value: `₹${totalPendingDues.toLocaleString('en-IN')}`, sub: 'Outstanding dues', color: 'var(--danger)' },
            { label: 'Students Paid', value: studentsPaidCount, sub: 'Zero monthly balance', color: 'var(--success)' },
            { label: 'Students Pending', value: studentsPendingCount, sub: 'Requires monthly verification', color: 'var(--warning)' }
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{stat.label}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* 2. Total monthly billing master overview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }} className="grid-2-col-mobile">
          <div style={{ padding: '24px', background: 'rgba(91, 108, 255, 0.04)', border: '1.5px solid rgba(91, 108, 255, 0.12)', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Monthly Fees</span>
            <strong style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>₹{totalMonthlyBilled.toLocaleString('en-IN')}</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Sum of class-standard tuition fee targets for active students.</span>
          </div>
          <div style={{ padding: '24px', background: 'rgba(239, 83, 80, 0.04)', border: '1.5px solid rgba(239, 83, 80, 0.12)', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pending Fees Card</span>
            <strong style={{ fontSize: '2rem', color: 'var(--danger)' }}>₹{totalPendingDues.toLocaleString('en-IN')}</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Outstanding dues for students with pending statuses.</span>
          </div>
        </div>

        {/* 3. Verification Queue */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Verification Queue <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', background: 'var(--primary)', color: 'white' }}>{pendingVerifications.length}</span>
          </h3>
          
          {pendingVerifications.length === 0 ? (
            <div style={{ padding: '32px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)' }}>
              No pending payment submissions.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {pendingVerifications.map(sub => (
                <div key={sub.id} style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>{sub.studentName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Course: <strong>{sub.course}</strong> | Amount: <strong style={{ color: 'var(--success)' }}>₹{sub.amount}</strong> | UTR: <strong>{sub.transactionId}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '4px' }}>Submitted: {formatDate(sub.createdAt)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleApproveSubmission(sub)}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button 
                      onClick={() => handleRejectSubmission(sub)}
                      className="btn btn-ghost"
                      style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Payment History Table & Search / Filters */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Ledger Details</h3>
            
            {/* Roster Controls */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              
              {/* Instant Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search by Name, ID, Email, Transaction UTR..."
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '38px', height: '40px', fontSize: '0.85rem' }}
                />
              </div>

              {/* Status Filter */}
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="form-input"
                style={{ width: '130px', height: '40px', fontSize: '0.85rem', padding: '0 8px' }}
              >
                <option value="all">Status: All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>

              {/* Month Filter */}
              <select 
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className="form-input"
                style={{ width: '160px', height: '40px', fontSize: '0.85rem', padding: '0 8px' }}
              >
                <option value="all">Month: All</option>
                <option value="current">Current Month</option>
                <option value="previous">Previous Month</option>
              </select>

            </div>
          </div>

          {/* Payment History Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
            {filteredLedger.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
                <CreditCard size={48} />
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>No payment records found.</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Payments will appear here after verification.</p>
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 700 }}>
                    <th style={{ padding: '16px' }}>Student Name</th>
                    <th style={{ padding: '16px' }}>Student ID</th>
                    <th style={{ padding: '16px' }}>Date</th>
                    <th style={{ padding: '16px' }}>Amount</th>
                    <th style={{ padding: '16px' }}>Transaction ID</th>
                    <th style={{ padding: '16px' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map(row => {
                    const isPending = row.status === 'pending';
                    const targetStudent = allUsers.find(u => u.uid === row.studentId);
                    return (
                      <tr 
                        key={row.id} 
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setSelectedPayment(row)}
                      >
                        <td style={{ padding: '16px', fontWeight: 600 }}>{row.studentName}</td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{targetStudent?.studentId || 'N/A'}</td>
                        <td style={{ padding: '16px' }}>{isPending ? '—' : formatDate(row.paymentDate)}</td>
                        <td style={{ padding: '16px', fontWeight: 700 }}>₹{row.amount}</td>
                        <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{row.transactionId}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800,
                            color: isPending ? 'var(--danger)' : 'var(--success)',
                            background: isPending ? 'rgba(224, 86, 86, 0.12)' : 'rgba(67, 164, 108, 0.12)'
                          }}>
                            {isPending ? 'Pending' : 'Paid'}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            {isPending && targetStudent && (
                              <button 
                                onClick={() => handleSendReminder(targetStudent)}
                                className="btn btn-ghost"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)', background: 'none' }}
                              >
                                <Phone size={12} /> Send Reminder
                              </button>
                            )}
                            <button 
                              onClick={() => setSelectedPayment(row)}
                              className="btn btn-ghost"
                              style={{ padding: '6px', borderRadius: '6px', minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'none' }}
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 5. Payment Details Modal */}
        <AnimatePresence>
          {selectedPayment && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', width: '100%', maxWidth: '500px', padding: '28px', boxShadow: 'var(--shadow-xl)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Ledger Entry Details</h4>
                  <button onClick={() => setSelectedPayment(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
                  {[
                    { label: 'Student Name', value: selectedPayment.studentName },
                    { label: 'Student ID', value: allUsers.find(u => u.uid === selectedPayment.studentId)?.studentId || 'N/A' },
                    { label: 'Course', value: selectedPayment.course || 'Not specified' },
                    { label: 'Phone Number', value: selectedPayment.phone || 'N/A' },
                    { label: 'Email', value: selectedPayment.email || 'N/A' },
                    { label: 'Amount Paid', value: `₹${selectedPayment.amount}`, isBold: true },
                    { label: 'Transaction ID', value: selectedPayment.transactionId },
                    { label: 'Payment Date', value: selectedPayment.paymentDate ? formatDate(selectedPayment.paymentDate) : '—' },
                    { label: 'Status', value: selectedPayment.status === 'paid' ? 'Paid' : 'Pending', isBadge: true }
                  ].map((field, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{field.label}</span>
                      {field.isBadge ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800,
                          color: selectedPayment.status === 'pending' ? 'var(--danger)' : 'var(--success)',
                          background: selectedPayment.status === 'pending' ? 'rgba(224, 86, 86, 0.12)' : 'rgba(67, 164, 108, 0.12)'
                        }}>{field.value}</span>
                      ) : (
                        <span style={{ fontWeight: field.isBold ? 700 : 500 }}>{field.value}</span>
                      )}
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setSelectedPayment(null)} 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '24px', borderRadius: '12px' }}
                >
                  Close Detail
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 6. Rejection Reason Modal */}
        <AnimatePresence>
          {rejectingRequest && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: 'var(--shadow-xl)' }}
              >
                <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 800 }}>Reject Payment Request</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>Provide a reason for rejecting the receipt submission of <strong>{rejectingRequest.studentName}</strong>.</p>
                
                <textarea 
                  placeholder="e.g. UTR matches an already verified payment / Screenshot does not match details..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', height: '100px', resize: 'none', fontSize: '0.85rem', padding: '10px', borderRadius: '10px', marginBottom: '20px' }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={handleRejectSubmit}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', justifyContent: 'center', background: 'var(--danger)' }}
                  >
                    Confirm Reject
                  </button>
                  <button 
                    onClick={() => setRejectingRequest(null)}
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // ========================================================
  // RENDER: STUDENT INTERFACE
  // ========================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: 'var(--text-primary)' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-heading)' }}>Fees & Payments</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>View your tuition invoice, make payments, and access ledger history.</p>
      </div>

      {/* Verification Queue Warning Banner for Student */}
      {studentPendingSubmission && (
        <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.08)', border: '1.5px solid rgba(245, 158, 11, 0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={20} color="#F59E0B" />
          <div style={{ fontSize: '0.85rem' }}>
            Your receipt submission of <strong style={{ color: '#F59E0B' }}>₹{studentPendingSubmission.amount}</strong> (UTR: {studentPendingSubmission.transactionId}) is currently <strong>pending verification</strong>.
          </div>
        </div>
      )}

      {/* Grid: Ledger Cards & Portal Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '28px' }} className="grid-2-col-mobile">
        
        {/* Left Column: Totals & Ledger List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Monthly Tuition Fee</span>
              <strong style={{ fontSize: '1.35rem' }}>₹{studentMonthlyFee}</strong>
            </div>
            <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Current Status</span>
              <strong style={{ fontSize: '1.35rem', color: studentStatus === 'Paid' ? 'var(--success)' : 'var(--danger)' }}>{studentStatus}</strong>
            </div>
          </div>

          <div style={{ padding: '18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Invoice Generation</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                Tuple billing generates on the 1st of every month automatically.
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Last Paid Date</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
                {studentLastPaymentDate ? formatDate(studentLastPaymentDate) : 'No records'}
              </span>
            </div>
          </div>

          {/* Student Payment Ledger */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '12px' }}>Ledger Entries History</h3>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflowX: 'auto' }}>
              {studentPayments.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No payment records found.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 700 }}>
                      <th style={{ padding: '14px 16px' }}>Date</th>
                      <th style={{ padding: '14px 16px' }}>Amount</th>
                      <th style={{ padding: '14px 16px' }}>Transaction ID</th>
                      <th style={{ padding: '14px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentPayments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 16px' }}>{formatDate(p.paymentDate)}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 700 }}>₹{p.amount}</td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{p.transactionId}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', background: 'rgba(67, 164, 108, 0.12)' }}>
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Checkout UPI Portal */}
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Invoice Settle Portal</h3>
            
            {studentAmountDue <= 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <CheckCircle size={54} color="var(--success)" style={{ margin: '0 auto 16px' }} />
                <strong style={{ fontSize: '1.05rem', display: 'block', color: 'var(--text-primary)' }}>Account Fully Settled</strong>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>You have zero outstanding balance for the current billing cycle.</p>
              </div>
            ) : (
              <>
                {/* Dynamically Generated QR */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#111', fontWeight: 700, marginBottom: '12px' }}>Scan with any UPI App</span>
                  <div style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #f2f2f2' }}>
                    <QRCodeSVG value={`upi://pay?pa=9674035542@ibl&pn=Biswajit+Maity&am=${studentAmountDue}&cu=INR`} size={160} />
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '12px', color: '#1A1D24' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Biswajit Maity</div>
                    <div style={{ fontSize: '0.75rem', color: '#5E6472' }}>9674035542@ibl</div>
                  </div>
                </div>

                {/* Direct UPI Button */}
                <a 
                  href={`https://upi.pe/9674035542@ibl?pn=Biswajit+Maity&am=${studentAmountDue}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', justifyContent: 'center', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Wallet size={16} /> Pay Fees (₹{studentAmountDue})
                </a>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

                <button 
                  onClick={() => {
                    setPayAmount(String(studentAmountDue));
                    setPaymentDate(new Date().toISOString().split('T')[0]);
                    setScreenshotName('');
                    setIsPayModalOpen(true);
                  }}
                  className="btn btn-ghost"
                  style={{ width: '100%', padding: '12px', justifyContent: 'center', border: '1px solid var(--border)' }}
                >
                  I Have Paid
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Student Submit Proof Modal */}
      <AnimatePresence>
        {isPayModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: 'var(--shadow-xl)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Submit Payment Verification</h4>
                <button onClick={() => setIsPayModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>

              <form onSubmit={handleStudentPaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Transaction ID / Reference ID *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter the 12-digit UPI UTR ID" 
                    value={utrNumber}
                    onChange={e => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                    className="form-input"
                    style={{ height: '42px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Amount Paid *</label>
                  <input 
                    type="number" 
                    required 
                    placeholder="Enter exact amount paid" 
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="form-input"
                    style={{ height: '42px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Payment Date</label>
                  <input 
                    type="date" 
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="form-input"
                    style={{ height: '42px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Attach Payment Screen *</label>
                  <div 
                    style={{ border: '1.5px dashed var(--primary-light)', padding: '16px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setScreenshotName('receipt_captured.png')}
                  >
                    <FileText size={16} style={{ display: 'block', margin: '0 auto 6px' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                      {screenshotName ? screenshotName : 'Click to select payment screenshot'}
                    </span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || !screenshotName || !utrNumber}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '10px' }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Proof'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
