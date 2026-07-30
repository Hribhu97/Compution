import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  HOUSES, subscribeAllHouses, createPrefectCompetition, declareHousePrefect, 
  switchUserHouse, logHouseActivity 
} from '../../services/battleOfMindsService';
import { 
  Shield, Trophy, Crown, Plus, Users, Search, Filter, 
  Check, AlertCircle, FileText, UploadCloud, Edit3, Trash2 
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import Modal from '../Modal';

const AdminHouseManagement = () => {
  const { user } = useAuth();
  const [allHouses, setAllHouses] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'members', 'competitions'
  
  // Student Reassignment State
  const [searchStudent, setSearchStudent] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [targetHouse, setTargetHouse] = useState('gryffindor');
  
  // New Competition Form State
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [compForm, setCompForm] = useState({
    title: '',
    houseId: 'all',
    subject: 'Computer Science & AI',
    durationMins: 20,
    passingScore: 80,
    status: 'Active'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  useEffect(() => {
    const unsub = subscribeAllHouses((data) => setAllHouses(data));
    return () => unsub();
  }, []);

  const handleSearchStudents = async (e) => {
    e.preventDefault();
    if (!searchStudent.trim()) return;
    try {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'student'),
        limit(15)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u => 
          (u.displayName || u.name || '').toLowerCase().includes(searchStudent.toLowerCase()) ||
          (u.email || '').toLowerCase().includes(searchStudent.toLowerCase())
        );
      setSearchResults(list);
    } catch (err) {
      console.error("Error searching students:", err);
    }
  };

  const handleReassignHouse = async (student) => {
    setIsSubmitting(true);
    try {
      await switchUserHouse(student, targetHouse, true);
      triggerToast(`Reassigned ${student.displayName || student.name} to ${HOUSES[targetHouse].name}`);
      setSelectedStudent(null);
    } catch (err) {
      triggerToast(err.message || 'Failed to reassign house');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateComp = async (e) => {
    e.preventDefault();
    if (!compForm.title.trim()) return;
    setIsSubmitting(true);
    try {
      await createPrefectCompetition(user, compForm);
      triggerToast('House Prefect Competition published successfully!');
      setIsCompModalOpen(false);
      setCompForm({
        title: '',
        houseId: 'all',
        subject: 'Computer Science & AI',
        durationMins: 20,
        passingScore: 80,
        status: 'Active'
      });
    } catch (err) {
      triggerToast(err.message || 'Failed to publish competition');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {toastMsg && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          color: '#4ADE80',
          padding: '12px 18px',
          borderRadius: '12px',
          fontWeight: 800,
          fontSize: '0.88rem'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Header Bar */}
      <div style={{
        background: 'var(--white)',
        padding: '16px 20px',
        borderRadius: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        border: '1px solid var(--border)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 950, color: 'var(--dark)' }}>
            🏰 Battle of Minds House Management
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Manage houses, reassign students, publish prefect competitions & declare winners.
          </span>
        </div>

        <button
          onClick={() => setIsCompModalOpen(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '100px',
            border: 'none',
            background: 'var(--primary)',
            color: '#FFF',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={16} /> New Prefect Competition
        </button>
      </div>

      {/* Segmented Control */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { id: 'overview', label: 'Houses Overview' },
          { id: 'members', label: 'Student Reassignment' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 18px',
              borderRadius: '100px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === t.id ? 'var(--primary)' : 'var(--bg)',
              color: activeTab === t.id ? '#FFF' : 'var(--text-muted)',
              minHeight: '38px'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: HOUSES OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {Object.values(HOUSES).map(h => {
            const liveData = allHouses.find(item => item.id === h.id) || {};
            return (
              <div key={h.id} style={{
                background: 'var(--white)',
                borderRadius: '20px',
                padding: '20px',
                border: `1.5px solid ${h.primaryColor}40`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {h.logo ? (
                      <img src={h.logo} alt={h.name} style={{ width: 38, height: 38, objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '2rem' }}>{h.emoji}</span>
                    )}
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: h.primaryColor }}>{h.name}</h3>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg)', padding: '10px', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>POINTS</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--dark)' }}>{liveData.totalPoints || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>MEMBERS</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--dark)' }}>{liveData.memberCount || 0}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  👑 Prefect: <strong>{liveData.currentPrefectName || 'None'}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: STUDENT REASSIGNMENT */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <form onSubmit={handleSearchStudents} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search student by name or email..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              style={{ flex: 1, padding: '12px 18px', borderRadius: '100px', border: '1px solid var(--border)', outline: 'none', minHeight: '44px' }}
            />
            <button type="submit" style={{ padding: '12px 24px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#FFF', fontWeight: 800, minHeight: '44px' }}>
              Search Student
            </button>
          </form>

          {searchResults.map(s => (
            <div key={s.uid} style={{
              background: 'var(--white)',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800 }}>{s.displayName || s.name}</h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Current House: <strong>{s.house ? HOUSES[s.house]?.name : 'Unassigned'}</strong> • Email: {s.email}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={targetHouse}
                  onChange={(e) => setTargetHouse(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', minHeight: '40px' }}
                >
                  {Object.values(HOUSES).map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleReassignHouse(s)}
                  style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: '#F59E0B', color: '#000', fontWeight: 800, minHeight: '40px', cursor: 'pointer' }}
                >
                  Admin Override Reassign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Competition Modal */}
      {isCompModalOpen && (
        <Modal isOpen={isCompModalOpen} onClose={() => setIsCompModalOpen(false)} title="Create Prefect Competition">
          <form onSubmit={handleCreateComp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Competition Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Gryffindor Prefect Qualifying Exam"
                value={compForm.title}
                onChange={(e) => setCompForm({ ...compForm, title: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Target House</label>
              <select
                value={compForm.houseId}
                onChange={(e) => setCompForm({ ...compForm, houseId: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
              >
                <option value="all">All Houses</option>
                {Object.values(HOUSES).map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Duration (Mins)</label>
                <input
                  type="number"
                  value={compForm.durationMins}
                  onChange={(e) => setCompForm({ ...compForm, durationMins: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Passing Score (%)</label>
                <input
                  type="number"
                  value={compForm.passingScore}
                  onChange={(e) => setCompForm({ ...compForm, passingScore: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* 📎 Admin Question File Attachment */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UploadCloud size={16} color="var(--primary)" /> Attach Question Bank (PDF / DOCX / TXT / JSON)
              </label>
              <div style={{
                border: '2px dashed var(--primary)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                background: 'rgba(83, 109, 254, 0.04)',
                marginTop: '6px',
                position: 'relative'
              }}>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.json,.csv"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setCompForm(prev => ({
                        ...prev,
                        attachedFileName: file.name,
                        attachedFileSize: (file.size / 1024).toFixed(1) + ' KB'
                      }));
                    }
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                />
                {compForm.attachedFileName ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--success)', fontWeight: 800, fontSize: '0.88rem' }}>
                    <FileText size={18} /> {compForm.attachedFileName} ({compForm.attachedFileSize})
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <strong>Click or drag question document here</strong> to attach (PDF, DOCX, TXT, JSON)
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '14px',
                borderRadius: '100px',
                border: 'none',
                background: 'var(--primary)',
                color: '#FFF',
                fontWeight: 900,
                cursor: isSubmitting ? 'wait' : 'pointer',
                marginTop: '8px'
              }}
            >
              Publish Competition
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminHouseManagement;
