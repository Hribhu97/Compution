import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Award, ChevronDown, ChevronUp, Sparkles, Volume2, VolumeX, 
  ArrowRight, Users, CheckCircle, Flame, Shield, Star, RefreshCw 
} from 'lucide-react';
import { getFinaleData } from '../../services/worldCupService';

const WorldCupFinale = ({ onComplete }) => {
  const navigate = useNavigate();
  const [screenStep, setScreenStep] = useState(1); // 1: Farewell & Stadium, 2: Lights fade transition, 3: Finale Leaderboards & MVPs
  const [soundMuted, setSoundMuted] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finaleData, setFinaleData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await getFinaleData('season_2026');
      if (data) {
        setFinaleData(data);
      } else {
        // Fallback default mock finale data if Firestore query returns empty
        setFinaleData({
          eventTitle: 'WORLD CUP MANIA 2026',
          teamLeaderboard: [
            {
              id: 'team_italy',
              rank: 1,
              medal: '🥇 Champion',
              teamName: 'ITALY',
              flag: '🇮🇹',
              points: 2840,
              questionsSolved: 1420,
              membersCount: 27,
              mvp: 'Mayukh Das',
              mvpScore: 940,
              accuracy: '93%',
              avgAttendance: '96%',
              details: {
                overallXP: 28400,
                correctAnswers: 1320,
                wrongAnswers: 100,
                fastestResponders: 'Mayukh Das, Hribhu T.',
                avgAccuracy: '93%',
                attendancePct: '96%',
                assignmentsCompleted: 220,
                longestStreak: '14 Days',
                totalChaptersFinished: 85,
                totalLearningHours: 190
              }
            },
            {
              id: 'team_brazil',
              rank: 2,
              medal: '🥈 Runner Up',
              teamName: 'BRAZIL',
              flag: '🇧🇷',
              points: 2410,
              questionsSolved: 1205,
              membersCount: 24,
              mvp: 'Sreeparna Ghosh',
              mvpScore: 810,
              accuracy: '91%',
              avgAttendance: '92%',
              details: {
                overallXP: 24100,
                correctAnswers: 1100,
                wrongAnswers: 105,
                fastestResponders: 'Sreeparna G., Rahul K.',
                avgAccuracy: '91%',
                attendancePct: '92%',
                assignmentsCompleted: 195,
                longestStreak: '12 Days',
                totalChaptersFinished: 78,
                totalLearningHours: 165
              }
            },
            {
              id: 'team_germany',
              rank: 3,
              medal: '🥉 Third',
              teamName: 'GERMANY',
              flag: '🇩🇪',
              points: 2180,
              questionsSolved: 1090,
              membersCount: 22,
              mvp: 'Biswajit Maity',
              mvpScore: 750,
              accuracy: '89%',
              avgAttendance: '90%',
              details: {
                overallXP: 21800,
                correctAnswers: 970,
                wrongAnswers: 120,
                fastestResponders: 'Biswajit M., Piyali D.',
                avgAccuracy: '89%',
                attendancePct: '90%',
                assignmentsCompleted: 170,
                longestStreak: '10 Days',
                totalChaptersFinished: 70,
                totalLearningHours: 145
              }
            }
          ],
          topMVPs: [
            { rank: 1, name: 'Mayukh Das', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300', xp: 4500, questions: 420, accuracy: '96%', badgesEarned: 12, squadName: 'ITALY Alpha', contributionPct: '33%' },
            { rank: 2, name: 'Sreeparna Ghosh', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300', xp: 3950, questions: 380, accuracy: '94%', badgesEarned: 10, squadName: 'BRAZIL Beta', contributionPct: '34%' },
            { rank: 3, name: 'Biswajit Maity', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=300', xp: 3600, questions: 340, accuracy: '92%', badgesEarned: 9, squadName: 'GERMANY Alpha', contributionPct: '35%' }
          ]
        });
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleEnterAchievements = () => {
    if (onComplete) onComplete();
    navigate('/dashboard/achievements');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: '#0B0F19',
      color: '#FFFFFF',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh'
    }}>
      {/* Sound Toggle */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <button
          onClick={() => setSoundMuted(!soundMuted)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: '100px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {soundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {soundMuted ? 'Muted' : 'Stadium Audio'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* SCREEN 1: CINEMATIC FAREWELL */}
        {screenStep === 1 && (
          <motion.div
            key="screen1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 20px',
              textAlign: 'center',
              background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0%, rgba(11, 15, 25, 0.95) 70%)'
            }}
          >
            {/* Confetti particles */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {Array.from({ length: 25 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -50, x: Math.random() * window.innerWidth }}
                  animate={{ y: window.innerHeight + 50, rotate: 360 }}
                  transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    width: 8,
                    height: 8,
                    borderRadius: i % 2 === 0 ? '50%' : '2px',
                    background: i % 3 === 0 ? '#F59E0B' : i % 3 === 1 ? '#10B981' : '#3B82F6'
                  }}
                />
              ))}
            </div>

            <motion.div initial={{ y: -20 }} animate={{ y: 0 }} transition={{ duration: 0.5 }}>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '6px 16px',
                borderRadius: '100px',
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                🏆 WORLD CUP MANIA 2026
              </span>
            </motion.div>

            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              margin: '24px 0 16px 0',
              lineHeight: 1.15,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Thank You.
            </h1>

            <p style={{
              fontSize: 'clamp(0.95rem, 2.5vw, 1.25rem)',
              maxWidth: '650px',
              color: '#CBD5E1',
              lineHeight: 1.6,
              margin: '0 0 32px 0'
            }}>
              Thousands of questions solved.<br />
              Hundreds of students competed.<br />
              New champions emerged.<br />
              <strong style={{ color: '#10B981' }}>The final whistle has blown...</strong>
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setScreenStep(2)}
              className="btn btn-primary"
              style={{
                padding: '16px 36px',
                fontSize: '1rem',
                fontWeight: 800,
                borderRadius: '100px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Reveal Final Results <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        )}

        {/* SCREEN 2: LIGHTS FADE & TRANSITION */}
        {screenStep === 2 && (
          <motion.div
            key="screen2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 20px',
              textAlign: 'center',
              background: '#0B0F19'
            }}
          >
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 0, rotate: 720, opacity: 0 }}
              transition={{ duration: 1.2 }}
              style={{ fontSize: '4rem', marginBottom: '24px' }}
            >
              ⚽
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <span style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Presenting
              </span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#F59E0B', margin: '8px 0 24px 0' }}>
                WORLD CUP MANIA FINAL RESULTS
              </h2>
              <button
                onClick={() => setScreenStep(3)}
                className="btn btn-primary"
                style={{
                  padding: '12px 28px',
                  borderRadius: '100px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}
              >
                View Podium & MVPs
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* SCREEN 3: PODIUM, TEAM LEADERBOARDS & MVPs */}
        {screenStep === 3 && finaleData && (
          <motion.div
            key="screen3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              padding: '40px 20px 60px 20px',
              maxWidth: '1000px',
              margin: '0 auto',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Header Title */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 14px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800 }}>
                FINAL STANDINGS
              </span>
              <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, margin: '10px 0 6px 0', color: '#FFFFFF' }}>
                World Cup Mania Champions
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>
                Historical standings archived permanently in the Compution Hall of Champions.
              </p>
            </div>

            {/* Team Leaderboard Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
              {finaleData.teamLeaderboard.map((team) => {
                const isExpanded = expandedTeamId === team.id;
                return (
                  <div
                    key={team.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: team.rank === 1 ? '1.5px solid #F59E0B' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      padding: '20px',
                      backdropFilter: 'blur(12px)',
                      boxShadow: team.rank === 1 ? '0 0 24px rgba(245, 158, 11, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 900, width: 36, textAlign: 'center' }}>
                          {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : `#${team.rank}`}
                        </span>
                        <div style={{ fontSize: '2rem' }}>{team.flag}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#FFFFFF' }}>{team.teamName}</h3>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#CBD5E1', fontWeight: 700 }}>
                              {team.medal}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
                            MVP: <strong style={{ color: '#F59E0B' }}>{team.mvp}</strong> · {team.membersCount} Members · {team.accuracy} Accuracy
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10B981' }}>{team.points.toLocaleString()} pts</div>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{team.questionsSolved} Questions Solved</div>
                        </div>
                        <button
                          onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Deep Team Stats */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Detailed Team Metrics
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Overall XP</div>
                            <strong style={{ fontSize: '1rem', color: '#3B82F6' }}>{team.details.overallXP.toLocaleString()} XP</strong>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '100px' ? '10px' : '10px' }}>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Correct vs Wrong</div>
                            <strong style={{ fontSize: '0.9rem', color: '#10B981' }}>{team.details.correctAnswers} / {team.details.wrongAnswers}</strong>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Fastest Responders</div>
                            <strong style={{ fontSize: '0.85rem', color: '#FFFFFF' }}>{team.details.fastestResponders}</strong>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Attendance & Hours</div>
                            <strong style={{ fontSize: '0.85rem', color: '#F59E0B' }}>{team.details.attendancePct} · {team.details.totalLearningHours}h Learned</strong>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Top 10 MVPs Section */}
            <div style={{ marginBottom: '48px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 16px 0', color: '#FFFFFF' }}>
                🏅 Tournament MVPs (Top Contributors)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {finaleData.topMVPs.map((mvp) => (
                  <div
                    key={mvp.rank}
                    style={{
                      background: 'rgba(30, 41, 59, 0.4)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}
                  >
                    <img
                      src={mvp.avatar}
                      alt={mvp.name}
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #F59E0B' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mvp.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#F59E0B' }}>#{mvp.rank}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
                        {mvp.squadName} · {mvp.questions} Qs · {mvp.accuracy} Acc
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TRANSITION BANNER: ACHIEVEMENT ERA BEGINS */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(83, 109, 254, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1.5px solid rgba(83, 109, 254, 0.4)',
              borderRadius: '24px',
              padding: '32px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(83, 109, 254, 0.2)'
            }}>
              <Sparkles size={32} style={{ color: '#818CF8', marginBottom: '12px' }} />
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#A5B4FC', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                One Season Ends. Another Begins.
              </span>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 900, margin: '8px 0 16px 0', color: '#FFFFFF' }}>
                Welcome To COMPUTION ACHIEVEMENTS
              </h2>
              <p style={{ fontSize: '0.92rem', color: '#CBD5E1', maxWidth: '580px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
                Your tournament stats are permanently saved in the Hall of Champions. Continue building daily learning streaks, unlocking mastery badges, and leveling your Academic Pass!
              </p>
              <button
                onClick={handleEnterAchievements}
                className="btn btn-primary"
                style={{
                  padding: '16px 36px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  borderRadius: '100px',
                  background: 'linear-gradient(135deg, #536DFE, #7C4DFF)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(83, 109, 254, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Enter Achievement Ecosystem <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorldCupFinale;
