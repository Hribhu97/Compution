import React from 'react';
import { motion } from 'framer-motion';

const PERF_CONFIG = {
  excellent:      { label: 'Excellent',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   emoji: '⭐', percent: 100 },
  good:           { label: 'Good',           color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  emoji: '👍', percent: 75  },
  average:        { label: 'Average',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  emoji: '📊', percent: 50  },
  needs_practice: { label: 'Needs Practice', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   emoji: '🔄', percent: 25  },
};

const SIZE = 80;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

const PerformanceMeter = ({ performance = 'good', size = SIZE, label = true }) => {
  const cfg = PERF_CONFIG[performance] || PERF_CONFIG.good;
  const dashOffset = CIRC * (1 - cfg.percent / 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none" stroke={cfg.color} strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size > 60 ? '1.6rem' : '1.2rem',
        }}>
          {cfg.emoji}
        </div>
      </div>
      {label && (
        <span style={{
          fontSize: '0.75rem', fontWeight: 700,
          color: cfg.color, background: cfg.bg,
          padding: '3px 10px', borderRadius: '100px',
          border: `1px solid ${cfg.color}30`,
        }}>
          {cfg.label}
        </span>
      )}
    </div>
  );
};

export const PerformanceSelector = ({ value, onChange }) => {
  const options = ['excellent', 'good', 'average', 'needs_practice'];
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      {options.map(opt => {
        const cfg = PERF_CONFIG[opt];
        const selected = value === opt;
        return (
          <motion.button
            key={opt}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(opt)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '10px 16px', borderRadius: '14px', cursor: 'pointer',
              background: selected ? cfg.bg : 'rgba(248,250,252,1)',
              border: `2px solid ${selected ? cfg.color : 'rgba(226,232,240,1)'}`,
              outline: 'none', transition: 'all 0.2s ease',
              boxShadow: selected ? `0 4px 16px ${cfg.color}30` : 'none',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>{cfg.emoji}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: selected ? cfg.color : '#64748b' }}>
              {cfg.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default PerformanceMeter;
