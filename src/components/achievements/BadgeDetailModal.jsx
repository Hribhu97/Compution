import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, CheckCircle, Lock, Sparkles, Coins, Users, Calendar, BookOpen } from 'lucide-react';
import { RARITY_CONFIG } from '../../services/achievementService';

const BadgeDetailModal = ({ badge, isOpen, onClose }) => {
  if (!isOpen || !badge) return null;

  const rarity = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.common;

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
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            background: 'var(--white, #FFFFFF)',
            color: 'var(--text-primary, #121212)',
            borderRadius: '24px',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xl)',
            border: `2px solid ${rarity.border}`
          }}
        >
          {/* Top Header Banner */}
          <div style={{
            background: rarity.bg,
            padding: '32px 24px',
            textAlign: 'center',
            position: 'relative'
          }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(0,0,0,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            {/* Badge Icon Display */}
            <motion.div
              animate={{ rotate: badge.isUnlocked ? [0, -5, 5, 0] : 0 }}
              transition={{ repeat: Infinity, duration: 4 }}
              style={{
                fontSize: '4.5rem',
                margin: '0 auto 12px auto',
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'var(--white)',
                boxShadow: rarity.glow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `3px solid ${rarity.color}`
              }}
            >
              {badge.icon}
            </motion.div>

            <span style={{
              background: rarity.color,
              color: '#FFFFFF',
              fontSize: '0.72rem',
              fontWeight: 900,
              padding: '3px 10px',
              borderRadius: '100px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {rarity.label} · {badge.category}
            </span>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '8px 0 4px 0' }}>
              {badge.title}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
              {badge.description}
            </p>
          </div>

          {/* Modal Body Details */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Progress Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                <span>{badge.isUnlocked ? 'Completed' : 'Mastery Progress'}</span>
                <span style={{ color: rarity.color }}>
                  {badge.isUnlocked ? '100%' : `${badge.percent}% (${badge.progress} / ${badge.target} ${badge.unit})`}
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${badge.percent}%`,
                  background: rarity.color,
                  transition: 'width 0.6s ease'
                }} />
              </div>
              {!badge.isUnlocked && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Need <strong>{badge.target - badge.progress}</strong> more {badge.unit} to unlock.
                </div>
              )}
            </div>

            {/* Rewards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(83,109,254,0.06)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={20} style={{ color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>XP Reward</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>+{badge.xpReward} XP</strong>
                </div>
              </div>

              <div style={{ background: 'rgba(245,158,11,0.06)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Coins size={20} style={{ color: '#F59E0B' }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Campus Coins</div>
                  <strong style={{ fontSize: '0.95rem', color: '#F59E0B' }}>+{badge.coinReward} Coins</strong>
                </div>
              </div>
            </div>

            {/* Skills Acquired */}
            {badge.skills && badge.skills.length > 0 && (
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Skills Reinforced
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {badge.skills.map((skill, idx) => (
                    <span key={idx} style={{ background: 'var(--surface)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Faculty Notes if available */}
            {badge.facultyNote && (
              <div style={{ background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22C55E', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem' }}>
                <strong>Faculty Endorsement:</strong> "{badge.facultyNote}"
              </div>
            )}

            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ padding: '12px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, marginTop: '8px' }}
            >
              Close Details
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BadgeDetailModal;
