import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  HOUSES, subscribeAllHouses, subscribeHouseTeammates, 
  subscribePrefectCompetitions, subscribeHouseActivities 
} from '../../services/battleOfMindsService';
import { 
  Shield, Trophy, Users, Award, Clock, Star, RotateCcw,
  ChevronRight, Crown, Flame, AlertCircle, Play, CheckCircle2,
  FileText, MessageSquare, Sparkles, ArrowRight
} from 'lucide-react';
import HouseSortingModal from '../../components/house/HouseSortingModal';
import AdminHouseManagement from '../../components/house/AdminHouseManagement';
import Modal from '../../components/Modal';

const BattleOfMindsPage = () => {
  const { user } = useAuth();
  
  // If Admin / Faculty / Staff, render Admin House Management directly
  if (user && user?.role?.toLowerCase() !== 'student') {
    return <AdminHouseManagement />;
  }

  const userHouseId = user?.house || 'gryffindor';
  const house = HOUSES[userHouseId] || HOUSES.gryffindor;

  // Tabs: 'teammates', 'leaderboard', 'prefect'
  const [activeTab, setActiveTab] = useState('teammates');
  const [leaderboardFilter, setLeaderboardFilter] = useState('Week');
  
  // Realtime Data from Firestore
  const [allHouses, setAllHouses] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [activities, setActivities] = useState([]);

  // Sorting Modal trigger
  const [isSortingModalOpen, setIsSortingModalOpen] = useState(!user?.house);

  // Active Quiz Modal
  const [activeQuizComp, setActiveQuizComp] = useState(null);

  useEffect(() => {
    const unsubHouses = subscribeAllHouses((data) => setAllHouses(data));
    const unsubTeam = subscribeHouseTeammates(userHouseId, (data) => setTeammates(data));
    const unsubComp = subscribePrefectCompetitions(userHouseId, (data) => setCompetitions(data));
    const unsubAct = subscribeHouseActivities(userHouseId, (data) => setActivities(data));

    return () => {
      unsubHouses();
      unsubTeam();
      unsubComp();
      unsubAct();
    };
  }, [userHouseId]);

  // Dynamic Real Standings & Points Calculation
  const sortedHouses = [...allHouses].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  const houseRankIndex = sortedHouses.findIndex(h => h.id === userHouseId);
  const houseRankDisplay = houseRankIndex >= 0 ? `#${houseRankIndex + 1}` : 'Unranked';
  const currentHouseData = allHouses.find(h => h.id === userHouseId) || {};
  const currentXP = currentHouseData.totalPoints || 0;
  const targetXP = 5000;
  const xpPct = Math.min(100, Math.round((currentXP / targetXP) * 100));

  // Atmosphere Accent Border & Glow per house
  const accentBorderColor = {
    gryffindor: '#DC2626',
    ravenclaw: '#2563EB',
    slytherin: '#16A34A',
    hufflepuff: '#EAB308'
  }[userHouseId] || '#EAB308';

  const accentGlow = {
    gryffindor: '0 16px 44px rgba(220, 38, 38, 0.35)',
    ravenclaw: '0 16px 44px rgba(37, 99, 235, 0.35)',
    slytherin: '0 16px 44px rgba(22, 163, 74, 0.35)',
    hufflepuff: '0 16px 44px rgba(234, 179, 8, 0.35)'
  }[userHouseId] || '0 16px 44px rgba(234, 179, 8, 0.35)';

  // Find active published mission
  const activeMission = competitions.find(c => c.status === 'Active');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden',
      padding: '0 16px 40px',
      boxSizing: 'border-box'
    }}>
      
      {/* 🏰 HERO HOUSE BANNER */}
      <div style={{
        position: 'relative',
        borderRadius: '28px',
        overflow: 'hidden',
        background: house.bgGradient,
        padding: '24px 20px',
        color: '#ffffff',
        boxShadow: accentGlow,
        border: `1.5px solid ${house.primaryColor}60`,
        borderLeft: `5px solid ${accentBorderColor}`,
        marginBottom: '4px'
      }}>
        {/* Scenery Background Overlay with 45–55% Dark Gradient & Soft Blur */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${house.bannerImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.45,
          filter: 'blur(4px)',
          zIndex: 0
        }} />

        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(11,19,41,0.48) 0%, rgba(11,19,41,0.85) 100%)',
          zIndex: 1
        }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Row: Vertically Centered 80px Floating Crest Logo & Layered Typography */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Floating PNG Crest Logo (No Container Box, Transparent, Vertically Centered, Drop Shadow Only) */}
              <div style={{ flexShrink: 0 }}>
                {house.logo ? (
                  <img 
                    src={house.logo} 
                    alt={house.name} 
                    style={{ 
                      width: 80, 
                      height: 80, 
                      objectFit: 'contain', 
                      filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.6))' 
                    }} 
                  />
                ) : (
                  <span style={{ fontSize: '3.2rem', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.6))' }}>{house.emoji}</span>
                )}
              </div>

              {/* Layered Typography */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)' }}>
                  ACADEMIC HOUSE
                </span>
                <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 950, letterSpacing: '-0.02em', color: '#FFFFFF', lineHeight: 1.1 }}>
                  {house.name.toUpperCase()}
                </h1>
                <div style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', margin: 0 }}>
                  "{house.motto}"
                </div>
              </div>
            </div>

            {/* Ghost "Change House" Button */}
            {user?.role?.toLowerCase() === 'student' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <button
                  onClick={() => setIsSortingModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '100px',
                    border: `1.5px solid ${house.primaryColor}`,
                    background: 'rgba(0,0,0,0.3)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    minHeight: '44px',
                    backdropFilter: 'blur(6px)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                  }}
                >
                  <RotateCcw size={16} /> Change House
                </button>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                  One change allowed every season
                </span>
              </div>
            )}
          </div>

          {/* 📊 UNIFIED 2-COLUMN RESPONSIVE STATS GRID (100% Real Data) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px'
          }}>
            {/* Card 1: House Rank */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                HOUSE RANK
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 950, color: '#F59E0B', marginTop: '2px' }}>
                🏆 {houseRankDisplay}
              </div>
            </div>

            {/* Card 2: House XP Progress Bar */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase' }}>
                <span>HOUSE XP</span>
                <span style={{ color: '#4ADE80' }}>{currentXP}/{targetXP} XP</span>
              </div>
              <div style={{ width: '100%', height: '6px', borderRadius: '100px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ width: `${xpPct}%`, height: '100%', borderRadius: '100px', background: '#4ADE80', transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Card 3: Members Count */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                MEMBERS
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 950, color: '#60A5FA', marginTop: '2px' }}>
                {teammates.length} {teammates.length === 1 ? 'Student' : 'Students'}
              </div>
            </div>

            {/* Card 4: House Prefect */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              padding: '14px 16px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                HOUSE PREFECT
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 900, color: currentHouseData.currentPrefectName ? '#FCD34D' : 'rgba(255,255,255,0.7)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentHouseData.currentPrefectName ? `👑 ${currentHouseData.currentPrefectName}` : 'No House Prefect selected.'}
              </div>
            </div>
          </div>

          {/* 🔥 TODAY'S HOUSE MISSION SECTION (Database-Backed / Verified Empty State) */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.28)',
            backdropFilter: 'blur(6px)',
            padding: '14px 18px',
            borderRadius: '18px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {activeMission ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#FCD34D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🔥 Today's House Mission
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#4ADE80' }}>
                    {activeMission.passingScore}% Passing Target
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>
                  {activeMission.title} ({activeMission.subject})
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', padding: '4px 0' }}>
                No mission has been published today.
              </div>
            )}
          </div>

          {/* 🏆 PROMINENT HIGH-CONTRAST CTA BUTTON */}
          <button
            onClick={() => setActiveTab('prefect')}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: '100px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366F1, #3B82F6)',
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              minHeight: '48px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
            }}
          >
            🏆 Enter House Cup <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* 🚀 QUICK ACTION HORIZONTAL ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        width: '100%'
      }}>
        {[
          { id: 'teammates', label: 'Members', icon: <Users size={18} /> },
          { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={18} /> },
          { id: 'prefect', label: 'Missions', icon: <Crown size={18} /> }
        ].map(act => (
          <button
            key={act.id}
            onClick={() => setActiveTab(act.id)}
            style={{
              padding: '14px 10px',
              borderRadius: '18px',
              border: '1px solid var(--border)',
              background: activeTab === act.id ? 'var(--primary)' : 'var(--white)',
              color: activeTab === act.id ? '#FFFFFF' : 'var(--dark)',
              fontWeight: 800,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              minHeight: '48px',
              boxShadow: activeTab === act.id ? '0 8px 20px rgba(99, 102, 241, 0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            {act.icon} {act.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TEAMMATES ROSTER */}
      {activeTab === 'teammates' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {teammates.length === 0 ? (
            <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', width: '100%', gridColumn: '1 / -1' }}>
              No members assigned to this house yet. Be the first to join!
            </div>
          ) : (
            teammates.map(m => (
              <div key={m.uid} style={{
                background: 'var(--white)',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
              }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${house.primaryColor}, var(--dark))`,
                  color: '#FFF',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {m.displayName?.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.displayName}
                    </h4>
                    {m.role === 'House Prefect' && <span title="House Prefect">👑</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {m.class} • {m.course}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
                    <span>⭐ Level {m.houseLevel}</span>
                    <span>🔥 {m.streak} Day Streak</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: HOUSE LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Time Filter */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['Today', 'Week', 'Month', 'All Time'].map(f => (
              <button
                key={f}
                onClick={() => setLeaderboardFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: leaderboardFilter === f ? 'var(--primary)' : 'var(--bg)',
                  color: leaderboardFilter === f ? '#FFF' : 'var(--text-muted)',
                  minHeight: '36px'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Standings List (Zero Hardcoded Data / Verified Empty State) */}
          <div style={{
            background: 'var(--white)',
            borderRadius: '20px',
            padding: '16px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {teammates.filter(m => m.housePoints > 0).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No house points recorded yet. Rankings will update automatically once members complete lessons and quizzes.
              </div>
            ) : (
              teammates.sort((a, b) => b.housePoints - a.housePoints).map((m, idx) => (
                <div key={m.uid} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: idx === 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg)',
                  border: idx === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 900, width: '24px', color: idx === 0 ? '#D97706' : 'var(--text-muted)' }}>
                      #{idx + 1}
                    </span>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--dark)' }}>{m.displayName}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '0.9rem', color: house.primaryColor }}>
                    {m.housePoints} XP
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PREFECT COMPETITION / MISSIONS */}
      {activeTab === 'prefect' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Prefect Spotlight Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1E293B, #0F172A)',
            borderRadius: '20px',
            padding: '20px',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ fontSize: '2.5rem' }}>👑</div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#F59E0B', letterSpacing: '0.08em' }}>
                CURRENT HOUSE PREFECT
              </span>
              <h3 style={{ margin: '2px 0 4px', fontSize: '1.2rem', fontWeight: 900 }}>
                {currentHouseData.currentPrefectName || 'No House Prefect selected.'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                Appointed via official academic prefect competition.
              </p>
            </div>
          </div>

          {/* Active Competitions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--dark)' }}>Active Missions</h4>
            {competitions.length === 0 ? (
              <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active missions or competitions scheduled right now. Check back soon!
              </div>
            ) : (
              competitions.map(c => (
                <div key={c.id} style={{
                  background: 'var(--white)',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: 'var(--dark)' }}>{c.title}</h4>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Subject: {c.subject} • Duration: {c.durationMins} Mins • Passing Score: {c.passingScore}%
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveQuizComp(c)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '100px',
                      border: 'none',
                      background: 'var(--primary)',
                      color: '#FFF',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Play size={14} fill="#FFF" /> Take Mission Quiz
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 📜 RECENT HOUSE ACTIVITY FEED (100% Real Firestore Data / Verified Empty State) */}
      <div style={{
        background: 'var(--white)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Sparkles size={18} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--dark)' }}>Recent House Activity</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activities.length === 0 ? (
            <div style={{ padding: '16px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              No house activity yet. Complete today's lesson or quiz to become the first contributor.
            </div>
          ) : (
            activities.map(act => (
              <div key={act.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'var(--bg)',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--dark)', fontWeight: 600 }}>• {act.activityName}</span>
                <span style={{ color: 'var(--success)', fontWeight: 900, fontSize: '0.82rem' }}>+{act.points || 0} XP</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sorting Modal */}
      <HouseSortingModal
        user={user}
        isOpen={isSortingModalOpen}
        onClose={() => setIsSortingModalOpen(false)}
        onComplete={(newHouse) => setIsSortingModalOpen(false)}
      />
    </div>
  );
};

export default BattleOfMindsPage;
