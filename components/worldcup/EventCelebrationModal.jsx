import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Sparkles, ArrowRight, X, Star, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const EventCelebrationModal = ({ isOpen, onClose, onViewResults }) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  const handleClose = () => {
    localStorage.setItem('worldCupResultsViewed', 'true');
    localStorage.setItem('hallViewed_season2026', 'true');
    window.dispatchEvent(new Event('hall-viewed-updated'));
    if (onClose) onClose();
  };

  const handleViewResults = () => {
    localStorage.setItem('worldCupResultsViewed', 'true');
    localStorage.setItem('hallViewed_season2026', 'true');
    window.dispatchEvent(new Event('hall-viewed-updated'));
    if (onViewResults) onViewResults();
  };

  const personalRank = user?.wcRank || 24;
  const questionsAnswered = user?.wcQuestions || 92;
  const correct = user?.wcCorrect || 81;
  const accuracy = Math.round((correct / questionsAnswered) * 100);
  const totalPoints = user?.score || 1640;
  const userTeam = user?.chosenTeam || 'Argentina';

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(11, 15, 25, 0.88)',
        backdropFilter: 'blur(12px)',
        overflowY: 'auto'
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
            maxWidth: '520px',
            width: '100%',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(245, 158, 11, 0.35)',
            position: 'relative',
            maxHeight: '90dvh',
            overflowY: 'auto'
          }}
        >
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
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
            style={{ fontSize: '4rem', marginBottom: '12px' }}
          >
            🏆
          </motion.div>

          <span style={{
            background: 'rgba(245, 158, 11, 0.2)',
            color: '#F59E0B',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            padding: '6px 16px',
            borderRadius: '100px',
            fontSize: '0.75rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            EVENT CONCLUDED & ARCHIVED
          </span>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '14px 0 6px 0', color: '#FFFFFF' }}>
            WORLD CUP MANIA HAS OFFICIALLY ENDED
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: '0 0 20px 0' }}>
            Congratulations to all participants! Winners & Champions declared.
          </p>

          {/* Leaderboard Podium Summary */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '18px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '20px',
            textAlign: 'left',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>🏆 Champion Team</span>
              <strong style={{ color: '#F59E0B', fontWeight: 900 }}>ARGENTINA (2,840 pts)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>👑 Highest Scorer</span>
              <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>Mayukh Das (1,820 pts · 96% Acc)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>🥈 Runner-up Team</span>
              <strong style={{ color: '#CBD5E1', fontWeight: 700 }}>BRAZIL (2,410 pts)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>🥉 Third Place Team</span>
              <strong style={{ color: '#D97706', fontWeight: 700 }}>GERMANY (2,180 pts)</strong>
            </div>
          </div>

          {/* Personal Tournament Summary Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(83,109,254,0.12) 0%, rgba(94,107,255,0.06) 100%)',
            border: '1px solid rgba(83,109,254,0.3)',
            borderRadius: '18px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', fontWeight: 900, color: '#7EC8FF', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={16} /> Your Tournament Summary ({userTeam})
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block' }}>Rank</span>
                <strong style={{ fontSize: '1rem', color: '#F59E0B' }}>#{personalRank}</strong>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block' }}>Accuracy</span>
                <strong style={{ fontSize: '1rem', color: '#22C55E' }}>{accuracy}%</strong>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block' }}>Total Points</span>
                <strong style={{ fontSize: '1rem', color: '#FFFFFF' }}>{totalPoints.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={handleViewResults}
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
              boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)',
              minHeight: '44px'
            }}
          >
            View Final Results & Hall of Champions <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EventCelebrationModal;
