import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, TrendingUp, Calendar, Zap, Coins, BookOpen, Flame } from 'lucide-react';

const Stat = ({ label, value, color, icon }) => (
  <div style={{
    flex: '1 1 120px',
    padding: '14px 16px',
    borderRadius: '14px',
    background: `${color}08`,
    border: `1px solid ${color}20`,
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{icon}</div>
    <div style={{ fontSize: '1.3rem', fontWeight: 900, color }}>{value}</div>
    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{label}</div>
  </div>
);

const WeeklySummary = ({ summary = {}, studentName = 'Student' }) => {
  const [expanded, setExpanded] = useState(false);
  const {
    classesAttended = 0,
    assignmentsGiven = 0,
    topicsCompleted = 0,
    xpEarned = 0,
    coinsEarned = 0,
    currentStreak = 0,
    consistencyScore = 0,
  } = summary;

  const now = new Date();
  const weekLabel = now.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' });

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          width: '100%', padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04))',
          border: 'none', cursor: 'pointer',
          borderBottom: expanded ? '1px solid rgba(226,232,240,1)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '12px',
            background: 'rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={18} color="#6366f1" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weekly Summary
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
              Week of {weekLabel}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, color: '#6366f1',
            background: 'rgba(99,102,241,0.08)', padding: '3px 10px', borderRadius: '100px',
          }}>
            +{xpEarned} XP
          </span>
          {expanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <Stat label="Classes Attended" value={classesAttended} color="#22c55e" icon="📅" />
              <Stat label="Assignments Given" value={assignmentsGiven} color="#f59e0b" icon="📝" />
              <Stat label="Topics Covered" value={topicsCompleted} color="#3b82f6" icon="📖" />
              <Stat label="XP Earned" value={`+${xpEarned}`} color="#6366f1" icon="⚡" />
              {currentStreak > 0 && <Stat label="Day Streak" value={`${currentStreak}🔥`} color="#f59e0b" icon="🔥" />}
            </div>

            {/* Consistency score */}
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Weekly Consistency</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#22c55e' }}>
                  {classesAttended > 0 ? Math.round((classesAttended / Math.max(classesAttended + 1, 5)) * 100) : 0}%
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(148,163,184,0.12)', borderRadius: '100px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${classesAttended > 0 ? Math.round((classesAttended / Math.max(classesAttended + 1, 5)) * 100) : 0}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '100px' }}
                />
              </div>
              <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                {classesAttended >= 5
                  ? "🏆 Outstanding week! You're in the top performer zone."
                  : classesAttended >= 3
                    ? "📈 Good progress this week. Keep the momentum going!"
                    : "💪 Every class counts. Show up more this week!"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeeklySummary;
