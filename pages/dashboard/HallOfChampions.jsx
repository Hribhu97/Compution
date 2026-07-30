import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Star, Flame, Shield, Calendar, Users, X, CheckCircle } from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

const HallOfChampions = ({ isModal = false, onClose }) => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState('2026');
  const [archiveData, setArchiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHallData = async () => {
      try {
        const docRef = doc(db, 'hallOfChampions', `season_${selectedYear}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setArchiveData(docSnap.data());
        } else {
          // Default fallback data for 2026
          setArchiveData({
            eventTitle: 'World Cup Mania 2026',
            seasonYear: '2026',
            championTeam: { teamName: 'ITALY', points: 2840, flag: '🇮🇹', membersCount: 27 },
            championStudent: { name: 'Mayukh Das', xp: 4500, accuracy: '96%', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300' },
            stats: {
              questionsSolved: '48,920',
              hoursLearned: '1,420 hrs',
              mostImproved: 'Piyali Das',
              mostHelpful: 'Biswajit Maity'
            },
            teamLeaderboard: [
              { rank: 1, teamName: 'ITALY', flag: '🇮🇹', points: 2840, mvp: 'Mayukh Das', accuracy: '93%' },
              { rank: 2, teamName: 'BRAZIL', flag: '🇧🇷', points: 2410, mvp: 'Sreeparna Ghosh', accuracy: '91%' },
              { rank: 3, teamName: 'GERMANY', flag: '🇩🇪', points: 2180, mvp: 'Biswajit Maity', accuracy: '89%' }
            ]
          });
        }
      } catch (err) {
        console.error('[HallOfChampions] fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHallData();
  }, [selectedYear]);

  const handleDismiss = () => {
    localStorage.setItem('hallViewed_season2026', 'true');
    window.dispatchEvent(new Event('hall-viewed-updated'));
    if (onClose) onClose();
  };

  // Personal match statistics for current user
  const personalStats = {
    rank: user?.wcRank || 42,
    questionsAnswered: user?.wcQuestions || 88,
    correct: user?.wcCorrect || 72,
    accuracy: `${Math.round(((user?.wcCorrect || 72) / (user?.wcQuestions || 88)) * 100)}%`,
    pointsEarned: user?.score || 1320,
    team: user?.chosenTeam?.toUpperCase() || 'ITALY ALPHA'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-primary)', width: '100%' }}
    >
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)',
        border: '1.5px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '24px',
        padding: '28px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        position: 'relative'
      }}>
        {isModal && (
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(0,0,0,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        )}

        <div>
          <span style={{
            background: 'var(--warning, #F59E0B)',
            color: '#000000',
            fontSize: '0.75rem',
            fontWeight: 900,
            padding: '4px 12px',
            borderRadius: '100px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display: 'inline-block',
            marginBottom: '8px'
          }}>
            🏛️ Permanent Archive
          </span>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
            Hall of Champions
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
            Celebrating legacy academic achievements and seasonal tournament victories.
          </p>
        </div>

        {/* Year Selector & Dismiss */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface, rgba(0,0,0,0.05))', padding: '4px', borderRadius: '100px' }}>
            {['2026', '2025'].map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '100px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  background: selectedYear === yr ? 'var(--primary)' : 'transparent',
                  color: selectedYear === yr ? 'var(--text-on-primary)' : 'var(--text-muted)'
                }}
              >
                {yr}
              </button>
            ))}
          </div>

          <button
            onClick={handleDismiss}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '100px', fontWeight: 800 }}
          >
            Dismiss & Close
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading Hall of Champions data...
        </div>
      ) : archiveData ? (
        <>
          {/* Key Honor Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card card-p" style={{ background: 'var(--white)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ fontSize: '2.2rem' }}>🏆</div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Champion Team</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{archiveData.championTeam?.teamName}</h3>
                <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>{archiveData.championTeam?.points} pts</span>
              </div>
            </div>

            <div className="card card-p" style={{ background: 'var(--white)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ fontSize: '2.2rem' }}>👑</div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Tournament MVP</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{archiveData.championStudent?.name}</h3>
                <span style={{ fontSize: '0.8rem', color: '#3B82F6', fontWeight: 700 }}>{archiveData.championStudent?.xp} XP</span>
              </div>
            </div>

            <div className="card card-p" style={{ background: 'var(--white)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ fontSize: '2.2rem' }}>🎯</div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Questions Solved</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{archiveData.stats?.questionsSolved || '48,920'}</h3>
                <span style={{ fontSize: '0.8rem', color: '#8B5CF6', fontWeight: 700 }}>Community Total</span>
              </div>
            </div>
          </div>

          {/* PERSONAL MATCH SUMMARY CARD */}
          <div
            className="card card-p"
            style={{
              background: 'linear-gradient(135deg, rgba(83, 109, 254, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
              border: '1.5px solid rgba(83, 109, 254, 0.3)',
              borderRadius: '20px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Award size={22} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>Your Performance Summary</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Personal match stats for World Cup Mania 2026</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'var(--white)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Rank</span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)' }}>#{personalStats.rank}</h4>
              </div>

              <div style={{ background: 'var(--white)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Questions</span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900 }}>{personalStats.questionsAnswered}</h4>
              </div>

              <div style={{ background: 'var(--white)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Correct</span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#10B981' }}>{personalStats.correct}</h4>
              </div>

              <div style={{ background: 'var(--white)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Accuracy</span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#3B82F6' }}>{personalStats.accuracy}</h4>
              </div>

              <div style={{ background: 'var(--white)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Points Earned</span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#F59E0B' }}>{personalStats.pointsEarned.toLocaleString()}</h4>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="card card-p" style={{ background: 'var(--white)', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>
              {archiveData.eventTitle} Final Standings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {archiveData.teamLeaderboard.map((team, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: idx === 0 ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.2rem', minWidth: 24 }}>#{team.rank}</span>
                    <span style={{ fontSize: '1.6rem' }}>{team.flag || '⚽'}</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{team.teamName}</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>MVP: {team.mvp}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{team.points} pts</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.accuracy} Accuracy</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </motion.div>
  );
};

export default HallOfChampions;
