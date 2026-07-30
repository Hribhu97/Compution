import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HOUSES, subscribeAllHouses, subscribeHouseTeammates, 
  subscribePrefectCompetitions 
} from '../../services/battleOfMindsService';
import { Shield, Trophy, ArrowRight, Sparkles, Crown, Flame, Target } from 'lucide-react';

const HouseDashboardWidget = ({ user }) => {
  const navigate = useNavigate();

  if (!user || user?.role?.toLowerCase() !== 'student') return null;

  const userHouseId = user?.house || 'gryffindor';
  const house = HOUSES[userHouseId] || HOUSES.gryffindor;

  // Realtime Data
  const [allHouses, setAllHouses] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [competitions, setCompetitions] = useState([]);

  useEffect(() => {
    const unsubHouses = subscribeAllHouses((data) => setAllHouses(data));
    const unsubTeam = subscribeHouseTeammates(userHouseId, (data) => setTeammates(data));
    const unsubComp = subscribePrefectCompetitions(userHouseId, (data) => setCompetitions(data));

    return () => {
      unsubHouses();
      unsubTeam();
      unsubComp();
    };
  }, [userHouseId]);

  // Compute Real Standings & Points
  const sortedHouses = [...allHouses].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  const houseRankIndex = sortedHouses.findIndex(h => h.id === userHouseId);
  const houseRankDisplay = houseRankIndex >= 0 ? `#${houseRankIndex + 1}` : 'Unranked';
  const currentHouseData = allHouses.find(h => h.id === userHouseId) || {};
  const currentXP = currentHouseData.totalPoints || 0;
  const targetXP = 5000;
  const xpPct = Math.min(100, Math.round((currentXP / targetXP) * 100));

  // Atmosphere Accent Color & Glow per house
  const accentBorderColor = {
    gryffindor: '#DC2626',
    ravenclaw: '#2563EB',
    slytherin: '#16A34A',
    hufflepuff: '#EAB308'
  }[userHouseId] || '#EAB308';

  const accentGlow = {
    gryffindor: '0 16px 40px rgba(220, 38, 38, 0.35)',
    ravenclaw: '0 16px 40px rgba(37, 99, 235, 0.35)',
    slytherin: '0 16px 40px rgba(22, 163, 74, 0.35)',
    hufflepuff: '0 16px 40px rgba(234, 179, 8, 0.35)'
  }[userHouseId] || '0 16px 40px rgba(234, 179, 8, 0.35)';

  // Find active published mission
  const activeMission = competitions.find(c => c.status === 'Active');

  return (
    <div
      onClick={() => navigate('/dashboard/battle-of-minds')}
      style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        background: house.bgGradient,
        padding: '24px 20px',
        color: '#ffffff',
        boxShadow: accentGlow,
        border: `1.5px solid ${house.primaryColor}60`,
        borderLeft: `5px solid ${accentBorderColor}`,
        cursor: 'pointer',
        marginBottom: '24px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      className="hover-card-effect"
    >
      {/* Background Scenery Overlay with 45–55% Dark Gradient & Soft Blur */}
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
        
        {/* Header: Floating Crest Hero (72-84px, No Box Container) + Vertically Centered Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em' }}>
              ACADEMIC HOUSE
            </span>
            <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 950, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {house.name.toUpperCase()}
            </h3>
            <div style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>
              "{house.motto}"
            </div>
          </div>
        </div>

        {/* 📊 Unified 2-Column Responsive Stats Grid (100% Real Data) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px'
        }}>
          {/* Card 1: House Rank */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase' }}>
              HOUSE RANK
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 950, color: '#F59E0B', marginTop: '2px' }}>
              🏆 {houseRankDisplay}
            </div>
          </div>

          {/* Card 2: House XP Progress Bar */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase' }}>
              <span>HOUSE XP</span>
              <span style={{ color: '#4ADE80' }}>{currentXP}/{targetXP} XP</span>
            </div>
            <div style={{ width: '100%', height: '6px', borderRadius: '100px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: '6px' }}>
              <div style={{ width: `${xpPct}%`, height: '100%', borderRadius: '100px', background: '#4ADE80', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* 🔥 Today's House Mission Section (Real Data / Verified Empty State) */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.28)',
          backdropFilter: 'blur(6px)',
          padding: '12px 16px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {activeMission ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#FCD34D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔥 Today's House Mission
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#4ADE80' }}>
                  {activeMission.passingScore}% Passing Target
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>
                {activeMission.title} ({activeMission.subject})
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', padding: '4px 0' }}>
              No mission has been published today.
            </div>
          )}
        </div>

        {/* 🏆 High-Contrast Prominent CTA Button */}
        <button
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '100px',
            border: 'none',
            background: 'linear-gradient(135deg, #6366F1, #3B82F6)',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            minHeight: '44px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
          }}
        >
          🏆 Enter House Cup <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default HouseDashboardWidget;
