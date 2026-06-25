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
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
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
    'auth/invalid-phone-number': 'Invalid phone number. Please enter a valid number in E.164 format (e.g. +91XXXXXXXXXX).',
    'auth/too-many-requests': 'SMS quota exceeded or too many attempts. Please wait a few minutes and try again.',
    'auth/invalid-verification-code': 'Invalid OTP. Please check the code and try again.',
    'auth/code-expired': 'OTP has expired. Please request a new one.',
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
    'auth/operation-not-allowed': 'Phone Sign-In is not enabled for this Firebase project. The admin must enable it in Firebase Console → Authentication → Sign-in method → Phone.',
    'auth/captcha-check-failed': 'reCAPTCHA verification failed. This domain may not be authorized. Check Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/billing-not-enabled': 'Firebase billing is not enabled. Phone Authentication requires the Blaze (pay-as-you-go) plan.',
    'auth/quota-exceeded': 'SMS quota for this project has been exceeded. Please try again later or contact the admin.',
    'auth/user-disabled': 'This user account has been disabled by an administrator.',
    'auth/invalid-app-credential': 'The reCAPTCHA token is invalid or has expired. Please refresh the page and try again.',
    'auth/missing-phone-number': 'Phone number is missing. Please enter your phone number.',
    'auth/argument-error': 'Invalid arguments passed to Phone Auth. Check that the phone number format and reCAPTCHA are correct.',
    'auth/internal-error': 'Firebase internal error. This could indicate a server-side issue or misconfigured project.',
  };
  if (code && map[code]) {
    return map[code];
  }
  // Never show generic "Something went wrong" — always show the actual error
  if (code) {
    return `Firebase Error [${code}]: ${message || 'No additional details.'}`;
  }
  if (message) {
    return `Error: ${message}`;
  }
  return 'An unknown error occurred. Check the browser console for details.';
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
  const { user, loading: authLoading, registerMobileUser } = useAuth();
  const navigate = useNavigate();

  // Login view controller: 'login' | 'register' | 'verify' | 'success' | 'otp-verify' | 'register-profile' | 'forgot' | 'reset-success'
  const [view, setView] = useState('login');
  // Login method: 'email' | 'mobile'
  const [loginMethod, setLoginMethod] = useState('email');

  // Input states
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

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
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.needsRegistration) {
        setView('register-profile');
      } else {
        setView('success');
        setTimeout(() => navigate('/dashboard'), 900);
      }
    }
  }, [user, authLoading, navigate]);

  // Handle countdown timer for Resend OTP
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

    // Debug Log: OTP requested
    console.log('[Phone Auth Debug] OTP requested');

    setLoading(true);
    setMobileStatus('Sending OTP...');
    setError('');

    const fullPhone = `${countryCode}${trimmedPhone}`;

    console.log('[Phone Auth Flow] ── handleSendOTP START ──');
    console.log('[Phone Auth Flow] Full phone number:', fullPhone);
    console.log('[Phone Auth Flow] E.164 format valid:', /^\+[1-9]\d{6,14}$/.test(fullPhone));
    console.log('[Phone Auth Flow] Auth instance exists:', !!auth);
    console.log('[Phone Auth Flow] Current user:', auth?.currentUser?.uid || 'NONE (expected for new login)');

    try {
      // Step 1: Setup invisible reCAPTCHA
      console.log('[Phone Auth Flow] Setting up reCAPTCHA...');
      let verifier = window.recaptchaVerifier;
      if (!verifier) {
        console.log('[Phone Auth Flow] No existing verifier found. Creating new RecaptchaVerifier...');
        window.recaptchaVerifier = authService.setupRecaptcha('recaptcha-container');
        verifier = window.recaptchaVerifier;
      } else {
        console.log('[Phone Auth Flow] Reusing existing RecaptchaVerifier');
      }
      console.log('[Phone Auth Flow] reCAPTCHA verifier ready:', !!verifier);

      // Step 2: Send OTP
      console.log('[Phone Auth Flow] Calling sendOTP()...');
      const result = await authService.sendOTP(fullPhone, verifier);
      
      // Debug Log: OTP sent
      console.log('[Phone Auth Debug] OTP sent');
      
      setConfirmationResult(result);
      setView('otp-verify');
      setTimer(30);
      setMobileStatus('');
    } catch (err) {
      console.error('[Phone Auth Flow] ── handleSendOTP FAILED ──');
      console.error('[Phone Auth Error] Error code:', err.code || 'NO_CODE');
      console.error('[Phone Auth Error] Error message:', err.message || 'NO_MESSAGE');
      console.error('[Phone Auth Error] Error name:', err.name || 'NO_NAME');
      console.error('[Phone Auth Error] Full error:', err);

      // Clean up reCAPTCHA on failure
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
          console.log('[Phone Auth Flow] reCAPTCHA verifier cleared after error');
        } catch (clearErr) {
          console.error('[Phone Auth Error] Failed to clear reCAPTCHA:', clearErr);
        }
      }
      setError(friendlyPhoneError(err.code, err.message));
      setMobileStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;

    // Debug Log: OTP requested
    console.log('[Phone Auth Debug] OTP requested');

    setLoading(true);
    setMobileStatus('Sending OTP...');
    setError('');

    const fullPhone = `${countryCode}${phoneNumber.trim()}`;

    console.log('[Phone Auth Flow] ── handleResendOTP START ──');
    console.log('[Phone Auth Flow] Resending OTP to:', fullPhone);

    try {
      let verifier = window.recaptchaVerifier;
      if (!verifier) {
        console.log('[Phone Auth Flow] Creating new RecaptchaVerifier for resend...');
        window.recaptchaVerifier = authService.setupRecaptcha('recaptcha-container');
        verifier = window.recaptchaVerifier;
      }

      console.log('[Phone Auth Flow] Calling sendOTP() for resend...');
      const result = await authService.sendOTP(fullPhone, verifier);
      
      // Debug Log: OTP sent
      console.log('[Phone Auth Debug] OTP sent');
      
      setConfirmationResult(result);
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      setMobileStatus('');
      setError('');
    } catch (err) {
      console.error('[Phone Auth Flow] ── handleResendOTP FAILED ──');
      console.error('[Phone Auth Error] Error code:', err.code || 'NO_CODE');
      console.error('[Phone Auth Error] Error message:', err.message || 'NO_MESSAGE');
      console.error('[Phone Auth Error] Full error:', err);

      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (clearErr) {
          console.error('[Phone Auth Error] Failed to clear reCAPTCHA:', clearErr);
        }
      }
      setError(friendlyPhoneError(err.code, err.message));
      setMobileStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    const otpCode = otp.join('');
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
      await confirmationResult.confirm(otpCode);
      
      // Debug Log: OTP verified
      console.log('[Phone Auth Debug] OTP verified');
      
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

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Please enter your name'); return; }
    if (!form.email.trim()) { setError('Please enter your email'); return; }

    setLoading(true);
    setError('');
    try {
      const fullPhone = `${countryCode}${phoneNumber.trim()}`;
      await registerMobileUser(form.name, form.email, fullPhone);
    } catch (err) {
      console.error("Error during registration:", err);
      setError(err.message || 'Failed to complete registration. Please try again.');
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
    }
  };

  return (
    <div className="login-layout">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>

      <div className="login-panel">
        <Link to="/" style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.04em', color: 'var(--dark)' }}>
          COMP<span style={{ color: 'var(--primary)' }}>UTION</span>
        </Link>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: '400px' }}
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

              {/* ════════════ MOBILE COMPLETE REGISTRATION VIEW ════════════ */}
              {view === 'register-profile' && (
                <motion.div key="register-profile-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 style={{ fontSize: '2.25rem', marginBottom: '8px' }}>Complete Profile</h1>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1rem', lineHeight: 1.6 }}>
                    Create your account profile to complete registration.
                  </p>

                  <form onSubmit={handleCompleteRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Full Name */}
                    <div>
                      <label className="form-label">Full Name</label>
                      <input
                        ref={nameInputRef}
                        name="name" value={form.name} onChange={handleChange}
                        className="form-input" placeholder="e.g. Arjun Sen"
                        autoComplete="name"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="form-label">Email Address</label>
                      <input
                        name="email" type="email"
                        value={form.email} onChange={handleChange}
                        className="form-input"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>

                    {/* Verified Mobile */}
                    <div>
                      <label className="form-label">Verified Mobile Number</label>
                      <input
                        type="text"
                        value={`${countryCode} ${phoneNumber}`}
                        disabled
                        className="form-input"
                        style={{ background: 'rgba(83,109,254,0.02)', color: 'var(--text-light)', borderStyle: 'dashed' }}
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
                      {loading ? <Spinner /> : <><UserPlus size={20} /> Complete Registration</>}
                    </motion.button>
                  </form>
                </motion.div>
              )}

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
