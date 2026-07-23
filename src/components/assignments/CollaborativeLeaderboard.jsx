import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Star, Flame, CheckCircle, Users, Sparkles, TrendingUp } from 'lucide-react';
import { BONUS_BADGES } from '../../services/collaborativeAssignmentService';

const CollaborativeLeaderboard = ({ assignments = [] }) => {
  // Filter graded / completed assignments
  const gradedAssignments = assignments
    .filter(a => a.status === 'approved' && a.marks !== null)
    .sort((a, b) => b.marks - a.marks);

  const top3 = gradedAssignments.slice(0, 3);
  const remaining = gradedAssignments.slice(3);

  // Analytics calculations
  const totalApproved = gradedAssignments.length;
  const avgMarks = totalApproved > 0 ? Math.round(gradedAssignments.reduce((acc, a) => acc + (a.marks || 0), 0) / totalApproved) : 0;
  const totalBadgesAwarded = gradedAssignments.reduce((acc, a) => acc + (a.bonusBadges?.length || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Top Header Metrics Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(83, 109, 254, 0.12) 100%)',
        border: '1.5px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '24px',
        padding: '24px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span style={{ background: '#F59E0B', color: '#000', fontSize: '0.72rem', fontWeight: 900, padding: '3px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Team Competition Scoreboard
          </span>
          <h2 style={{ margin: '6px 0 2px 0', fontSize: '1.5rem', fontWeight: 900 }}>Collaborative Leaderboard</h2>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Real-time team standings based on evaluation marks & bonus badges</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--white)', padding: '10px 18px', borderRadius: '14px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Average Class Score</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)' }}>{avgMarks}/100</h3>
          </div>

          <div style={{ background: 'var(--white)', padding: '10px 18px', borderRadius: '14px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Total Badges Earned</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#F59E0B' }}>🏅 {totalBadgesAwarded}</h3>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px 0' }}>🏆 Championship Podium</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {top3.map((team, idx) => {
              const medalEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
              const rankColor = idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : '#D97706';

              return (
                <div
                  key={team.id}
                  className="card card-p"
                  style={{
                    background: 'var(--white)',
                    border: `1.5px solid ${rankColor}`,
                    borderRadius: '20px',
                    padding: '20px',
                    boxShadow: idx === 0 ? '0 10px 30px rgba(245, 158, 11, 0.2)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '2rem' }}>{medalEmoji}</span>
                    <strong style={{ fontSize: '1.4rem', fontWeight: 900, color: rankColor }}>{team.marks}/100</strong>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 900 }}>{team.title}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{team.subject} · {team.level}</span>
                  </div>

                  {/* Team Members */}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <strong>Members:</strong> {(team.teamMembers || []).map(m => m.displayName).join(', ')}
                  </div>

                  {/* Bonus Badges */}
                  {team.bonusBadges && team.bonusBadges.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {team.bonusBadges.map(bId => {
                        const bObj = BONUS_BADGES.find(b => b.id === bId);
                        return bObj ? (
                          <span key={bId} style={{ background: `${bObj.color}15`, color: bObj.color, padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800 }}>
                            {bObj.icon} {bObj.title}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="card card-p" style={{ background: 'var(--white)', padding: '24px', borderRadius: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800 }}>All Evaluated Team Rankings</h3>
        {gradedAssignments.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No graded team assignments published yet. Complete and grade assignments to populate the leaderboard.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {gradedAssignments.map((team, idx) => (
              <div
                key={team.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: idx < 3 ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '220px' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.1rem', minWidth: 28 }}>#{idx + 1}</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{team.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Faculty Leader: {team.facultyLeaderName || 'None'} · Members: {(team.teamMembers || []).map(m => m.displayName).join(', ')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(team.bonusBadges || []).map(bId => {
                      const bObj = BONUS_BADGES.find(b => b.id === bId);
                      return bObj ? <span key={bId} title={bObj.title} style={{ fontSize: '1.1rem' }}>{bObj.icon}</span> : null;
                    })}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>{team.marks}/100</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{team.progress || 100}% Completed</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborativeLeaderboard;
