import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Sparkles, Coins, Flame, ArrowRight } from 'lucide-react';
import { getDailyMissions, claimMissionReward } from '../../services/achievementService';

const DailyMissionsWidget = ({ userId, onRewardClaimed }) => {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMissions = async () => {
      const list = await getDailyMissions(userId);
      setMissions(list);
      setLoading(false);
    };
    fetchMissions();
  }, [userId]);

  const handleClaim = async (missionId) => {
    const res = await claimMissionReward(userId, missionId);
    if (res) {
      setMissions(prev => prev.map(m => m.id === missionId ? { ...m, completed: true } : m));
      if (onRewardClaimed) onRewardClaimed(res);
    }
  };

  const completedCount = missions.filter(m => m.completed).length;
  const progressPct = missions.length > 0 ? Math.round((completedCount / missions.length) * 100) : 0;

  return (
    <div className="card card-p" style={{ background: 'var(--white)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
            AI Daily Missions
          </span>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', fontWeight: 800 }}>
            Daily Habit Builder
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)' }}>
            {completedCount} / {missions.length} Done
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #536DFE, #10B981)', transition: 'width 0.4s ease' }} />
      </div>

      {/* Missions Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
        {missions.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: m.completed ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg)',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
              <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {m.title}
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {m.desc}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                +{m.xp} XP · +{m.coins} 🪙
              </div>
              {m.completed ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 800, color: '#22C55E' }}>
                  <CheckCircle size={16} /> Claimed
                </span>
              ) : (
                <button
                  onClick={() => handleClaim(m.id)}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', fontWeight: 800 }}
                >
                  Claim
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyMissionsWidget;
