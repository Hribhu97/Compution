import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, doc, getDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { addDoc } from '../firebase';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const FeesPayment = ({ isOpen, onClose, pendingAmount, studentId }) => {
  const { user } = useAuth();
  const { triggerToast } = useToast();
  
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotUrl, setScreenshotUrl] = useState(''); // simplified mock URL for now
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feeStructure, setFeeStructure] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchFees = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'feeStructure'));
          if (docSnap.exists()) {
            setFeeStructure(docSnap.data());
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchFees();
    }
  }, [isOpen]);

  // Use feeStructure settings
  const upiId = feeStructure?.upiId || 'institutelogo@upi';
  const upiName = feeStructure?.upiName || 'Compution Institute';
  const amountStr = pendingAmount || 0;

  // Generate UPI URI
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amountStr}&cu=INR`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!utrNumber) {
      triggerToast('Please provide a UTR or Reference ID', 'danger');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'paymentSubmissions'), {
        studentId: studentId || user.uid,
        studentName: user?.displayName || user?.name || 'Student',
        email: user?.email || '',
        phone: user?.phone || user?.phoneNumber || '',
        course: user?.course || 'Not specified',
        amount: Number(amountStr),
        transactionId: utrNumber.trim(),
        paymentDate: Timestamp.fromDate(new Date(paymentDate)),
        screenshotUrl: screenshotUrl || 'receipt_uploaded.png',
        status: 'pending_verification',
        createdAt: serverTimestamp()
      });
      triggerToast('Payment submitted for verification!', 'success');
      onClose();
      setUtrNumber('');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to submit payment. Try again.', 'danger');
    }
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1040 }}
            onClick={onClose}
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ 
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', maxWidth: '100vw',
              background: 'var(--surface)', zIndex: 1050, boxShadow: '-5px 0 25px rgba(0,0,0,0.1)',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Pay Fees</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pending Amount: ₹{amountStr}</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              
              <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)', marginBottom: '24px' }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Scan QR with any UPI App</p>
                <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #eee' }}>
                  <QRCodeSVG value={upiUri} size={180} />
                </div>
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{upiName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{upiId}</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>UTR / Reference Number *</label>
                  <input 
                    type="text" required value={utrNumber} onChange={e => setUtrNumber(e.target.value)}
                    placeholder="e.g. 123456789012"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', background: 'var(--white)', color: 'var(--text-primary)' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Payment Date</label>
                  <input 
                    type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', background: 'var(--white)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ background: 'rgba(91, 108, 255, 0.05)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--primary)', textAlign: 'center', cursor: 'pointer' }}>
                  <Upload size={20} color="var(--primary)" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>Upload Screenshot (Optional)</div>
                </div>

                <button 
                  type="submit" disabled={isSubmitting}
                  style={{ 
                    marginTop: '8px', padding: '12px', borderRadius: '8px', background: 'var(--primary)', 
                    color: 'white', fontWeight: 700, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                  }}
                >
                  {isSubmitting ? <Clock size={18} /> : <CheckCircle size={18} />}
                  {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </form>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FeesPayment;
