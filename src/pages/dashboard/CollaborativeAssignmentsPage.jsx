import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, Plus, Search, Filter, Trophy, Clock, CheckCircle, 
  AlertCircle, ArrowRight, Shield, Award, Sparkles, BookOpen 
} from 'lucide-react';
import { subscribeCollaborativeAssignments, BONUS_BADGES } from '../../services/collaborativeAssignmentService';
import TeamAssignmentModal from '../../components/assignments/TeamAssignmentModal';
import CollaborativeWorkspaceEditor from '../../components/assignments/CollaborativeWorkspaceEditor';
import CollaborativeLeaderboard from '../../components/assignments/CollaborativeLeaderboard';

const CollaborativeAssignmentsPage = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Sub-tabs: 'assignments' | 'leaderboard'
  const [activeSubTab, setActiveSubTab] = useState('assignments');

  // Selected Assignment for Live Workspace Mode
  const [activeWorkspaceAssignment, setActiveWorkspaceAssignment] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeCollaborativeAssignments(user, (data) => {
      setAssignments(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (activeWorkspaceAssignment) {
    return (
      <CollaborativeWorkspaceEditor
        assignment={activeWorkspaceAssignment}
        currentUser={user}
        onBack={() => setActiveWorkspaceAssignment(null)}
      />
    );
  }

  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', color: 'var(--text-primary)' }}
    >
      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, #7C4DFF 100%)',
          color: 'var(--text-on-primary)',
          borderRadius: '24px',
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, letterSpacing: '0.08em' }}>
            Real-Time Group Workspaces
          </span>
          <h1 style={{ color: 'var(--text-on-primary)', margin: '4px 0 6px 0', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 900 }}>
            Collaborative Assignments
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', maxWidth: '560px' }}>
            Work together in shared Google Docs-style live workspaces, track section milestones, and compete on the class leaderboard.
          </p>
        </div>

        {user?.role?.toLowerCase() === 'admin' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: '100px',
              background: '#F59E0B',
              border: 'none',
              color: '#000000',
              fontWeight: 900,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 10px 25px rgba(245,158,11,0.3)'
            }}
          >
            <Plus size={18} /> Create Team Assignment
          </button>
        )}
      </div>

      {/* Sub-Tab Navigation & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Segmented Sub-Tab Switcher */}
        <div className="card card-p" style={{ background: 'var(--white)', padding: '4px', borderRadius: '100px', display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setActiveSubTab('assignments')}
            style={{
              padding: '8px 22px',
              borderRadius: '100px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: activeSubTab === 'assignments' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'assignments' ? 'var(--text-on-primary)' : 'var(--text-muted)'
            }}
          >
            👥 Team Assignments ({assignments.length})
          </button>

          <button
            onClick={() => setActiveSubTab('leaderboard')}
            style={{
              padding: '8px 22px',
              borderRadius: '100px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              background: activeSubTab === 'leaderboard' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'leaderboard' ? 'var(--text-on-primary)' : 'var(--text-muted)'
            }}
          >
            🏆 Scorecard & Leaderboard
          </button>
        </div>

        {/* Search & Filters */}
        {activeSubTab === 'assignments' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search team projects..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--white)' }}
            >
              <option value="All">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Needs Revisions</option>
            </select>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: ASSIGNMENTS GRID */}
      {activeSubTab === 'assignments' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading collaborative workspaces...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="card card-p" style={{ background: 'var(--white)', padding: '40px', borderRadius: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <h3>No collaborative team assignments found</h3>
              <p style={{ fontSize: '0.88rem' }}>Assignments created for your team will appear here for live real-time editing.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {filteredAssignments.map(a => {
                const statusBg = a.status === 'approved' ? 'rgba(34,197,94,0.1)' : a.status === 'pending_review' ? 'rgba(245,158,11,0.1)' : 'rgba(83,109,254,0.1)';
                const statusColor = a.status === 'approved' ? '#22C55E' : a.status === 'pending_review' ? '#F59E0B' : 'var(--primary)';

                return (
                  <motion.div
                    key={a.id}
                    whileHover={{ y: -4 }}
                    className="card card-p"
                    style={{
                      background: 'var(--white)',
                      borderRadius: '20px',
                      padding: '20px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '3px 10px', borderRadius: '100px', background: statusBg, color: statusColor, textTransform: 'uppercase' }}>
                          {a.status === 'approved' ? '✓ Approved' : a.status === 'pending_review' ? '⏳ Pending Review' : a.status === 'rejected' ? '💙 Reopened' : '🛠️ In Progress'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Due: {a.dueDate}</span>
                      </div>

                      <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 900 }}>{a.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {a.subject} · {a.level}
                      </p>
                    </div>

                    {/* Team Members */}
                    <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.78rem' }}>
                      <div style={{ fontWeight: 800, marginBottom: '4px', color: 'var(--text-secondary)' }}>Team Members ({(a.teamMembers || []).length}):</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(a.teamMembers || []).map((m, idx) => (
                          <span key={idx} style={{ background: 'var(--white)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700 }}>
                            {m.isLeader ? '👑 ' : ''}{m.displayName}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Progress & Marks */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                        <span>Progress</span>
                        <span>{a.progress || 0}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 100, overflow: 'hidden', marginBottom: '12px' }}>
                        <div style={{ height: '100%', width: `${a.progress || 0}%`, background: 'var(--primary)' }} />
                      </div>

                      {a.marks !== null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(34,197,94,0.06)', padding: '8px 12px', borderRadius: '100px', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#22C55E' }}>Evaluation Marks</span>
                          <strong style={{ fontSize: '1rem', fontWeight: 900, color: '#22C55E' }}>{a.marks}/100</strong>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveWorkspaceAssignment(a)}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      Open Live Workspace <ArrowRight size={16} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: LEADERBOARD & SCORECARD */}
      {activeSubTab === 'leaderboard' && (
        <CollaborativeLeaderboard assignments={assignments} />
      )}

      {/* Admin Team Assignment Modal */}
      <TeamAssignmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={user}
      />
    </motion.div>
  );
};

export default CollaborativeAssignmentsPage;
