import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Trophy, Award, Search, Sparkles, Coins, Flame, Lock, CheckCircle, 
  ChevronRight, Filter, Shield, BookOpen, Star, ShoppingBag, ArrowLeft 
} from 'lucide-react';
import { 
  subscribeUserAchievements, RARITY_CONFIG, getAcademicPassProgress 
} from '../../services/achievementService';
import BadgeDetailModal from '../../components/achievements/BadgeDetailModal';
import DailyMissionsWidget from '../../components/achievements/DailyMissionsWidget';
import CampusStoreModal from '../../components/achievements/CampusStoreModal';

const AchievementsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [topTab, setTopTab] = useState(
    tabParam === 'academic-pass' ? 'academic-pass' : 'awards'
  );

  const [achievements, setAchievements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRarity, setSelectedRarity] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [coins, setCoins] = useState(user?.campusCoins || 0);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (tabParam === 'academic-pass' && topTab !== 'academic-pass') {
      setTopTab('academic-pass');
    } else if ((!tabParam || tabParam === 'awards') && topTab !== 'awards') {
      setTopTab('awards');
    }
  }, [tabParam]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserAchievements(user.uid, (data) => {
      setAchievements(data);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleTopTabChange = (key) => {
    setTopTab(key);
    setSearchParams({ tab: key });
  };

  const categories = ['All', 'Attendance', 'Programming', 'Productivity', 'Academic', 'Software Skills', 'Community', 'Hidden'];
  const rarities = ['All', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  const filteredBadges = achievements.filter((badge) => {
    const matchesCategory = selectedCategory === 'All' || badge.category === selectedCategory;
    const matchesRarity = selectedRarity === 'All' || badge.rarity === selectedRarity;
    const matchesSearch = badge.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          badge.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesRarity && matchesSearch;
  });

  const unlockedCount = achievements.filter(b => b.isUnlocked).length;
  const totalXP = user?.xp || 0;
  const passInfo = getAcademicPassProgress(totalXP);

  const handleOpenBadge = (badge) => {
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  const handleRewardClaimed = (mission) => {
    setToastMessage(`🎉 Claimed +${mission.xp} XP & +${mission.coins} Campus Coins!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-primary)', width: '100%' }}
    >
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed',
              top: 32,
              left: '50%',
              zIndex: 99999,
              background: 'rgba(34, 197, 94, 0.95)',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: '100px',
              fontWeight: 800,
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary), #7C4DFF)',
        color: 'var(--text-on-primary)',
        borderRadius: '24px',
        padding: '28px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, letterSpacing: '0.08em' }}>
            Accomplishments & Mastery
          </span>
          <h1 style={{ color: 'var(--text-on-primary)', margin: '4px 0 6px 0', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 900 }}>
            Achievements Workspace
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', maxWidth: '550px' }}>
            All your academic medals, certificates, daily missions, and 100-Level Academic Pass in one place.
          </p>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 18px', borderRadius: '14px', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700 }}>Level & Tier</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#F59E0B' }}>Lvl {passInfo.currentLevel}</h3>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 18px', borderRadius: '14px', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700 }}>Campus Coins</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#F59E0B' }}>🪙 {coins}</h3>
          </div>

          <button
            onClick={() => setIsStoreOpen(true)}
            className="btn btn-primary"
            style={{ padding: '10px 20px', borderRadius: '100px', background: '#F59E0B', border: 'none', color: '#000', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ShoppingBag size={16} /> Campus Store
          </button>
        </div>
      </div>

      {/* Main Top Navigation Segmented Tabs */}
      <div
        className="card card-p"
        style={{
          background: 'var(--white)',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          borderRadius: '100px',
          maxWidth: 'fit-content',
          margin: '0 auto'
        }}
      >
        <button
          onClick={() => handleTopTabChange('awards')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 28px',
            borderRadius: '100px',
            fontSize: '0.9rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: topTab === 'awards' ? 'var(--primary)' : 'transparent',
            color: topTab === 'awards' ? 'var(--text-on-primary)' : 'var(--text-muted)',
            transition: 'all 0.2s ease'
          }}
        >
          <Award size={18} /> 🏆 Awards & Badges
        </button>

        <button
          onClick={() => handleTopTabChange('academic-pass')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 28px',
            borderRadius: '100px',
            fontSize: '0.9rem',
            fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            background: topTab === 'academic-pass' ? 'var(--primary)' : 'transparent',
            color: topTab === 'academic-pass' ? 'var(--text-on-primary)' : 'var(--text-muted)',
            transition: 'all 0.2s ease'
          }}
        >
          <Shield size={18} /> 🎓 Academic Pass (100 Lvls)
        </button>
      </div>

      {/* TAB 1: AWARDS & BADGES */}
      {topTab === 'awards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Daily Missions Widget */}
          <DailyMissionsWidget userId={user?.uid} onRewardClaimed={handleRewardClaimed} />

          {/* Filter and Search Bar */}
          <div className="card card-p" style={{ background: 'var(--white)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search mastery badges by title or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.88rem', background: 'var(--white)' }}
                >
                  <option value="All">All Rarities</option>
                  {rarities.filter(r => r !== 'All').map(r => (
                    <option key={r} value={r}>{r.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '100px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: selectedCategory === cat ? 'var(--primary)' : 'var(--bg)',
                    color: selectedCategory === cat ? 'var(--text-on-primary)' : 'var(--text-muted)'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Badges Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {filteredBadges.map((badge) => {
              const rarity = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG.common;
              return (
                <motion.div
                  key={badge.id}
                  whileHover={{ y: -4 }}
                  onClick={() => handleOpenBadge(badge)}
                  className="card card-p"
                  style={{
                    background: 'var(--white)',
                    borderRadius: '20px',
                    padding: '20px',
                    cursor: 'pointer',
                    border: `1.5px solid ${badge.isUnlocked ? rarity.color : 'var(--border)'}`,
                    boxShadow: badge.isUnlocked ? rarity.glow : 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{
                        fontSize: '2.5rem',
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: rarity.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        filter: badge.isUnlocked ? 'none' : 'grayscale(100%) opacity(0.5)'
                      }}>
                        {badge.icon}
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '100px',
                        background: rarity.bg,
                        color: rarity.color,
                        textTransform: 'uppercase'
                      }}>
                        {badge.rarity}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800 }}>
                      {badge.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {badge.description}
                    </p>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>{badge.isUnlocked ? 'Unlocked' : `${badge.progress} / ${badge.target} ${badge.unit}`}</span>
                      <span>{badge.percent}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${badge.percent}%`, background: rarity.color }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ACADEMIC PASS */}
      {topTab === 'academic-pass' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Level Progress Bar Card */}
          <div className="card card-p" style={{ background: 'var(--white)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 800 }}>
              <span>Academic Tier Level {passInfo.currentLevel} Progress</span>
              <span style={{ color: 'var(--primary)' }}>{passInfo.currentLevelXP} / {passInfo.xpPerLevel} XP ({passInfo.levelPercent}%)</span>
            </div>
            <div style={{ height: 12, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${passInfo.levelPercent}%`, background: 'linear-gradient(90deg, #536DFE, #7C4DFF)', transition: 'width 0.6s ease' }} />
            </div>
          </div>

          {/* 100 Levels Rewards Roadmap Grid */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px 0' }}>
              100-Level Academic Progression Roadmap
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
        </div>
      )}

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        badge={selectedBadge}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Campus Store Modal */}
      <CampusStoreModal
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
        userId={user?.uid}
        userCoins={coins}
        onPurchaseComplete={(newBal) => setCoins(newBal)}
      />
    </motion.div>
  );
};

export default AchievementsPage;
