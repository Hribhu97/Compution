import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star, TrendingUp } from 'lucide-react';
import { getLevel } from '../../services/trackerService';

const LEVEL_COLORS = [
  '#94a3b8', // 1 Seed
  '#22c55e', // 2 Sprout
  '#16a34a', // 3 Sapling
  '#06b6d4', // 4 Explorer
  '#3b82f6', // 5 Builder
  '#6366f1', // 6 Creator
  '#8b5cf6', // 7 Innovator
  '#f59e0b', // 8 Champion
  '#ef4444', // 9 Legend
  '#fbbf24', // 10 Grandmaster
];

const AnimatedCounter = ({ from, to, duration = 1200 }) => {
  const [value, setValue] = useState(from);
  const raf = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [to]);

  return <span>{value.toLocaleString()}</span>;
};

const XPProgressBar = ({ totalXP = 0 }) => {
  const levelInfo = getLevel(totalXP);
  const color = LEVEL_COLORS[levelInfo.level - 1] || '#6366f1';
  const prevXP = useRef(totalXP);
  const [showGain, setShowGain] = useState(null);

  useEffect(() => {
    const diff = totalXP - prevXP.current;
    if (diff > 0) {
      setShowGain(diff);
      setTimeout(() => setShowGain(null), 2500);
    }
    prevXP.current = totalXP;
  }, [totalXP]);

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: '20px',
      padding: '20px 24px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 140, height: 140, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '12px',
            background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} color={color} fill={color} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Experience Points
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.1 }}>
              <AnimatedCounter from={Math.max(0, totalXP - 50)} to={totalXP} /> XP
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            background: `${color}15`,
            color, fontWeight: 800, fontSize: '0.82rem',
            padding: '4px 12px', borderRadius: '100px',
            border: `1px solid ${color}30`,
          }}>
            Lv.{levelInfo.level} {levelInfo.title}
          </div>
          {levelInfo.next && (
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
              → {levelInfo.next.title} at {levelInfo.next.minXP} XP
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          height: '10px', background: 'rgba(148,163,184,0.12)',
          borderRadius: '100px', overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${levelInfo.progress}%` }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
              borderRadius: '100px',
              boxShadow: `0 2px 8px ${color}50`,
              position: 'relative',
            }}
          >
            {/* Shimmer */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '50%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              }}
            />
          </motion.div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: '#94a3b8' }}>
          <span>Lv.{levelInfo.level}</span>
          {levelInfo.next ? <span>{levelInfo.progress}% to Lv.{levelInfo.level + 1}</span> : <span>Max Level!</span>}
        </div>
      </div>

      {/* XP gain popup */}
      <AnimatePresence>
        {showGain && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -30, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.8 }}
            style={{
              position: 'absolute', top: 20, right: 24,
              background: `${color}`, color: '#fff',
              fontWeight: 800, fontSize: '0.9rem',
              padding: '4px 12px', borderRadius: '100px',
              boxShadow: `0 4px 16px ${color}60`,
              pointerEvents: 'none',
            }}
          >
            +{showGain} XP ✨
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default XPProgressBar;
