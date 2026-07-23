import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Award, Users, CheckCircle, Sparkles, Send } from 'lucide-react';
import { SYSTEM_BADGES } from '../../services/achievementService';

const FacultyAchievementManager = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState('comm_faculty_favorite');
  const [facultyNote, setFacultyNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach(d => {
          const data = d.data();
          if (data.role?.toLowerCase() === 'student' || !data.role) {
            list.push({ id: d.id, displayName: data.displayName || data.name || 'Student' });
          }
        });
        setStudents(list);
        if (list.length > 0) setSelectedStudentId(list[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStudents();
  }, []);

  const handleAwardBadge = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedBadgeId) return;

    setIsSubmitting(true);
    setStatusMessage('');

    try {
      const badgeObj = SYSTEM_BADGES.find(b => b.id === selectedBadgeId) || SYSTEM_BADGES[0];
      const badgeRef = doc(db, 'users', selectedStudentId, 'studentAchievements', selectedBadgeId);
      
      await setDoc(badgeRef, {
        progress: badgeObj.target,
        isUnlocked: true,
        unlockedAt: new Date().toISOString(),
        facultyNote: facultyNote || 'Awarded by Faculty Mentor for outstanding performance.',
        updatedAt: serverTimestamp()
      }, { merge: true });

      setStatusMessage('🎉 Badge successfully awarded to student!');
      setFacultyNote('');
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to award badge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card card-p" style={{ background: 'var(--white)', padding: '24px', borderRadius: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{ fontSize: '1.8rem' }}>🎖️</div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Faculty Badge Award Console</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manually commend students with official academic mastery badges</span>
        </div>
      </div>

      {statusMessage && (
        <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', padding: '10px 14px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 800, marginBottom: '16px' }}>
          {statusMessage}
        </div>
      )}

      <form onSubmit={handleAwardBadge} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Select Student</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.88rem', background: 'var(--white)' }}
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.displayName}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Select Achievement Badge</label>
          <select
            value={selectedBadgeId}
            onChange={(e) => setSelectedBadgeId(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.88rem', background: 'var(--white)' }}
          >
            {SYSTEM_BADGES.map(b => (
              <option key={b.id} value={b.id}>{b.icon} {b.title} ({b.rarity.toUpperCase()})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Faculty Commendation Note</label>
          <textarea
            value={facultyNote}
            onChange={(e) => setFacultyNote(e.target.value)}
            placeholder="e.g. Outstanding analytical problem solving in today's class."
            rows={3}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.88rem', resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary"
          style={{ padding: '12px', borderRadius: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Send size={16} /> Award Badge
        </button>
      </form>
    </div>
  );
};

export default FacultyAchievementManager;
