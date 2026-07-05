import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getActiveSeason, joinWorldCupTeam } from '../../services/worldCupService';
import { X, Users, ChevronRight, Info } from 'lucide-react';

const TEAMS = [
  { id: 'Argentina', name: 'Argentina', flag: '🇦🇷', color: '#74ACDF', captain: 'Lionel Messi', shirtColor: '#74ACDF', stripeColor: '#FFFFFF', pattern: 'stripes' },
  { id: 'Brazil', name: 'Brazil', flag: '🇧🇷', color: '#FEDF00', captain: 'Neymar Jr', shirtColor: '#FEDF00', trimColor: '#009739', pattern: 'solid' },
  { id: 'France', name: 'France', flag: '🇫🇷', color: '#002395', captain: 'Kylian Mbappé', shirtColor: '#002395', trimColor: '#FFFFFF', pattern: 'solid' },
  { id: 'England', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#FFFFFF', captain: 'Harry Kane', shirtColor: '#FFFFFF', trimColor: '#C8102E', pattern: 'solid' },
  { id: 'Germany', name: 'Germany', flag: '🇩🇪', color: '#000000', captain: 'Jamal Musiala', shirtColor: '#FFFFFF', trimColor: '#000000', pattern: 'german' },
  { id: 'Spain', name: 'Spain', flag: '🇪🇸', color: '#C60B1E', captain: 'Pedri', shirtColor: '#C60B1E', trimColor: '#FFD700', pattern: 'solid' },
  { id: 'Portugal', name: 'Portugal', flag: '🇵🇹', color: '#046A38', captain: 'Cristiano Ronaldo', shirtColor: '#C1272D', trimColor: '#046A38', pattern: 'solid' },
  { id: 'Italy', name: 'Italy', flag: '🇮🇹', color: '#008C45', captain: 'Nicolò Barella', shirtColor: '#002F6C', trimColor: '#FFFFFF', pattern: 'solid' },
  { id: 'Netherlands', name: 'Netherlands', flag: '🇳🇱', color: '#21468B', captain: 'Virgil van Dijk', shirtColor: '#F85B00', trimColor: '#FFFFFF', pattern: 'solid' },
  { id: 'Belgium', name: 'Belgium', flag: '🇧🇪', color: '#FFE936', captain: 'Kevin De Bruyne', shirtColor: '#E30613', trimColor: '#FFE936', pattern: 'solid' },
  { id: 'Croatia', name: 'Croatia', flag: '🇭🇷', color: '#FF0000', captain: 'Luka Modrić', shirtColor: '#FFFFFF', stripeColor: '#E30613', pattern: 'checkers' },
  { id: 'Uruguay', name: 'Uruguay', flag: '🇺🇾', color: '#55B355', captain: 'Federico Valverde', shirtColor: '#55B355', trimColor: '#FFFFFF', pattern: 'solid' },
  { id: 'Japan', name: 'Japan', flag: '🇯🇵', color: '#BC002D', captain: 'Wataru Endo', shirtColor: '#0000FF', trimColor: '#FFFFFF', pattern: 'solid' },
  { id: 'Senegal', name: 'Senegal', flag: '🇸🇳', color: '#00853F', captain: 'Sadio Mané', shirtColor: '#FFFFFF', trimColor: '#00853F', pattern: 'solid' },
  { id: 'Morocco', name: 'Morocco', flag: '🇲🇦', color: '#C1272D', captain: 'Achraf Hakimi', shirtColor: '#C1272D', trimColor: '#006233', pattern: 'solid' },
  { id: 'USA', name: 'USA', flag: '🇺🇸', color: '#3C3B6E', captain: 'Christian Pulisic', shirtColor: '#FFFFFF', trimColor: '#3C3B6E', pattern: 'solid' }
];

// Styled Soccer Jersey SVG Generator
const SoccerJersey = ({ team }) => {
  const shirtColor = team.shirtColor || '#FFFFFF';
  const trimColor = team.trimColor || 'rgba(0,0,0,0.1)';
  const stripeColor = team.stripeColor || '#FFFFFF';
  
  return (
    <svg viewBox="0 0 100 100" width="75" height="75" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))' }}>
      {/* Clip path for shirt body */}
      <defs>
        <clipPath id="shirt-clip">
          <path d="M 25 15 L 35 15 L 43 25 L 50 20 L 57 25 L 65 15 L 75 15 L 85 28 L 76 38 L 73 34 L 73 85 L 27 85 L 27 34 L 24 38 L 15 28 Z" />
        </clipPath>
      </defs>

      {/* Main Shirt Outline & Shadow */}
      <path 
        d="M 25 15 L 35 15 L 43 25 L 50 20 L 57 25 L 65 15 L 75 15 L 85 28 L 76 38 L 73 34 L 73 85 L 27 85 L 27 34 L 24 38 L 15 28 Z" 
        fill={shirtColor}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
      />

      {/* Shirt Patterns */}
      <g clipPath="url(#shirt-clip)">
        {team.pattern === 'stripes' && (
          <>
            <rect x="33" y="10" width="7" height="80" fill={stripeColor} />
            <rect x="47" y="10" width="7" height="80" fill={stripeColor} />
            <rect x="60" y="10" width="7" height="80" fill={stripeColor} />
          </>
        )}
        
        {team.pattern === 'checkers' && (
          <>
            {/* Simple Checker Board Pattern */}
            <rect x="27" y="15" width="12" height="12" fill={stripeColor} />
            <rect x="51" y="15" width="12" height="12" fill={stripeColor} />
            <rect x="39" y="27" width="12" height="12" fill={stripeColor} />
            <rect x="63" y="27" width="12" height="12" fill={stripeColor} />
            <rect x="27" y="39" width="12" height="12" fill={stripeColor} />
            <rect x="51" y="39" width="12" height="12" fill={stripeColor} />
            <rect x="39" y="51" width="12" height="12" fill={stripeColor} />
            <rect x="63" y="51" width="12" height="12" fill={stripeColor} />
            <rect x="27" y="63" width="12" height="12" fill={stripeColor} />
            <rect x="51" y="63" width="12" height="12" fill={stripeColor} />
          </>
        )}

        {team.pattern === 'german' && (
          <>
            {/* German flag chest stripe */}
            <rect x="20" y="32" width="60" height="6" fill="#000000" />
            <rect x="20" y="38" width="60" height="6" fill="#FF0000" />
            <rect x="20" y="44" width="60" height="6" fill="#FFCC00" />
          </>
        )}
      </g>

      {/* Collar & Sleeve trims */}
      <path d="M 43 25 A 10 10 0 0 0 57 25" fill="none" stroke={trimColor} strokeWidth="3" />
      <line x1="15" y1="28" x2="24" y2="38" stroke={trimColor} strokeWidth="3" />
      <line x1="85" y1="28" x2="76" y2="38" stroke={trimColor} strokeWidth="3" />
    </svg>
  );
};

const TeamSelection = ({ user, onClose, onJoined }) => {
  const [squads, setSquads] = useState({});
  const [loading, setLoading] = useState(true);
  const [joiningTeam, setJoiningTeam] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchSquadData = async () => {
      try {
        const activeSeason = await getActiveSeason();
        const groupsRef = collection(db, 'worldcup_groups');
        const q = query(groupsRef, where('seasonId', '==', activeSeason.id));
        const snap = await getDocs(q);
        
        const squadMap = {};
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const teamId = data.teamId;
          if (!squadMap[teamId]) squadMap[teamId] = [];
          squadMap[teamId].push(data);
        });
        
        setSquads(squadMap);
      } catch (err) {
        console.error('[TeamSelection] Error fetching squad sizes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSquadData();
  }, []);

  const getTeamRecruitmentStatus = (teamId) => {
    const teamSquads = squads[teamId] || [];
    const recruiting = teamSquads
      .filter(s => s.members && s.members.length < 4)
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))[0];
      
    if (recruiting) {
      const count = recruiting.members.length;
      return {
        text: `${count} / 4`,
        available: true,
        count
      };
    }
    
    return {
      text: `0 / 4`,
      available: true,
      count: 0
    };
  };

  const handleSelectTeam = async (teamId) => {
    setJoiningTeam(teamId);
    try {
      const result = await joinWorldCupTeam(
        user.uid,
        user.displayName || user.name || 'Student',
        teamId
      );
      onJoined?.(result);
    } catch (err) {
      console.error('[TeamSelection] Error joining team:', err);
    } finally {
      setJoiningTeam(null);
    }
  };

  const content = (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      color: 'white',
      background: 'radial-gradient(circle at center, #111827 0%, #030712 100%)',
      padding: isMobile ? '20px' : '24px',
      borderRadius: '24px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 950, letterSpacing: '0.02em', color: '#60A5FA' }}>🌍 DRAFT YOUR TEAM</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            Choose a country to claim your jersey and compete with your squad!
          </p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Info notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(96,165,250,0.06)',
        border: '1px solid rgba(96,165,250,0.2)',
        padding: '12px 14px',
        borderRadius: '16px',
        ariaHidden: true,
        marginBottom: '20px',
        fontSize: '0.78rem',
        color: '#60A5FA',
        fontWeight: 600
      }}>
        <Info size={16} style={{ flexShrink: 0 }} />
        <span>FCFS SQUAD SCALING: Max 4 players per squad. If filled, new squads auto-allocate.</span>
      </div>

      {/* List Container */}
      <div style={{ 
        flex: 1, 
        overflowY: isMobile ? 'visible' : 'auto', 
        maxHeight: isMobile ? 'none' : '500px',
        paddingRight: '4px'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(96,165,250,0.2)', borderTopColor: '#60A5FA', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '16px' 
          }}>
            {TEAMS.map(team => {
              const status = getTeamRecruitmentStatus(team.id);
              const isJoining = joiningTeam === team.id;
              
              return (
                <motion.div
                  key={team.id}
                  whileHover={{ y: -6, scale: 1.03, boxShadow: `0 15px 30px rgba(0,0,0,0.4)` }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => !joiningTeam && handleSelectTeam(team.id)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(31,41,55,0.7), rgba(17,24,39,0.9))',
                    border: '1.5px solid rgba(255,255,255,0.06)',
                    borderRadius: '20px',
                    padding: '20px 16px',
                    cursor: joiningTeam ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                >
                  {/* Stadium Lights background glow */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '40px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                    pointerEvents: 'none'
                  }} />

                  {/* Flag and name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                    <span>{team.flag}</span>
                    <span>{team.name}</span>
                  </div>

                  {/* Soccer Jersey (Animated slightly on hover) */}
                  <motion.div 
                    whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
                    transition={{ duration: 0.3 }}
                    style={{ margin: '8px 0' }}
                  >
                    <SoccerJersey team={team} />
                  </motion.div>

                  {/* Captain Info */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Captain</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>{team.captain}</div>
                  </div>

                  {/* FCFS Seat Recruitment Info */}
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', 
                    padding: '6px 12px', borderRadius: '100px', width: '100%', justifyContent: 'center'
                  }}>
                    <Users size={12} color="rgba(255,255,255,0.5)" />
                    <span style={{ fontWeight: 800, color: '#f59e0b' }}>Available: {status.text}</span>
                  </div>

                  {/* Join button overlay on card footer */}
                  <div style={{
                    width: '100%',
                    padding: '8px 0',
                    textAlign: 'center',
                    background: 'rgba(99,102,241,0.1)',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#60A5FA',
                    border: '1px solid rgba(99,102,241,0.2)'
                  }}>
                    {isJoining ? 'Drafting...' : 'Join Squad'}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        background: '#030712',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {content}
      </div>
    );
  }

  return content;
};

export default TeamSelection;
