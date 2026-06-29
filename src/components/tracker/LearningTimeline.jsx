import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, PlayCircle, Lock, Sparkles } from 'lucide-react';

const STATUS_CONFIG = {
  completed: {
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    icon: CheckCircle2,
    label: 'Completed',
  },
  current: {
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.3)',
    icon: PlayCircle,
    label: 'In Progress',
  },
  locked: {
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.06)',
    border: 'rgba(148,163,184,0.15)',
    icon: Lock,
    label: 'Upcoming',
  },
};

const Sparkle = ({ x, y }) => (
  <motion.div
    initial={{ scale: 0, opacity: 1, x, y }}
    animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0], y: y - 30 }}
    transition={{ duration: 0.7, ease: 'easeOut' }}
    style={{
      position: 'absolute', width: 8, height: 8,
      borderRadius: '50%', background: '#fbbf24',
      pointerEvents: 'none', zIndex: 10,
    }}
  />
);

const TopicNode = ({ entry, index, isNew }) => {
  const status = entry.status || 'locked';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.locked;
  const Icon = cfg.icon;
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    if (isNew && status === 'completed') {
      const s = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 60,
      }));
      setSparkles(s);
      setTimeout(() => setSparkles([]), 800);
    }
  }, [isNew, status]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative' }}
    >
      {/* Connector line */}
      {index > 0 && (
        <div style={{
          position: 'absolute', left: '19px', top: '-24px',
          width: '2px', height: '24px',
          background: status === 'completed'
            ? 'linear-gradient(to bottom, #22c55e, rgba(34,197,94,0.3))'
            : 'rgba(148,163,184,0.2)',
        }} />
      )}

      {/* Icon node */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <motion.div
          animate={status === 'current' ? {
            boxShadow: ['0 0 0 0 rgba(99,102,241,0.3)', '0 0 0 10px rgba(99,102,241,0)', '0 0 0 0 rgba(99,102,241,0)'],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: cfg.bg,
            border: `2px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon size={18} color={cfg.color} strokeWidth={2.5} />
        </motion.div>
        {sparkles.map(s => <Sparkle key={s.id} x={s.x} y={s.y} />)}
      </div>

      {/* Content card */}
      <motion.div
        whileHover={status !== 'locked' ? { y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } : {}}
        style={{
          flex: 1,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: '14px',
          padding: '14px 16px',
          marginBottom: '8px',
          cursor: status !== 'locked' ? 'default' : 'not-allowed',
          opacity: status === 'locked' ? 0.6 : 1,
          transition: 'all 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: cfg.color, background: `${cfg.border}`,
              padding: '2px 8px', borderRadius: '100px',
            }}>
              {cfg.label}
            </span>
            {entry.chapter && (
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>{entry.chapter}</span>
            )}
          </div>
          {entry.classDate && (
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
              {entry.classDate?.toDate
                ? entry.classDate.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : entry.classDate}
            </span>
          )}
        </div>

        <h4 style={{ margin: 0, fontSize: '0.97rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
          {entry.topic}
        </h4>

        {entry.description && (
          <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
            {entry.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
          {entry.homework && (
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              📝 Homework assigned
            </span>
          )}
          {entry.practicalWork && (
            <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              💻 Practical included
            </span>
          )}
          {entry.performance && (
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px',
              background: entry.performance === 'excellent' ? 'rgba(34,197,94,0.1)'
                : entry.performance === 'good' ? 'rgba(59,130,246,0.1)'
                  : entry.performance === 'average' ? 'rgba(245,158,11,0.1)'
                    : 'rgba(239,68,68,0.1)',
              color: entry.performance === 'excellent' ? '#16a34a'
                : entry.performance === 'good' ? '#2563eb'
                  : entry.performance === 'average' ? '#d97706'
                    : '#dc2626',
            }}>
              {entry.performance === 'excellent' ? '⭐ Excellent' : entry.performance === 'good' ? '👍 Good' : entry.performance === 'average' ? '📊 Average' : '🔄 Needs Practice'}
            </span>
          )}
          {entry.xpAwarded > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700 }}>
              +{entry.xpAwarded} XP
            </span>
          )}
        </div>

        {entry.teacherNote && (
          <div style={{
            marginTop: '10px', padding: '10px 12px',
            background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid #6366f1',
            borderRadius: '0 8px 8px 0', fontSize: '0.82rem', color: '#475569',
            fontStyle: 'italic',
          }}>
            💬 "{entry.teacherNote}"
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const LearningTimeline = ({ entries = [], courseName = '' }) => {
  const prevLength = useRef(0);
  const [newIndices, setNewIndices] = useState(new Set());

  useEffect(() => {
    if (entries.length > prevLength.current) {
      const idx = new Set();
      for (let i = prevLength.current; i < entries.length; i++) idx.add(i);
      setNewIndices(idx);
      setTimeout(() => setNewIndices(new Set()), 1000);
    }
    prevLength.current = entries.length;
  }, [entries.length]);

  const completed = entries.filter(e => e.status === 'completed').length;
  const total = entries.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ padding: '0' }}>
      {/* Course header & progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
              🚀 {courseName || 'Learning Journey'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.83rem', color: '#64748b' }}>
              {completed} of {total} topics completed
            </p>
          </div>
          <div style={{
            background: percent === 100 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(99,102,241,0.08)',
            color: percent === 100 ? '#fff' : '#6366f1',
            fontWeight: 800, fontSize: '1.2rem',
            padding: '8px 16px', borderRadius: '100px',
            boxShadow: percent === 100 ? '0 4px 16px rgba(245,158,11,0.35)' : 'none',
          }}>
            {percent}%
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '8px', background: 'rgba(148,163,184,0.15)', borderRadius: '100px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%',
              background: percent === 100
                ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              borderRadius: '100px',
            }}
          />
        </div>
      </div>

      {/* Timeline nodes */}
      <div style={{ position: 'relative' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📚</div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>No classes recorded yet.</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>Your journey starts with the first class!</p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <TopicNode
              key={entry.id || index}
              entry={entry}
              index={index}
              isNew={newIndices.has(index)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LearningTimeline;
