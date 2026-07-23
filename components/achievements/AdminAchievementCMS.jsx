import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Settings, Shield, Award, Sparkles, Trash2 } from 'lucide-react';
import { SYSTEM_BADGES, RARITY_CONFIG } from '../../services/achievementService';

const AdminAchievementCMS = () => {
  const [badgeList, setBadgeList] = useState(SYSTEM_BADGES);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Programming');
  const [newRarity, setNewRarity] = useState('rare');
  const [newIcon, setNewIcon] = useState('⭐');
  const [newDesc, setNewDesc] = useState('');
  const [newTarget, setNewTarget] = useState(25);
  const [newXP, setNewXP] = useState(300);
  const [newCoins, setNewCoins] = useState(100);
  const [statusMsg, setStatusMsg] = useState('');

  const handleCreateBadge = async (e) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;

    const newBadgeId = `custom_${Date.now()}`;
    const newBadgeObj = {
      id: newBadgeId,
      title: newTitle,
      category: newCategory,
      rarity: newRarity,
      icon: newIcon,
      description: newDesc,
      target: Number(newTarget),
      unit: 'Items',
      xpReward: Number(newXP),
      coinReward: Number(newCoins),
      skills: [newCategory]
    };

    try {
      const docRef = doc(db, 'achievements', newBadgeId);
      await setDoc(docRef, { ...newBadgeObj, createdAt: serverTimestamp() });
      setBadgeList(prev => [newBadgeObj, ...prev]);
      setStatusMsg('🎉 Custom achievement created and published!');
      setIsAddOpen(false);
      setNewTitle('');
      setNewDesc('');
    } catch (err) {
      console.error(err);
      setStatusMsg('Failed to create achievement.');
    }
  };

  return (
    <div className="card card-p" style={{ background: 'var(--white)', padding: '24px', borderRadius: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Achievement CMS Engine</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage system badge definitions, seasonal challenges, and rarity rules</span>
        </div>
        <button
          onClick={() => setIsAddOpen(!isAddOpen)}
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '100px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Create Custom Achievement
        </button>
      </div>

      {statusMsg && (
        <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', padding: '10px 14px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 800, marginBottom: '16px' }}>
          {statusMsg}
        </div>
      )}

      {/* Add Form Drawer */}
      {isAddOpen && (
        <form onSubmit={handleCreateBadge} style={{ background: 'var(--bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Add New System Badge</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Title</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="e.g. Docker Explorer" className="form-input" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Category</label>
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="form-input" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <option value="Attendance">Attendance</option>
                <option value="Programming">Programming</option>
                <option value="Productivity">Productivity</option>
                <option value="Academic">Academic</option>
                <option value="Software Skills">Software Skills</option>
                <option value="Community">Community</option>
                <option value="Hidden">Hidden</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Rarity</label>
              <select value={newRarity} onChange={e => setNewRarity(e.target.value)} className="form-input" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="mythic">Mythic</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Icon Emoji</label>
              <input value={newIcon} onChange={e => setNewIcon(e.target.value)} required placeholder="🐋" className="form-input" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Description</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} required placeholder="Complete 10 Docker container exercises" className="form-input" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.82rem', borderRadius: '8px' }}>Save Badge</button>
            <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.82rem', borderRadius: '8px' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Badge List Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
        {badgeList.slice(0, 12).map((b) => {
          const rarity = RARITY_CONFIG[b.rarity] || RARITY_CONFIG.common;
          return (
            <div key={b.id} style={{ border: `1px solid ${rarity.border}`, borderRadius: '14px', padding: '14px', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.6rem' }}>{b.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800 }}>{b.title}</h4>
                  <span style={{ fontSize: '0.7rem', color: rarity.color, fontWeight: 800 }}>{b.rarity.toUpperCase()}</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminAchievementCMS;
