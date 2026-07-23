import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Save, Users, Clock, History, MessageSquare, CheckSquare, 
  Send, RefreshCw, Lock, Unlock, Award, CheckCircle, FileText, Sparkles, 
  Bold, Italic, Code, List, Table, Image, Mic, Play, Shield, File, Download 
} from 'lucide-react';
import { 
  subscribeWorkspaceDoc, autosaveWorkspaceDoc, updatePresenceState, 
  subscribePresenceStates, subscribeWorkspaceComments, addWorkspaceComment, 
  subscribeWorkspaceActivity, subscribeWorkspaceVersions, restoreWorkspaceVersion, 
  submitForReview, BONUS_BADGES 
} from '../../services/collaborativeAssignmentService';
import ApprovalGradingModal from './ApprovalGradingModal';
import RejectionEncouragementModal from './RejectionEncouragementModal';
import DocumentPreviewer from './DocumentPreviewer';

const CollaborativeWorkspaceEditor = ({ assignment, currentUser, onBack }) => {
  const [workspaceDoc, setWorkspaceDoc] = useState(null);
  const [content, setContent] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [presenceList, setPresenceList] = useState([]);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [versions, setVersions] = useState([]);

  // Main Workspace Tab: 'workspace' | 'original_file'
  const [activeMainTab, setActiveMainTab] = useState('workspace');

  // Active Drawers & Modals
  const [activeRightTab, setActiveRightTab] = useState('comments'); // 'comments' | 'history' | 'activity'
  const [newComment, setNewComment] = useState('');
  const [saveStatus, setSaveStatus] = useState('Autosaved'); // 'Autosaved' | 'Saving...' | 'Unsaved'
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [isEncouragementModalOpen, setIsEncouragementModalOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // New Checklist Item State
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistCat, setNewChecklistCat] = useState('Documentation');

  const autosaveTimerRef = useRef(null);

  // 1. Subscribe to real-time workspace doc
  useEffect(() => {
    if (!assignment?.id) return;
    const unsubDoc = subscribeWorkspaceDoc(assignment.id, (data) => {
      if (data) {
        setWorkspaceDoc(data);
        setContent(data.content || '');
        setChecklist(data.checklist || []);
      }
    });

    const unsubPresence = subscribePresenceStates(assignment.id, setPresenceList);
    const unsubComments = subscribeWorkspaceComments(assignment.id, setComments);
    const unsubActivity = subscribeWorkspaceActivity(assignment.id, setActivity);
    const unsubVersions = subscribeWorkspaceVersions(assignment.id, setVersions);

    // Initial presence ping
    updatePresenceState(assignment.id, currentUser, false, 'Editor');

    return () => {
      unsubDoc();
      unsubPresence();
      unsubComments();
      unsubActivity();
      unsubVersions();
    };
  }, [assignment?.id, currentUser?.uid]);

  // 2. Real-time Autosave Trigger (debounced 1.5s)
  const handleContentChange = (newVal) => {
    setContent(newVal);
    setSaveStatus('Saving...');

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      await autosaveWorkspaceDoc(assignment.id, newVal, checklist, currentUser);
      setSaveStatus('Autosaved');
    }, 1500);

    // Broadcast presence typing state
    updatePresenceState(assignment.id, currentUser, true, 'Editor');
  };

  // 3. Toggle Checklist Item
  const toggleChecklistItem = async (chkId) => {
    const updatedChecklist = checklist.map(item => 
      item.id === chkId ? { ...item, completed: !item.completed, assignedTo: currentUser.displayName || 'Member' } : item
    );
    setChecklist(updatedChecklist);
    setSaveStatus('Saving...');
    await autosaveWorkspaceDoc(assignment.id, content, updatedChecklist, currentUser);
    setSaveStatus('Autosaved');
  };

  // 4. Add New Custom Checklist Item
  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;

    const newItem = {
      id: `chk_${Date.now()}`,
      text: newChecklistText.trim(),
      category: newChecklistCat,
      completed: false,
      assignedTo: currentUser.displayName || 'Member'
    };

    const updatedChecklist = [...checklist, newItem];
    setChecklist(updatedChecklist);
    setNewChecklistText('');
    await autosaveWorkspaceDoc(assignment.id, content, updatedChecklist, currentUser);
  };

  // 5. Send Comment
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addWorkspaceComment(assignment.id, newComment, currentUser);
    setNewComment('');
  };

  // 6. Submit for Review
  const handleSubmitReview = async () => {
    setIsSubmittingReview(true);
    try {
      await submitForReview(assignment.id, currentUser);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // 7. Format Toolbar Inserter
  const insertFormatting = (prefix, suffix = '') => {
    setContent(prev => prev + `${prefix}${suffix}`);
  };

  // Progress metrics calculation
  const sectionProgress = workspaceDoc?.sectionProgress || { Research: 0, Design: 0, Documentation: 0, Testing: 0, Overall: 0 };
  const overallPct = sectionProgress.Overall || 0;
  
  // Progress Bar Color Mapping (Red -> Orange -> Blue -> Green)
  const getProgressBarColor = (pct) => {
    if (pct >= 80) return '#10B981'; // Green
    if (pct >= 50) return '#3B82F6'; // Blue
    if (pct >= 25) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  const isReadOnly = assignment.status === 'approved' || assignment.status === 'locked';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minHeight: '100dvh' }}>
      {/* Top Header Bar */}
      <div
        className="card card-p"
        style={{
          background: 'var(--white)',
          padding: '16px 20px',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem' }}>
            <ArrowLeft size={16} /> Back
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{assignment.title}</h2>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', background: assignment.status === 'approved' ? 'rgba(34,197,94,0.1)' : assignment.status === 'pending_review' ? 'rgba(245,158,11,0.1)' : 'rgba(83,109,254,0.1)', color: assignment.status === 'approved' ? '#22C55E' : assignment.status === 'pending_review' ? '#F59E0B' : 'var(--primary)' }}>
                {assignment.status === 'approved' ? '✓ Approved' : assignment.status === 'pending_review' ? '⏳ Pending Review' : assignment.status === 'rejected' ? '💙 Needs Revisions' : '🛠️ Live Workspace'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {assignment.subject} · Due: {assignment.dueDate} · Marks: {assignment.marks || 100} · Faculty Leader: {assignment.facultyLeaderName || 'None'}
            </div>
          </div>
        </div>

        {/* Presence & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Autosave Status Indicator */}
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: saveStatus === 'Saving...' ? '#F59E0B' : '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={14} /> {saveStatus}
          </div>

          {/* Presence Avatars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '-6px' }}>
            {presenceList.map((p, idx) => (
              <div
                key={p.uid || idx}
                title={`${p.displayName} (${p.isTyping ? 'Typing...' : 'Active'})`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  border: '2px solid white',
                  position: 'relative'
                }}
              >
                {p.displayName.substring(0, 2).toUpperCase()}
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: p.isTyping ? '#F59E0B' : '#10B981', border: '1px solid white' }} />
              </div>
            ))}
          </div>

          {/* Action Trigger Buttons */}
          {currentUser.role?.toLowerCase() === 'admin' ? (
            <button
              onClick={() => setIsGradingModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '10px', background: 'var(--success, #22C55E)', border: 'none', fontWeight: 800 }}
            >
              <Award size={16} /> Review & Grade
            </button>
          ) : (
            <button
              onClick={handleSubmitReview}
              disabled={isSubmittingReview || assignment.status === 'pending_review' || isReadOnly}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '10px', fontWeight: 800 }}
            >
              {assignment.status === 'pending_review' ? 'Submitted for Review' : 'Submit for Review'}
            </button>
          )}

          {assignment.status === 'rejected' && (
            <button
              onClick={() => setIsEncouragementModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '10px', color: '#6366F1', border: '1px solid #6366F1', fontWeight: 800 }}
            >
              💙 View Feedback & Redo
            </button>
          )}
        </div>
      </div>

      {/* Workspace / Original File Segmented Controls */}
      <div className="card card-p" style={{ background: 'var(--white)', padding: '6px', borderRadius: '14px', display: 'flex', gap: '6px', maxWidth: 'fit-content' }}>
        <button
          onClick={() => setActiveMainTab('workspace')}
          style={{
            padding: '8px 20px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            background: activeMainTab === 'workspace' ? 'var(--primary)' : 'transparent',
            color: activeMainTab === 'workspace' ? 'var(--text-on-primary)' : 'var(--text-muted)'
          }}
        >
          🛠️ Interactive Workspace
        </button>

        <button
          onClick={() => setActiveMainTab('original_file')}
          style={{
            padding: '8px 20px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            background: activeMainTab === 'original_file' ? 'var(--primary)' : 'transparent',
            color: activeMainTab === 'original_file' ? 'var(--text-on-primary)' : 'var(--text-muted)'
          }}
        >
          📄 Original Assignment File {assignment.fileName ? `(${assignment.fileName})` : ''}
        </button>
      </div>

      {/* MAIN VIEW: ORIGINAL FILE PREVIEW OR LIVE WORKSPACE */}
      {activeMainTab === 'original_file' ? (
        <DocumentPreviewer
          fileURL={assignment.fileURL}
          fileName={assignment.fileName}
          fileType={assignment.fileType}
          rawContent={workspaceDoc?.content}
        />
      ) : (
        /* Main Workspace Layout (2 Columns: Editor & Drawers) */
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }} className="grid-2-col-mobile">
          {/* LEFT COLUMN: Workspace Editor & Progress Tracker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Team Progress Breakdown Card */}
            <div className="card card-p" style={{ background: 'var(--white)', padding: '20px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900 }}>Team Completion Progress</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automated milestone calculation</span>
                </div>
                <strong style={{ fontSize: '1.2rem', fontWeight: 900, color: getProgressBarColor(overallPct) }}>
                  {overallPct}% Overall
                </strong>
              </div>

              {/* Dynamic Animated Progress Bar */}
              <div style={{ height: 10, background: 'var(--border)', borderRadius: 100, overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ height: '100%', width: `${overallPct}%`, background: getProgressBarColor(overallPct), transition: 'width 0.6s ease' }} />
              </div>

              {/* Section Percentages Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {['Research', 'Design', 'Documentation', 'Testing'].map(sec => (
                  <div key={sec} style={{ background: 'var(--bg)', padding: '8px 12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{sec}</div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>{sectionProgress[sec] || 0}%</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Shared Checklist */}
            <div className="card card-p" style={{ background: 'var(--white)', padding: '20px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckSquare size={18} style={{ color: 'var(--primary)' }} /> Collaborative Team Checklist
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {checklist.map(item => (
                  <div
                    key={item.id}
                    onClick={() => !isReadOnly && toggleChecklistItem(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: item.completed ? 'rgba(34,197,94,0.05)' : 'var(--bg)',
                      cursor: isReadOnly ? 'default' : 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        readOnly
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {item.text}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(83,109,254,0.1)', color: 'var(--primary)', fontWeight: 800 }}>
                      {item.category}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add Custom Task Form */}
              {!isReadOnly && (
                <form onSubmit={handleAddChecklistItem} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Add custom task item..."
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                  />
                  <select
                    value={newChecklistCat}
                    onChange={e => setNewChecklistCat(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem', background: 'var(--white)' }}
                  >
                    <option value="Research">Research</option>
                    <option value="Design">Design</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Testing">Testing</option>
                  </select>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.82rem', borderRadius: '8px' }}>
                    Add Task
                  </button>
                </form>
              )}
            </div>

            {/* Live Content Editor */}
            <div className="card card-p" style={{ background: 'var(--white)', padding: '20px', borderRadius: '20px' }}>
              {/* Formatting Toolbar */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <button onClick={() => insertFormatting('**', '**')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}><Bold size={14} /></button>
                <button onClick={() => insertFormatting('*', '*')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}><Italic size={14} /></button>
                <button onClick={() => insertFormatting('`', '`')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}><Code size={14} /></button>
                <button onClick={() => insertFormatting('\n- ')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}><List size={14} /></button>
                <button onClick={() => insertFormatting('\n| Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |\n')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}><Table size={14} /></button>
              </div>

              <textarea
                readOnly={isReadOnly}
                value={content}
                onChange={e => handleContentChange(e.target.value)}
                placeholder="Collaborate live here... Supports Markdown & Rich Formatting."
                rows={16}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Discussion Comments, History & Timeline Drawers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Drawer Segmented Header */}
            <div className="card card-p" style={{ background: 'var(--white)', padding: '6px', borderRadius: '14px', display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setActiveRightTab('comments')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  background: activeRightTab === 'comments' ? 'var(--primary)' : 'transparent',
                  color: activeRightTab === 'comments' ? 'var(--text-on-primary)' : 'var(--text-muted)'
                }}
              >
                💬 Comments ({comments.length})
              </button>

              <button
                onClick={() => setActiveRightTab('activity')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  background: activeRightTab === 'activity' ? 'var(--primary)' : 'transparent',
                  color: activeRightTab === 'activity' ? 'var(--text-on-primary)' : 'var(--text-muted)'
                }}
              >
                ⚡ Activity
              </button>

              <button
                onClick={() => setActiveRightTab('history')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  background: activeRightTab === 'history' ? 'var(--primary)' : 'transparent',
                  color: activeRightTab === 'history' ? 'var(--text-on-primary)' : 'var(--text-muted)'
                }}
              >
                📜 History
              </button>
            </div>

            {/* TAB 1: COMMENTS THREAD */}
            {activeRightTab === 'comments' && (
              <div className="card card-p" style={{ background: 'var(--white)', padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', height: '480px', justifyContent: 'space-between' }}>
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                  {comments.map((c, idx) => (
                    <div key={c.id || idx} style={{ background: 'var(--bg)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '2px' }}>
                        <span style={{ color: 'var(--primary)' }}>{c.authorName}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{c.authorRole}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{c.text}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No discussion comments yet. Start the conversation!
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendComment} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="text"
                    placeholder="Leave suggestion or comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px', borderRadius: '8px' }}>
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: ACTIVITY TIMELINE */}
            {activeRightTab === 'activity' && (
              <div className="card card-p" style={{ background: 'var(--white)', padding: '20px', borderRadius: '20px', height: '480px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 900 }}>Live Activity Feed</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activity.map((act, idx) => (
                    <div key={act.id || idx} style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '10px', fontSize: '0.78rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{act.userName}:</strong> {act.message}
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(act.createdAt?.seconds * 1000 || Date.now()).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: VERSION HISTORY */}
            {activeRightTab === 'history' && (
              <div className="card card-p" style={{ background: 'var(--white)', padding: '20px', borderRadius: '20px', height: '480px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 900 }}>Revision History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {versions.map((ver, idx) => (
                    <div key={ver.id || idx} style={{ background: 'var(--bg)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                        <span>{ver.authorName}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                          {new Date(ver.createdAt?.seconds * 1000 || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 8px 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        "{ver.contentSnippet}..."
                      </p>
                      {currentUser.role?.toLowerCase() === 'admin' && (
                        <button
                          onClick={() => restoreWorkspaceVersion(assignment.id, ver, currentUser)}
                          style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Restore Version
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Grading Modal */}
      <ApprovalGradingModal
        isOpen={isGradingModalOpen}
        onClose={() => setIsGradingModalOpen(false)}
        assignment={assignment}
        currentUser={currentUser}
      />

      {/* Rejection Encouragement Modal */}
      <RejectionEncouragementModal
        isOpen={isEncouragementModalOpen}
        onClose={() => setIsEncouragementModalOpen(false)}
        assignment={assignment}
        currentUser={currentUser}
      />
    </div>
  );
};

export default CollaborativeWorkspaceEditor;
