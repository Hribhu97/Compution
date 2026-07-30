import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Award, Lock, CheckCircle, Sparkles, Coins, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAcademicPassProgress } from '../../services/achievementService';
import CampusStoreModal from '../../components/achievements/CampusStoreModal';

const AcademicPassPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [coins, setCoins] = useState(user?.campusCoins || 0);

  const totalXP = user?.xp || 0;
  const passInfo = getAcademicPassProgress(totalXP);

  const handlePurchaseComplete = (newCoinsBalance) => {
    setCoins(newCoinsBalance);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: 'var(--text-primary)' }}
    >
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B, #312E81)',
        color: '#FFFFFF',
        borderRadius: '24px',
        padding: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        <div>
          <button
            onClick={() => navigate('/dashboard/achievements')}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 14px', borderRadius: '100px', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}
          >
            <ArrowLeft size={14} /> Back to Achievements
          </button>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, margin: '0 0 6px 0', color: '#FFFFFF' }}>
            Academic Pass · 100 Levels
          </h1>
          <p style={{ margin: 0, color: '#A5B4FC', fontSize: '0.95rem' }}>
            Earn levels through attendance, quizzes, assignments, and study consistency.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: '16px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#A5B4FC' }}>Current Tier</span>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#F59E0B' }}>Level {passInfo.currentLevel}</h2>
          </div>

          <button
            onClick={() => setIsStoreOpen(true)}
            className="btn btn-primary"
            style={{ padding: '14px 24px', borderRadius: '100px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ShoppingBag size={18} /> Campus Store (🪙 {coins})
          </button>
        </div>
      </div>

      {/* Progress Level Bar Card */}
      <div className="card card-p" style={{ background: 'var(--white)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 800 }}>
          <span>Level {passInfo.currentLevel} Progress</span>
          <span style={{ color: 'var(--primary)' }}>{passInfo.currentLevelXP} / {passInfo.xpPerLevel} XP ({passInfo.levelPercent}%)</span>
        </div>
        <div style={{ height: 12, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${passInfo.levelPercent}%`, background: 'linear-gradient(90deg, #536DFE, #7C4DFF)', transition: 'width 0.6s ease' }} />
        </div>
      </div>

      {/* 100 Levels Rewards Roadmap Grid */}
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px 0' }}>
          100-Level Academic Pass Rewards
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {passInfo.rewardsRoadmap.slice(0, 30).map((lvl) => (
            <div
              key={lvl.level}
              style={{
                background: lvl.isUnlocked ? 'rgba(34,197,94,0.06)' : 'var(--white)',
                border: lvl.isUnlocked ? '1.5px solid #22C55E' : '1px solid var(--border)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                opacity: lvl.isUnlocked ? 1 : 0.75
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: lvl.isUnlocked ? '#22C55E' : 'var(--text-muted)' }}>
                  LEVEL {lvl.level}
                </span>
                {lvl.isUnlocked ? <CheckCircle size={18} style={{ color: '#22C55E' }} /> : <Lock size={16} style={{ color: 'var(--text-muted)' }} />}
              </div>

              <div>
                <div style={{ fontSize: '2rem', margin: '4px 0' }}>{lvl.icon}</div>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800 }}>{lvl.rewardTitle}</h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lvl.rewardType}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campus Store Modal */}
      <CampusStoreModal
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
        userId={user?.uid}
        userCoins={coins}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </motion.div>
  );
};

export default AcademicPassPage;
