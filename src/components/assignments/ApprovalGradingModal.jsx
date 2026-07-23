import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, CheckCircle, XCircle, Sparkles, Send } from 'lucide-react';
import { BONUS_BADGES, approveAndGradeAssignment, rejectAssignmentSubmission } from '../../services/collaborativeAssignmentService';

const ApprovalGradingModal = ({ isOpen, onClose, assignment, currentUser, onGraded }) => {
  const [marks, setMarks] = useState(assignment?.marks || 88);
  const [feedback, setFeedback] = useState(assignment?.feedback || '');
  const [selectedBadges, setSelectedBadges] = useState(assignment?.bonusBadges || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !assignment) return null;

  const toggleBadge = (badgeId) => {
    if (selectedBadges.includes(badgeId)) {
      setSelectedBadges(prev => prev.filter(id => id !== badgeId));
    } else {
      setSelectedBadges(prev => [...prev, badgeId]);
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (marks < 0 || marks > 100) {
      setErrorMsg('Marks must be between 0 and 100.');
      return;
    }

    setIsSubmitting(true);
    try {
      await approveAndGradeAssignment(assignment.id, marks, selectedBadges, feedback, currentUser);
      if (onGraded) onGraded('approved');
      onClose();
    } catch (err) {
      console.error('Approval failed:', err);
      setErrorMsg('Failed to approve assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await rejectAssignmentSubmission(assignment.id, feedback || 'Needs minor revisions before approval.', currentUser);
      if (onGraded) onGraded('rejected');
      onClose();
    } catch (err) {
      console.error('Rejection failed:', err);
      setErrorMsg('Failed to reject submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          style={{
            background: 'var(--white, #FFFFFF)',
            color: 'var(--text-primary, #121212)',
            borderRadius: '24px',
            maxWidth: '580px',
            width: '100%',
            maxHeight: '90dvh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: 'var(--shadow-xl)',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Review & Grade Assignment</h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{assignment.title} · Team Scorecard</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleApprove} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Marks Input */}
            <div>
              <label className="form-label">Marks Awarded (0 - 100) *</label>
              <input
                type="number"
                min={0}
                max={100}
                required
                className="form-input"
                value={marks}
                onChange={e => setMarks(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}
              />
            </div>

            {/* Bonus Badges Multi-select */}
            <div>
              <label className="form-label">Award Bonus Team Badges</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                {BONUS_BADGES.map(badge => {
                  const isSelected = selectedBadges.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      onClick={() => toggleBadge(badge.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: isSelected ? `1.5px solid ${badge.color}` : '1px solid var(--border)',
                        background: isSelected ? `${badge.color}15` : 'var(--bg)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 800 : 500
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{badge.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{badge.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review Feedback */}
            <div>
              <label className="form-label">Review Remarks & Feedback</label>
              <textarea
                rows={3}
                placeholder="Write constructive notes for the team..."
                className="form-input"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ flex: 2, padding: '12px', borderRadius: '12px', fontWeight: 800, background: 'var(--success, #22C55E)', border: 'none' }}
              >
                Approve & Publish Marks ({marks}/100)
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 800, color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}
              >
                Reject & Reopen
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ApprovalGradingModal;
