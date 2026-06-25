import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db, syncStudentFeeAggregates } from '../../firebase';
import { 
  collection, doc, onSnapshot, addDoc, updateDoc, 
  query, where, serverTimestamp, getDoc, getDocs 
} from 'firebase/firestore';
import { 
  CreditCard, CheckCircle, XCircle, AlertTriangle, 
  Clock, ArrowUpRight, Share2, Phone, FileText, 
  Search, RefreshCw, Send, Users, ShieldAlert,
  Download, Wallet, Calendar, AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function FeesAndPayments() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userRoleLower = user?.role?.toLowerCase();
  const isAdmin = userRoleLower === 'admin' || userRoleLower === 'faculty' || userRoleLower === 'member';

  // --- Student States ---
  const [feeDoc, setFeeDoc] = useState(null);
  const [studentLoading, setStudentLoading] = useState(!isAdmin);
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotName, setScreenshotName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentFlowState, setPaymentFlowState] = useState('checkout'); // 'checkout' | 'success' | 'failure'
  const [failureReason, setFailureReason] = useState('');

  // --- Admin States ---
  const [allFees, setAllFees] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [adminLoading, setAdminLoading] = useState(isAdmin);
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // --- 1. STUDENT REAL-TIME LISTENER ---
  useEffect(() => {
    if (isAdmin || !user?.uid) return;

    setStudentLoading(true);
    // Background sync dynamically on load to ensure up-to-date monthly cycle
    syncStudentFeeAggregates(user.uid);

    const unsub = onSnapshot(doc(db, 'fees', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setFeeDoc(docSnap.data());
      } else {
        // Fallback initialization if missing document
        setFeeDoc({
          monthlyFee: user.monthlyFee || 500,
          totalFeeDue: user.feesAmount || 0,
          totalPaid: user.paidAmount || 0,
          remainingBalance: user.pendingAmount || 0,
          status: user.feeStatus || 'Pending',
          paymentHistory: [],
          dueDate: '10',
          lastPaymentDate: null
        });
      }
      setStudentLoading(false);
    }, (err) => {
      console.error("Student fees listener error:", err);
      setStudentLoading(false);
    });

    return () => unsub();
  }, [user?.uid, isAdmin]);

  // --- 2. ADMIN REAL-TIME LISTENERS ---
  useEffect(() => {
    if (!isAdmin) return;

    setAdminLoading(true);

    const unsubFees = onSnapshot(collection(db, 'fees'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setAllFees(list);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setAllUsers(list);
    });

    const unsubRequests = onSnapshot(collection(db, 'paymentRequests'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
      setPaymentRequests(list);
      setAdminLoading(false);
    });

    return () => {
      unsubFees();
      unsubUsers();
      unsubRequests();
    };
  }, [isAdmin]);

  // --- STUDENT ACTION: SUBMIT PAYMENT PROOF ---
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      showToast('Please enter a valid Transaction UTR reference number.', 'danger');
      return;
    }

    setIsSubmitting(true);
    try {
      // Offline network simulation check
      if (!navigator.onLine) {
        throw new Error('Network Offline: Please check your internet connection.');
      }

      await addDoc(collection(db, 'paymentRequests'), {
        studentId: user.uid,
        studentName: user.displayName || user.name || 'Student',
        course: user.course || 'Not specified',
        amount: feeDoc.remainingBalance,
        utrNumber: utrNumber.trim(),
        paymentDate,
        screenshotUrl: 'mock_uploaded_receipt.png', // simplified mockup
        status: 'Pending Verification',
        submittedAt: new Date().toISOString()
      });

      // Show success screen
      setPaymentFlowState('success');
      setUtrNumber('');
      setScreenshotName('');
    } catch (err) {
      console.error("Payment submission failed:", err);
      setFailureReason(err.message || 'Verification failed. Timeout occurred.');
      setPaymentFlowState('failure');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ADMIN ACTION: APPROVE PAYMENT REQUEST ---
  const handleApprovePayment = async (req) => {
    try {
      // Check duplicate transaction ID on database
      const dupQuery = query(collection(db, 'paymentHistory'), where('transactionId', '==', req.utrNumber));
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        showToast('Duplicate transaction UTR detected. Already approved.', 'warning');
        return;
      }

      // 1. Create Payment History record in collection
      await addDoc(collection(db, 'paymentHistory'), {
        studentId: req.studentId,
        studentName: req.studentName,
        amount: Number(req.amount),
        date: req.paymentDate || new Date().toISOString(),
        mode: 'UPI',
        transactionId: req.utrNumber,
        remarks: 'Approved via Verification Queue',
        feeName: 'Tuition',
        status: 'Approved',
        timestamp: new Date().toISOString()
      });

      // 2. Update payment request status
      await updateDoc(doc(db, 'paymentRequests', req.id), {
        status: 'Approved',
        verifiedAt: new Date().toISOString()
      });

      // 3. Recalculate billing aggregates
      await syncStudentFeeAggregates(req.studentId);

      showToast(`Payment of ₹${req.amount} approved for ${req.studentName}!`, 'success');
    } catch (err) {
      console.error("Approval error:", err);
      showToast('Failed to approve transaction.', 'danger');
    }
  };

  // --- ADMIN ACTION: REJECT PAYMENT REQUEST ---
  const handleRejectPayment = async (reqId) => {
    try {
      await updateDoc(doc(db, 'paymentRequests', reqId), {
        status: 'Rejected',
        rejectedAt: new Date().toISOString()
      });
      showToast('Payment verification request rejected.', 'danger');
    } catch (err) {
      console.error("Rejection error:", err);
      showToast('Failed to reject transaction.', 'danger');
    }
  };

  // --- WHATSAPP SHARING UTILITY ---
  const handleShareWhatsAppProof = (tx) => {
    const studentName = user.displayName || user.name || 'Student';
    const studentId = user.studentId || 'N/A';
    const course = user.course || 'Not specified';
    const amountPaid = tx ? tx.amount : feeDoc.remainingBalance;
    const transDate = tx ? tx.date : paymentDate;
    const transId = tx ? tx.transactionId : 'Pending Verification';

    const text = encodeURIComponent(
      `*COMPUTION PAYMENT RECEIPT*\n` +
      `--------------------------------\n` +
      `Student Name: ${studentName}\n` +
      `Student ID: ${studentId}\n` +
      `Course: ${course}\n` +
      `Amount Paid: ₹${amountPaid}\n` +
      `Transaction Date: ${transDate}\n` +
      `Transaction ID: ${transId}\n` +
      `--------------------------------\n` +
      `Please verify and confirm my receipt.`
    );
    window.open(`https://wa.me/9196740035542?text=${text}`, '_blank');
  };

  // --- ADMIN MANUAL REMINDER UTILITY ---
  const handleSendWhatsAppReminder = (student) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = months[new Date().getMonth()];
    const text = encodeURIComponent(
      `Hi ${student.displayName},\n\n` +
      `This is a friendly reminder that your outstanding tuition fee of *₹${student.pendingAmount}* for the month of *${currentMonth}* is overdue.\n\n` +
      `Please clear the balance at the earliest to prevent any platform restriction.\n\n` +
      `Payment Link: https://compution.vercel.app/dashboard/fees\n` +
      `UPI ID QR: 9674035542@ibl\n\n` +
      `Thank you,\n` +
      `Compution Academy`
    );
    const cleanPhone = (student.phone || '').replace(/\D/g, '');
    const num = cleanPhone ? cleanPhone : '9196740035542';
    window.open(`https://wa.me/${num.startsWith('91') ? num : '91' + num}?text=${text}`, '_blank');
  };

  // --- STATS CALCULATIONS FOR ADMIN ---
  const activeStudentList = allUsers.filter(u => u.role === 'student');
  const totalStudents = activeStudentList.length;

  const monthlyCollection = allFees.reduce((acc, f) => acc + (Number(f.totalPaid) || 0), 0);
  const pendingCollection = allFees.reduce((acc, f) => acc + (Number(f.remainingBalance) || 0), 0);
  const totalBilled = monthlyCollection + pendingCollection;
  const collectionPercentage = totalBilled > 0 ? Math.round((monthlyCollection / totalBilled) * 100) : 0;

  const paidStudents = allFees.filter(f => f.status === 'Paid').length;
  const pendingStudents = allFees.filter(f => f.status === 'Pending').length;

  // Filter students for admin search
  const filteredStudents = activeStudentList.filter(s => 
    s.displayName?.toLowerCase().includes(adminSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(adminSearch.toLowerCase()) ||
    s.course?.toLowerCase().includes(adminSearch.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(adminSearch.toLowerCase())
  );

  // Helper date status check
  const isOverdue = new Date().getDate() > 10;

  if (studentLoading || adminLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(94,107,255,0.2)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ==========================================
  // RENDER 1: ADMIN FEES & RECEIPTS DASHBOARD
  // ==========================================
  if (isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: 'var(--text-primary)' }}>
        
        {/* Header Title */}
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Fees & Payments Management</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Track billing collections, verify receipts, and send WhatsApp payment notifications.</p>
        </div>

        {/* Real-time Collections Dashboard Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {[
            { label: 'Total Students', value: totalStudents, sub: 'Enrolled Students', color: 'var(--primary)' },
            { label: 'Total Collection', value: `₹${monthlyCollection.toLocaleString('en-IN')}`, sub: 'Approved Received', color: 'var(--success)' },
            { label: 'Pending Collection', value: `₹${pendingCollection.toLocaleString('en-IN')}`, sub: 'Outstanding Dues', color: 'var(--danger)' },
            { label: 'Collection Rate', value: `${collectionPercentage}%`, sub: 'Received of Billed', color: '#8B5CF6' },
            { label: 'Paid Students', value: paidStudents, sub: 'Zero Balance', color: 'var(--success)' },
            { label: 'Pending Students', value: pendingStudents, sub: 'Due Balance', color: 'var(--warning)' }
          ].map((card, idx) => (
            <div key={idx} style={{ padding: '20px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{card.label}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '4px' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Pending Verifications Section */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>Receipt Verification Queue ({paymentRequests.filter(r => r.status === 'Pending Verification').length})</h3>
          {paymentRequests.filter(r => r.status === 'Pending Verification').length === 0 ? (
            <div style={{ padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)' }}>
              All payment submissions verified. No pending receipts in queue.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {paymentRequests.filter(r => r.status === 'Pending Verification').map(req => (
                <div key={req.id} style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>{req.studentName}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Course: <strong>{req.course}</strong> | Amount: <strong style={{ color: 'var(--success)' }}>₹{req.amount}</strong> | UTR: <strong>{req.utrNumber}</strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px' }}>Submitted on: {new Date(req.submittedAt).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => setSelectedReceipt(req)} 
                      className="btn btn-ghost" 
                      style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px' }}
                    >
                      View Receipt Screenshot
                    </button>
                    <button 
                      onClick={() => handleApprovePayment(req)} 
                      className="btn btn-primary" 
                      style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px' }}
                    >
                      Approve & Sync
                    </button>
                    <button 
                      onClick={() => handleRejectPayment(req.id)} 
                      className="btn" 
                      style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', background: 'rgba(224, 86, 86, 0.1)', color: 'var(--danger)', border: '1px solid rgba(224, 86, 86, 0.2)' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Billing & Reminders Roster */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Student Dues & Billing Overview</h3>
            <div style={{ position: 'relative', maxWidth: '300px', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search student, email, course..." 
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                className="form-input" 
                style={{ paddingLeft: '38px', height: '40px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 700 }}>
                  <th style={{ padding: '16px' }}>Student Profile</th>
                  <th style={{ padding: '16px' }}>Course / Program</th>
                  <th style={{ padding: '16px' }}>Total Billed</th>
                  <th style={{ padding: '16px' }}>Total Paid</th>
                  <th style={{ padding: '16px' }}>Remaining Balance</th>
                  <th style={{ padding: '16px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => {
                  const studentFee = allFees.find(f => f.studentId === student.id) || {
                    totalFeeDue: student.feesAmount || 0,
                    totalPaid: student.paidAmount || 0,
                    remainingBalance: student.pendingAmount || 0,
                    status: student.feeStatus || 'Pending'
                  };

                  const isStudentPending = studentFee.status === 'Pending';
                  const isOverdueStudent = isOverdue && isStudentPending;

                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 800 }}>{student.displayName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{student.studentId} • {student.email}</div>
                      </td>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{student.course}</td>
                      <td style={{ padding: '16px', fontWeight: 600 }}>₹{studentFee.totalFeeDue.toLocaleString()}</td>
                      <td style={{ padding: '16px', fontWeight: 600, color: 'var(--success)' }}>₹{studentFee.totalPaid.toLocaleString()}</td>
                      <td style={{ padding: '16px', fontWeight: 600, color: studentFee.remainingBalance > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>₹{studentFee.remainingBalance.toLocaleString()}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800,
                          color: studentFee.status === 'Paid' ? 'var(--success)' : 'var(--danger)',
                          background: studentFee.status === 'Paid' ? 'rgba(67, 164, 108, 0.12)' : 'rgba(224, 86, 86, 0.12)'
                        }}>
                          {studentFee.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {isStudentPending && (
                            <button
                              onClick={() => handleSendWhatsAppReminder(student)}
                              className="btn btn-ghost"
                              style={{
                                padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px',
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                border: isOverdueStudent ? '1px solid var(--danger)' : '1px solid var(--border)',
                                color: isOverdueStudent ? 'var(--danger)' : 'inherit',
                                background: isOverdueStudent ? 'rgba(224, 86, 86, 0.05)' : 'none'
                              }}
                            >
                              <Phone size={12} />
                              {isOverdueStudent ? 'Send Overdue Alert' : 'Send Reminder'}
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              await syncStudentFeeAggregates(student.id);
                              showToast(`Billing aggregates resynced for ${student.displayName}`, 'success');
                            }}
                            className="btn btn-ghost"
                            style={{ padding: '6px', borderRadius: '6px' }}
                            title="Resync Billing Aggregates"
                          >
                            <RefreshCw size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Screenshot View Modal */}
        <AnimatePresence>
          {selectedReceipt && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', width: '100%', maxWidth: '480px', padding: '28px', position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Receipt Verification</h4>
                  <button onClick={() => setSelectedReceipt(null)} style={{ color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}>&times;</button>
                </div>
                <div style={{ width: '100%', height: '240px', background: 'var(--surface-elevated)', borderRadius: '12px', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  <FileText size={44} color="var(--primary)" style={{ marginBottom: '10px' }} />
                  <strong>receipt_screenshot.png</strong>
                  <span>Transaction ID: {selectedReceipt.utrNumber}</span>
                  <span>Amount: ₹{selectedReceipt.amount}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => {
                      handleApprovePayment(selectedReceipt);
                      setSelectedReceipt(null);
                    }} 
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '12px', borderRadius: '10px', justifyContent: 'center' }}
                  >
                    Approve & Verify
                  </button>
                  <button 
                    onClick={() => {
                      handleRejectPayment(selectedReceipt.id);
                      setSelectedReceipt(null);
                    }} 
                    className="btn btn-ghost" 
                    style={{ flex: 1, padding: '12px', borderRadius: '10px', justifyContent: 'center', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  >
                    Reject Verification
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // ==========================================
  // RENDER 2: STUDENT FEES & PAYMENTS INTERFACE
  // ==========================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: 'var(--text-primary)' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Fees & Payments</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>View tuition ledger records, settle invoices, and request receipts verification.</p>
      </div>

      {feeDoc ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '28px' }} className="grid-2-col-mobile">
          
          {/* Left Column: Ledger Totals & Payment History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Ledger Totals Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {[
                { label: 'Monthly Tuition', value: `₹${feeDoc.monthlyFee}`, color: 'var(--text-primary)' },
                { label: 'Total Fee Billed', value: `₹${feeDoc.totalFeeDue}`, color: 'var(--primary)' },
                { label: 'Total Paid To Date', value: `₹${feeDoc.totalPaid}`, color: 'var(--success)' },
                { label: 'Remaining Balance', value: `₹${feeDoc.remainingBalance}`, color: feeDoc.remainingBalance > 0 ? 'var(--danger)' : 'var(--text-muted)' }
              ].map((card, idx) => (
                <div key={idx} style={{ padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{card.label}</span>
                  <strong style={{ fontSize: '1.35rem', color: card.color }}>{card.value}</strong>
                </div>
              ))}
            </div>

            {/* Current Fee Status and Due Date Info */}
            <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Current Billing Status</span>
                <span style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 800, marginTop: '6px',
                  color: feeDoc.status === 'Paid' ? 'var(--success)' : 'var(--danger)',
                  background: feeDoc.status === 'Paid' ? 'rgba(67, 164, 108, 0.12)' : 'rgba(224, 86, 86, 0.12)'
                }}>
                  {feeDoc.status}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Invoice Due Date</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginTop: '6px' }}>
                  10th of every month
                </span>
              </div>
            </div>

            {/* Payment History Ledger List */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>Approved Receipt Transactions</h3>
              {feeDoc.paymentHistory.length === 0 ? (
                <div style={{ padding: '20px', textTransform: 'none', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No transaction history recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {feeDoc.paymentHistory.map((item, idx) => (
                    <div key={idx} style={{ padding: '12px 16px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{item.feeName} Payment</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Mode: {item.mode} • UTR: {item.transactionId}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--success)' }}>+₹{item.amount}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-light)' }}>{item.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Checkout & Pay Portal */}
          <div>
            <AnimatePresence mode="wait">

              {/* CHECKOUT STATE */}
              {paymentFlowState === 'checkout' && (
                <motion.div 
                  key="checkout"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Pay Tuition Fees</h3>
                  
                  {feeDoc.remainingBalance <= 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'block' }}>Fully Paid</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Your account has zero outstanding dues. Thank you!</span>
                    </div>
                  ) : (
                    <>
                      {/* UPI QR Code */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.78rem', color: '#121212', fontWeight: 600, marginBottom: '12px' }}>Scan with any UPI App</span>
                        <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                          <QRCodeSVG value={`upi://pay?pa=9674035542@ibl&pn=Biswajit+Maity&am=${feeDoc.remainingBalance}&cu=INR`} size={160} />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '12px', color: '#1A1D24' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Biswajit Maity</div>
                          <div style={{ fontSize: '0.75rem', color: '#5E6472' }}>9674035542@ibl</div>
                        </div>
                      </div>

                      {/* Direct UPI Button */}
                      <a 
                        href={`https://upi.pe/9674035542@ibl?pn=Biswajit+Maity&am=${feeDoc.remainingBalance}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '12px', justifyContent: 'center', textDecoration: 'none' }}
                      >
                        <Wallet size={16} /> Open UPI App (₹{feeDoc.remainingBalance})
                      </a>

                      <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

                      {/* Verification proof submit */}
                      <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Transaction UTR / Reference ID *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="12-digit number (e.g. 302514...)" 
                            value={utrNumber}
                            onChange={e => setUtrNumber(e.target.value.replace(/\D/g, ''))}
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
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Attach Payment Screen (Required)</label>
                          <div 
                            style={{ border: '1.5px dashed var(--primary-light)', padding: '16px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', textAlign: 'center', cursor: 'pointer' }}
                            onClick={() => setScreenshotName('receipt_captured.png')}
                          >
                            <FileText size={16} style={{ display: 'block', margin: '0 auto 6px' }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                              {screenshotName ? screenshotName : 'Upload payment screenshot'}
                            </span>
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={isSubmitting || !screenshotName}
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '4px' }}
                        >
                          {isSubmitting ? 'Submitting proof...' : 'Submit Verification'}
                        </button>
                      </form>
                    </>
                  )}
                </motion.div>
              )}

              {/* SUCCESS FLOW */}
              {paymentFlowState === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
                >
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(67, 164, 108, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={36} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Payment Submitted Successfully</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', lineHeight: 1.5 }}>
                      Your payment receipt has been generated. The operations support team will review and approve the ledger entry shortly.
                    </p>
                  </div>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={() => handleShareWhatsAppProof(null)} 
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                    >
                      <Share2 size={16} /> Share on WhatsApp
                    </button>
                    <button 
                      onClick={() => setPaymentFlowState('checkout')} 
                      className="btn btn-ghost"
                      style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                    >
                      Go Back to Ledger
                    </button>
                  </div>
                </motion.div>
              )}

              {/* FAILURE FLOW */}
              {paymentFlowState === 'failure' && (
                <motion.div
                  key="failure"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
                >
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(224, 86, 86, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={36} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Payment Submission Failed</h3>
                    <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '6px', fontWeight: 600 }}>
                      Error: {failureReason}
                    </p>
                  </div>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={() => setPaymentFlowState('checkout')} 
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                    >
                      Retry Payment
                    </button>
                    <button 
                      onClick={() => {
                        showToast('Cash Payment requested. Reach out to front desk.', 'info');
                        setPaymentFlowState('checkout');
                      }}
                      className="btn btn-ghost"
                      style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                    >
                      Continue With Cash Payment
                    </button>
                    <a
                      href="https://wa.me/9196740035542"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                      style={{ width: '100%', padding: '12px', justifyContent: 'center', textDecoration: 'none' }}
                    >
                      Contact Support
                    </a>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
      ) : (
        <div style={{ padding: '40px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No fees record found for this student profile. Please contact academic support.
        </div>
      )}

    </div>
  );
}
