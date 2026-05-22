import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Code, CheckCircle, Mail, RefreshCw, UserPlus } from 'lucide-react';
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

/* ──────────────────────────────────────────────────── */
/* ── LOGIN / REGISTER PAGE                          ── */
/* ──────────────────────────────────────────────────── */
const Login = () => {
  // View: 'login' | 'register' | 'verify' | 'success'
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const navigate = useNavigate();

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

      setView('success');
      setTimeout(() => navigate('/dashboard'), 900);
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
      // Google accounts are always verified
      setView('success');
      setTimeout(() => navigate('/dashboard'), 900);
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
      // Temporarily sign in to get user object, send verification, then sign out
      const result = await signInWithEmailAndPassword(auth, form.email || verifyEmail, form.password);
      await sendEmailVerification(result.user);
      await signOut(auth);
      setResent(true);
    } catch {
      // If we can't resend (e.g. no password stored), just show a helpful message
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
                  <p style={{ color: 'var(--text-muted)', marginBottom: '36px', fontSize: '1rem' }}>
                    Sign in to your student workspace.
                  </p>

                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                      {loading ? <Spinner /> : <>Sign In <ArrowRight size={20} /></>}
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

                  {/* Switch to Login */}
                  <p style={{ textAlign: 'center', marginTop: '28px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Already have an account?{' '}
                    <button onClick={goToLogin} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                      Sign In →
                    </button>
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <div className="login-visual">
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(83,109,254,0.08)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(126,200,255,0.12)', filter: 'blur(30px)' }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{ maxWidth: '400px', width: '100%', position: 'relative', zIndex: 1 }}
        >
          {/* Mini dashboard preview */}
          <div className="card" style={{ overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ background: 'var(--dark)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1rem', color: 'white' }}>
                COMP<span style={{ color: 'var(--accent)' }}>UTION</span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Student Portal</span>
            </div>
            <div className="card-p" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Attendance', val: '92%', color: 'var(--primary)' },
                { label: 'Python Progress', val: '68%', color: '#3776AB' },
                { label: 'DSA Progress', val: '85%', color: 'var(--success)' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                    <span>{item.label}</span><span style={{ color: item.color, fontWeight: 700 }}>{item.val}</span>
                  </div>
                  <div className="progress-track">
                    <motion.div className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: item.val }}
                      transition={{ duration: 1.2, delay: 0.8 }}
                      style={{ background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { emoji: '🔥', value: '7 Days', label: 'Study Streak' },
              { emoji: '📚', value: '3 Pending', label: 'Assignments' },
            ].map(stat => (
              <div key={stat.label} className="card card-p" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{stat.emoji}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.15rem' }}>{stat.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
