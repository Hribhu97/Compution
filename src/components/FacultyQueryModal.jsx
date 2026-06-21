import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

const FacultyQueryModal = ({ isOpen, onClose, student, faculty, triggerToast }) => {
  const [formData, setFormData] = useState({ subject: '', question: '', priority: 'Medium', attachmentUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resolvedFaculty, setResolvedFaculty] = useState(null);

  useEffect(() => {
    if (isOpen && faculty?.facultyId) {
      const fetchFacultyData = async () => {
        try {
          const docRef = doc(db, 'users', faculty.facultyId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setResolvedFaculty({
              ...faculty,
              ...docSnap.data()
            });
          } else {
            setResolvedFaculty(faculty);
          }
        } catch (err) {
          console.error("Error fetching faculty details:", err);
          setResolvedFaculty(faculty);
        }
      };
      fetchFacultyData();
    } else {
      setResolvedFaculty(null);
    }
  }, [isOpen, faculty]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.question.trim()) return;
    if (!faculty || !faculty.facultyId) {
      triggerToast('No assigned faculty mentor found to send query to!', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const activeFaculty = resolvedFaculty || faculty;
      const queriesRef = collection(db, 'facultyQueries');
      const payload = {
        studentId: student.uid || student.id,
        studentName: student.displayName || 'Student',
        studentClass: student.grade || 'Class 10',
        facultyId: faculty.facultyId,
        facultyName: activeFaculty.displayName || activeFaculty.facultyName || 'Faculty Mentor',
        question: formData.question.trim(),
        subject: formData.subject.trim(),
        priority: formData.priority,
        attachmentUrl: formData.attachmentUrl.trim() || '',
        status: 'Pending', // 'Pending' | 'Viewed' | 'Replied' | 'Resolved'
        createdAt: serverTimestamp()
      };

      // 1. Save in Firestore
      const docRef = await addDoc(queriesRef, payload);

      // 2. Email Fallback triggering collection (used by Firebase Trigger Email extension)
      if (activeFaculty.email) {
        await addDoc(collection(db, 'mail'), {
          to: activeFaculty.email,
          message: {
            subject: `[Compution Query] New doubt from ${payload.studentName}`,
            html: `
              <h3>New Student Query Submitted</h3>
              <p><b>Student:</b> ${payload.studentName} (${payload.studentClass})</p>
              <p><b>Subject:</b> ${payload.subject}</p>
              <p><b>Priority:</b> ${payload.priority}</p>
              <p><b>Question:</b> ${payload.question}</p>
              ${payload.attachmentUrl ? `<p><b>Attachment:</b> <a href="${payload.attachmentUrl}">${payload.attachmentUrl}</a></p>` : ''}
              <p>Please log in to your faculty dashboard to reply.</p>
            `
          }
        });
      }

      // 3. Generate WhatsApp Redirection
      const facultyPhone = activeFaculty.phone || '9674035542'; // fallback default
      const message = `Hello ${payload.facultyName},

A student has submitted a new query on Compution.

Student: ${payload.studentName}
Class: ${payload.studentClass}
Subject: ${payload.subject}
Question: ${payload.question}

View full details: https://compution.vercel.app/dashboard`;

      // Open WhatsApp automatically
      const whatsappUrl = `https://api.whatsapp.com/send?phone=91${facultyPhone}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      setSuccess(true);
      triggerToast('Query submitted and WhatsApp redirection triggered!', 'success');
      
      setTimeout(() => {
        setSuccess(false);
        setFormData({ subject: '', question: '', priority: 'Medium', attachmentUrl: '' });
        onClose();
      }, 2500);

    } catch (err) {
      console.error("Error submitting query:", err);
      triggerToast('Failed to submit doubt query.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
            maxWidth: '520px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 32px 64px rgba(0,0,0,0.25)',
            position: 'relative',
            color: 'var(--text-primary)'
          }}
        >
          <button 
            onClick={onClose} 
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

          {!success ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'rgba(83,109,254,0.08)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Ask Assigned Faculty Mentor</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Sending doubt to: <b>{faculty?.displayName || faculty?.facultyName || 'Faculty Mentor'}</b>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Subject / Topic</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Python Loops, SQL Join query"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="form-input"
                  />
                </label>

                <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Your Doubt Question</span>
                  <textarea
                    required
                    placeholder="Describe your query or paste code snippet here..."
                    rows={4}
                    value={formData.question}
                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                    className="form-input"
                    style={{ resize: 'vertical' }}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Priority Level</span>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      className="form-input"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </label>

                  <label className="form-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Attachment Link (Optional)</span>
                    <input
                      type="url"
                      placeholder="e.g. Drive, Github URL"
                      value={formData.attachmentUrl}
                      onChange={e => setFormData({ ...formData, attachmentUrl: e.target.value })}
                      className="form-input"
                    />
                  </label>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting} 
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', marginTop: '8px', fontSize: '0.95rem', justifyContent: 'center' }}
              >
                {submitting ? 'Submitting query...' : 'Submit Query & Open WhatsApp'}
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
              <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>Query Submitted!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', lineHeight: 1.5 }}>
                Query sent to your mentor. Opening WhatsApp redirection for direct follow-up.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FacultyQueryModal;
