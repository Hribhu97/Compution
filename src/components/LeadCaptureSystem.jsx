import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, User, GraduationCap, CheckCircle, HelpCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const LeadCaptureSystem = () => {
  const [activeModal, setActiveModal] = useState(null); // 'exit_intent' | 'idle_user' | 'parent_enquiry'
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', courseClass: '', interestedCourse: '' });
  const [submitting, setSubmitting] = useState(false);

  // Keep track of which triggers occurred in the current session
  const triggeredSession = useRef({ exit_intent: false, idle_user: false, parent_enquiry: false });
  const idleTimer = useRef(null);

  // Setup triggers
  useEffect(() => {
    // 1. Exit Intent Trigger (Desktop only, cursor exits viewport at the top)
    const handleMouseLeave = (e) => {
      if (e.clientY < 5 && !triggeredSession.current.exit_intent && !activeModal) {
        triggeredSession.current.exit_intent = true;
        setActiveModal('exit_intent');
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    // 2. Idle User Trigger (60 seconds inactivity)
    const resetIdleTimer = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (triggeredSession.current.idle_user) return;

      idleTimer.current = setTimeout(() => {
        if (!activeModal && !triggeredSession.current.idle_user) {
          triggeredSession.current.idle_user = true;
          setActiveModal('idle_user');
        }
      }, 60 * 1000); // 60 seconds
    };

    // Listen to user interactions to reset idle timer
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => document.addEventListener(event, resetIdleTimer));
    resetIdleTimer();

    // 3. Parent Enquiry Trigger (Scroll past 40% height of page)
    const handleScroll = () => {
      if (triggeredSession.current.parent_enquiry || activeModal) return;

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;

      const scrolled = (window.scrollY / totalHeight) * 100;
      if (scrolled > 40) {
        triggeredSession.current.parent_enquiry = true;
        setActiveModal('parent_enquiry');
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      events.forEach(event => document.removeEventListener(event, resetIdleTimer));
      window.removeEventListener('scroll', handleScroll);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [activeModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    setSubmitting(true);
    try {
      const leadsRef = collection(db, 'leadCaptures');
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        course: formData.interestedCourse || formData.courseClass || 'General inquiry',
        class: formData.courseClass || '',
        source: activeModal,
        status: 'new', // 'new' | 'contacted' | 'converted'
        createdAt: serverTimestamp()
      };
      
      await addDoc(leadsRef, payload);
      
      // Send data to the two WhatsApp numbers
      const messageText = encodeURIComponent(
        `Hello, I would like to request course details / make a quick enquiry.\n\n` +
        `Name: ${formData.name.trim()}\n` +
        `Phone: ${formData.phone.trim()}\n` +
        `Class/Grade: ${formData.courseClass || 'N/A'}\n` +
        `Interested Course: ${formData.interestedCourse || 'N/A'}`
      );
      
      window.open(`https://wa.me/919674035542?text=${messageText}`, '_blank');
      window.open(`https://wa.me/916290935898?text=${messageText}`, '_blank');

      setSubmitted(true);
      
      // Auto close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      console.error("Error saving lead capture:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setActiveModal(null);
    setSubmitted(false);
    setFormData({ name: '', phone: '', courseClass: '', interestedCourse: '' });
  };

  if (!activeModal) return null;

  // Configurations for each modal source
  const modalConfig = {
    exit_intent: {
      title: 'Leaving so soon? 🚀',
      subtitle: 'Need help selecting a course? Book a free consultation with our experts.',
      showCourseInput: true,
      submitLabel: 'Book Consultation'
    },
    idle_user: {
      title: 'Need any assistance? 💬',
      subtitle: 'Have questions about our syllabus or classroom batches? Talk to our team.',
      showCourseInput: false,
      submitLabel: 'Get Call Back'
    },
    parent_enquiry: {
      title: 'Parent Quick Enquiry 🎓',
      subtitle: 'Request course details, fees structure, and batch schedules for your child.',
      showCourseInput: true,
      showInterestedCourse: true,
      submitLabel: 'Request Details'
    }
  };

  const config = modalConfig[activeModal];

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 15, 25, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            background: 'var(--surface-elevated, #FFFFFF)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            maxWidth: '480px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 32px 64px rgba(0,0,0,0.25)',
            position: 'relative',
            color: 'var(--text-primary)'
          }}
        >
          {/* Close button */}
          <button 
            onClick={handleClose} 
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>

          {!submitted ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'rgba(83,109,254,0.08)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <HelpCircle size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>{config.title}</h3>
              </div>
              
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {config.subtitle}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder="Enter name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>

                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit phone number"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>

                {config.showCourseInput && (
                  <div style={{ position: 'relative' }}>
                    <GraduationCap size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      required
                      placeholder="Class / Grade (e.g. Class 11)"
                      value={formData.courseClass}
                      onChange={e => setFormData({ ...formData, courseClass: e.target.value })}
                      className="form-input"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>
                )}

                {config.showInterestedCourse && (
                  <select
                    value={formData.interestedCourse}
                    onChange={e => setFormData({ ...formData, interestedCourse: e.target.value })}
                    className="form-input"
                    required
                  >
                    <option value="" disabled>Select interested course</option>
                    <option value="Class XI CS">Class XI Computer Science</option>
                    <option value="Class XII CS">Class XII Computer Science</option>
                    <option value="Python Mastery">Python programming</option>
                    <option value="Java Development">Java programming</option>
                    <option value="C & C++ Fundamentals">C & C++ fundamentals</option>
                    <option value="DSA">Data Structures & Algorithms</option>
                    <option value="Web Development">Web Development (HTML/CSS/JS)</option>
                  </select>
                )}
              </div>

              <button 
                type="submit" 
                disabled={submitting} 
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', marginTop: '8px', fontSize: '0.95rem', justifyContent: 'center' }}
              >
                {submitting ? 'Submitting request...' : config.submitLabel}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(102,187,106,0.1)', color: 'var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <CheckCircle size={32} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>Enquiry submitted!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', lineHeight: 1.5 }}>
                Thank you! Our growth counselor will contact you shortly on your provided number.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LeadCaptureSystem;
