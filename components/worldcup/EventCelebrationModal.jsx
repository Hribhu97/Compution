import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Sparkles, ArrowRight, X } from 'lucide-react';

const EventCelebrationModal = ({ isOpen, onClose, onViewResults }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
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
            border: '2px solid #F59E0B',
            borderRadius: '28px',
            maxWidth: '480px',
            width: '100%',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(245, 158, 11, 0.3)',
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
            animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            style={{ fontSize: '4.5rem', marginBottom: '16px' }}
          >
            🏆
          </motion.div>

          <span style={{
            background: 'rgba(245, 158, 11, 0.2)',
            color: '#F59E0B',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            padding: '4px 14px',
            borderRadius: '100px',
            fontSize: '0.75rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            EVENT CONCLUDED
          </span>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '12px 0 6px 0', color: '#FFFFFF' }}>
            WORLD CUP MANIA HAS ENDED
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '0 0 24px 0' }}>
            Congratulations to all participants! Champions have emerged.
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '28px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: '#94A3B8' }}>Winner Team</span>
              <strong style={{ color: '#F59E0B' }}>🇮🇹 ITALY (2,840 pts)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: '#94A3B8' }}>Tournament Champion</span>
              <strong style={{ color: '#FFFFFF' }}>👑 Mayukh Das (940 pts)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: '#94A3B8' }}>Runner Up</span>
              <strong style={{ color: '#CBD5E1' }}>🥈 Sreeparna Ghosh</strong>
            </div>
          </div>

          <button
            onClick={() => {
              if (onViewResults) onViewResults();
            }}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              border: 'none',
              color: '#000000',
              fontWeight: 900,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)'
            }}
          >
            View Full Results & Your Stats <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EventCelebrationModal;
