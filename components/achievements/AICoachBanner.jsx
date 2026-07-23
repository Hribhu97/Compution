import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Brain, Flame, Target } from 'lucide-react';

const AICoachBanner = ({ user, onActionClick }) => {
  const xp = user?.xp || 0;
  const streak = user?.streak || 5;

  const insights = [
    { title: 'SQL Accuracy Boost', text: 'You improved your SQL Join accuracy by 18% this week!', action: 'Take SQL Quiz' },
    { title: 'Badge Unlocking Soon', text: 'You are only 5 quizzes away from unlocking SQL Master!', action: 'View Badge' },
    { title: 'Streak Protection Active', text: `Keep your ${streak}-day learning streak alive by completing today's chapter!`, action: 'Study Now' }
  ];

  const currentInsight = insights[0];

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(83, 109, 254, 0.08) 0%, rgba(124, 77, 255, 0.08) 100%)',
      border: '1.5px solid rgba(83, 109, 254, 0.25)',
      borderRadius: '20px',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '240px' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'var(--primary)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          boxShadow: '0 4px 12px rgba(83, 109, 254, 0.3)'
        }}>
          🤖
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Personal AI Learning Coach
            </span>
            <Sparkles size={12} style={{ color: 'var(--primary)' }} />
          </div>
          <h4 style={{ margin: '2px 0 0 0', fontSize: '0.98rem', fontWeight: 800 }}>
            {currentInsight.title}: {currentInsight.text}
          </h4>
        </div>
      </div>

      <button
        onClick={onActionClick}
        className="btn btn-primary"
        style={{
          padding: '8px 16px',
          fontSize: '0.82rem',
          borderRadius: '100px',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {currentInsight.action} <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default AICoachBanner;
