import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, RefreshCw, MessageSquare, X, ArrowRight, Sparkles } from 'lucide-react';
import { redoAssignmentAction } from '../../services/collaborativeAssignmentService';

const RejectionEncouragementModal = ({ isOpen, onClose, assignment, currentUser, onRedoUnlocked }) => {
  const [showFeedbackDetail, setShowFeedbackDetail] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  if (!isOpen || !assignment) return null;

  const handleRedo = async () => {
    setIsUnlocking(true);
    try {
      await redoAssignmentAction(assignment.id, currentUser);
      if (onRedoUnlocked) onRedoUnlocked();
      onClose();
    } catch (err) {
      console.error('Error unlocking redo action:', err);
    } finally {
      setIsUnlocking(false);
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
        padding: '20px',
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(12px)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            color: '#FFFFFF',
            border: '2px solid rgba(83, 109, 254, 0.4)',
            borderRadius: '28px',
            maxWidth: '520px',
            width: '100%',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(83, 109, 254, 0.25)',
            position: 'relative'
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>

          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(83, 109, 254, 0.15)',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <Heart size={32} fill="#6366F1" />
          </motion.div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0 0 8px 0', color: '#FFFFFF' }}>
            Keep Going! 💙
          </h2>

          <p style={{ fontSize: '0.95rem', color: '#CBD5E1', lineHeight: 1.6, margin: '0 0 20px 0' }}>
            Great attempts lead to great results. Your assignment needs a few improvements before approval.<br />
            <strong>Don't worry—you're already closer than when you started.</strong><br />
            Review the feedback below, make the suggested improvements, and submit it again.<br />
            We're excited to see your next version!
          </p>

          {/* Feedback Drawer */}
          {assignment.feedback && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 800, color: '#A5B4FC' }}>
                <MessageSquare size={16} /> Admin Feedback:
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#E2E8F0', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{assignment.feedback}"
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowFeedbackDetail(!showFeedbackDetail)}
              className="btn btn-secondary"
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Review Feedback
            </button>

            <button
              onClick={handleRedo}
              disabled={isUnlocking}
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #536DFE, #7C4DFF)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 10px 25px rgba(83, 109, 254, 0.4)'
              }}
            >
              <RefreshCw size={16} className={isUnlocking ? 'spin' : ''} /> Redo Assignment
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RejectionEncouragementModal;
