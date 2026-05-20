import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Send, Clock, UserMinus, ChevronDown, Share2 } from 'lucide-react';

/* ── Animation helpers ── */
const stagger = { show: { transition: { staggerChildren: 0.06 } } };
const fadeItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
};

/* ── Circular Progress Ring ── */
const CircularProgress = ({ percentage, size = 140, stroke = 12 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#E8EDF5" strokeWidth={stroke} />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--success)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--dark)' }}>{percentage}%</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>completed</span>
      </div>
    </div>
  );
};

/* ── Bar Chart ── */
const BarChart = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.value));
  const maxHeight = 160;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: maxHeight + 40, paddingTop: '20px' }}>
      {/* Y-axis labels */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: maxHeight, paddingBottom: '24px' }}>
        {['>4 hr', '2 hr', '1 hr'].map(l => (
          <span key={l} style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 500, whiteSpace: 'nowrap' }}>{l}</span>
        ))}
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', flex: 1 }}>
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * maxHeight;
          const isHighest = d.value === maxVal;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: isHighest ? 'white' : 'var(--success)',
                background: isHighest ? 'var(--success)' : 'transparent',
                padding: isHighest ? '3px 8px' : '0',
                borderRadius: '20px',
              }}>{d.label}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: '100%',
                  maxWidth: '48px',
                  borderRadius: '8px 8px 4px 4px',
                  background: isHighest
                    ? 'linear-gradient(180deg, #66BB6A 0%, #43A047 100%)'
                    : 'linear-gradient(180deg, #A5D6A7 0%, #C8E6C9 100%)',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── OVERVIEW PAGE ── */
const Overview = () => {
  const { user } = useAuth();

  const displayName = user?.displayName || 'Student';
  const email = user?.email || 'student@compution.in';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const stats = [
    { icon: <Users size={22} />, value: '20', label: 'Total Attendance', color: 'var(--primary)', bg: 'rgba(83,109,254,0.08)' },
    { icon: <Send size={22} />, value: '200+', label: 'Doubts solved', color: 'var(--success)', bg: 'rgba(102,187,106,0.08)' },
    { icon: <Clock size={22} />, value: '2', label: 'Late present', color: '#FFA726', bg: 'rgba(255,167,38,0.08)' },
    { icon: <UserMinus size={22} />, value: '5', label: 'Total Absent', color: 'var(--danger)', bg: 'rgba(239,83,80,0.08)' },
  ];

  const weeklyData = [
    { day: 'Mon', value: 2.0, label: '2 hr' },
    { day: 'Tue', value: 2.1, label: '2.1 hr' },
    { day: 'Wed', value: 2.5, label: '2.5 hr' },
    { day: 'Thu', value: 3.5, label: '3.5 hr' },
    { day: 'Fri', value: 2.9, label: '2.9 hr' },
    { day: 'Sat', value: 2.5, label: '2.5 hr' },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ═══════════ MY PROFILE CARD ═══════════ */}
      <motion.div variants={fadeItem} style={{
        background: 'white', borderRadius: '20px', padding: '32px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My profile</h2>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid var(--border-strong)', background: 'white',
            fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)',
            cursor: 'pointer',
          }}>
            Jan <ChevronDown size={14} />
          </button>
        </div>

        {/* Avatar + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--surface)' }} />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: '1.2rem',
              border: '3px solid var(--surface)',
            }}>{initials}</div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{displayName}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>{email}</div>
          </div>
        </div>

        {/* Info strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px',
          padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          marginBottom: '24px',
        }}>
          {[
            { label: 'ID', value: 'COMP25007' },
            { label: 'Contact', value: user?.email?.split('@')[0] || '—' },
            { label: 'Course', value: 'Python Adv.' },
            { label: 'Last fees', value: '10th Jan' },
          ].map(info => (
            <div key={info.label}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '4px' }}>{info.label}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark)' }}>{info.value}</div>
            </div>
          ))}
        </div>

        {/* Stat cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {stats.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '18px 20px', borderRadius: '14px',
                border: '1px solid var(--border)',
                background: 'white',
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: s.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: s.color,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', lineHeight: 1, color: 'var(--dark)' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════ MY PROGRESS CARD ═══════════ */}
      <motion.div variants={fadeItem} style={{
        background: 'white', borderRadius: '20px', padding: '32px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My progress</h2>
          <button style={{
            width: 40, height: 40, borderRadius: '10px',
            border: '1px solid var(--border)', background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>
            <Share2 size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          {/* Bar chart area */}
          <div style={{ flex: 1 }}>
            <BarChart data={weeklyData} />

            {/* Overall progress */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '16px', padding: '10px', borderRadius: '10px',
              background: 'rgba(83,109,254,0.04)',
            }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>Overall Progress:</span>
              <span style={{
                fontWeight: 800, fontSize: '1rem', color: 'var(--success)',
                background: 'rgba(102,187,106,0.12)', padding: '2px 10px',
                borderRadius: '6px',
              }}>A</span>
            </div>
          </div>

          {/* Circular progress + legend */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', minWidth: '180px' }}>
            <CircularProgress percentage={35} size={150} stroke={14} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 16, height: 16, borderRadius: '4px', background: 'var(--success)' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--dark)' }}>Completed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 16, height: 16, borderRadius: '4px', background: '#E8EDF5', border: '1px solid #D1D9E6' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--dark)' }}>Remaining</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Overview;
