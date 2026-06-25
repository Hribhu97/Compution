import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { doc } from 'firebase/firestore';
import { updateDoc, setDoc } from '../../firebase';;
import {
  User, Mail, Phone, MapPin, Sparkles, CheckCircle, X,
  ShieldCheck, Loader2, Edit3, Compass, CreditCard, Bell, Info
} from 'lucide-react';

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
  const { user } = useAuth();
  
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

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
    location: false,
    bio: false,
    bank: false
  });

  // Local Edit Fields Values
  const [formValues, setFormValues] = useState({
    displayName: '',
    phone: '',
    location: '',
    bio: '',
    bankAccount: '',
    notificationsEnabled: false
  });

  // Initialize values from Firebase User document
  useEffect(() => {
    if (user) {
      setFormValues({
        displayName: user.displayName || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
        bankAccount: user.bankAccount || '',
        notificationsEnabled: user.notificationsEnabled || false
      });
    }
  }, [user]);

  const triggerToast = (msg) => {
    setToast(msg);
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
  const isPersonalInfo = !!(user?.displayName && user?.phone);
  const isLocation = !!user?.location;
  const isBio = !!user?.bio;
  const isNotifications = !!user?.notificationsEnabled;
  const isBankDetails = !!user?.bankAccount;

  const completionPct = 
    (isSetupAccount ? 10 : 0) +
    (isPhotoUploaded ? 5 : 0) +
    (isPersonalInfo ? 10 : 0) +
    (isLocation ? 20 : 0) +
    (isBio ? 15 : 0) +
    (isNotifications ? 10 : 0) +
    (isBankDetails ? 30 : 0);

  const trackerItems = [
    { label: 'Setup account', weight: 10, isComplete: isSetupAccount, sectionId: 'account-section' },
    { label: 'Upload your photo', weight: 5, isComplete: isPhotoUploaded, sectionId: 'photo-section' },
    { label: 'Personal Info', weight: 10, isComplete: isPersonalInfo, sectionId: 'personal-section' },
    { label: 'Location', weight: 20, isComplete: isLocation, sectionId: 'location-section', plus: true },
    { label: 'Biography', weight: 15, isComplete: isBio, sectionId: 'bio-section' },
    { label: 'Notifications', weight: 10, isComplete: isNotifications, sectionId: 'notifications-section', plus: true },
    { label: 'Bank details', weight: 30, isComplete: isBankDetails, sectionId: 'bank-section', plus: true }
  ];

  const handleScrollToSection = (id, editKey) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary highlight
      el.style.boxShadow = '0 0 0 3px rgba(83, 109, 254, 0.4)';
      el.style.borderColor = 'var(--primary)';
      setTimeout(() => {
        el.style.boxShadow = '';
        el.style.borderColor = '';
      }, 1500);
      
      // Auto-open editing if applicable
      if (editKey) {
        setEditStates(prev => ({ ...prev, [editKey]: true }));
      }
    }
  };

  const displayName = user?.displayName || 'Student';
  const email = user?.email || 'student@compution.in';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="profile-wrapper">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Edit Profile</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your personal details, credentials, and track your completeness level</p>
      </div>

      <div className="profile-grid">
        
        {/* LEFT COLUMN: EDIT FORMS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PHOTO CARD */}
          <div id="photo-section" className="card card-p transition-card" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
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
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                At least 800×800 px recommended. JPG or PNG is allowed.
              </p>
            </div>
          </div>

          {/* PERSONAL INFO CARD */}
          <div id="personal-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Personal Info</h3>
              {!editStates.personal ? (
                <button
                  onClick={() => setEditStates(prev => ({ ...prev, personal: true }))}
                  className="btn-edit"
                >
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditStates(prev => ({ ...prev, personal: false }));
                    setFormValues(prev => ({ ...prev, displayName: user?.displayName || '', phone: user?.phone || '' }));
                  }}
                  style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}
                >
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
                  <div className="meta-label">Email</div>
                  <div className="meta-value">{email}</div>
                </div>
                <div>
                  <div className="meta-label">Phone</div>
                  <div className="meta-value">{user?.phone || 'Not provided'}</div>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveSection('personal', { displayName: formValues.displayName, phone: formValues.phone });
              }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formValues.displayName}
                      onChange={e => setFormValues({ ...formValues, displayName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formValues.phone}
                      onChange={e => setFormValues({ ...formValues, phone: e.target.value.replace(/\D/g, '') })}
                      maxLength={10}
                      required
                    />
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Location</h3>
              {editStates.location && (
                <button
                  onClick={() => {
                    setEditStates(prev => ({ ...prev, location: false }));
                    setFormValues(prev => ({ ...prev, location: user?.location || '' }));
                  }}
                  style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Cancel
                </button>
              )}
            </div>

            {!editStates.location ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: formValues.location ? 'var(--dark)' : 'var(--text-muted)' }}>
                  <MapPin size={18} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{user?.location || 'Add your residential location'}</span>
                </div>
                <button
                  onClick={() => setEditStates(prev => ({ ...prev, location: true }))}
                  className="btn-edit"
                >
                  <Edit3 size={14} /> Edit
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveSection('location', { location: formValues.location });
              }} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Compass size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input
                    type="text"
                    className="form-input"
                    value={formValues.location}
                    onChange={e => setFormValues({ ...formValues, location: e.target.value })}
                    placeholder="Enter city, state, country (e.g. California)"
                    style={{ paddingLeft: '44px' }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.88rem', borderRadius: '8px' }}>
                  Save changes
                </button>
              </form>
            )}
          </div>

          {/* BIOGRAPHY CARD */}
          <div id="bio-section" className="card card-p transition-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Bio</h3>
              {!editStates.bio ? (
                <button
                  onClick={() => setEditStates(prev => ({ ...prev, bio: true }))}
                  className="btn-edit"
                >
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditStates(prev => ({ ...prev, bio: false }));
                    setFormValues(prev => ({ ...prev, bio: user?.bio || '' }));
                  }}
                  style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Cancel
                </button>
              )}
            </div>

            {!editStates.bio ? (
              <p style={{
                fontSize: '0.92rem', color: user?.bio ? 'var(--dark)' : 'var(--text-muted)',
                lineHeight: 1.6, whiteSpace: 'pre-line'
              }}>
                {user?.bio || "Tell us about yourself! E.g. Interests, coding goals, projects or subjects you're learning..."}
              </p>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveSection('bio', { bio: formValues.bio });
              }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <textarea
                  className="form-input"
                  rows={4}
                  value={formValues.bio}
                  onChange={e => setFormValues({ ...formValues, bio: e.target.value })}
                  placeholder="Write a brief biography description about your skills, classes, or coding ambitions..."
                  style={{ resize: 'none', padding: '16px' }}
                  required
                />
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
                <button
                  onClick={() => setEditStates(prev => ({ ...prev, bank: true }))}
                  className="btn-edit"
                >
                  <Edit3 size={14} /> Edit
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditStates(prev => ({ ...prev, bank: false }));
                    setFormValues(prev => ({ ...prev, bankAccount: user?.bankAccount || '' }));
                  }}
                  style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Cancel
                </button>
              )}
            </div>

            {!editStates.bank ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: 'rgba(83,109,254,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                }}>
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
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveSection('bank', { bankAccount: formValues.bankAccount });
              }} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  value={formValues.bankAccount}
                  onChange={e => setFormValues({ ...formValues, bankAccount: e.target.value.replace(/[^0-9A-Za-z@.]/g, '') })}
                  placeholder="Enter UPI ID or Bank Account Details"
                  style={{ flex: 1, minWidth: '200px' }}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.88rem', borderRadius: '8px' }}>
                  Save changes
                </button>
              </form>
            )}
          </div>

          {/* ONBOARDING TOUR CARD */}
          <div id="tour-settings-section" className="card card-p transition-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: 'rgba(83,109,254,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
              }}>
                <Compass size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Onboarding Tutorial</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Restart the guided tour to walk through key dashboard features.</p>
              </div>
            </div>
            <button
              onClick={handleResetTour}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px' }}
            >
              Show Tour Again
            </button>
          </div>

          {/* NOTIFICATIONS CARD */}
          <div id="notifications-section" className="card card-p transition-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,167,38,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)'
              }}>
                <Bell size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Notifications preference</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Receive live dashboard alerts, assignment deadlines and fee slips</p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              style={{
                width: 52,
                height: 28,
                borderRadius: 100,
                background: formValues.notificationsEnabled ? 'var(--success)' : '#E8EDF5',
                border: '1.5px solid var(--border)',
                padding: 3,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: formValues.notificationsEnabled ? 'flex-end' : 'flex-start',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <motion.div
                layout
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--white)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
            </button>
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
                    item.sectionId === 'location-section' ? 'location' :
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
