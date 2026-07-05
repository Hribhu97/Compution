import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Code, CheckCircle, Mail, RefreshCw, UserPlus, Gamepad2, Phone, ArrowLeft } from 'lucide-react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  PhoneAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  updateEmail
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, updateDoc } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

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
  if (code && map[code]) {
    return map[code];
  }
  return message || 'Authentication service temporarily unavailable.';
};

/* ── Google Logo SVG ── */
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
    <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
    <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
  </svg>
);

/* ── Spinner ── */
const Spinner = ({ size = 20 }) => (
  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
    <Code size={size} />
  </motion.div>
);

const Login = () => {
  const { user, loading: authLoading, registerMobileUser, completeUserProfile } = useAuth();
  const navigate = useNavigate();

  // Login view controller: 'login' | 'register' | 'verify' | 'success' | 'otp-verify' | 'register-profile' | 'forgot' | 'reset-success'
  const [view, setView] = useState('login');
  // Login method: 'email' | 'mobile'
  const [loginMethod, setLoginMethod] = useState('email');

  // Input states
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  // Account linking states
  const [pendingPhoneCredential, setPendingPhoneCredential] = useState(null);
  const [pendingLinkEmail, setPendingLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');

  // Profile linking states
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

  // UI/Status states
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  
  // Mobile OTP States
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [mobileStatus, setMobileStatus] = useState('');

  // Refs for OTP boxes
  const otpRefs = useRef([]);
  const linkOtpRefs = useRef([]);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.needsRegistration || !user.profileCompleted) {
        setView('register-profile');
        const currentUser = auth.currentUser;
        if (currentUser) {
          const isEmail = currentUser.providerData.some(p => p.providerId === 'password');
          const isPhone = currentUser.providerData.some(p => p.providerId === 'phone');
          
          setForm(f => ({
            ...f,
            name: f.name || currentUser.displayName || user.displayName || '',
            email: f.email || currentUser.email || user.email || '',
            phone: f.phone || currentUser.phoneNumber || user.phone || user.phoneNumber || '',
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
            aadhaarNumber: f.aadhaarNumber || user.aadhaarNumber || ''
          }));
          
          if (isEmail) {
            if (currentUser.phoneNumber || user.phoneNumber || user.phone) {
              setPhoneLinked(true);
            }
          }
          if (isPhone) {
            if (currentUser.email || user.email) {
              setEmailLinked(true);
              if (currentUser.emailVerified || user.emailVerified) {
                setEmailVerifiedLocal(true);
              }
            }
          }
        }
      } else {
        setView('success');
        setTimeout(() => navigate('/dashboard'), 900);
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (linkTimer > 0) {
      const interval = setInterval(() => {
        setLinkTimer(t => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [linkTimer]);



  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Auto-focus OTP inputs when view changes
  useEffect(() => {
    if (view === 'otp-verify') {
      setTimeout(() => {
        if (otpRefs.current[0]) {
          otpRefs.current[0].focus();
        }
      }, 100);
    }
  }, [view]);

  // Auto-focus Name input on Complete Registration view
  useEffect(() => {
    if (view === 'register-profile') {
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [view]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setError('');
  };

  /* ── Email/Password LOGIN ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { setError('Please enter your email'); return; }
    if (!form.password.trim()) { setError('Please enter your password'); return; }

    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, form.email, form.password);

      // ✅ Check email verification
      if (!result.user.emailVerified) {
        const email = result.user.email;
        await signOut(auth); // block access
        setVerifyEmail(email);
        setView('verify');
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  /* ── Email/Password REGISTER ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Please enter your name'); return; }
    if (!form.email.trim()) { setError('Please enter your email'); return; }
    if (!form.password.trim()) { setError('Please enter a password'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    setError('');
    try {
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password);

      // Save display name to Firebase Auth profile
      await updateProfile(result.user, { displayName: form.name.trim() });

      // Send verification email
      await sendEmailVerification(result.user);

      // Do NOT keep user signed in — sign them out
      const email = result.user.email;
      await signOut(auth);

      // Show verify screen
      setVerifyEmail(email);
      setView('verify');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  /* ── Google Sign-In ── */
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setGoogleLoading(false);
      if (err.code === 'auth/popup-closed-by-user') return;
      setError(friendlyError(err.code));
    }
  };

  /* ── Resend Verification Email ── */
  const handleResend = async () => {
    setResending(true);
    setResent(false);
    try {
      const result = await signInWithEmailAndPassword(auth, form.email || verifyEmail, form.password);
      await sendEmailVerification(result.user);
      await signOut(auth);
      setResent(true);
    } catch {
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  /* ── Switch view helpers ── */
  const goToRegister = () => { setView('register'); setError(''); setForm({ email: '', password: '', name: '' }); };
  const goToLogin = () => { setView('login'); setError(''); setForm(f => ({ ...f, password: '', name: '' })); setVerifyEmail(''); setResent(false); };

  /* ── Password Reset ── */
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { setError('Please enter your email'); return; }

    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, form.email.trim());
      setView('reset-success');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  /* ──────────────────────────────────────────────────── */
  /* ── MOBILE OTP AUTHENTICATION FLOWS                ── */
  /* ──────────────────────────────────────────────────── */

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) { setError('Please enter your phone number'); return; }
    if (countryCode === '+91' && trimmedPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (trimmedPhone.length < 8) { setError('Please enter a valid phone number'); return; }

    setLoading(true);
    setMobileStatus('Sending OTP...');
    setError('');

    const fullPhone = `${countryCode}${trimmedPhone}`;

    console.log('[Phone Auth Flow] ── handleSendOTP START ──');
    console.log('[Phone Auth Flow] Full phone number:', fullPhone);
    console.log('[Phone Auth Flow] E.164 format valid:', /^\+[1-9]\d{6,14}$/.test(fullPhone));
    console.log('[Phone Auth Flow] Auth instance exists:', !!auth);

    try {
      console.log('[Phone Auth Flow] Calling sendOTP() using authService...');
      const result = await authService.sendOTP(fullPhone, 'recaptcha-container');
      
      setConfirmationResult(result);
      setView('otp-verify');
      setTimer(30);
      setMobileStatus('');
    } catch (err) {
      console.error('[Phone Auth Flow] ── handleSendOTP FAILED ──', err);
      setError(friendlyPhoneError(err.code, err.message));
      setMobileStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;

    setLoading(true);
    setMobileStatus('Sending OTP...');
    setError('');

    const fullPhone = `${countryCode}${phoneNumber.trim()}`;

    console.log('[Phone Auth Flow] ── handleResendOTP START ──');
    console.log('[Phone Auth Flow] Resending OTP to:', fullPhone);

    try {
      console.log('[Phone Auth Flow] Calling sendOTP() for resend...');
      const result = await authService.sendOTP(fullPhone, 'recaptcha-container');
      
      setConfirmationResult(result);
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      setMobileStatus('');
      setError('');
    } catch (err) {
      console.error('[Phone Auth Flow] ── handleResendOTP FAILED ──', err);
      setError(friendlyPhoneError(err.code, err.message));
      setMobileStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e, overrideOtp = null) => {
    if (e) e.preventDefault();
    const otpCode = (overrideOtp || otp).join('');
    if (otpCode.length < 6) { setError('Please enter the 6-digit OTP'); return; }

    setLoading(true);
    setMobileStatus('Verifying...');
    setError('');

    console.log('[Phone Auth Flow] ── handleVerifyOTP START ──');
    console.log('[Phone Auth Flow] OTP code length:', otpCode.length);
    console.log('[Phone Auth Flow] ConfirmationResult exists:', !!confirmationResult);

    try {
      if (!confirmationResult) {
        const msg = 'No verification code confirmation context found. Please request OTP again.';
        console.error('[Phone Auth Error]', msg);
        throw new Error(msg);
      }

      console.log('[Phone Auth Flow] Calling confirmationResult.confirm()...');
      const userCredential = await confirmationResult.confirm(otpCode);
      
      // Debug Log: OTP verified
      console.log('[Phone Auth Debug] OTP verified');

      // Check if this phone number is already registered under another account in Firestore
      const fullPhone = `${countryCode}${phoneNumber.trim()}`;
      const usersRef = collection(db, 'users');
      
      const qPhone = query(usersRef, where('phone', '==', fullPhone));
      const qMobile = query(usersRef, where('mobileNumber', '==', fullPhone));
      
      const [snapPhone, snapMobile] = await Promise.all([
        getDocs(qPhone),
        getDocs(qMobile)
      ]);
      
      let existingUserDoc = null;
      snapPhone.forEach(d => { existingUserDoc = { id: d.id, ...d.data() }; });
      if (!existingUserDoc) {
        snapMobile.forEach(d => { existingUserDoc = { id: d.id, ...d.data() }; });
      }

      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otpCode);
      setPendingPhoneCredential(credential);

      if (existingUserDoc) {
        if (existingUserDoc.id !== userCredential.user.uid) {
          console.log('[Phone Auth Flow] Phone number registered to existing profile:', existingUserDoc.id);
          console.log('[Phone Auth Flow] Authenticated UID:', userCredential.user.uid);
          console.log('[Phone Auth Flow] Triggering Account Linking Flow...');

          setPendingLinkEmail(existingUserDoc.email || '');
          setLinkPassword('');

          // Sign out of temp account
          await signOut(auth);
          
          // Show linking screen
          setView('link-account');
          setMobileStatus('');
          setLoading(false);
          return;
        }
      } else {
        // Phone number is NOT registered to any profile in Firestore.
        // Keep them signed in as they are a new phone-first signup!
        console.log('[Phone Auth Flow] Phone number not found in Firestore. Directing to profile registration...');
        setForm(f => ({ ...f, phone: fullPhone }));
        setView('register-profile');
        setMobileStatus('');
        setLoading(false);
        return;
      }
      
      setMobileStatus('');
    } catch (err) {
      console.error('[Phone Auth Flow] ── handleVerifyOTP FAILED ──');
      console.error('[Phone Auth Error] Error code:', err.code || 'NO_CODE');
      console.error('[Phone Auth Error] Error message:', err.message || 'NO_MESSAGE');
      console.error('[Phone Auth Error] Full error:', err);
      setError(friendlyPhoneError(err.code, err.message));
      setMobileStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkEmailSubmit = async (e) => {
    e.preventDefault();
    if (!pendingLinkEmail.trim()) { setError('Please enter your email address'); return; }
    
    setLoading(true);
    setMobileStatus('Searching email...');
    setError('');
    
    try {
      const emailLower = pendingLinkEmail.trim().toLowerCase();
      // Search Firestore to see if this email exists!
      const usersRef = collection(db, 'users');
      const qEmail = query(usersRef, where('email', '==', emailLower));
      const snapEmail = await getDocs(qEmail);
      
      let existingUserDoc = null;
      snapEmail.forEach(d => { existingUserDoc = { id: d.id, ...d.data() }; });
      
      if (existingUserDoc) {
        console.log('[Phone Auth Flow] Email belongs to existing profile:', existingUserDoc.id);
        console.log('[Phone Auth Flow] Triggering Account Linking Flow...');
        
        setPendingLinkEmail(existingUserDoc.email || emailLower);
        setLinkPassword('');
        
        // Switch view to link-account
        setView('link-account');
      } else {
        setError("This email address is not registered. If you are new, click 'Create New Profile'.");
      }
      setMobileStatus('');
    } catch (err) {
      console.error("[Phone Auth Error] Error searching email:", err);
      setError("An error occurred. Please try again.");
      setMobileStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async (e) => {
    e.preventDefault();
    if (!linkPassword.trim()) { setError('Please enter your password'); return; }

    setLoading(true);
    setError('');
    console.log('[Phone Auth Flow] ── handleLinkAccount START ──');

    try {
      console.log('[Phone Auth Flow] Signing in to existing email account:', pendingLinkEmail);
      const emailCredential = await signInWithEmailAndPassword(auth, pendingLinkEmail, linkPassword);
      
      console.log('[Phone Auth Flow] Linking phone credential to email user:', emailCredential.user.uid);
      await linkWithCredential(emailCredential.user, pendingPhoneCredential);
      console.log('[Phone Auth Flow] Account linking SUCCESS!');

      // Update the existing profile to store the linked phone number and extended schema
      const userRef = doc(db, 'users', emailCredential.user.uid);
      const fullPhone = `${countryCode}${phoneNumber.trim()}`;
      const providers = emailCredential.user.providerData.map(p => p.providerId);
      
      await setDoc(userRef, {
        uid: emailCredential.user.uid,
        email: emailCredential.user.email?.toLowerCase() || pendingLinkEmail.toLowerCase(),
        phone: fullPhone,
        phoneNumber: fullPhone,
        emailVerified: emailCredential.user.emailVerified || false,
        phoneVerified: true,
        authProviders: providers,
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setView('success');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      console.error('[Phone Auth Error] Account linking failed:', err);
      setError(friendlyPhoneError(err.code, err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    setLoading(true);
    setError('');
    console.log('[Phone Auth Flow] ── handleLinkGoogle START ──');
    try {
      console.log('[Phone Auth Flow] Signing in with Google to link...');
      const googleResult = await signInWithPopup(auth, googleProvider);
      
      console.log('[Phone Auth Flow] Linking phone credential to Google user:', googleResult.user.uid);
      await linkWithCredential(googleResult.user, pendingPhoneCredential);
      console.log('[Phone Auth Flow] Google Account linking SUCCESS!');

      const userRef = doc(db, 'users', googleResult.user.uid);
      const fullPhone = `${countryCode}${phoneNumber.trim()}`;
      const providers = googleResult.user.providerData.map(p => p.providerId);
      
      await setDoc(userRef, {
        uid: googleResult.user.uid,
        email: googleResult.user.email?.toLowerCase() || '',
        phone: fullPhone,
        phoneNumber: fullPhone,
        emailVerified: googleResult.user.emailVerified || false,
        phoneVerified: true,
        authProviders: providers,
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setView('success');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      console.error('[Phone Auth Error] Google account linking failed:', err);
      setError(friendlyPhoneError(err.code, err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── LINKING & VERIFY HANDLERS FOR COMPLETE PROFILE ──
  const handleSendLinkOTP = async (e) => {
    if (e) e.preventDefault();
    const trimmedPhone = linkPhone.trim();
    if (!trimmedPhone) { setError('Please enter your phone number'); return; }
    if (trimmedPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    
    setLinkLoading(true);
    setLinkStatus('Sending OTP...');
    setError('');
    
    const fullPhone = `${countryCode}${trimmedPhone}`;
    
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
      setForm(f => ({ ...f, phone: `${countryCode}${linkPhone.trim()}` }));
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

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name?.trim()) { setError('Please enter your name'); return; }
    if (!form.email?.trim()) { setError('Please enter your email'); return; }
    
    const currentUser = auth.currentUser;
    if (!currentUser) { setError('Session expired. Please log in again.'); return; }
    
    const isEmail = currentUser.providerData.some(p => p.providerId === 'password');
    const isPhone = currentUser.providerData.some(p => p.providerId === 'phone');
    
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
    if (!/^\d{10}$/.test(form.emergencyContact)) {
      setError('Emergency contact must be a valid 10-digit number');
      return;
    }
    if (!form.school?.trim()) { setError('Please enter your School'); return; }
    if (!form.class) { setError('Please select your Class'); return; }
    if (!form.course?.trim()) { setError('Please enter your Course'); return; }
    if (!form.guardianName?.trim()) { setError('Please enter your Guardian\'s Name'); return; }
    
    if (!/^\d{10}$/.test(form.guardianPhone)) {
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
        emergencyContact: form.emergencyContact,
        school: form.school,
        class: form.class,
        course: form.course,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        aadhaarNumber: form.aadhaarNumber,
        phoneVerified: isEmail ? phoneLinked : true,
        emailVerified: isPhone ? emailVerifiedLocal : true
      });
      
      setView('success');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      console.error("Error during profile completion:", err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    setError('');

    // Auto-focus next input
    if (element.value !== '' && index < 5) {
      otpRefs.current[index + 1].focus();
    }

    // Auto-verify when 6 digits are completed
    const completedOtp = newOtp.join('');
    if (completedOtp.length === 6) {
      console.log('[Phone Auth Flow] OTP completed via typing. Triggering auto-verification...');
      handleVerifyOTP(null, newOtp);
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && /^\d+$/.test(pasteData)) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      otpRefs.current[5].focus();
      setError('');
      console.log('[Phone Auth Flow] OTP completed via paste. Triggering auto-verification...');
      handleVerifyOTP(null, newOtp);
    }
  };

  return (
    <div className="login-layout">
      <div className="login-panel">
        <Link to="/" style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.04em', color: 'var(--dark)' }}>
          COMP<span style={{ color: 'var(--primary)' }}>UTION</span>
        </Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: view === 'register-profile' ? '680px' : '400px', transition: 'max-width 0.3s ease-in-out' }}
          >
            <AnimatePresence mode="wait">

              {/* ════════════ SUCCESS VIEW ════════════ */}
              {view === 'success' && (
                <motion.div key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ textAlign: 'center', padding: '40px 0' }}
                >
                  <motion.div
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ marginBottom: '20px' }}
                  >
                    <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto' }} />
                  </motion.div>
                  <h2>Welcome! 🎉</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Loading your workspace…</p>
                </motion.div>
              )}

              {/* ════════════ VERIFY EMAIL VIEW ════════════ */}
              {view === 'verify' && (
                <motion.div key="verify"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ textAlign: 'center', padding: '20px 0' }}
                >
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: 'rgba(83,109,254,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}>
                    <Mail size={36} color="var(--primary)" />
                  </div>

                  <h2 style={{ fontSize: '1.75rem', marginBottom: '12px' }}>Verify your email</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '8px' }}>
                    We have sent you a verification email to
                  </p>
                  <p style={{
                    fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem',
                    background: 'rgba(83,109,254,0.06)',
                    padding: '10px 20px', borderRadius: 'var(--radius-md)',
                    display: 'inline-block', marginBottom: '24px'
                  }}>
                    {verifyEmail}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '32px' }}>
                    Please verify it and log in.
                  </p>

                  {/* Login Button */}
                  <motion.button
                    className="btn btn-primary"
                    whileTap={{ scale: 0.97 }}
                    onClick={goToLogin}
                    style={{ width: '100%', padding: '16px', fontSize: '1.05rem', justifyContent: 'center', marginBottom: '16px' }}
                  >
                    <ArrowRight size={20} /> Go to Login
                  </motion.button>

                  {/* Resend */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleResend}
                    disabled={resending}
                    style={{
                      width: '100%', padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-strong)',
                      background: 'var(--white)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                      color: 'var(--dark)', cursor: resending ? 'wait' : 'pointer',
                    }}
                  >
                    {resending ? <Spinner size={16} /> : <RefreshCw size={16} />}
                    {resent ? 'Verification email resent ✓' : 'Resend verification email'}
                  </motion.button>
                </motion.div>
              )}

              {/* ════════════ FORGOT PASSWORD VIEW ════════════ */}
              {view === 'forgot' && (
                <motion.div key="forgot-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 style={{ fontSize: '2.25rem', marginBottom: '8px' }}>Reset Password</h1>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '36px', fontSize: '1rem' }}>
                    Enter your email to receive a password reset link.
                  </p>

                  <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Email */}
                    <div>
                      <label className="form-label">Email</label>
                      <input
                        name="email" type="email"
                        value={form.email} onChange={handleChange}
                        className="form-input"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
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
                      disabled={loading}
                      style={{ padding: '16px', fontSize: '1.05rem', marginTop: '4px', width: '100%', justifyContent: 'center' }}>
                      {loading ? <Spinner /> : 'Get reset link'}
                    </motion.button>
                  </form>

                  {/* Switch to Login */}
                  <p style={{ textAlign: 'center', marginTop: '28px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <button type="button" onClick={goToLogin} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                      ← Back to Sign In
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ════════════ RESET SUCCESS VIEW ════════════ */}
              {view === 'reset-success' && (
                <motion.div key="reset-success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ textAlign: 'center', padding: '20px 0' }}
                >
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: 'rgba(76,175,80,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}>
                    <CheckCircle size={36} color="var(--success)" />
                  </div>

                  <h2 style={{ fontSize: '1.75rem', marginBottom: '12px' }}>Check your email</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '24px' }}>
                    we sent you a password reset link to <strong style={{ color: 'var(--primary)' }}>{form.email}</strong>
                  </p>

                  {/* Sign In Button */}
                  <motion.button
                    className="btn btn-primary"
                    whileTap={{ scale: 0.97 }}
                    onClick={goToLogin}
                    style={{ width: '100%', padding: '16px', fontSize: '1.05rem', justifyContent: 'center' }}
                  >
                    Sign In
                  </motion.button>
                </motion.div>
              )}

              {/* ════════════ LOGIN VIEW ════════════ */}
              {view === 'login' && (
                <motion.div key="login-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 style={{ fontSize: '2.25rem', marginBottom: '8px' }}>Welcome back</h1>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '28px', fontSize: '1rem' }}>
                    Sign in to your student workspace.
                  </p>

                  {/* Unified Toggle Selector */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', background: 'rgba(83,109,254,0.06)', padding: '4px', borderRadius: '12px' }}>
                    <button
                      type="button"
                      onClick={() => { setLoginMethod('email'); setError(''); }}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        background: loginMethod === 'email' ? 'var(--white)' : 'none',
                        color: loginMethod === 'email' ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        boxShadow: loginMethod === 'email' ? '0 2px 8px rgba(83,109,254,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: '0.2s ease',
                        fontFamily: 'var(--font-heading)'
                      }}
                    >
                      <Mail size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Continue with Email
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginMethod('mobile'); setError(''); }}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        background: loginMethod === 'mobile' ? 'var(--white)' : 'none',
                        color: loginMethod === 'mobile' ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        boxShadow: loginMethod === 'mobile' ? '0 2px 8px rgba(83,109,254,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: '0.2s ease',
                        fontFamily: 'var(--font-heading)'
                      }}
                    >
                      <Phone size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Continue with Mobile
                    </button>
                  </div>

                  {loginMethod === 'email' ? (
                    /* Email Login Form */
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <label className="form-label">Email</label>
                        <input
                          name="email" type="email"
                          value={form.email} onChange={handleChange}
                          className="form-input"
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <label className="form-label">Password</label>
                          <button
                            type="button"
                            onClick={() => {
                              setView('forgot');
                              setError('');
                            }}
                            style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            name="password" type={showPass ? 'text' : 'password'}
                            value={form.password} onChange={handleChange}
                            className="form-input"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            style={{ paddingRight: '48px' }}
                          />
                          <button type="button" onClick={() => setShowPass(v => !v)}
                            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 500 }}
                          >{error}</motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button type="submit" className="btn btn-primary" whileTap={{ scale: 0.97 }}
                        disabled={loading}
                        style={{ padding: '16px', fontSize: '1.05rem', marginTop: '4px', width: '100%', justifyContent: 'center' }}>
                        {loading ? <Spinner /> : <>Sign In <ArrowRight size={20} /></>}
                      </motion.button>
                    </form>
                  ) : (
                    /* Mobile OTP Login Form */
                    <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <label className="form-label">Mobile Number</label>
                        <div style={{ display: 'flex' }}>
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            style={{
                              padding: '14px',
                              borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                              border: '1.5px solid var(--border-strong)',
                              borderRight: 'none',
                              background: 'rgba(83,109,254,0.02)',
                              color: 'var(--dark)',
                              fontWeight: 600,
                              outline: 'none',
                              cursor: 'pointer',
                              width: '90px',
                              fontSize: '0.95rem'
                            }}
                          >
                            <option value="+91">+91 (IN)</option>
                            <option value="+1">+1 (US)</option>
                            <option value="+44">+44 (GB)</option>
                            <option value="+61">+61 (AU)</option>
                            <option value="+971">+971 (AE)</option>
                          </select>
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, '')); setError(''); }}
                            className="form-input"
                            placeholder="Enter 10-digit number"
                            maxLength={10}
                            style={{
                              borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                              flex: 1
                            }}
                          />
                        </div>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 500 }}
                          >{error}</motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {mobileStatus && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <Spinner size={16} /> {mobileStatus}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button type="submit" className="btn btn-primary" whileTap={{ scale: 0.97 }}
                        disabled={loading}
                        style={{ padding: '16px', fontSize: '1.05rem', marginTop: '4px', width: '100%', justifyContent: 'center' }}>
                        {loading ? <Spinner /> : <>Send OTP <ArrowRight size={20} /></>}
                      </motion.button>
                    </form>
                  )}

                  {/* OR Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '28px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
                    <span style={{ color: 'var(--text-light)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.05em' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
                  </div>

                  {/* Google */}
                  <motion.button onClick={handleGoogleSignIn} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}
                    disabled={googleLoading || loading}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-strong)', background: 'var(--white)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                      fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                      color: 'var(--dark)', cursor: googleLoading ? 'wait' : 'pointer',
                      transition: 'var(--transition)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                    {googleLoading ? <Spinner size={18} /> : <><GoogleLogo /> Continue with Google</>}
                  </motion.button>

                  {/* Google Play Games */}
                  <motion.button onClick={handleGoogleSignIn} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}
                    disabled={googleLoading || loading}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid #10B981', background: '#ECFDF5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                      fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                      color: '#065F46', cursor: googleLoading ? 'wait' : 'pointer',
                      transition: 'var(--transition)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      marginTop: '12px'
                    }}>
                    {googleLoading ? <Spinner size={18} /> : <><Gamepad2 size={20} color="#10B981" /> Continue with Google Play Games</>}
                  </motion.button>

                  {/* Switch to Register */}
                  <p style={{ textAlign: 'center', marginTop: '28px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Don't have an account?{' '}
                    <button onClick={goToRegister} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                      Create Account →
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ════════════ REGISTER VIEW ════════════ */}
              {view === 'register' && (
                <motion.div key="register-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 style={{ fontSize: '2.25rem', marginBottom: '8px' }}>Create Account</h1>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '36px', fontSize: '1rem' }}>
                    Join Compution's student ecosystem.
                  </p>

                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Name */}
                    <div>
                      <label className="form-label">Full Name</label>
                      <input
                        name="name" value={form.name} onChange={handleChange}
                        className="form-input" placeholder="e.g. Arjun Sen"
                        autoComplete="name"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="form-label">Email</label>
                      <input
                        name="email" type="email"
                        value={form.email} onChange={handleChange}
                        className="form-input"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="form-label">Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          name="password" type={showPass ? 'text' : 'password'}
                          value={form.password} onChange={handleChange}
                          className="form-input"
                          placeholder="Min 6 characters"
                          autoComplete="new-password"
                          style={{ paddingRight: '48px' }}
                        />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '6px' }}>
                        Must be at least 6 characters
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
                      disabled={loading}
                      style={{ padding: '16px', fontSize: '1.05rem', marginTop: '4px', width: '100%', justifyContent: 'center' }}>
                      {loading ? <Spinner /> : <><UserPlus size={20} /> Create Account</>}
                    </motion.button>
                  </form>

                  {/* OR Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '28px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
                    <span style={{ color: 'var(--text-light)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.05em' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
                  </div>

                  {/* Google */}
                  <motion.button onClick={handleGoogleSignIn} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}
                    disabled={googleLoading || loading}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-strong)', background: 'var(--white)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                      fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                      color: 'var(--dark)', cursor: googleLoading ? 'wait' : 'pointer',
                      transition: 'var(--transition)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                    {googleLoading ? <Spinner size={18} /> : <><GoogleLogo /> Continue with Google</>}
                  </motion.button>

                  {/* Google Play Games */}
                  <motion.button onClick={handleGoogleSignIn} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}
                    disabled={googleLoading || loading}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid #10B981', background: '#ECFDF5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                      fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                      color: '#065F46', cursor: googleLoading ? 'wait' : 'pointer',
                      transition: 'var(--transition)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      marginTop: '12px'
                    }}>
                    {googleLoading ? <Spinner size={18} /> : <><Gamepad2 size={20} color="#10B981" /> Continue with Google Play Games</>}
                  </motion.button>

                  {/* Switch to Login */}
                  <p style={{ textAlign: 'center', marginTop: '28px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Already have an account?{' '}
                    <button onClick={goToLogin} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                      Sign In →
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ════════════ MOBILE OTP VERIFY VIEW ════════════ */}
              {view === 'otp-verify' && (
                <motion.div key="otp-verify-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(''); setOtp(['', '', '', '', '', '']); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                      padding: 0, marginBottom: '24px'
                    }}
                  >
                    <ArrowLeft size={16} /> Back to Login
                  </button>

                  <h1 style={{ fontSize: '2.25rem', marginBottom: '8px' }}>Verify OTP</h1>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1rem', lineHeight: 1.6 }}>
                    We've sent a 6-digit code to <strong style={{ color: 'var(--dark)' }}>{countryCode} {phoneNumber}</strong>.
                  </p>

                  <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* 6-box OTP entry */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }} onPaste={handleOtpPaste}>
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => otpRefs.current[idx] = el}
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(e.target, idx)}
                          onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                          style={{
                            width: '48px',
                            height: '52px',
                            borderRadius: '12px',
                            border: '1.5px solid var(--border-strong)',
                            textAlign: 'center',
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            background: 'var(--white)',
                            color: 'var(--dark)',
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.boxShadow = '0 0 0 3px rgba(83,109,254,0.15)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'var(--border-strong)';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      ))}
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 500 }}
                        >{error}</motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {mobileStatus && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Spinner size={16} /> {mobileStatus}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button type="submit" className="btn btn-primary" whileTap={{ scale: 0.97 }}
                      disabled={loading}
                      style={{ padding: '16px', fontSize: '1.05rem', width: '100%', justifyContent: 'center' }}>
                      {loading ? <Spinner /> : 'Verify & Login'}
                    </motion.button>
                  </form>

                  {/* Resend timer */}
                  <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '0.95rem' }}>
                    {timer > 0 ? (
                      <span style={{ color: 'var(--text-muted)' }}>
                        Resend code in <strong style={{ color: 'var(--primary)', fontWeight: 700 }}>{timer}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={loading}
                        style={{
                          background: 'none', border: 'none', color: 'var(--primary)',
                          fontWeight: 700, cursor: 'pointer', padding: 0
                        }}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ════════════ PROMPT LINK EMAIL VIEW ════════════ */}
              {view === 'prompt-link-email' && (
                <motion.div key="prompt-link-email"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                  <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Link Existing Account</h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    The phone number <strong style={{ color: 'var(--dark)' }}>{countryCode} {phoneNumber}</strong> is not registered to any profile.
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    If you already have a registered email account, enter it below to link your mobile number. Otherwise, click 'Create New Profile' to set up a new account.
                  </p>

                  <form onSubmit={handleLinkEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label className="form-label">Registered Email Address</label>
                      <input
                        type="email"
                        value={pendingLinkEmail}
                        onChange={(e) => { setPendingLinkEmail(e.target.value); setError(''); }}
                        className="form-input"
                        placeholder="you@example.com"
                        required
                      />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 500 }}
                        >{error}</motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {mobileStatus && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Spinner size={16} /> {mobileStatus}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button type="submit" className="btn btn-primary" whileTap={{ scale: 0.97 }}
                      disabled={loading}
                      style={{ padding: '16px', fontSize: '1.05rem', width: '100%', justifyContent: 'center' }}>
                      {loading ? <Spinner /> : 'Link with Email'}
                    </motion.button>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '10px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
                    <span style={{ color: 'var(--text-light)', fontSize: '0.82rem', fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
                  </div>

                  <motion.button 
                    onClick={() => {
                      setError('');
                      setView('register-profile');
                    }}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-strong)', background: 'var(--white)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                      color: 'var(--dark)', cursor: 'pointer',
                      transition: 'var(--transition)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    Create New Profile
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(''); setOtp(['', '', '', '', '', '']); }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                      padding: 0, marginTop: '10px', textAlign: 'center'
                    }}
                  >
                    Cancel and Back
                  </button>
                </motion.div>
              )}

              {/* ════════════ LINK ACCOUNT VIEW ════════════ */}
              {view === 'link-account' && (
                <motion.div key="link-account"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                  <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Link Your Account</h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    The phone number <strong style={{ color: 'var(--dark)' }}>{countryCode} {phoneNumber}</strong> is already associated with the email <strong style={{ color: 'var(--primary)' }}>{pendingLinkEmail}</strong>.
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    Please verify your password or link with Google to continue.
                  </p>

                  <form onSubmit={handleLinkAccount} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label className="form-label">Password for {pendingLinkEmail}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={linkPassword}
                          onChange={(e) => { setLinkPassword(e.target.value); setError(''); }}
                          className="form-input"
                          placeholder="••••••••"
                          required
                        />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 500 }}
                        >{error}</motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button type="submit" className="btn btn-primary" whileTap={{ scale: 0.97 }}
                      disabled={loading}
                      style={{ padding: '16px', fontSize: '1.05rem', width: '100%', justifyContent: 'center' }}>
                      {loading ? <Spinner /> : 'Link Account'}
                    </motion.button>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '10px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
                    <span style={{ color: 'var(--text-light)', fontSize: '0.82rem', fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-strong)' }} />
                  </div>

                  <motion.button onClick={handleLinkGoogle} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}
                    disabled={loading}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-strong)', background: 'var(--white)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                      fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                      color: 'var(--dark)', cursor: 'pointer',
                      transition: 'var(--transition)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                    <GoogleLogo /> Link with Google
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(''); }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                      padding: 0, marginTop: '10px', textAlign: 'center'
                    }}
                  >
                    Cancel and Back
                  </button>
                </motion.div>
              )}

              {/* ════════════ MOBILE COMPLETE REGISTRATION VIEW ════════════ */}
              {view === 'register-profile' && (() => {
                const currentUser = auth.currentUser;
                const isEmail = currentUser?.providerData.some(p => p.providerId === 'password');
                const isPhone = currentUser?.providerData.some(p => p.providerId === 'phone');
                return (
                  <motion.div key="register-profile-form"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h1 style={{ fontSize: '2.25rem', marginBottom: '8px' }}>Complete Profile</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '1rem', lineHeight: 1.6 }}>
                      Complete your profile registration to access your dashboard.
                    </p>

                    {/* Section 1: Authentication Methods (Locked + Link Editable) */}
                    <div style={{ background: 'rgba(83,109,254,0.04)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', color: 'var(--dark)' }}>Unified Account Link</h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Email Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--white)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Mail size={18} color="var(--primary)" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isEmail ? form.email : (emailLinked ? form.email : 'Link your email')}</span>
                          </div>
                          {(isEmail || emailVerifiedLocal) ? (
                            <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={14} /> Verified
                            </span>
                          ) : isPhone && !emailLinked ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginLeft: '16px', alignItems: 'stretch' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Almost done! Add your Email Address</span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                                <input
                                  type="email"
                                  placeholder="you@example.com"
                                  value={linkEmail}
                                  onChange={(e) => setLinkEmail(e.target.value)}
                                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', flex: 1 }}
                                />
                                <button
                                  type="button"
                                  onClick={handleSendPhoneSignupEmailVerification}
                                  disabled={linkLoading}
                                  className="btn btn-primary"
                                  style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: '8px', whiteSpace: 'nowrap' }}
                                >
                                  {linkLoading ? 'Sending...' : 'Send Verification Link'}
                                </button>
                              </div>
                            </div>
                          ) : isPhone && emailLinked && !emailVerifiedLocal ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginLeft: '16px', alignItems: 'stretch' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--white)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Phone size={18} color="var(--primary)" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{isPhone ? form.phone : (phoneLinked ? form.phone : 'Link your mobile')}</span>
                          </div>
                          {(isPhone || phoneLinked) ? (
                            <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={14} /> Verified
                            </span>
                          ) : isEmail && !linkOTPSent ? (
                            <div style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end', marginLeft: '16px' }}>
                              <input
                                type="tel"
                                placeholder="10-digit Mobile"
                                value={linkPhone}
                                onChange={(e) => setLinkPhone(e.target.value.replace(/\D/g, ''))}
                                maxLength={10}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '160px' }}
                              />
                              <button
                                type="button"
                                onClick={handleSendLinkOTP}
                                disabled={linkLoading}
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px' }}
                              >
                                {linkLoading ? 'Send...' : 'Verify'}
                              </button>
                            </div>
                          ) : isEmail && linkOTPSent ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', flex: 1 }}>
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
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                        <div style={{ gridColumn: 'span 2' }}>
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
                                "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", 
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
                            onChange={(e) => setForm({ ...form, emergencyContact: e.target.value.replace(/\D/g, '') })}
                            maxLength={10}
                            placeholder="Emergency contact"
                            className="form-input"
                            required
                          />
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '8px', color: 'var(--dark)', marginTop: '10px' }}>Academic & Guardian details</h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
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
                        
                        {/* Dynamic Semester Field */}
                        <div style={{ gridColumn: ['Class 11', 'Class 12', 'B.Sc', 'BCA', 'B.Tech'].includes(form.class) ? 'span 1' : 'none' }}>
                          <AnimatePresence>
                            {['Class 11', 'Class 12', 'B.Sc', 'BCA', 'B.Tech'].includes(form.class) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{ overflow: 'hidden' }}
                              >
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
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
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
                            onChange={(e) => setForm({ ...form, guardianPhone: e.target.value.replace(/\D/g, '') })}
                            maxLength={10}
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
                        disabled={loading || (isEmail && !phoneLinked) || (isPhone && !emailLinked)}
                        style={{ padding: '16px', fontSize: '1.05rem', marginTop: '10px', width: '100%', justifyContent: 'center', cursor: (loading || (isEmail && !phoneLinked) || (isPhone && !emailLinked)) ? 'not-allowed' : 'pointer' }}>
                        {loading ? <Spinner /> : <><UserPlus size={20} /> Complete Registration</>}
                      </motion.button>
                    </form>
                  </motion.div>
                );
              })()}

            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <div className="login-visual" style={{ padding: 0 }}>
        <img 
          src="https://i.postimg.cc/mDFN9Zh0/480682920-626733483646791-4515802378743072113-n.jpg" 
          alt="Login Background" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>
    </div>
  );
};

export default Login;
