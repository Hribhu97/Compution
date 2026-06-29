import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Leaf, TreePine } from 'lucide-react';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const StreakWidget = ({ streakData = {}, compact = false }) => {
  const { currentStreak = 0, longestStreak = 0, attendanceDays = [] } = streakData;

  // Build last 7 days
  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return {
      dayLabel: DAY_LABELS[d.getDay()],
      dateStr: d.toISOString().split('T')[0],
      isToday: i === 6,
    };
  });

  const plantStage = currentStreak >= 30 ? 'tree' : currentStreak >= 7 ? 'plant' : 'seed';

  const PlantEmoji = () => {
    if (plantStage === 'tree') return (
      <motion.div
        animate={{ scale: [1, 1.05, 1], filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ fontSize: '2.2rem' }}
      >🌳</motion.div>
    );
    if (plantStage === 'plant') return (
      <motion.div
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: '2.2rem' }}
      >🌱</motion.div>
    );
    return <div style={{ fontSize: '2.2rem' }}>🌰</div>;
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: '20px',
      padding: compact ? '16px 20px' : '20px 24px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '12px',
            background: 'rgba(245,158,11,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Flame size={20} color="#f59e0b" fill="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Attendance Streak
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: currentStreak > 0 ? '#f59e0b' : '#94a3b8' }}>
                {currentStreak}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>days</span>
            </div>
          </div>
        </div>
        <PlantEmoji />
      </div>

      {/* 7-day grid */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {last7.map(({ dayLabel, dateStr, isToday }, i) => {
          const active = attendanceDays.includes(dateStr);
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>
                {dayLabel}
              </div>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                style={{
                  width: '100%', aspectRatio: '1',
                  borderRadius: '8px',
                  background: active
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : isToday
                      ? 'rgba(99,102,241,0.12)'
                      : 'rgba(148,163,184,0.1)',
                  border: isToday && !active ? '2px dashed rgba(99,102,241,0.4)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
                }}
              >
                {active && <span style={{ fontSize: '0.6rem' }}>✓</span>}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Milestones */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{
          flex: 1, padding: '8px 10px', borderRadius: '10px',
          background: 'rgba(248,250,252,1)', border: '1px solid rgba(226,232,240,1)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Best Streak</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>{longestStreak}d</div>
        </div>
        <div style={{
          flex: 1, padding: '8px 10px', borderRadius: '10px',
          background: currentStreak >= 7 ? 'rgba(34,197,94,0.06)' : 'rgba(248,250,252,1)',
          border: `1px solid ${currentStreak >= 7 ? 'rgba(34,197,94,0.2)' : 'rgba(226,232,240,1)'}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Next Reward</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: currentStreak >= 7 ? '#16a34a' : '#6366f1' }}>
            {currentStreak < 7 ? `${7 - currentStreak}d → 🌱` : currentStreak < 30 ? `${30 - currentStreak}d → 🌳` : '🏆 Max!'}
          </div>
        </div>
      </div>

      {/* Streak milestone messages */}
      <AnimatePresence>
        {currentStreak === 7 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              fontSize: '0.82rem', color: '#16a34a', fontWeight: 700, textAlign: 'center',
            }}
          >
            🌱 Amazing! 7-day streak unlocked your Growth Plant!
          </motion.div>
        )}
        {currentStreak === 30 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              fontSize: '0.82rem', color: '#d97706', fontWeight: 700, textAlign: 'center',
            }}
          >
            🌳 Legendary! 30-day streak — you've grown a Golden Tree!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreakWidget;
