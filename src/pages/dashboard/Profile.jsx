import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { doc } from 'firebase/firestore';
import { updateDoc, setDoc } from '../../firebase';;
import { useToast } from '../../contexts/ToastContext';
import { reportService } from '../../services/reportService';
import {
  User, Mail, Phone, MapPin, Sparkles, CheckCircle, X,
  ShieldCheck, Loader2, Edit3, Compass, CreditCard, Bell, Info, Download,
  UserPlus, Code, AlertCircle
} from 'lucide-react';
import {
  PhoneAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  updateEmail,
  sendEmailVerification
} from 'firebase/auth';
import { collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { auth } from '../../firebase';
import { authService } from '../../services/authService';
import { normalizePhoneNumber, validatePhoneNumber, normalizeIndianNationalNumber } from '../../utils/phoneUtils';

/* ── Spinner ── */
const Spinner = ({ size = 20 }) => (
  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
    <Code size={size} />
  </motion.div>
);

/* ── Friendly error messages ── */
const friendlyError = (code) => {
  const map = {
    'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Try again or reset it.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
};

const friendlyPhoneError = (code, message) => {
  const map = {
    'auth/invalid-phone-number': 'Please enter a valid mobile number.',
    'auth/invalid-verification-code': 'Invalid OTP entered. Try again.',
    'auth/code-expired': 'This OTP has expired. Please request a new OTP.',
    'auth/too-many-requests': 'Too many attempts detected. Please wait before requesting another OTP.',
    'auth/quota-exceeded': 'Too many attempts detected. Please wait before requesting another OTP.',
    'auth/network-request-failed': 'Network connection lost. Please try again.',
    'auth/internal-error': 'Authentication service temporarily unavailable.',
    'auth/operation-not-allowed': 'Authentication service temporarily unavailable.',
    'account-not-found': 'No account found for this mobile number.'
  };
  return map[code] || message || 'Something went wrong. Please try again.';
};

/* ── CIRCULAR PROGRESS COMPONENT ────────────────────────── */
const CircularProgress = ({ percentage, size = 120, stroke = 10 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8EDF5" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--success)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--dark)' }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
};

/* ── TOAST NOTIFICATION ────────────────────────────── */
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
      animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
      exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      style={{
        position: 'fixed',
        top: '32px',
        left: '50%',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)',
        color: 'var(--dark)',
        fontFamily: 'var(--font-support)',
        fontWeight: 600,
        fontSize: '0.95rem',
      }}
    >
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: 'var(--success)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-on-primary)',
      }}>
        <ShieldCheck size={14} />
      </div>
      <span>{message}</span>
    </motion.div>
  );
};

import { ProfileSkeleton } from '../../components/SkeletonLoader';

const Profile = () => {
  const { user, completeUserProfile } = useAuth();
  const { showToast } = useToast();
  
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile completion states
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    district: '',
    state: '',
    pin: '',
    emergencyContact: '',
    school: '',
    class: '',
    course: '',
    guardianName: '',
    guardianPhone: '',
    aadhaarNumber: '',
    semester: ''
  });

  const [linkPhone, setLinkPhone] = useState('');
  const [linkOtp, setLinkOtp] = useState(['', '', '', '', '', '']);
  const [linkOTPSent, setLinkOTPSent] = useState(false);
  const [linkConfirmationResult, setLinkConfirmationResult] = useState(null);
  const [linkTimer, setLinkTimer] = useState(0);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkStatus, setLinkStatus] = useState('');
  const [phoneLinked, setPhoneLinked] = useState(false);

  const [linkEmail, setLinkEmail] = useState('');
  const [linkEmailPassword, setLinkEmailPassword] = useState('');
  const [emailLinked, setEmailLinked] = useState(false);
  const [emailVerifySent, setEmailVerifySent] = useState(false);
  const [emailVerifiedLocal, setEmailVerifiedLocal] = useState(false);
  const [error, setError] = useState('');

  const linkOtpRefs = useRef([]);
  const nameInputRef = useRef(null);

  // Avatar customizer states
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarTab, setAvatarTab] = useState('presets'); // 'presets' | 'customize'
  const [customTab, setCustomTab] = useState('head'); // 'head' | 'body' | 'glasses' | 'item'
  const [selectedHead, setSelectedHead] = useState(0);
  const [selectedBody, setSelectedBody] = useState(0);
  const [selectedGlasses, setSelectedGlasses] = useState(0);
  const [selectedItem, setSelectedItem] = useState(0);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Initialize values from Firebase User document and Auth Linking States
  useEffect(() => {
    if (user) {
      const currentUser = auth.currentUser;
      const providers = currentUser?.providerData.map(p => p.providerId) || [];
      const isEmail = providers.includes('password');
      const isPhone = providers.includes('phone');

      if (isEmail) {
        if (currentUser?.phoneNumber || user.phone || user.phoneNumber) {
          setPhoneLinked(true);
        }
      }
      if (isPhone) {
        if (currentUser?.email || user.email) {
          setEmailLinked(true);
          if (currentUser?.emailVerified || user.emailVerified) {
            setEmailVerifiedLocal(true);
          }
        }
      }

      setForm(f => ({
        ...f,
        name: f.name || user.name || user.displayName || '',
        email: f.email || user.email || '',
        phone: f.phone || user.phone || user.phoneNumber || user.mobileNumber || '',
        dob: f.dob || user.dob || '',
        gender: f.gender || user.gender || '',
        address: f.address || user.address || '',
        district: f.district || user.district || '',
        state: f.state || user.state || '',
        pin: f.pin || user.pin || '',
        emergencyContact: f.emergencyContact || user.emergencyContact || '',
        school: f.school || user.school || '',
        class: f.class || user.class || '',
        course: f.course || user.course || '',
        guardianName: f.guardianName || user.guardianName || '',
        guardianPhone: f.guardianPhone || user.guardianPhone || '',
        aadhaarNumber: f.aadhaarNumber || user.aadhaarNumber || '',
        semester: f.semester || user.semester || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    if (linkTimer > 0) {
      const interval = setInterval(() => {
        setLinkTimer(t => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [linkTimer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLinkOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...linkOtp];
    newOtp[index] = element.value;
    setLinkOtp(newOtp);
    setError('');

    if (element.value !== '' && index < 5) {
      linkOtpRefs.current[index + 1].focus();
    }

    const completedOtp = newOtp.join('');
    if (completedOtp.length === 6) {
      handleVerifyLinkOTP(null, newOtp);
    }
  };

  const handleLinkOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && linkOtp[index] === '' && index > 0) {
      linkOtpRefs.current[index - 1].focus();
    }
  };

  const handleSendLinkOTP = async (e) => {
    if (e) e.preventDefault();
    const nationalNumber = normalizePhoneNumber(linkPhone, countryCode);
    setLinkPhone(nationalNumber);
    
    const validation = validatePhoneNumber(nationalNumber, countryCode);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }
    
    setLinkLoading(true);
    setLinkStatus('Sending OTP...');
    setError('');
    
    const fullPhone = `${countryCode}${nationalNumber}`;
    
    try {
      const isDuplicate = await authService.checkDuplicatePhoneNumber(fullPhone, auth.currentUser?.uid);
      if (isDuplicate) {
        setError('This phone number is already linked with another student account.');
        setLinkLoading(false);
        setLinkStatus('');
        return;
      }
      
      const result = await authService.sendOTP(fullPhone, 'recaptcha-container');
      setLinkConfirmationResult(result);
      setLinkOTPSent(true);
      setLinkTimer(30);
      setLinkStatus('OTP Sent!');
    } catch (err) {
      console.error(err);
      setError(friendlyPhoneError(err.code, err.message));
      setLinkStatus('');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleVerifyLinkOTP = async (e, overrideOtp = null) => {
    if (e) e.preventDefault();
    const otpCode = (overrideOtp || linkOtp).join('');
    if (otpCode.length < 6) { setError('Please enter 6-digit OTP'); return; }
    
    setLinkLoading(true);
    setLinkStatus('Verifying OTP...');
    setError('');
    
    try {
      const credential = PhoneAuthProvider.credential(linkConfirmationResult.verificationId, otpCode);
      await linkWithCredential(auth.currentUser, credential);
      
      setPhoneLinked(true);
      setLinkStatus('Phone Linked Successfully!');
      setLinkOTPSent(false);
      setForm(f => ({ ...f, phone: `${countryCode}${normalizePhoneNumber(linkPhone, countryCode)}` }));
    } catch (err) {
      console.error(err);
      setError(friendlyPhoneError(err.code, err.message));
      setLinkStatus('');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkEmail = async (e) => {
    if (e) e.preventDefault();
    const trimmedEmail = linkEmail.trim().toLowerCase();
    if (!trimmedEmail) { setError('Please enter your email'); return; }
    if (!linkEmailPassword.trim() || linkEmailPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLinkLoading(true);
    setLinkStatus('Linking Email...');
    setError('');
    
    try {
      const usersRef = collection(db, 'users');
      const qEmail = query(usersRef, where('email', '==', trimmedEmail));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        let duplicateUid = '';
        snapEmail.forEach(d => { duplicateUid = d.id; });
        if (duplicateUid !== auth.currentUser?.uid) {
          setError('This email address is already linked with another student account.');
          setLinkLoading(false);
          setLinkStatus('');
          return;
        }
      }
      
      const credential = EmailAuthProvider.credential(trimmedEmail, linkEmailPassword);
      await linkWithCredential(auth.currentUser, credential);
      await sendEmailVerification(auth.currentUser);
      
      setEmailLinked(true);
      setLinkStatus('Email linked! Please verify it in your inbox.');
      setEmailVerifySent(true);
    } catch (err) {
      console.error(err);
      setError(friendlyError(err.code));
      setLinkStatus('');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleConfirmEmailVerification = async (e) => {
    if (e) e.preventDefault();
    setLinkLoading(true);
    setLinkStatus('Checking email verification...');
    setError('');
    
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setEmailVerifiedLocal(true);
        setLinkStatus('Email Verified Successfully!');
        setForm(f => ({ ...f, email: auth.currentUser.email }));
      } else {
        setError('Email is not verified yet. Please check your inbox.');
        setLinkStatus('');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to check verification status.');
      setLinkStatus('');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleSendPhoneSignupEmailVerification = async (e) => {
    if (e) e.preventDefault();
    const trimmedEmail = linkEmail.trim().toLowerCase();
    if (!trimmedEmail) { setError('Please enter your email address'); return; }
    
    setLinkLoading(true);
    setLinkStatus('Saving email and sending verification link...');
    setError('');
    
    try {
      const usersRef = collection(db, 'users');
      const qEmail = query(usersRef, where('email', '==', trimmedEmail));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        let duplicateUid = '';
        snapEmail.forEach(d => { duplicateUid = d.id; });
        if (duplicateUid !== auth.currentUser?.uid) {
          setError('This email address is already registered under another account.');
          setLinkLoading(false);
          setLinkStatus('');
          return;
        }
      }
      
      await updateEmail(auth.currentUser, trimmedEmail);
      await sendEmailVerification(auth.currentUser);
      
      setEmailLinked(true);
      setLinkStatus('Verification email sent! Check your inbox.');
      setEmailVerifySent(true);
      setForm(f => ({ ...f, email: trimmedEmail }));
    } catch (err) {
      console.error('[Phone Signup Email Verification Error]', err);
      setError(err.message || 'Failed to send verification link.');
      setLinkStatus('');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name?.trim()) { setError('Please enter your name'); return; }
    if (!form.email?.trim()) { setError('Please enter your email'); return; }
    
    const currentUser = auth.currentUser;
    if (!currentUser) { setError('Session expired. Please log in again.'); return; }
    
    const providers = currentUser.providerData.map(p => p.providerId);
    const isEmail = providers.includes('password');
    const isPhone = providers.includes('phone');
    
    if (isEmail && !phoneLinked) {
      setError('Please link and verify your mobile number first.');
      return;
    }
    if (isPhone && !emailVerifiedLocal) {
      setError('Please link and verify your email address first.');
      return;
    }

    if (!form.dob) { setError('Please enter your Date of Birth'); return; }
    if (!form.gender) { setError('Please select your gender'); return; }
    if (!form.address?.trim()) { setError('Please enter your Address'); return; }
    if (!form.district?.trim()) { setError('Please enter your District'); return; }
    if (!form.state?.trim()) { setError('Please enter your State'); return; }
    
    if (!/^\d{6}$/.test(form.pin)) {
      setError('PIN code must be exactly 6 digits');
      return;
    }
    
    const normalizedEmergency = normalizeIndianNationalNumber(form.emergencyContact);
    if (normalizedEmergency.length !== 10) {
      setError('Emergency contact must be a valid 10-digit number');
      return;
    }
    
    if (!form.school?.trim()) { setError('Please enter your School'); return; }
    if (!form.class) { setError('Please select your Class'); return; }
    if (!form.course?.trim()) { setError('Please enter your Course'); return; }
    if (!form.guardianName?.trim()) { setError('Please enter your Guardian\'s Name'); return; }
    
    const normalizedGuardian = normalizeIndianNationalNumber(form.guardianPhone);
    if (normalizedGuardian.length !== 10) {
      setError('Guardian phone must be a valid 10-digit number');
      return;
    }
    
    if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber)) {
      setError('Aadhaar number must be exactly 12 digits');
      return;
    }

    setLoading(true);

    try {
      await completeUserProfile({
        name: form.name,
        email: form.email,
        phone: form.phone || (isPhone ? currentUser.phoneNumber : ''),
        dob: form.dob,
        gender: form.gender,
        address: form.address,
        district: form.district,
        state: form.state,
        pin: form.pin,
        emergencyContact: normalizedEmergency,
        school: form.school,
        class: form.class,
        course: form.course,
        guardianName: form.guardianName,
        guardianPhone: normalizedGuardian,
        aadhaarNumber: form.aadhaarNumber,
        phoneVerified: isEmail ? phoneLinked : true,
        emailVerified: isPhone ? emailVerifiedLocal : true
      });
      
      showToast('Profile completed successfully!', 'success');
      setIsCompletingProfile(false);
    } catch (err) {
      console.error("Error during profile completion:", err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <ProfileSkeleton />;
  }

  const handleResetTour = async () => {
    try {
      await setDoc(doc(db, 'userPreferences', user.uid), { tourCompleted: false }, { merge: true });
      triggerToast('Walkthrough reset! Redirecting to Dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1200);
    } catch (err) {
      console.error("Error resetting tour:", err);
      triggerToast('Failed to reset onboarding tour.');
    }
  };

  // Card Editing States
  const [editStates, setEditStates] = useState({
    personal: false,
    academic: false,
    contact: false,
    guardian: false,
    location: false,
    aadhaar: false,
    bio: false,
    bank: false
  });

  // Local Edit Fields Values
  const [formValues, setFormValues] = useState({
    displayName: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    district: '',
    state: '',
    pin: '',
    emergencyContact: '',
    school: '',
    class: '',
    course: '',
    guardianName: '',
    guardianPhone: '',
    aadhaarNumber: '',
    bio: '',
    bankAccount: '',
    notificationsEnabled: false
  });

  // Initialize values from Firebase User document
  useEffect(() => {
    if (user) {
      setFormValues({
        displayName: user.displayName || user.name || '',
        phone: user.phone || user.phoneNumber || user.mobileNumber || '',
        dob: user.dob || '',
        gender: user.gender || '',
        address: user.address || '',
        district: user.district || '',
        state: user.state || '',
        pin: user.pin || '',
        emergencyContact: user.emergencyContact || '',
        school: user.school || '',
        class: user.class || '',
        course: user.course || '',
        guardianName: user.guardianName || '',
        guardianPhone: user.guardianPhone || '',
        aadhaarNumber: user.aadhaarNumber || '',
        bio: user.bio || '',
        bankAccount: user.bankAccount || '',
        notificationsEnabled: user.notificationsEnabled || false
      });
    }
  }, [user]);

  const triggerToast = (msg) => {
    setToast(msg);
  };

  const PRESET_AVATARS = [
    { head: 0, body: 0, glasses: 0, item: 0 },
    { head: 1, body: 2, glasses: 0, item: 0 },
    { head: 5, body: 2, glasses: 0, item: 0 },
    { head: 3, body: 0, glasses: 0, item: 2 },
    { head: 2, body: 1, glasses: 0, item: 2 },
    { head: 1, body: 0, glasses: 3, item: 0 },
    { head: 1, body: 0, glasses: 2, item: 0 },
    { head: 5, body: 0, glasses: 0, item: 0 },
    { head: 3, body: 2, glasses: 0, item: 0 },
    { head: 4, body: 1, glasses: 2, item: 0 },
    { head: 5, body: 0, glasses: 1, item: 0 },
    { head: 2, body: 0, glasses: 0, item: 0 }
  ];

  const renderAvatarSvg = (head, body, glasses, itemVal) => {
    return `<svg viewBox="0 0 150 150" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#F3F4F6" rx="24" />
  ${head === 0 ? '<path d="M 45 75 C 38 65, 45 42, 60 40 C 70 30, 80 30, 90 40 C 105 42, 112 65, 105 75 Z" fill="#18181B" stroke="#000" stroke-width="2.5" />' : ''}
  ${head === 1 || head === 5 ? '<path d="M 46 65 C 46 55, 55 45, 75 42 C 95 45, 104 55, 104 65 Z" fill="#18181B" stroke="#000" stroke-width="2.5" />' : ''}
  ${head === 2 ? '<path d="M 45 80 C 40 70, 42 45, 60 42 C 75 40, 75 40, 90 42 C 108 45, 110 70, 105 80 Z" fill="#18181B" stroke="#000" stroke-width="2.5" /><circle cx="75" cy="33" r="11" fill="#18181B" stroke="#000" stroke-width="2.5" />' : ''}
  ${head === 3 ? '<path d="M 46 70 C 42 60, 42 45, 60 42 C 75 40, 75 40, 90 42 C 108 45, 108 60, 104 70 C 108 85, 110 100, 106 115 L 44 115 C 40 100, 42 85, 46 70 Z" fill="#18181B" stroke="#000" stroke-width="2.5" />' : ''}
  ${head === 4 ? '<path d="M 44 85 C 42 70, 45 44, 75 42 C 105 44, 108 70, 106 85 C 105 92, 102 95, 98 92 C 96 85, 98 75, 98 70 C 92 65, 58 65, 52 70 C 52 75, 54 85, 52 92 C 48 95, 45 92, 44 85 Z" fill="#18181B" stroke="#000" stroke-width="2.5" />' : ''}
  <path d="M 66 92 L 66 110 L 84 110 L 84 92 Z" fill="#FFF" stroke="#000" stroke-width="2.5" />
  <circle cx="75" cy="70" r="28" fill="#FFF" stroke="#000" stroke-width="2.5" />
  ${head === 5 ? '<path d="M 48 70 C 48 88, 52 98, 75 98 C 98 98, 102 88, 102 70 C 100 72, 97 74, 94 74 C 90 82, 60 82, 56 74 C 52 74, 49 72, 48 70 Z" fill="#18181B" stroke="#000" stroke-width="2" />' : ''}
  <circle cx="67" cy="68" r="2.5" fill="#000" />
  <circle cx="83" cy="68" r="2.5" fill="#000" />
  <path d="M 75 69 Q 77 72 75 74" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" />
  <path d="M 70 80 Q 75 83 80 80" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" />
  ${head === 0 ? '<path d="M 47 55 C 50 48, 62 48, 65 54 C 70 48, 80 48, 85 54 C 90 48, 98 52, 101 58 C 103 52, 102 45, 95 43 C 85 38, 65 38, 55 43 C 48 46, 46 52, 47 55 Z" fill="#18181B" stroke="#000" stroke-width="2.5" />' : ''}
  ${head === 1 || head === 5 ? '<path d="M 47 50 L 52 44 L 58 48 L 64 42 L 72 48 L 78 42 L 86 48 L 92 43 L 98 50 L 102 56 L 96 58 C 85 52, 65 52, 47 56 Z" fill="#18181B" stroke="#000" stroke-width="2.5" />' : ''}
  ${head === 2 ? '<path d="M 47 62 C 55 52, 65 52, 70 58 C 75 52, 85 52, 93 62 C 95 55, 93 48, 75 45 C 57 48, 55 55, 47 62 Z" fill="#18181B" stroke="#000" stroke-width="2.5" />' : ''}
  ${head === 3 ? '<path d="M 47 58 C 53 50, 68 50, 72 58 C 76 50, 91 50, 97 58 C 96 48, 85 43, 75 43 C 65 43, 54 48, 47 58 Z" fill="#18181B" stroke="#000" stroke-width="2.5" />' : ''}
  ${body === 0 ? '<path d="M 30 110 C 30 100, 50 95, 75 95 C 100 95, 120 100, 120 110 L 120 135 L 30 135 Z" fill="#18181B" stroke="#000" stroke-width="2.5" /><path d="M 60 95 L 75 108 L 68 116 L 55 100 Z" fill="#FFF" stroke="#000" stroke-width="2" /><path d="M 90 95 L 75 108 L 82 116 L 95 100 Z" fill="#FFF" stroke="#000" stroke-width="2" />' : ''}
  ${body === 1 ? '<path d="M 30 110 C 30 100, 50 95, 75 95 C 100 95, 120 100, 120 110 L 120 135 L 30 135 Z" fill="#27272A" stroke="#000" stroke-width="2.5" /><path d="M 52 95 C 52 112, 98 112, 98 95 Z" fill="#18181B" stroke="#000" stroke-width="2" /><line x1="65" y1="106" x2="65" y2="120" stroke="#FFF" stroke-width="2" stroke-linecap="round" /><circle cx="65" cy="120" r="3" fill="#FFF" /><line x1="85" y1="106" x2="85" y2="120" stroke="#FFF" stroke-width="2" stroke-linecap="round" /><circle cx="85" cy="120" r="3" fill="#FFF" />' : ''}
  ${body === 2 ? '<path d="M 30 110 C 30 100, 50 95, 75 95 C 100 95, 120 100, 120 110 L 120 135 L 30 135 Z" fill="#52525B" stroke="#000" stroke-width="2.5" /><path d="M 60 95 C 60 104, 90 104, 90 95 Z" fill="#FFF" stroke="#000" stroke-width="2" />' : ''}
  ${glasses === 1 ? '<circle cx="65" cy="68" r="9" fill="none" stroke="#000" stroke-width="2.5" /><circle cx="85" cy="68" r="9" fill="none" stroke="#000" stroke-width="2.5" /><path d="M 74 68 A 12 12 0 0 1 76 68" fill="none" stroke="#000" stroke-width="2.5" />' : ''}
  ${glasses === 2 ? '<rect x="56" y="60" width="16" height="14" rx="3" fill="none" stroke="#000" stroke-width="2.5" /><rect x="78" y="60" width="16" height="14" rx="3" fill="none" stroke="#000" stroke-width="2.5" /><line x1="72" y1="67" x2="78" y2="67" stroke="#000" stroke-width="2.5" />' : ''}
  ${glasses === 3 ? '<circle cx="65" cy="68" r="9" fill="#18181B" stroke="#000" stroke-width="2" /><circle cx="85" cy="68" r="9" fill="#18181B" stroke="#000" stroke-width="2" /><line x1="74" y1="68" x2="76" y2="68" stroke="#000" stroke-width="2" />' : ''}
  ${itemVal === 0 ? '<circle cx="54" cy="73" r="4.5" fill="#F43F5E" opacity="0.3" /><circle cx="96" cy="73" r="4.5" fill="#F43F5E" opacity="0.3" />' : ''}
  ${itemVal === 1 ? '<path d="M 45 45 L 45 55 M 40 50 L 50 50" stroke="#000" stroke-width="1.5" stroke-linecap="round" /><path d="M 105 45 L 105 55 M 100 50 L 110 50" stroke="#000" stroke-width="1.5" stroke-linecap="round" />' : ''}
  ${itemVal === 2 ? '<circle cx="45" cy="76" r="3" fill="#fbbf24" stroke="#000" stroke-width="1" /><circle cx="105" cy="76" r="3" fill="#fbbf24" stroke="#000" stroke-width="1" />' : ''}
</svg>`;
  };

  const handleSaveCustomAvatar = async () => {
    setIsSavingAvatar(true);
    try {
      const svgStr = renderAvatarSvg(selectedHead, selectedBody, selectedGlasses, selectedItem);
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { photoURL: dataUri }, { merge: true });
      triggerToast('Custom avatar saved successfully!');
      setIsAvatarModalOpen(false);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save avatar');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      triggerToast('Image size should be less than 1.5MB');
      return;
    }

    setSaving(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { photoURL: reader.result }, { merge: true });
        triggerToast('Profile photo updated successfully!');
      } catch (err) {
        console.error("Error saving photo:", err);
        triggerToast('Failed to save profile photo');
      } finally {
        setSaving(false);
      }
    };
    reader.onerror = () => {
      triggerToast('Failed to read image file');
      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSection = async (sectionKey, fieldsToUpdate) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, fieldsToUpdate, { merge: true });
      setEditStates(prev => ({ ...prev, [sectionKey]: false }));
      triggerToast('Section changes saved successfully!');
    } catch (err) {
      console.error(`Error saving ${sectionKey}:`, err);
      triggerToast('Failed to save changes. Please try again.');
    }
  };

  const handleSaveAadhaar = async (e) => {
    e.preventDefault();
    if (!/^\d{12}$/.test(formValues.aadhaarNumber)) {
      triggerToast('Aadhaar number must be exactly 12 digits');
      return;
    }
    await handleSaveSection('aadhaar', {
      aadhaarNumber: formValues.aadhaarNumber,
      aadhaarStatus: 'pending',
      aadhaarRemarks: ''
    });
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(formValues.pin)) {
      triggerToast('PIN code must be exactly 6 digits');
      return;
    }
    await handleSaveSection('location', {
      address: formValues.address,
      district: formValues.district,
      state: formValues.state,
      pin: formValues.pin
    });
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (formValues.emergencyContact && !/^\d{10}$/.test(formValues.emergencyContact)) {
      triggerToast('Emergency contact must be a valid 10-digit number');
      return;
    }
    await handleSaveSection('contact', {
      emergencyContact: formValues.emergencyContact
    });
  };

  const handleSaveGuardian = async (e) => {
    e.preventDefault();
    if (formValues.guardianPhone && !/^\d{10}$/.test(formValues.guardianPhone)) {
      triggerToast('Guardian phone must be a valid 10-digit number');
      return;
    }
    await handleSaveSection('guardian', {
      guardianName: formValues.guardianName,
      guardianPhone: formValues.guardianPhone
    });
  };

  const toggleNotifications = async () => {
    const newVal = !formValues.notificationsEnabled;
    setFormValues(prev => ({ ...prev, notificationsEnabled: newVal }));
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { notificationsEnabled: newVal }, { merge: true });
      triggerToast(newVal ? 'Notifications turned ON!' : 'Notifications turned OFF');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to update preference');
    }
  };

  // Checklist Completion Metrics
  const isSetupAccount = !!user;
  const isPhotoUploaded = !!user?.photoURL;
  const isPersonalInfo = !!(user?.displayName && user?.dob && user?.gender);
  const isAcademicInfo = !!(user?.school && user?.class && user?.course);
  const isContactInfo = !!(user?.email && user?.phone && user?.emergencyContact);
  const isLocation = !!(user?.address && user?.district && user?.state && user?.pin);
  const isGuardian = !!(user?.guardianName && user?.guardianPhone);
  const isAadhaarSubmitted = !!user?.aadhaarNumber;
  const isBio = !!user?.bio;
  const isBankDetails = !!user?.bankAccount;

  const completionPct = 
    (isSetupAccount ? 10 : 0) +
    (isPhotoUploaded ? 10 : 0) +
    (isPersonalInfo ? 10 : 0) +
    (isAcademicInfo ? 10 : 0) +
    (isContactInfo ? 10 : 0) +
    (isLocation ? 10 : 0) +
    (isGuardian ? 10 : 0) +
    (isAadhaarSubmitted ? 10 : 0) +
    (isBio ? 10 : 0) +
    (isBankDetails ? 10 : 0);

  const trackerItems = [
    { label: 'Setup account', weight: 10, isComplete: isSetupAccount, sectionId: 'photo-section' },
    { label: 'Upload your photo', weight: 10, isComplete: isPhotoUploaded, sectionId: 'photo-section' },
    { label: 'Personal details', weight: 10, isComplete: isPersonalInfo, sectionId: 'personal-section' },
    { label: 'Academic details', weight: 10, isComplete: isAcademicInfo, sectionId: 'academic-section' },
    { label: 'Contact details', weight: 10, isComplete: isContactInfo, sectionId: 'contact-section' },
    { label: 'Location details', weight: 10, isComplete: isLocation, sectionId: 'location-section' },
    { label: 'Guardian details', weight: 10, isComplete: isGuardian, sectionId: 'guardian-section' },
    { label: 'Aadhaar details', weight: 10, isComplete: isAadhaarSubmitted, sectionId: 'aadhaar-section' },
    { label: 'Biography', weight: 10, isComplete: isBio, sectionId: 'bio-section' },
    { label: 'Bank details', weight: 10, isComplete: isBankDetails, sectionId: 'bank-section' }
  ];

  const handleScrollToSection = (id, editKey) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.boxShadow = '0 0 0 3px rgba(83, 109, 254, 0.4)';
      el.style.borderColor = 'var(--primary)';
      setTimeout(() => {
        el.style.boxShadow = '';
        el.style.borderColor = '';
      }, 1500);
      
      if (editKey) {
        setEditStates(prev => ({ ...prev, [editKey]: true }));
      }
    }
  };

  const displayName = user?.displayName || user?.name || 'Student';
  const email = user?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="profile-wrapper">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Edit Profile</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your personal details, credentials, and track your completeness level</p>
      </div>

      {/* Profile Complete / Incomplete Banner */}
      {user?.profileCompleted ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)',
          borderRadius: '12px', padding: '12px 16px', color: 'var(--success)',
          fontSize: '0.9rem', fontWeight: 600, marginBottom: '24px'
        }}>
          <CheckCircle size={16} />
          <span>✓ Profile Complete</span>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
          background: 'rgba(83,109,254,0.08)', border: '1px solid rgba(83,109,254,0.2)',
          borderRadius: '16px', padding: '16px 20px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)' }}>
                Complete your profile to unlock all features.
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Progress: <strong style={{ color: 'var(--success)' }}>{completionPct}% Complete</strong>
              </div>
            </div>
          </div>
          {!isCompletingProfile && (
            <button
              onClick={() => setIsCompletingProfile(true)}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px' }}
            >
              Complete Profile
            </button>
          )}
        </div>
      )}

      {isCompletingProfile ? (
        <div className="card card-p" style={{ maxWidth: '680px', margin: '0 auto', width: '100%', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Complete Registration Form</h2>
            <button
              onClick={() => { setIsCompletingProfile(false); setError(''); }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
            >
              Cancel and Back
            </button>
          </div>

          {/* Section 1: Authentication Methods (Locked + Link Editable) */}
          <div style={{ background: 'rgba(83,109,254,0.04)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', color: 'var(--dark)' }}>Unified Account Link</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Email Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--white)', borderRadius: '10px', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mail size={18} color="var(--primary)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{auth.currentUser?.email || (emailLinked ? form.email : 'Link your email')}</span>
                </div>
                {(auth.currentUser?.emailVerified || emailVerifiedLocal) ? (
                  <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Verified
                  </span>
                ) : auth.currentUser?.providerData.some(p => p.providerId === 'phone') && !emailLinked ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '200px', alignItems: 'stretch' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Almost done! Add your Email Address</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={linkEmail}
                        onChange={(e) => setLinkEmail(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', flex: 1, minWidth: 0 }}
                      />
                      <button
                        type="button"
                        onClick={handleSendPhoneSignupEmailVerification}
                        disabled={linkLoading}
                        className="btn btn-primary"
                        style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: '8px', whiteSpace: 'nowrap' }}
                      >
                        {linkLoading ? 'Sending...' : 'Send Verification'}
                      </button>
                    </div>
                  </div>
                ) : auth.currentUser?.providerData.some(p => p.providerId === 'phone') && emailLinked && !emailVerifiedLocal ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '200px', alignItems: 'stretch' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 700 }}>Email Pending Verification</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>We sent a link to {form.email}.</span>
                      <button
                        type="button"
                        onClick={handleConfirmEmailVerification}
                        disabled={linkLoading}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px', whiteSpace: 'nowrap', marginLeft: 'auto' }}
                      >
                        {linkLoading ? 'Checking...' : 'I Have Verified'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Phone Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--white)', borderRadius: '10px', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={18} color="var(--primary)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{auth.currentUser?.phoneNumber || (phoneLinked ? form.phone : 'Link your mobile')}</span>
                </div>
                {(auth.currentUser?.phoneNumber || phoneLinked) ? (
                  <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Verified
                  </span>
                ) : auth.currentUser?.providerData.some(p => p.providerId === 'password') && !linkOTPSent ? (
                  <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px', justifyContent: 'flex-end' }}>
                    <input
                      type="tel"
                      placeholder="Mobile number"
                      value={linkPhone}
                      onChange={(e) => { setLinkPhone(e.target.value.replace(/[^0-9\s\-\+\(\)\.]/g, '')); setError(''); }}
                      maxLength={20}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '100%', maxWidth: '160px' }}
                    />
                    <button
                      type="button"
                      onClick={handleSendLinkOTP}
                      disabled={linkLoading}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px', whiteSpace: 'nowrap' }}
                    >
                      {linkLoading ? 'Send...' : 'Verify'}
                    </button>
                  </div>
                ) : auth.currentUser?.providerData.some(p => p.providerId === 'password') && linkOTPSent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {linkOtp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => linkOtpRefs.current[idx] = el}
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleLinkOtpChange(e.target, idx)}
                          onKeyDown={(e) => handleLinkOtpKeyDown(e, idx)}
                          style={{ width: '32px', height: '36px', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center', fontSize: '1.1rem', fontWeight: 700 }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {linkTimer > 0 ? `Resend in ${linkTimer}s` : <button type="button" onClick={handleSendLinkOTP} style={{ color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Resend OTP</button>}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            
            {linkStatus && (
              <div style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600, marginTop: '10px' }}>
                {linkStatus}
              </div>
            )}
          </div>

          {/* Section 2: Profile Fields Forms (Grid) */}
          <form onSubmit={handleCompleteRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '8px', color: 'var(--dark)' }}>Personal Information</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label className="form-label">Full Name</label>
                <input
                  ref={nameInputRef}
                  name="name" value={form.name} onChange={handleChange}
                  className="form-input" placeholder="e.g. Arjun Sen"
                  required
                />
              </div>
              <div>
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  name="dob" value={form.dob} onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Gender</label>
                <select
                  name="gender" value={form.gender} onChange={handleChange}
                  className="form-input"
                  style={{ background: 'var(--white)' }}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Aadhaar Number (Optional)</label>
                <input
                  type="text"
                  name="aadhaarNumber" value={form.aadhaarNumber}
                  onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value.replace(/\D/g, '') })}
                  maxLength={12}
                  placeholder="Enter 12 digits (Optional)"
                  className="form-input"
                />
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '8px', color: 'var(--dark)', marginTop: '10px' }}>Contact & Address</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address</label>
                <input
                  name="address" value={form.address} onChange={handleChange}
                  className="form-input" placeholder="House/Flat No, Street Name, Locality"
                  required
                />
              </div>
              <div>
                <label className="form-label">State</label>
                <select
                  name="state"
                  value={form.state}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, state: e.target.value, district: '' }));
                    setError('');
                  }}
                  className="form-input"
                  style={{ background: 'var(--white)' }}
                  required
                >
                  <option value="">Select State</option>
                  {[
                    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
                    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
                    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
                    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", 
                    "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
                    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
                  ].map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">District</label>
                {form.state === 'West Bengal' ? (
                  <select
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    className="form-input"
                    style={{ background: 'var(--white)' }}
                    required
                  >
                    <option value="">Select District</option>
                    {[
                      "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", 
                      "Hooghly", "Howrah", "Jalyaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", 
                      "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", 
                      "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"
                    ].map(dt => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>
                ) : ['Delhi', 'Bihar', 'Jharkhand', 'Odisha'].includes(form.state) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select
                      name="district"
                      value={
                        ['Delhi', 'Bihar', 'Jharkhand', 'Odisha'].includes(form.state) && 
                        !{
                          "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
                          "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Arrah", "Begusarai"],
                          "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh"],
                          "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri"]
                        }[form.state].includes(form.district) && form.district !== ''
                          ? 'Other'
                          : form.district
                      }
                      onChange={(e) => {
                        if (e.target.value === 'Other') {
                          setForm(prev => ({ ...prev, district: 'Other_District' }));
                        } else {
                          setForm(prev => ({ ...prev, district: e.target.value }));
                        }
                      }}
                      className="form-input"
                      style={{ background: 'var(--white)' }}
                      required
                    >
                      <option value="">Select District</option>
                      {({
                        "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
                        "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Arrah", "Begusarai"],
                        "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh"],
                        "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri"]
                      }[form.state] || []).map(dt => (
                        <option key={dt} value={dt}>{dt}</option>
                      ))}
                      <option value="Other">Other...</option>
                    </select>
                    {(form.district === 'Other_District' || 
                      (form.district !== '' && !({
                        "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
                        "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Arrah", "Begusarai"],
                        "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh"],
                        "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri"]
                      }[form.state] || []).includes(form.district))) && (
                      <input
                        type="text"
                        placeholder="Enter District Name"
                        value={form.district === 'Other_District' ? '' : form.district}
                        onChange={(e) => setForm(prev => ({ ...prev, district: e.target.value }))}
                        className="form-input"
                        required
                      />
                    )}
                  </div>
                ) : (
                  <input
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="District name"
                    required
                  />
                )}
              </div>
              <div>
                <label className="form-label">PIN Code (6-digit)</label>
                <input
                  type="text"
                  name="pin" value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                  maxLength={6}
                  placeholder="6-digit PIN"
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Emergency Contact (10-digit)</label>
                <input
                  type="tel"
                  name="emergencyContact" value={form.emergencyContact}
                  onChange={(e) => setForm({ ...form, emergencyContact: e.target.value.replace(/[^0-9\s\-\+\(\)\.]/g, '') })}
                  maxLength={20}
                  placeholder="Emergency contact"
                  className="form-input"
                  required
                />
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '8px', color: 'var(--dark)', marginTop: '10px' }}>Academic & Guardian details</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label className="form-label">School Name</label>
                <input
                  name="school" value={form.school} onChange={handleChange}
                  className="form-input" placeholder="School name"
                  required
                />
              </div>
              <div>
                <label className="form-label">Class</label>
                <select
                  name="class" value={form.class} onChange={(e) => setForm(prev => ({ ...prev, class: e.target.value, semester: '' }))}
                  className="form-input"
                  style={{ background: 'var(--white)' }}
                  required
                >
                  <option value="">Select Class</option>
                  <option value="Class 2">Class 2</option>
                  <option value="Class 3">Class 3</option>
                  <option value="Class 4">Class 4</option>
                  <option value="Class 5">Class 5</option>
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                  <option value="Basic Computer">Basic Computer</option>
                  <option value="Basic with AI">Basic with AI</option>
                  <option value="Tally">Tally</option>
                  <option value="B.Sc">B.Sc</option>
                  <option value="BCA">BCA</option>
                  <option value="B.Tech">B.Tech</option>
                </select>
              </div>
              
              {['Class 11', 'Class 12', 'B.Sc', 'BCA', 'B.Tech'].includes(form.class) && (
                <div>
                  <label className="form-label">Semester</label>
                  <select
                    name="semester"
                    value={form.semester || ''}
                    onChange={handleChange}
                    className="form-input"
                    style={{ background: 'var(--white)' }}
                    required
                  >
                    <option value="">Select Semester</option>
                    {(['Class 11', 'Class 12'].includes(form.class)
                      ? ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4']
                      : ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6']
                    ).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">Course Registered</label>
                <input
                  name="course" value={form.course} onChange={handleChange}
                  className="form-input" placeholder="e.g. Python, Class 10 Board"
                  required
                />
              </div>
              <div>
                <label className="form-label">Guardian's Name</label>
                <input
                  name="guardianName" value={form.guardianName} onChange={handleChange}
                  className="form-input" placeholder="Guardian's name"
                  required
                />
              </div>
              <div>
                <label className="form-label">Guardian's Phone (10-digit)</label>
                <input
                  type="tel"
                  name="guardianPhone" value={form.guardianPhone}
                  onChange={(e) => setForm({ ...form, guardianPhone: e.target.value.replace(/[^0-9\s\-\+\(\)\.]/g, '') })}
                  maxLength={20}
                  placeholder="Guardian phone"
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 500 }}
                >{error}</motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button type="submit" className="btn btn-primary" whileTap={{ scale: 0.97 }}
              disabled={loading || (auth.currentUser?.providerData.some(p => p.providerId === 'password') && !phoneLinked) || (auth.currentUser?.providerData.some(p => p.providerId === 'phone') && !emailLinked)}
              style={{ padding: '16px', fontSize: '1.05rem', marginTop: '10px', width: '100%', justifyContent: 'center', cursor: (loading || (auth.currentUser?.providerData.some(p => p.providerId === 'password') && !phoneLinked) || (auth.currentUser?.providerData.some(p => p.providerId === 'phone') && !emailLinked)) ? 'not-allowed' : 'pointer' }}>
              {loading ? <Spinner /> : <><UserPlus size={20} /> Complete Registration</>}
            </motion.button>
          </form>
          <div id="recaptcha-container"></div>
        </div>
      ) : (
        <div className="profile-grid">
        
        {/* LEFT COLUMN: EDIT FORMS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PHOTO CARD WITH VERIFICATION BADGES */}
          <div id="photo-section" className="card card-p transition-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--surface)' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-on-primary)', fontWeight: 800, fontSize: '2rem',
                    border: '3px solid var(--surface)'
                  }}>{initials}</div>
                )}
                {saving && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.7)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Loader2 size={24} style={{ color: 'var(--primary)' }} />
                    </motion.span>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '4px' }}>{displayName}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Student ID: {user?.studentId || 'COMP-TEMP'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label htmlFor="photo-file-upload" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px' }}>
                    Upload new photo
                  </label>
                  <input
                    id="photo-file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={saving}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Sparkles size={14} style={{ color: 'var(--primary)' }} /> Create Custom Avatar
                  </button>
                  {user?.photoURL && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, 'users', user.uid), { photoURL: null }, { merge: true });
                          triggerToast('Profile photo removed!');
                        } catch (err) {
                          console.error("Error removing photo:", err);
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--danger)', border: '1px solid var(--danger)', background: 'transparent', borderRadius: '8px' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* VERIFICATION BADGES SYSTEM */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              
              {/* Email Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', background: user?.emailVerified ? 'rgba(76,175,80,0.08)' : 'rgba(239,83,80,0.08)', border: `1px solid ${user?.emailVerified ? 'rgba(76,175,80,0.2)' : 'rgba(239,83,80,0.2)'}`, fontSize: '0.82rem', fontWeight: 700 }}>
                <CheckCircle size={14} color={user?.emailVerified ? 'var(--success)' : 'var(--danger)'} />
                <span style={{ color: user?.emailVerified ? '#2E7D32' : '#C62828' }}>Email: {user?.emailVerified ? 'Firebase Verified' : 'Unverified'}</span>
              </div>

              {/* Phone Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', background: user?.phoneVerified ? 'rgba(76,175,80,0.08)' : 'rgba(239,83,80,0.08)', border: `1px solid ${user?.phoneVerified ? 'rgba(76,175,80,0.2)' : 'rgba(239,83,80,0.2)'}`, fontSize: '0.82rem', fontWeight: 700 }}>
                <CheckCircle size={14} color={user?.phoneVerified ? 'var(--success)' : 'var(--danger)'} />
                <span style={{ color: user?.phoneVerified ? '#2E7D32' : '#C62828' }}>Phone: {user?.phoneVerified ? 'Firebase Verified' : 'Unverified'}</span>
              </div>

              {/* Aadhaar Badge */}
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', 
                background: user?.aadhaarStatus === 'verified' ? 'rgba(76,175,80,0.08)' : user?.aadhaarStatus === 'pending' ? 'rgba(255,167,38,0.08)' : user?.aadhaarStatus === 'rejected' ? 'rgba(239,83,80,0.08)' : 'rgba(158,158,158,0.08)', 
                border: `1px solid ${user?.aadhaarStatus === 'verified' ? 'rgba(76,175,80,0.2)' : user?.aadhaarStatus === 'pending' ? 'rgba(255,167,38,0.2)' : user?.aadhaarStatus === 'rejected' ? 'rgba(239,83,80,0.2)' : 'rgba(158,158,158,0.2)'}`, 
                fontSize: '0.82rem', fontWeight: 700 
              }}>
                <CheckCircle size={14} color={user?.aadhaarStatus === 'verified' ? 'var(--success)' : user?.aadhaarStatus === 'pending' ? 'var(--warning)' : user?.aadhaarStatus === 'rejected' ? 'var(--danger)' : 'var(--text-light)'} />
                <span style={{ color: user?.aadhaarStatus === 'verified' ? '#2E7D32' : user?.aadhaarStatus === 'pending' ? '#EF6C00' : user?.aadhaarStatus === 'rejected' ? '#C62828' : 'var(--text-muted)' }}>
                  Aadhaar: {user?.aadhaarStatus === 'verified' ? 'Admin Verified' : user?.aadhaarStatus === 'pending' ? 'Verification Pending' : user?.aadhaarStatus === 'rejected' ? 'Rejected' : 'Not Linked'}
                </span>
              </div>

            </div>
          </div>

          {/* PERSONAL INFO CARD */}
          <div id="personal-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Personal Info</h3>
              {!editStates.personal ? (
                <button onClick={() => setEditStates(prev => ({ ...prev, personal: true }))} className="btn-edit">
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button onClick={() => { setEditStates(prev => ({ ...prev, personal: false })); setFormValues(prev => ({ ...prev, displayName: user?.displayName || user?.name || '', dob: user?.dob || '', gender: user?.gender || '' })); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Cancel
                </button>
              )}
            </div>

            {!editStates.personal ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                  <div className="meta-label">Full Name</div>
                  <div className="meta-value">{displayName}</div>
                </div>
                <div>
                  <div className="meta-label">Date of Birth</div>
                  <div className="meta-value">{user?.dob ? new Date(user.dob).toLocaleDateString() : 'Not provided'}</div>
                </div>
                <div>
                  <div className="meta-label">Gender</div>
                  <div className="meta-value">{user?.gender || 'Not provided'}</div>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveSection('personal', { displayName: formValues.displayName, dob: formValues.dob, gender: formValues.gender }); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" value={formValues.displayName} onChange={e => setFormValues({ ...formValues, displayName: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={formValues.dob} onChange={e => setFormValues({ ...formValues, dob: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Gender</label>
                    <select className="form-input" style={{ background: 'var(--white)' }} value={formValues.gender} onChange={e => setFormValues({ ...formValues, gender: e.target.value })} required>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '0.88rem' }}>
                  Save changes
                </button>
              </form>
            )}
          </div>

          {/* ACADEMIC DETAILS CARD */}
          <div id="academic-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Academic details</h3>
              {!editStates.academic ? (
                <button onClick={() => setEditStates(prev => ({ ...prev, academic: true }))} className="btn-edit">
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button onClick={() => { setEditStates(prev => ({ ...prev, academic: false })); setFormValues(prev => ({ ...prev, school: user?.school || '', class: user?.class || '', course: user?.course || '' })); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Cancel
                </button>
              )}
            </div>

            {!editStates.academic ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                  <div className="meta-label">School Name</div>
                  <div className="meta-value">{user?.school || 'Not provided'}</div>
                </div>
                <div>
                  <div className="meta-label">Class</div>
                  <div className="meta-value">{user?.class ? `Class ${user.class}` : 'Not provided'}</div>
                </div>
                <div>
                  <div className="meta-label">Course Program</div>
                  <div className="meta-value">{user?.course || 'Not provided'}</div>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveSection('academic', { school: formValues.school, class: formValues.class, course: formValues.course }); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                  <div>
                    <label className="form-label">School Name</label>
                    <input type="text" className="form-input" value={formValues.school} onChange={e => setFormValues({ ...formValues, school: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Class</label>
                    <select className="form-input" style={{ background: 'var(--white)' }} value={formValues.class} onChange={e => setFormValues({ ...formValues, class: e.target.value })} required>
                      <option value="">Select Class</option>
                      <option value="2">Class 2-5</option>
                      <option value="6">Class 6-8</option>
                      <option value="9">Class 9-10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Course Registered</label>
                    <input type="text" className="form-input" value={formValues.course} onChange={e => setFormValues({ ...formValues, course: e.target.value })} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '0.88rem' }}>
                  Save changes
                </button>
              </form>
            )}
          </div>

          {/* CONTACT & CREDENTIALS CARD */}
          <div id="contact-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Contact details</h3>
              {!editStates.contact ? (
                <button onClick={() => setEditStates(prev => ({ ...prev, contact: true }))} className="btn-edit">
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button onClick={() => { setEditStates(prev => ({ ...prev, contact: false })); setFormValues(prev => ({ ...prev, emergencyContact: user?.emergencyContact || '' })); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Cancel
                </button>
              )}
            </div>

            {!editStates.contact ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                  <div className="meta-label">Email Address</div>
                  <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {email || 'N/A'}
                    <span style={{ fontSize: '0.72rem', background: 'rgba(76,175,80,0.12)', color: '#2E7D32', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Locked</span>
                  </div>
                </div>
                <div>
                  <div className="meta-label">Phone Number</div>
                  <div className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {user?.phone || 'N/A'}
                    <span style={{ fontSize: '0.72rem', background: 'rgba(76,175,80,0.12)', color: '#2E7D32', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Locked</span>
                  </div>
                </div>
                <div>
                  <div className="meta-label">Emergency Contact</div>
                  <div className="meta-value">{user?.emergencyContact || 'Not provided'}</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                  <div>
                    <label className="form-label">Email (Locked)</label>
                    <input type="text" className="form-input" value={email} disabled style={{ background: 'rgba(83,109,254,0.02)', color: 'var(--text-light)' }} />
                  </div>
                  <div>
                    <label className="form-label">Phone (Locked)</label>
                    <input type="text" className="form-input" value={user?.phone || ''} disabled style={{ background: 'rgba(83,109,254,0.02)', color: 'var(--text-light)' }} />
                  </div>
                  <div>
                    <label className="form-label">Emergency Contact (10-digit)</label>
                    <input type="tel" className="form-input" value={formValues.emergencyContact} onChange={e => setFormValues({ ...formValues, emergencyContact: e.target.value.replace(/\D/g, '') })} maxLength={10} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '0.88rem' }}>
                  Save changes
                </button>
              </form>
            )}
          </div>

          {/* GUARDIAN DETAILS CARD */}
          <div id="guardian-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Guardian details</h3>
              {!editStates.guardian ? (
                <button onClick={() => setEditStates(prev => ({ ...prev, guardian: true }))} className="btn-edit">
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button onClick={() => { setEditStates(prev => ({ ...prev, guardian: false })); setFormValues(prev => ({ ...prev, guardianName: user?.guardianName || '', guardianPhone: user?.guardianPhone || '' })); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Cancel
                </button>
              )}
            </div>

            {!editStates.guardian ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                  <div className="meta-label">Guardian Name</div>
                  <div className="meta-value">{user?.guardianName || 'Not provided'}</div>
                </div>
                <div>
                  <div className="meta-label">Guardian Phone</div>
                  <div className="meta-value">{user?.guardianPhone || 'Not provided'}</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveGuardian} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                  <div>
                    <label className="form-label">Guardian Name</label>
                    <input type="text" className="form-input" value={formValues.guardianName} onChange={e => setFormValues({ ...formValues, guardianName: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Guardian Phone (10-digit)</label>
                    <input type="tel" className="form-input" value={formValues.guardianPhone} onChange={e => setFormValues({ ...formValues, guardianPhone: e.target.value.replace(/\D/g, '') })} maxLength={10} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '0.88rem' }}>
                  Save changes
                </button>
              </form>
            )}
          </div>

          {/* LOCATION CARD */}
          <div id="location-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Location details</h3>
              {!editStates.location ? (
                <button onClick={() => setEditStates(prev => ({ ...prev, location: true }))} className="btn-edit">
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button onClick={() => { setEditStates(prev => ({ ...prev, location: false })); setFormValues(prev => ({ ...prev, address: user?.address || '', district: user?.district || '', state: user?.state || '', pin: user?.pin || '' })); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Cancel
                </button>
              )}
            </div>

            {!editStates.location ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <div className="meta-label">Address</div>
                  <div className="meta-value">{user?.address || 'Not provided'}</div>
                </div>
                <div>
                  <div className="meta-label">District</div>
                  <div className="meta-value">{user?.district || 'Not provided'}</div>
                </div>
                <div>
                  <div className="meta-label">State</div>
                  <div className="meta-value">{user?.state || 'Not provided'}</div>
                </div>
                <div>
                  <div className="meta-label">PIN Code</div>
                  <div className="meta-value">{user?.pin || 'Not provided'}</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Address</label>
                    <input type="text" className="form-input" value={formValues.address} onChange={e => setFormValues({ ...formValues, address: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">District</label>
                    <input type="text" className="form-input" value={formValues.district} onChange={e => setFormValues({ ...formValues, district: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">State</label>
                    <input type="text" className="form-input" value={formValues.state} onChange={e => setFormValues({ ...formValues, state: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">PIN Code (6-digit)</label>
                    <input type="text" className="form-input" value={formValues.pin} onChange={e => setFormValues({ ...formValues, pin: e.target.value.replace(/\D/g, '') })} maxLength={6} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '0.88rem' }}>
                  Save changes
                </button>
              </form>
            )}
          </div>

          {/* AADHAAR CARD */}
          <div id="aadhaar-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Aadhaar verification</h3>
              {user?.aadhaarStatus !== 'verified' && (
                !editStates.aadhaar ? (
                  <button onClick={() => setEditStates(prev => ({ ...prev, aadhaar: true }))} className="btn-edit">
                    <Edit3 size={14} /> Edit
                  </button>
                ) : (
                  <button onClick={() => { setEditStates(prev => ({ ...prev, aadhaar: false })); setFormValues(prev => ({ ...prev, aadhaarNumber: user?.aadhaarNumber || '' })); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Cancel
                  </button>
                )
              )}
            </div>

            {!editStates.aadhaar ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div>
                    <div className="meta-label">Aadhaar Number</div>
                    <div className="meta-value">{user?.aadhaarNumber ? `•••• •••• ${user.aadhaarNumber.slice(-4)}` : 'Not provided'}</div>
                  </div>
                  <div>
                    <div className="meta-label">Verification Status</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                        color: user?.aadhaarStatus === 'verified' ? 'var(--success)' : user?.aadhaarStatus === 'pending' ? 'var(--warning)' : user?.aadhaarStatus === 'rejected' ? 'var(--danger)' : 'var(--text-muted)',
                        background: user?.aadhaarStatus === 'verified' ? 'rgba(102,187,106,0.15)' : user?.aadhaarStatus === 'pending' ? 'rgba(255,167,38,0.15)' : user?.aadhaarStatus === 'rejected' ? 'rgba(239,83,80,0.15)' : 'rgba(158,158,158,0.15)',
                        border: `1px solid ${user?.aadhaarStatus === 'verified' ? 'var(--success)' : user?.aadhaarStatus === 'pending' ? 'var(--warning)' : user?.aadhaarStatus === 'rejected' ? 'var(--danger)' : 'var(--border)'}`
                      }}>
                        {user?.aadhaarStatus || 'NOT SUBMITTED'}
                      </span>
                    </div>
                  </div>
                </div>

                {user?.aadhaarStatus === 'rejected' && user?.aadhaarRemarks && (
                  <div style={{ background: 'rgba(239,83,80,0.06)', border: '1px solid rgba(239,83,80,0.15)', borderRadius: '8px', padding: '12px 16px', fontSize: '0.85rem', color: 'var(--danger)' }}>
                    <strong>Admin Remarks:</strong> {user.aadhaarRemarks}
                  </div>
                )}
                {user?.aadhaarStatus === 'verified' && (
                  <div style={{ background: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.15)', borderRadius: '8px', padding: '12px 16px', fontSize: '0.85rem', color: '#2E7D32', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} />
                    <span>Your Aadhaar profile has been verified. Details are locked.</span>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveAadhaar} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <input type="text" className="form-input" value={formValues.aadhaarNumber} onChange={e => setFormValues({ ...formValues, aadhaarNumber: e.target.value.replace(/\D/g, '') })} maxLength={12} placeholder="Enter 12-digit Aadhaar number" required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.88rem', borderRadius: '8px' }}>
                  Submit for Approval
                </button>
              </form>
            )}
          </div>

          {/* BIOGRAPHY CARD */}
          <div id="bio-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Bio</h3>
              {!editStates.bio ? (
                <button onClick={() => setEditStates(prev => ({ ...prev, bio: true }))} className="btn-edit">
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button onClick={() => { setEditStates(prev => ({ ...prev, bio: false })); setFormValues(prev => ({ ...prev, bio: user?.bio || '' })); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Cancel
                </button>
              )}
            </div>

            {!editStates.bio ? (
              <p style={{ fontSize: '0.92rem', color: user?.bio ? 'var(--dark)' : 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {user?.bio || "Tell us about yourself! E.g. Interests, coding goals, projects or subjects you're learning..."}
              </p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveSection('bio', { bio: formValues.bio }); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <textarea className="form-input" rows={4} value={formValues.bio} onChange={e => setFormValues({ ...formValues, bio: e.target.value })} placeholder="Write a brief biography description about your skills, classes, or coding ambitions..." style={{ resize: 'none', padding: '16px' }} required />
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px', fontSize: '0.88rem' }}>
                  Save changes
                </button>
              </form>
            )}
          </div>

          {/* BANK DETAILS CARD */}
          <div id="bank-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Bank details</h3>
              {!editStates.bank ? (
                <button onClick={() => setEditStates(prev => ({ ...prev, bank: true }))} className="btn-edit">
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button onClick={() => { setEditStates(prev => ({ ...prev, bank: false })); setFormValues(prev => ({ ...prev, bankAccount: user?.bankAccount || '' })); }} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Cancel
                </button>
              )}
            </div>

            {!editStates.bank ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(83,109,254,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                    {user?.bankAccount ? 'Linked Account Details' : 'No Account details linked'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {user?.bankAccount ? `Number/ID: ••••••••${user.bankAccount.slice(-4) || user.bankAccount}` : 'Link bank/billing account for monthly tuition fees transactions'}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveSection('bank', { bankAccount: formValues.bankAccount }); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <input type="text" className="form-input" value={formValues.bankAccount} onChange={e => setFormValues({ ...formValues, bankAccount: e.target.value.replace(/[^0-9A-Za-z@.]/g, '') })} placeholder="Enter UPI ID or Bank Account Details" style={{ flex: 1, minWidth: '200px' }} required />
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.88rem', borderRadius: '8px' }}>
                  Save changes
                </button>
              </form>
            )}
          </div>

          {/* ONBOARDING TOUR CARD */}
          <div id="tour-settings-section" className="card card-p transition-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(83,109,254,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Compass size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Onboarding Tutorial</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Restart the guided tour to walk through key dashboard features.</p>
              </div>
            </div>
            <button onClick={handleResetTour} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px' }}>
              Show Tour Again
            </button>
          </div>

          {/* NOTIFICATIONS CARD */}
          <div id="notifications-section" className="card card-p transition-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,167,38,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                <Bell size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Notifications preference</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Receive live dashboard alerts, assignment deadlines and fee slips</p>
              </div>
            </div>
            <button onClick={toggleNotifications} style={{ width: 52, height: 28, borderRadius: 100, background: formValues.notificationsEnabled ? 'var(--success)' : '#E8EDF5', border: '1.5px solid var(--border)', padding: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: formValues.notificationsEnabled ? 'flex-end' : 'flex-start', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <motion.div layout style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--white)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            </button>
          </div>

          {/* EXPORT MONTHLY REPORT CARD */}
          <div id="export-report-section" className="card card-p transition-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(79, 70, 229, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                <Download size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Monthly Performance Report</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Download a detailed Excel spreadsheet (.xls) with your academic metrics and fee status.</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                id="student-export-month"
                defaultValue={new Date().toISOString().slice(0, 7)}
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '0.82rem', background: 'var(--surface-elevated)', borderRadius: '8px', border: '1px solid var(--border)', width: '150px' }}
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
                  const selectEl = document.getElementById('student-export-month');
                  const mStr = selectEl?.value || new Date().toISOString().slice(0, 7);
                  btn.disabled = true;
                  const origText = btn.innerHTML;
                  btn.innerHTML = `<span class="spinner" style="display:inline-block;width:12px;height:12px;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:6px;"></span> Exporting...`;
                  try {
                    await reportService.exportMonthlyReport(user.uid, mStr, showToast);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    btn.disabled = false;
                    btn.innerHTML = origText;
                  }
                }}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: '0.85rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} /> Export Report
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: STICKY COMPLETION TRACKER */}
        <div style={{ position: 'sticky', top: '100px' }}>
          <div className="card card-p tracker-card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '20px' }}>Complete your profile</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <CircularProgress percentage={completionPct} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {trackerItems.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleScrollToSection(
                    item.sectionId, 
                    item.sectionId === 'personal-section' ? 'personal' :
                    item.sectionId === 'academic-section' ? 'academic' :
                    item.sectionId === 'contact-section' ? 'contact' :
                    item.sectionId === 'location-section' ? 'location' :
                    item.sectionId === 'guardian-section' ? 'guardian' :
                    item.sectionId === 'aadhaar-section' ? 'aadhaar' :
                    item.sectionId === 'bio-section' ? 'bio' :
                    item.sectionId === 'bank-section' ? 'bank' : null
                  )}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                    opacity: item.isComplete ? 1 : 0.65,
                    transition: 'var(--transition)'
                  }}
                  className="tracker-list-item"
                >
                  <div style={{
                    color: item.isComplete ? 'var(--success)' : 'var(--text-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {item.isComplete ? (
                      <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                    ) : (
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--text-light)' }} />
                    )}
                  </div>
                  
                  <span style={{ 
                    fontSize: '0.88rem', fontWeight: 600, color: 'var(--dark)',
                    textDecoration: item.isComplete ? 'line-through' : 'none',
                    flex: 1
                  }}>
                    {item.label}
                  </span>
                  
                  <span style={{ 
                    fontSize: '0.75rem', fontWeight: 700, 
                    color: item.isComplete ? 'var(--text-muted)' : 'var(--success)'
                  }}>
                    {item.plus && !item.isComplete ? '+' : ''}{item.weight}%
                  </span>
                </div>
              ))}
            </div>

            {completionPct === 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'rgba(102,187,106,0.1)',
                  border: '1.5px solid rgba(102,187,106,0.2)',
                  borderRadius: '12px',
                  padding: '14px',
                  marginTop: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--success)'
                }}
              >
                <Sparkles size={16} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Profile is 100% complete! Great job!</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* AVATAR SELECTOR / CUSTOMIZER MODAL */}
      {isAvatarModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
          padding: '16px'
        }} onClick={() => setIsAvatarModalOpen(false)}>
          <div style={{
            background: '#ffffff', border: '1px solid #e4e4e7',
            borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            width: '100%', maxWidth: '580px', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', maxHeight: '90vh', color: '#18181B'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e4e4e7' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#18181b', margin: 0 }}>Select or Create Avatar</h3>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', background: '#f4f4f5', padding: '6px', margin: '20px 24px 0', borderRadius: '12px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setAvatarTab('presets')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
                  background: avatarTab === 'presets' ? '#ffffff' : 'transparent',
                  color: avatarTab === 'presets' ? '#18181b' : '#71717a',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Preset Avatars
              </button>
              <button
                type="button"
                onClick={() => setAvatarTab('customize')}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
                  background: avatarTab === 'customize' ? '#ffffff' : 'transparent',
                  color: avatarTab === 'customize' ? '#18181b' : '#71717a',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Customize Avatar
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', minHeight: '320px' }}>
              {avatarTab === 'presets' ? (
                <div>
                  <p style={{ fontSize: '0.85rem', color: '#71717a', margin: '0 0 16px' }}>Choose from a selection of hand-drawn line avatars:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '16px' }}>
                    {PRESET_AVATARS.map((preset, idx) => {
                      const isSelected = selectedHead === preset.head && selectedBody === preset.body && selectedGlasses === preset.glasses && selectedItem === preset.item;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedHead(preset.head);
                            setSelectedBody(preset.body);
                            setSelectedGlasses(preset.glasses);
                            setSelectedItem(preset.item);
                          }}
                          style={{
                            border: isSelected ? '2.5px solid var(--primary)' : '1px solid #e4e4e7',
                            background: '#f9fafb', borderRadius: '16px', padding: '6px', cursor: 'pointer',
                            aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: isSelected ? '0 8px 16px rgba(83, 109, 254, 0.15)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ width: '70px', height: '70px' }} dangerouslySetInnerHTML={{ __html: renderAvatarSvg(preset.head, preset.body, preset.glasses, preset.item) }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', flexWrap: 'wrap' }}>
                  {/* Canvas Preview Column */}
                  <div style={{ flex: '1 0 160px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '160px', height: '160px', borderRadius: '24px', border: '1.5px solid #e4e4e7', overflow: 'hidden', background: '#f4f4f5', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} dangerouslySetInnerHTML={{ __html: renderAvatarSvg(selectedHead, selectedBody, selectedGlasses, selectedItem) }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#71717a' }}>Live Preview</span>
                  </div>

                  {/* Settings Column */}
                  <div style={{ flex: '2 0 240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Component Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #e4e4e7', paddingBottom: '4px', gap: '12px' }}>
                      {['head', 'body', 'glasses', 'item'].map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setCustomTab(tab)}
                          style={{
                            padding: '6px 2px 8px', fontSize: '0.82rem', fontWeight: 700,
                            background: 'none', border: 'none', borderBottom: customTab === tab ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                            color: customTab === tab ? 'var(--primary)' : '#71717a', cursor: 'pointer',
                            textTransform: 'capitalize', transition: 'all 0.2s'
                          }}
                        >
                          {tab === 'item' ? 'Blush' : tab}
                        </button>
                      ))}
                    </div>

                    {/* Options Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      {customTab === 'head' && Array.from({ length: 6 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedHead(i)}
                          style={{
                            border: selectedHead === i ? '2.5px solid var(--primary)' : '1px solid #e4e4e7',
                            background: '#f9fafb', borderRadius: '12px', padding: '4px', cursor: 'pointer',
                            aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <div style={{ width: '48px', height: '48px' }} dangerouslySetInnerHTML={{ __html: renderAvatarSvg(i, 2, 0, 0) }} />
                        </button>
                      ))}

                      {customTab === 'body' && Array.from({ length: 3 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedBody(i)}
                          style={{
                            border: selectedBody === i ? '2.5px solid var(--primary)' : '1px solid #e4e4e7',
                            background: '#f9fafb', borderRadius: '12px', padding: '4px', cursor: 'pointer',
                            aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <div style={{ width: '48px', height: '48px' }} dangerouslySetInnerHTML={{ __html: renderAvatarSvg(1, i, 0, 0) }} />
                        </button>
                      ))}

                      {customTab === 'glasses' && Array.from({ length: 4 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedGlasses(i)}
                          style={{
                            border: selectedGlasses === i ? '2.5px solid var(--primary)' : '1px solid #e4e4e7',
                            background: '#f9fafb', borderRadius: '12px', padding: '4px', cursor: 'pointer',
                            aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <div style={{ width: '48px', height: '48px' }} dangerouslySetInnerHTML={{ __html: renderAvatarSvg(1, 2, i, 0) }} />
                        </button>
                      ))}

                      {customTab === 'item' && Array.from({ length: 3 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedItem(i)}
                          style={{
                            border: selectedItem === i ? '2.5px solid var(--primary)' : '1px solid #e4e4e7',
                            background: '#f9fafb', borderRadius: '12px', padding: '4px', cursor: 'pointer',
                            aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <div style={{ width: '48px', height: '48px' }} dangerouslySetInnerHTML={{ __html: renderAvatarSvg(1, 2, 0, i) }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #e4e4e7', background: '#f4f4f5' }}>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: 600 }}
                disabled={isSavingAvatar}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomAvatar}
                className="btn btn-primary"
                style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: 700 }}
                disabled={isSavingAvatar}
              >
                {isSavingAvatar ? 'Saving...' : 'Set Profile Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .profile-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 1000px;
          margin: 0 auto;
        }
        .profile-grid {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 800px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }
        .meta-label {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 500;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .meta-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--dark);
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .btn-edit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1.5px solid var(--border-strong);
          background: white;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.82rem;
          transition: var(--transition);
        }
        .btn-edit:hover {
          background: var(--surface);
          color: var(--primary);
          border-color: var(--primary);
        }
        .transition-card {
          border: 1.5px solid var(--border);
          box-shadow: 0 4px 16px rgba(0,0,0,0.02);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .transition-card:hover {
          border-color: rgba(83, 109, 254, 0.15);
        }
        .tracker-card {
          border: 1.5px solid var(--border);
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .tracker-list-item:hover span {
          color: var(--primary) !important;
        }
      `}</style>

      {/* TOAST NOTIFICATION CONTAINER */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
