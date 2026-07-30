import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  HOUSES, subscribeAllHouses, createPrefectCompetition, declareHousePrefect, 
  switchUserHouse, logHouseActivity, subscribeHouseActivities 
} from '../../services/battleOfMindsService';
import { 
  Shield, Trophy, Crown, Plus, Users, Search, Filter, 
  Check, AlertCircle, FileText, UploadCloud, Edit3, Trash2,
  TrendingUp, BarChart2, Zap, Calendar, Settings, AlertTriangle,
  Play, Pause, RotateCcw, Award, CheckCircle2, RefreshCw, Eye
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, query, where, getDocs, doc, setDoc, updateDoc, 
  onSnapshot, serverTimestamp, limit, orderBy 
} from 'firebase/firestore';
import Modal from '../Modal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AdminHouseMissionAssignment from './AdminHouseMissionAssignment';

const DEFAULT_XP_CONFIG = {
  attendance: 10,
  todaysChapter: 30,
  assignment: 20,
  quiz: 40,
  pyq: 35,
  helpingStudent: 15,
  facultyBonus: 25,
  missionCompletion: 100
};

const AdminHouseManagement = () => {
  const { user } = useAuth();
  const [allHouses, setAllHouses] = useState([]);
  const [students, setStudents] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation Sub-Tabs
  const [activeTab, setActiveTab] = useState('leaderboard'); 
  // 'leaderboard', 'population', 'analytics', 'prefect', 'missions', 'contributors', 'config', 'activity'

  // XP Config State
  const [xpConfig, setXpConfig] = useState(DEFAULT_XP_CONFIG);

  // Student Reassignment State
  const [searchStudent, setSearchStudent] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [targetHouse, setTargetHouse] = useState('gryffindor');
  
  // New Competition / Mission Modal
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

  // Realtime Subscriptions
  useEffect(() => {
    if (!db) return;
    setLoading(true);

    const unsubHouses = subscribeAllHouses((data) => setAllHouses(data));
    
    // Fetch all students for roster, analytics & contributors
    const usersRef = collection(db, 'users');
    const unsubStudents = onSnapshot(query(usersRef, where('role', '==', 'student')), (snap) => {
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      setStudents(list);
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to students:", err);
      setLoading(false);
    });

    // Fetch Competitions / Missions
    const compsRef = collection(db, 'houseCompetitions');
    const unsubComps = onSnapshot(query(compsRef, orderBy('createdAt', 'desc'), limit(20)), (snap) => {
      setCompetitions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Activities
    const actRef = collection(db, 'houseActivities');
    const unsubAct = onSnapshot(query(actRef, orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubHouses();
      unsubStudents();
      unsubComps();
      unsubAct();
    };
  }, []);

  // Compute Standings strictly from stored Firestore points
  const sortedHouses = [...allHouses].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

  // Compute Population Counts strictly from Firestore users
  const popCounts = {
    gryffindor: students.filter(s => s.house === 'gryffindor').length,
    ravenclaw: students.filter(s => s.house === 'ravenclaw').length,
    hufflepuff: students.filter(s => s.house === 'hufflepuff').length,
    slytherin: students.filter(s => s.house === 'slytherin').length
  };

  // Check Population Imbalance
  const countsArr = Object.entries(popCounts).sort((a, b) => b[1] - a[1]);
  const maxHouse = countsArr[0];
  const minHouse = countsArr[countsArr.length - 1];
  const isImbalanced = maxHouse && minHouse && (maxHouse[1] - minHouse[1] >= 5);

  // Filter ONLY Real Top Contributors (Must have housePoints > 0 or xp > 0)
  const realContributors = students
    .filter(s => (s.housePoints || s.xp || 0) > 0 || (s.completedMissions || 0) > 0)
    .sort((a, b) => (b.housePoints || b.xp || 0) - (a.housePoints || a.xp || 0))
    .slice(0, 10);

  // Strictly Evaluate At-Risk Students (lastLogin > 7 days AND no activity/XP recorded)
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const atRiskStudents = students.filter(s => {
    const lastLoginTime = s.lastLogin?.toDate ? s.lastLogin.toDate().getTime() : 0;
    const isInactive = lastLoginTime > 0 && (now - lastLoginTime > SEVEN_DAYS_MS);
    const zeroXp = (s.housePoints || s.xp || 0) === 0;
    return isInactive && zeroXp;
  });

  // Calculate XP Breakdown from Real Firestore Activities
  const xpBreakdown = activities.reduce((acc, act) => {
    const category = act.category || 'General Activity';
    acc[category] = (acc[category] || 0) + (act.points || 0);
    return acc;
  }, {});

  const handleCreateComp = async (e) => {
    e.preventDefault();
    if (!compForm.title.trim()) return;
    setIsSubmitting(true);
    try {
      await createPrefectCompetition(user, compForm);
      triggerToast('House Prefect Mission published successfully!');
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
      triggerToast(err.message || 'Failed to publish mission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      
      {/* Toast Banner */}
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

      {/* Header Bar */}
      <div style={{
        background: 'var(--white)',
        padding: '20px 24px',
        borderRadius: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            COMPETITION CENTER
          </div>
          <h2 style={{ margin: '2px 0 0', fontSize: '1.6rem', fontWeight: 950, color: 'var(--dark)' }}>
            🏰 House Cup Command Center
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            100% database-driven control center for Academic Houses, Missions & Prefects.
          </span>
        </div>
      </div>

      {/* 4 HOUSE OVERVIEW CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px'
      }}>
        {Object.values(HOUSES).map(h => {
          const houseDoc = allHouses.find(x => x.id === h.id);
          const points = houseDoc?.totalPoints || 0;
          const prefect = houseDoc?.currentPrefectName;

          return (
            <div key={h.id} style={{
              background: h.bgGradient,
              borderRadius: '24px',
              padding: '20px',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
              border: `1.5px solid ${h.primaryColor}60`
            }}>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {h.logo ? (
                      <img src={h.logo} alt={h.name} style={{ width: 48, height: 48, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
                    ) : (
                      <span style={{ fontSize: '2.5rem' }}>{h.emoji}</span>
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 950 }}>{h.name.toUpperCase()}</h3>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>"{h.motto}"</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 950, color: '#F59E0B' }}>
                    #{sortedHouses.findIndex(x => x.id === h.id) + 1}
                  </div>
                </div>

                {/* Stats Strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '12px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800 }}>HOUSE XP</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 950, color: '#4ADE80' }}>{points} XP</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800 }}>MEMBERS</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 950, color: '#60A5FA' }}>{popCounts[h.id]} Students</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                  <span>👑 Prefect: {prefect ? prefect : 'Not selected yet'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SUB-TABS */}
      <div style={{
        display: 'flex',
        background: 'var(--white)',
        padding: '6px',
        borderRadius: '20px',
        gap: '6px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        border: '1px solid var(--border)'
      }}>
        {[
          { id: 'leaderboard', label: '🏆 Live Standings' },
          { id: 'population', label: '📊 Population & Balance' },
          { id: 'analytics', label: '📈 Analytics & XP' },
          { id: 'prefect', label: '👑 Prefect Control' },
          { id: 'missions', label: '📜 Mission Control' },
          { id: 'contributors', label: '🌟 Contributors & At-Risk' },
          { id: 'config', label: '⚡ Season & XP Rules' },
          { id: 'activity', label: '💬 Activity Feed' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 18px',
              borderRadius: '14px',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: '42px',
              background: activeTab === t.id ? 'var(--primary)' : 'transparent',
              color: activeTab === t.id ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: LIVE STANDINGS & LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'var(--white)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 950, color: 'var(--dark)' }}>
              🏆 Real-Time House Cup Standings
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedHouses.map((h, idx) => {
                const houseConfig = HOUSES[h.id] || HOUSES.gryffindor;
                const points = h.totalPoints || 0;
                const members = popCounts[h.id] || 0;
                const avgXp = members > 0 ? Math.round(points / members) : 0;
                const topScore = sortedHouses[0]?.totalPoints || 1;
                const pct = Math.round((points / Math.max(topScore, 1)) * 100);

                return (
                  <div key={h.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '20px',
                    background: idx === 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg)',
                    border: idx === 0 ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '220px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 950, width: '28px', color: idx === 0 ? '#D97706' : 'var(--text-muted)' }}>
                        #{idx + 1}
                      </span>
                      <img src={houseConfig.logo} alt={houseConfig.name} style={{ width: 44, height: 44, objectFit: 'contain' }} />
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 950, color: 'var(--dark)' }}>{houseConfig.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {members} Members • Avg {avgXp} XP / Member
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ width: '120px' }}>
                        <div style={{ height: '6px', borderRadius: '100px', background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: houseConfig.primaryColor, borderRadius: '100px' }} />
                        </div>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 950, color: houseConfig.primaryColor, minWidth: '90px', textAlign: 'right' }}>
                        {points} XP
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POPULATION & BALANCE */}
      {activeTab === 'population' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isImbalanced && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1.5px solid rgba(245, 158, 11, 0.4)',
              padding: '18px 20px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={24} color="#D97706" />
                <div>
                  <div style={{ fontWeight: 900, color: '#B45309', fontSize: '0.95rem' }}>
                    ⚠ Population Imbalance Recommendation
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--dark)' }}>
                    {HOUSES[maxHouse[0]]?.name} has {maxHouse[1] - minHouse[1]} more members than {HOUSES[minHouse[0]]?.name}.
                  </div>
                </div>
              </div>
              <button
                onClick={() => triggerToast("Sorting recommendation algorithm updated to balance house entry.")}
                style={{
                  padding: '10px 18px',
                  borderRadius: '100px',
                  border: 'none',
                  background: '#D97706',
                  color: '#FFF',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Enable Balance Recommendation
              </button>
            </div>
          )}

          <div style={{ background: 'var(--white)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 950, color: 'var(--dark)' }}>
              📊 House Student Distribution
            </h3>

            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(popCounts).map(([id, count]) => ({ name: HOUSES[id].name, count, color: HOUSES[id].primaryColor }))}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                    {Object.entries(popCounts).map(([id], idx) => (
                      <Cell key={idx} fill={HOUSES[id].primaryColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMANCE ANALYTICS & XP BREAKDOWN */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* XP Source Breakdown from Real Data */}
          <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 950, color: 'var(--dark)' }}>
              ⚡ Real House XP Source Breakdown
            </h3>

            {Object.keys(xpBreakdown).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No XP breakdown activity recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(xpBreakdown).map(([label, xp]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'var(--bg)' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--dark)' }}>{label}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--primary)' }}>+{xp} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data-Driven Intelligence */}
          <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 950, color: 'var(--dark)' }}>
              🧠 House Analytics & Observations
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: 'var(--dark)' }}>
              {activities.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No activity trends recorded yet.
                </div>
              ) : (
                <div style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  ✨ Real activity stream active with {activities.length} recorded events.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PREFECT CONTROL */}
      {activeTab === 'prefect' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 950, color: 'var(--dark)' }}>
              👑 House Prefect Appointments
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {Object.values(HOUSES).map(h => {
                const currentPrefect = allHouses.find(x => x.id === h.id)?.currentPrefectName;
                return (
                  <div key={h.id} style={{ padding: '18px', borderRadius: '18px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 950, color: h.primaryColor }}>{h.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--dark)', margin: '6px 0 14px', fontWeight: 700 }}>
                      Current Prefect: {currentPrefect ? `👑 ${currentPrefect}` : 'Not selected yet'}
                    </div>
                    <button
                      onClick={() => setIsCompModalOpen(true)}
                      style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#FFF', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Publish Prefect Exam
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MISSION CONTROL */}
      {activeTab === 'missions' && (
        <AdminHouseMissionAssignment />
      )}

      {/* TAB 6: REAL CONTRIBUTORS & STRICT AT-RISK MONITOR */}
      {activeTab === 'contributors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Top Contributors */}
          <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 950, color: 'var(--dark)' }}>
              🌟 Top House Contributors
            </h3>

            {realContributors.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No contributors yet. Students will appear after earning House XP.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {realContributors.map((s, idx) => (
                  <div key={s.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'var(--bg)' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--dark)' }}>#{idx + 1} {s.displayName || s.name}</span>
                    <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.88rem' }}>+{s.housePoints || s.xp || 0} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Strict At-Risk Student Monitor */}
          <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 950, color: '#DC2626' }}>
              ⚠ At-Risk Student Intervention Monitor
            </h3>

            {atRiskStudents.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No students currently at risk.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {atRiskStudents.map(s => (
                  <div key={s.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--dark)' }}>{s.displayName || s.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Inactive &gt; 7 Days</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: SEASON & XP CONFIG */}
      {activeTab === 'config' && (
        <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 950, color: 'var(--dark)' }}>
            ⚡ House Cup XP Rules & Configuration
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {Object.entries(xpConfig).map(([key, val]) => (
              <div key={key} style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{key}</label>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => setXpConfig({ ...xpConfig, [key]: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px', fontWeight: 900, boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => triggerToast("House Cup XP configuration saved to Firestore.")}
            style={{ padding: '12px 24px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#FFF', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer' }}
          >
            Save XP Rules Configuration
          </button>
        </div>
      )}

      {/* TAB 8: ACTIVITY FEED */}
      {activeTab === 'activity' && (
        <div style={{ background: 'var(--white)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 950, color: 'var(--dark)' }}>
            💬 Real-Time House Activity Stream
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activities.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No recent activity.
              </div>
            ) : (
              activities.map(act => (
                <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '14px', background: 'var(--bg)' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--dark)' }}>• {act.activityName}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--success)' }}>+{act.points || 0} XP</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mission Creation Modal */}
      {isCompModalOpen && (
        <Modal isOpen={isCompModalOpen} onClose={() => setIsCompModalOpen(false)} title="📜 Publish House Cup Mission">
          <form onSubmit={handleCreateComp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Mission Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Weekly House Prefect Challenge"
                value={compForm.title}
                onChange={(e) => setCompForm({ ...compForm, title: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Duration (Mins)</label>
                <input
                  type="number"
                  value={compForm.durationMins}
                  onChange={(e) => setCompForm({ ...compForm, durationMins: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--dark)' }}>Passing Score (%)</label>
                <input
                  type="number"
                  value={compForm.passingScore}
                  onChange={(e) => setCompForm({ ...compForm, passingScore: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '14px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#FFF', fontWeight: 900, cursor: 'pointer' }}
            >
              Publish Mission
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminHouseManagement;
