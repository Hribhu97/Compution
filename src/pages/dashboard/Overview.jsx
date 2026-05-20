import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Calendar, Clock, CheckCircle2, AlertCircle,
  Award, Flame, ChevronRight, TrendingUp,
  BookOpen, Code, Zap, ArrowRight
} from 'lucide-react';

const stagger = {
  show: { transition: { staggerChildren: 0.07 } }
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
};

const Overview = () => {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* ── Welcome ── */}
      <motion.div variants={item} style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>
          Good evening, Arjun 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Today is Tuesday · Python class at 5:00 PM · 3 pending assignments
        </p>
      </motion.div>

      {/* ── Stats Row ── */}
      <motion.div variants={item}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Attendance', value: '92%', change: '+2% this month', icon: <Calendar size={22} />, iconBg: 'rgba(83,109,254,0.1)', iconColor: 'var(--primary)', positive: true },
          { label: 'Pending Tasks', value: '3', change: '2 due this week', icon: <AlertCircle size={22} />, iconBg: 'rgba(255,167,38,0.1)', iconColor: 'var(--warning)', positive: false },
          { label: 'Study Streak', value: '7 Days', change: '3 more for badge!', icon: <Flame size={22} />, iconBg: 'rgba(239,83,80,0.1)', iconColor: 'var(--danger)', positive: true },
          { label: 'Hours Studied', value: '68 hrs', change: 'This month', icon: <Clock size={22} />, iconBg: 'rgba(102,187,106,0.1)', iconColor: 'var(--success)', positive: true },
        ].map((stat, i) => (
          <div key={i} className="card stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
              <div className="icon-box icon-box-md" style={{ background: stat.iconBg }}>
                <span style={{ color: stat.iconColor }}>{stat.icon}</span>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: stat.positive ? 'var(--success)' : 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={12} /> {stat.change}
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>

        {/* Coding Progress */}
        <motion.div variants={item} className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Coding Progress</h3>
            <Link to="/dashboard/progress"
              style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Full View <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {[
              { subject: 'Python', pct: 68, color: '#3776AB', level: 'Intermediate', badge: '🐍' },
              { subject: 'C++', pct: 42, color: '#00599C', level: 'Beginner', badge: '⚡' },
              { subject: 'Data Structures', pct: 85, color: 'var(--primary)', level: 'Advanced', badge: '🧩' },
              { subject: 'Web Dev (HTML/CSS)', pct: 55, color: '#E44D26', level: 'Intermediate', badge: '🌐' },
            ].map((track, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.95rem' }}>
                    <span>{track.badge}</span> {track.subject}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '3px 10px' }}>{track.level}</span>
                    <span style={{ fontWeight: 700, color: track.color, fontSize: '0.9rem' }}>{track.pct}%</span>
                  </div>
                </div>
                <div className="progress-track">
                  <motion.div className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${track.pct}%` }}
                    transition={{ duration: 1.1, delay: 0.3 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: track.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Today's Schedule */}
        <motion.div variants={item} className="card card-p">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Today's Schedule</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { time: '5:00 PM', subject: 'Python', topic: 'List Comprehensions', live: true, color: '#3776AB' },
              { time: '7:00 PM', subject: 'DSA Practice', topic: 'Binary Search Trees', live: false, color: 'var(--primary)' },
            ].map((cls, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', padding: '14px', borderRadius: 'var(--radius-md)', background: cls.live ? 'rgba(83,109,254,0.05)' : 'var(--bg)', border: `1px solid ${cls.live ? 'rgba(83,109,254,0.15)' : 'var(--border)'}` }}>
                <div style={{ width: '4px', borderRadius: '2px', background: cls.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{cls.subject}</span>
                    {cls.live && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Upcoming</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cls.topic}</div>
                  <div style={{ fontSize: '0.78rem', color: cls.color, fontWeight: 600, marginTop: '4px' }}>{cls.time}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No more classes today 🎉</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Pending Assignments */}
        <motion.div variants={item} className="card card-p">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Pending Assignments</h3>
            <Link to="/dashboard/assignments"
              style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              See All <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { title: 'Python: File I/O Exercise', subject: 'Python', due: 'Due Tomorrow', urgent: true },
              { title: 'DSA: Implement a Stack', subject: 'Data Structures', due: 'Due in 3 days', urgent: false },
              { title: 'HTML Form Project', subject: 'Web Dev', due: 'Due in 5 days', urgent: false },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', borderRadius: 'var(--radius-md)', background: a.urgent ? 'rgba(239,83,80,0.04)' : 'var(--bg)', border: `1px solid ${a.urgent ? 'rgba(239,83,80,0.15)' : 'var(--border)'}`, cursor: 'pointer' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.urgent ? 'var(--danger)' : 'var(--text-light)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                  <div style={{ fontSize: '0.78rem', color: a.urgent ? 'var(--danger)' : 'var(--text-muted)' }}>{a.due}</div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div variants={item} className="card card-p">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Recent Badges</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { icon: '🐍', title: 'Python Novice', desc: 'Completed 10 Python exercises', unlocked: true, color: 'rgba(55,118,171,0.1)' },
              { icon: '✅', title: 'First Upload', desc: 'Submitted an assignment on time', unlocked: true, color: 'rgba(102,187,106,0.1)' },
              { icon: '🔥', title: '10-Day Streak', desc: 'Code for 10 consecutive days', unlocked: false, color: 'rgba(0,0,0,0.04)' },
            ].map((badge, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', borderRadius: 'var(--radius-md)', background: badge.color, opacity: badge.unlocked ? 1 : 0.5 }}>
                <div style={{ fontSize: '1.5rem', filter: badge.unlocked ? 'none' : 'grayscale(1)' }}>{badge.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{badge.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{badge.desc}</div>
                </div>
                {badge.unlocked && <CheckCircle2 size={16} color="var(--success)" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Overview;
