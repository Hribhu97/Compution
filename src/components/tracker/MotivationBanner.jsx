import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES = [
  { icon: '🌱', text: "You're growing consistently. Keep showing up!", tag: 'growth' },
  { icon: '🔥', text: "Your streak is on fire! Don't let it cool down.", tag: 'streak' },
  { icon: '🚀', text: "Every class brings you closer to your goal.", tag: 'progress' },
  { icon: '⭐', text: "Your dedication is noticed. Faculty is proud of your work.", tag: 'pride' },
  { icon: '🏆', text: "Consistency is the superpower. You have it.", tag: 'consistency' },
  { icon: '💡', text: "Learning is an investment that always pays back.", tag: 'wisdom' },
  { icon: '🎯', text: "Focus on progress, not perfection.", tag: 'mindset' },
  { icon: '📚', text: "Each topic you complete is a new skill unlocked.", tag: 'skills' },
  { icon: '🌟', text: "Small steps daily lead to massive results.", tag: 'motivation' },
  { icon: '💪', text: "Hard work today, success tomorrow. You're doing it!", tag: 'effort' },
];

const getDeterministicMessage = (studentId, streak) => {
  const seed = (studentId?.charCodeAt(0) || 0) + (new Date().getDay()) + (streak || 0);
  return MESSAGES[seed % MESSAGES.length];
};

const MotivationBanner = ({ studentId, streak = 0, recentAchievement = null }) => {
  const msg = getDeterministicMessage(studentId, streak);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [streak]);

  const streakMsg = streak >= 30
    ? { icon: '🌳', text: `Incredible! You've maintained a ${streak}-day streak. You're a legend!` }
    : streak >= 14
      ? { icon: '🔥', text: `${streak}-day streak! You're absolutely on fire right now!` }
      : streak >= 7
        ? { icon: '🌱', text: `${streak}-day streak! Your growth plant is thriving!` }
        : null;

  const display = recentAchievement
    ? { icon: '🏅', text: recentAchievement }
    : streakMsg || msg;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background shimmer */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '30%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              pointerEvents: 'none',
            }}
          />

          <div style={{
            width: 44, height: 44, borderRadius: '14px',
            background: 'rgba(99,102,241,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', flexShrink: 0,
          }}>
            {display.icon}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              Daily Motivation
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
              {display.text}
            </div>
          </div>

          <button
            onClick={() => setVisible(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', fontSize: '1rem', lineHeight: 1,
              padding: '4px', borderRadius: '6px',
              flexShrink: 0,
            }}
            title="Dismiss"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MotivationBanner;
