import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { 
  collection, query, where, getDocs, doc, setDoc, updateDoc, 
  onSnapshot, serverTimestamp, orderBy, addDoc 
} from 'firebase/firestore';
import { 
  Target, Plus, Calendar, Clock, Award, Users, CheckCircle2, 
  AlertCircle, Edit3, Trash2, X, Share2, Sparkles, Filter, Search, Check, Lock, Shield
} from 'lucide-react';
import Modal from '../Modal';
import { HOUSES } from '../../services/battleOfMindsService';
import { useAuth } from '../../contexts/AuthContext';

// PREDEFINED MISSION CATEGORIES & TEMPLATES
export const PREDEFINED_MISSION_TEMPLATES = [
  {
    category: 'Learning',
    icon: '📚',
    items: [
      { id: 'chap_1', title: "Complete Today's Chapter", defaultXp: 30, criteria: 'Completion Only' },
      { id: 'pyq_1', title: 'Complete Previous Year Questions (PYQ)', defaultXp: 40, criteria: 'Minimum Score', defaultScore: 75 },
      { id: 'quiz_1', title: 'Finish Chapter Quiz', defaultXp: 35, criteria: 'Minimum Score', defaultScore: 80 },
      { id: 'lecture_1', title: 'Watch Recorded Lecture', defaultXp: 20, criteria: 'Completion Only' },
      { id: 'notes_1', title: 'Submit Notes', defaultXp: 25, criteria: 'Faculty Approval Required' },
      { id: 'code_1', title: 'Solve Coding Exercise', defaultXp: 50, criteria: 'Minimum Score', defaultScore: 90 }
    ]
  },
  {
    category: 'Attendance',
    icon: '📅',
    items: [
      { id: 'att_1', title: "Attend Today's Class", defaultXp: 10, criteria: 'Completion Only' },
      { id: 'att_2', title: 'Attend Extra Session', defaultXp: 15, criteria: 'Completion Only' },
      { id: 'att_3', title: 'Perfect Weekly Attendance', defaultXp: 60, criteria: 'Completion Only' }
    ]
  },
  {
    category: 'Assignments',
    icon: '📝',
    items: [
      { id: 'ass_1', title: 'Submit Assignment', defaultXp: 25, criteria: 'Completion Only' },
      { id: 'ass_2', title: 'Complete Practical Task', defaultXp: 30, criteria: 'Faculty Approval Required' },
      { id: 'ass_3', title: 'Finish Mini Project', defaultXp: 75, criteria: 'Faculty Approval Required' },
      { id: 'ass_4', title: 'Upload Project Report', defaultXp: 50, criteria: 'Completion Only' }
    ]
  },
  {
    category: 'Collaboration',
    icon: '🤝',
    items: [
      { id: 'collab_1', title: 'Help a House Member', defaultXp: 15, criteria: 'Faculty Approval Required' },
      { id: 'collab_2', title: 'Participate in Group Discussion', defaultXp: 20, criteria: 'Completion Only' },
      { id: 'collab_3', title: 'Complete Team Challenge', defaultXp: 60, criteria: 'Minimum Score', defaultScore: 80 },
      { id: 'collab_4', title: 'Join Study Session', defaultXp: 25, criteria: 'Completion Only' }
    ]
  },
  {
    category: 'House Challenges',
    icon: '🏆',
    items: [
      { id: 'house_1', title: 'Weekly House Challenge', defaultXp: 80, criteria: 'Minimum Score', defaultScore: 85 },
      { id: 'house_2', title: 'House Prefect Qualifier', defaultXp: 100, criteria: 'Minimum Score', defaultScore: 90 },
      { id: 'house_3', title: 'Monthly House Cup Mission', defaultXp: 150, criteria: 'Completion Only' },
      { id: 'house_4', title: 'Special Event Mission', defaultXp: 120, criteria: 'Completion Only' }
    ]
  },
  {
    category: 'Faculty Missions',
    icon: '👨‍🏫',
    items: [
      { id: 'fac_1', title: 'Faculty Bonus Challenge', defaultXp: 50, criteria: 'Faculty Approval Required' },
      { id: 'fac_2', title: 'Recommended Practice Set', defaultXp: 40, criteria: 'Minimum Score', defaultScore: 70 },
      { id: 'fac_3', title: 'Revision Marathon', defaultXp: 70, criteria: 'Completion Only' }
    ]
  }
];

const AdminHouseMissionAssignment = ({ onMissionCreated }) => {
  const { user } = useAuth();
  const [missions, setMissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    category: 'Learning',
    targetSubject: 'Computer Science & AI',
    xpReward: 30,
    criteria: 'Completion Only',
    passingScore: 80,
    targetHouses: ['gryffindor', 'ravenclaw', 'hufflepuff', 'slytherin'], // All houses default
    targetCourse: 'All Courses',
    targetBatch: 'All Batches',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });

  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Real-time Subscriptions
  useEffect(() => {
    if (!db) return;
    setLoading(true);

    const compsRef = collection(db, 'houseCompetitions');
    const qMissions = query(compsRef, orderBy('createdAt', 'desc'));

    const unsubMissions = onSnapshot(qMissions, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMissions(list);
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to missions:", err);
      setLoading(false);
    });

    const usersRef = collection(db, 'users');
    const unsubStudents = onSnapshot(query(usersRef, where('role', '==', 'student')), (snap) => {
      setStudents(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });

    return () => {
      unsubMissions();
      unsubStudents();
    };
  }, []);

  // Handle Template Select
  const handleSelectTemplate = (item, catName) => {
    setSelectedTemplate(item);
    setForm(prev => ({
      ...prev,
      title: item.title,
      category: catName,
      xpReward: item.defaultXp,
      criteria: item.criteria || 'Completion Only',
      passingScore: item.defaultScore || 80
    }));
  };

  // House Checkbox Toggle
  const toggleHouseSelection = (houseId) => {
    setForm(prev => {
      const exists = prev.targetHouses.includes(houseId);
      if (exists) {
        if (prev.targetHouses.length === 1) return prev; // Keep at least one
        return { ...prev, targetHouses: prev.targetHouses.filter(h => h !== houseId) };
      } else {
        return { ...prev, targetHouses: [...prev.targetHouses, houseId] };
      }
    });
  };

  const selectAllHouses = () => {
    setForm(prev => ({ ...prev, targetHouses: ['gryffindor', 'ravenclaw', 'hufflepuff', 'slytherin'] }));
  };

  // Handle Publish Mission
  const handlePublishMission = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { triggerToast("Please select a mission type."); return; }

    setSubmitting(true);
    try {
      // 1. Filter targeted students
      const targetedStudents = students.filter(s => {
        const houseMatch = form.targetHouses.includes(s.house || 'gryffindor');
        const courseMatch = form.targetCourse === 'All Courses' || s.course === form.targetCourse;
        const batchMatch = form.targetBatch === 'All Batches' || s.batch === form.targetBatch;
        return houseMatch && courseMatch && batchMatch;
      });

      const missionDocId = `mission_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const missionRef = doc(db, 'houseCompetitions', missionDocId);

      const isScheduled = new Date(form.startDate) > new Date();

      const newMissionData = {
        id: missionDocId,
        title: form.title,
        category: form.category,
        subject: form.targetSubject,
        xpReward: Number(form.xpReward),
        criteria: form.criteria,
        passingScore: Number(form.passingScore),
        targetHouses: form.targetHouses,
        houseId: form.targetHouses.length === 4 ? 'all' : form.targetHouses[0],
        targetCourse: form.targetCourse,
        targetBatch: form.targetBatch,
        startDate: form.startDate,
        endDate: form.endDate,
        status: isScheduled ? 'Scheduled' : 'Active',
        assignedBy: user?.displayName || 'Admin',
        assignedByUid: user?.uid || 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Real-time tracking fields
        assignedCount: targetedStudents.length,
        startedCount: 0,
        completedCount: 0,
        totalXpAwarded: 0
      };

      await setDoc(missionRef, newMissionData);

      // 2. Auto-dispatch Notifications to targeted students
      const notifBatchPromises = targetedStudents.map(student => {
        return addDoc(collection(db, 'notifications'), {
          userId: student.uid,
          title: `🎯 New House Mission: ${form.title}`,
          message: `Earn +${form.xpReward} House XP. Target: ${form.targetSubject}. Due: ${new Date(form.endDate).toLocaleDateString()}`,
          type: 'house_mission',
          missionId: missionDocId,
          read: false,
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(notifBatchPromises.slice(0, 50)); // Batch dispatch top 50 in parallel

      triggerToast(`Mission "${form.title}" assigned to ${targetedStudents.length} students across selected houses!`);
      setIsAssignModalOpen(false);
      setSelectedTemplate(null);
      if (onMissionCreated) onMissionCreated();
    } catch (err) {
      console.error("Error publishing mission:", err);
      triggerToast("Failed to publish mission.");
    } finally {
      setSubmitting(false);
    }
  };

  // Extend Mission Deadline
  const handleExtendDeadline = async (missionId) => {
    const newEnd = prompt("Enter new deadline date (YYYY-MM-DD HH:MM):", new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16));
    if (!newEnd) return;

    try {
      await updateDoc(doc(db, 'houseCompetitions', missionId), {
        endDate: newEnd,
        status: 'Active',
        updatedAt: serverTimestamp()
      });
      triggerToast("Mission deadline extended.");
    } catch (err) {
      console.error("Error extending deadline:", err);
      triggerToast("Failed to extend deadline.");
    }
  };

  // Cancel Mission
  const handleCancelMission = async (missionId) => {
    if (!window.confirm("Are you sure you want to cancel this active mission?")) return;

    try {
      await updateDoc(doc(db, 'houseCompetitions', missionId), {
        status: 'Cancelled',
        updatedAt: serverTimestamp()
      });
      triggerToast("Mission cancelled.");
    } catch (err) {
      console.error("Error cancelling mission:", err);
      triggerToast("Failed to cancel mission.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#4ADE80',
              padding: '12px 18px',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '0.88rem'
            }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 950, color: 'var(--dark)' }}>
            📜 Mission Assignment Center
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Select structured mission templates, configure target houses/batches, and track real-time progress.
          </span>
        </div>

        <button
          onClick={() => setIsAssignModalOpen(true)}
          style={{
            padding: '12px 24px',
            borderRadius: '100px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--primary), #3B82F6)',
            color: '#FFF',
            fontWeight: 900,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            minHeight: '44px'
          }}
        >
          <Target size={18} /> + Assign New Mission
        </button>
      </div>

      {/* Roster of Published Missions & Real-Time Tracking */}
      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading live house missions...
        </div>
      ) : missions.length === 0 ? (
        <div style={{ background: 'var(--white)', padding: '40px', borderRadius: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📜</div>
          <div style={{ fontWeight: 800, color: 'var(--dark)' }}>No mission assignments published yet</div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Click "+ Assign New Mission" to select a structured template.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {missions.map(m => {
            const isExpired = new Date(m.endDate) < new Date();
            const statusLabel = m.status === 'Cancelled' ? 'Cancelled' : isExpired ? 'Expired' : m.status || 'Active';
            
            const statusBg = {
              Active: 'rgba(34, 197, 94, 0.12)',
              Scheduled: 'rgba(245, 158, 11, 0.12)',
              Completed: 'rgba(99, 102, 241, 0.12)',
              Expired: 'rgba(100, 116, 139, 0.12)',
              Cancelled: 'rgba(239, 68, 68, 0.12)'
            }[statusLabel] || 'rgba(34, 197, 94, 0.12)';

            const statusColor = {
              Active: '#16A34A',
              Scheduled: '#D97706',
              Completed: '#4F46E5',
              Expired: '#475569',
              Cancelled: '#DC2626'
            }[statusLabel] || '#16A34A';

            const assigned = m.assignedCount || students.length;
            const completed = m.completedCount || 0;
            const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

            return (
              <div key={m.id} style={{
                background: 'var(--white)',
                borderRadius: '20px',
                padding: '20px',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', background: statusBg, color: statusColor, fontWeight: 900, fontSize: '0.75rem' }}>
                      {statusLabel}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 800 }}>
                      +{m.xpReward || 30} House XP
                    </span>
                  </div>

                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--dark)' }}>
                    {m.title}
                  </h4>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <span>Subject: <strong>{m.subject || 'Computer Science'}</strong></span>
                    <span>Criteria: <strong>{m.criteria || 'Completion Only'}</strong></span>
                    <span>Due: <strong>{new Date(m.endDate).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                {/* Progress Bar & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                      COMPLETION ({pct}%)
                    </div>
                    <div style={{ height: '6px', width: '120px', borderRadius: '100px', background: 'var(--border)', marginTop: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--success)', borderRadius: '100px' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--dark)', marginTop: '2px', fontWeight: 700 }}>
                      {completed} / {assigned} Students
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {statusLabel === 'Active' && (
                      <>
                        <button
                          onClick={() => handleExtendDeadline(m.id)}
                          style={{ padding: '8px 14px', borderRadius: '100px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--dark)', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Extend
                        </button>
                        <button
                          onClick={() => handleCancelMission(m.id)}
                          style={{ padding: '8px 14px', borderRadius: '100px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🎯 STRUCTURED MISSION ASSIGNMENT MODAL */}
      {isAssignModalOpen && (
        <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="🎯 Mission Assignment Center">
          <form onSubmit={handlePublishMission} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh', overflowY: 'auto' }}>
            
            {/* Step 1: Searchable Predefined Category Templates */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--dark)', marginBottom: '6px', display: 'block' }}>
                1. Select Predefined Mission Template *
              </label>

              {/* Template Search Bar */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search templates (e.g. PYQ, Quiz, Lecture, Attendance)..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '100px', border: '1px solid var(--border)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Template Grid */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                {PREDEFINED_MISSION_TEMPLATES.map(cat => {
                  const items = cat.items.filter(i => !templateSearch || i.title.toLowerCase().includes(templateSearch.toLowerCase()));
                  if (items.length === 0) return null;

                  return (
                    <div key={cat.category}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        {cat.icon} {cat.category}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                        {items.map(item => {
                          const isSelected = selectedTemplate?.id === item.id || form.title === item.title;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectTemplate(item, cat.category)}
                              style={{
                                textAlign: 'left',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--white)',
                                color: 'var(--dark)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span>{item.title}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 900 }}>+{item.defaultXp} XP</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Mission Summary Banner */}
            {form.title && (
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '12px 16px', borderRadius: '14px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16A34A' }}>SELECTED MISSION:</div>
                <div style={{ fontSize: '1rem', fontWeight: 950, color: 'var(--dark)' }}>{form.title}</div>
              </div>
            )}

            {/* Step 2: Target Subject & XP Reward */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Target Subject / Topic *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science - Chapter 4"
                  value={form.targetSubject}
                  onChange={(e) => setForm({ ...form, targetSubject: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>XP Reward *</label>
                <input
                  type="number"
                  required
                  value={form.xpReward}
                  onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box', fontWeight: 900 }}
                />
              </div>
            </div>

            {/* Step 3: Target Houses Multi-Select */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Target Houses *</label>
                <button type="button" onClick={selectAllHouses} style={{ fontSize: '0.75rem', color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800 }}>
                  Select All Houses
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {Object.values(HOUSES).map(h => {
                  const isChecked = form.targetHouses.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHouseSelection(h.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: isChecked ? `2px solid ${h.primaryColor}` : '1px solid var(--border)',
                        background: isChecked ? `${h.primaryColor}15` : 'var(--bg)',
                        color: 'var(--dark)',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      {h.emoji} {h.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Course & Batch Targeting */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Course Targeting</label>
                <select
                  value={form.targetCourse}
                  onChange={(e) => setForm({ ...form, targetCourse: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                >
                  <option value="All Courses">All Courses</option>
                  <option value="Basic Computer">Basic Computer</option>
                  <option value="Basic with AI">Basic with AI</option>
                  <option value="Full Stack Web Dev">Full Stack Web Dev</option>
                  <option value="Python & AI">Python & AI</option>
                  <option value="Class 10 Science">Class 10 Science</option>
                  <option value="Class 12 Physics">Class 12 Physics</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Batch / Class</label>
                <select
                  value={form.targetBatch}
                  onChange={(e) => setForm({ ...form, targetBatch: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                >
                  <option value="All Batches">All Batches</option>
                  <option value="Batch A">Batch A</option>
                  <option value="Morning">Morning Batch</option>
                  <option value="Evening">Evening Batch</option>
                </select>
              </div>
            </div>

            {/* Step 5: Schedule Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Step 6: Passing Criteria */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Passing Criteria</label>
                <select
                  value={form.criteria}
                  onChange={(e) => setForm({ ...form, criteria: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                >
                  <option value="Completion Only">Completion Only</option>
                  <option value="Minimum Score">Minimum Score %</option>
                  <option value="Minimum Accuracy">Minimum Accuracy %</option>
                  <option value="Faculty Approval Required">Faculty Approval Required</option>
                </select>
              </div>

              {form.criteria.includes('Minimum') && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Min Score (%)</label>
                  <input
                    type="number"
                    value={form.passingScore}
                    onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: '10px',
                padding: '14px',
                borderRadius: '100px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--primary), #3B82F6)',
                color: '#FFF',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: submitting ? 'wait' : 'pointer'
              }}
            >
              {submitting ? 'Publishing & Dispatching Notifications...' : '🚀 Publish Mission & Notify Students'}
            </button>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default AdminHouseMissionAssignment;
