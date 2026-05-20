import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, Trophy, TrendingUp, BarChart2, ChevronRight, CheckCircle2 } from 'lucide-react';

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const history = [
  { id: 1, title: 'Python Basics', date: '2025-01-18', score: 18, total: 20, rank: 3, subjects: 'Python' },
  { id: 2, title: 'C++ OOP Concepts', date: '2025-01-14', score: 15, total: 20, rank: 7, subjects: 'C++' },
  { id: 3, title: 'Data Structures MCQ', date: '2025-01-10', score: 17, total: 20, rank: 2, subjects: 'DSA' },
  { id: 4, title: 'HTML/CSS Quiz', date: '2025-01-06', score: 20, total: 20, rank: 1, subjects: 'Web Dev' },
];

const upcoming = [
  { title: 'Python Advanced', date: '2025-01-25', duration: '30 mins', subject: 'Python' },
  { title: 'DSA Trees & Graphs', date: '2025-01-28', duration: '45 mins', subject: 'DSA' },
];

const leaderboard = [
  { rank: 1, name: 'Priya M.', score: '98/100', badge: '🥇' },
  { rank: 2, name: 'Rohan D.', score: '95/100', badge: '🥈' },
  { rank: 3, name: 'Arjun S.', score: '90/100', badge: '🥉', isYou: true },
  { rank: 4, name: 'Shreya K.', score: '88/100', badge: '' },
  { rank: 5, name: 'Ankit R.', score: '85/100', badge: '' },
];

const MockTests = () => {
  const avg = Math.round(history.reduce((sum, t) => sum + (t.score / t.total) * 100, 0) / history.length);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Mock Tests</h1>
        <p style={{ color: 'var(--text-muted)' }}>Practice, track your scores, and climb the leaderboard</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Tests Taken', val: history.length, icon: '📝', color: 'var(--primary)', bg: 'rgba(83,109,254,0.08)' },
          { label: 'Average Score', val: `${avg}%`, icon: '📊', color: 'var(--success)', bg: 'rgba(102,187,106,0.08)' },
          { label: 'Best Rank', val: '#1', icon: '🏆', color: '#FFA726', bg: 'rgba(255,167,38,0.08)' },
          { label: 'Perfect Scores', val: '1', icon: '⭐', color: '#BD93F9', bg: 'rgba(189,147,249,0.08)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px', background: s.bg, border: 'none' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.75rem', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </motion.div>

      <div className="grid-2-1">
        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Upcoming */}
          <motion.div variants={item} className="card card-p">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={18} color="var(--primary)" /> Upcoming Tests
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcoming.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {t.duration}</span>
                      <span>📅 {t.date}</span>
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
                    <Play size={14} /> Start Test
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Score History */}
          <motion.div variants={item} className="card card-p">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} color="var(--primary)" /> Score History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((t) => {
                const pct = Math.round((t.score / t.total) * 100);
                return (
                  <div key={t.id} style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.title}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rank #{t.rank}</span>
                        <span style={{ fontWeight: 800, color: pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)', fontFamily: 'var(--font-heading)' }}>
                          {t.score}/{t.total}
                        </span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <motion.div className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: pct >= 85 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '6px' }}>{t.date} · {t.subjects}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Leaderboard */}
        <motion.div variants={item} className="card card-p">
          <h3 style={{ fontSize: '1.05rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="#FFA726" /> Leaderboard
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leaderboard.map((s) => (
              <div key={s.rank} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: 'var(--radius-md)',
                background: s.isYou ? 'rgba(83,109,254,0.08)' : 'var(--bg)',
                border: s.isYou ? '1px solid rgba(83,109,254,0.2)' : '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center' }}>{s.badge || `#${s.rank}`}</span>
                <span style={{ flex: 1, fontWeight: s.isYou ? 700 : 500, color: s.isYou ? 'var(--primary)' : 'var(--dark)', fontSize: '0.9rem' }}>
                  {s.name} {s.isYou && <span style={{ fontSize: '0.75rem' }}>(You)</span>}
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color: s.isYou ? 'var(--primary)' : 'var(--dark)' }}>{s.score}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            🏆 Top 3 students get a special badge
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MockTests;
