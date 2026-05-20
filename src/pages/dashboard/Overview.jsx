import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Users, Send, Clock, UserMinus, ChevronDown, Share2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AdminStudentGrid from '../../components/AdminStudentGrid';
import AdminDashboard from '../../components/AdminDashboard';

const stagger = { show: { transition: { staggerChildren: 0.06 } } };
const fadeItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
};

const CircularProgress = ({ percentage, size = 140, stroke = 12 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8EDF5" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--success)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--dark)' }}>{percentage}%</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>completed</span>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--dark)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
        {payload[0].value} hrs
      </div>
    );
  }
  return null;
};

const Overview = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') return <AdminDashboard />;

  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0, doubts: 0 });
  const [progressData, setProgressData] = useState([]);
  const [completionPct, setCompletionPct] = useState(0);
  const [overallGrade, setOverallGrade] = useState('N/A');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const attRef = collection(db, `users/${user.uid}/attendance`);
    const unsubAtt = onSnapshot(attRef, (snap) => {
      let present = 0, absent = 0, late = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'present') present++;
        else if (data.status === 'absent') absent++;
        else if (data.status === 'late') late++;
      });
      setAttendanceStats(s => ({ ...s, present, absent, late }));
    });

    const progRef = query(collection(db, `users/${user.uid}/progress`), orderBy('createdAt', 'desc'), limit(6));
    const unsubProg = onSnapshot(progRef, (snap) => {
      const data = [];
      let totalPct = 0;
      let count = 0;
      snap.forEach(doc => {
        const d = doc.data();
        data.unshift({ day: d.day || 'Day', studyHours: d.studyHours || 0 });
        totalPct += (d.completionRate || 0);
        count++;
      });
      
      if (data.length === 0) {
        setProgressData([
          { day: 'Mon', studyHours: 2 }, { day: 'Tue', studyHours: 2.1 },
          { day: 'Wed', studyHours: 2.5 }, { day: 'Thu', studyHours: 3.5 },
          { day: 'Fri', studyHours: 2.9 }, { day: 'Sat', studyHours: 2.5 }
        ]);
        setCompletionPct(35);
        setOverallGrade('A');
      } else {
        setProgressData(data);
        setCompletionPct(count > 0 ? Math.round(totalPct / count) : 0);
        setOverallGrade('A');
      }
      setLoading(false);
    });

    return () => { unsubAtt(); unsubProg(); };
  }, [user]);

  const displayName = user?.displayName || 'Student';
  const email = user?.email || 'student@compution.in';
  const studentId = user?.studentId || 'COMP25007';
  const course = user?.course || 'Not specified';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const stats = [
    { icon: <Users size={22} />, value: attendanceStats.present, label: 'Total Attendance', color: 'var(--primary)', bg: 'rgba(83,109,254,0.08)' },
    { icon: <Send size={22} />, value: '200+', label: 'Doubts solved', color: 'var(--success)', bg: 'rgba(102,187,106,0.08)' },
    { icon: <Clock size={22} />, value: attendanceStats.late, label: 'Late present', color: '#FFA726', bg: 'rgba(255,167,38,0.08)' },
    { icon: <UserMinus size={22} />, value: attendanceStats.absent, label: 'Total Absent', color: 'var(--danger)', bg: 'rgba(239,83,80,0.08)' },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <motion.div variants={fadeItem} className="card card-p">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My profile</h2>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
            border: '1px solid var(--border-strong)', background: 'white', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)'
          }}>
            Jan <ChevronDown size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--surface)' }} />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem',
              border: '3px solid var(--surface)'
            }}>{initials}</div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{displayName}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>{email}</div>
          </div>
        </div>

        <div style={{
          display: 'grid', 
          gridTemplateColumns: user?.role === 'student' ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', 
          gap: '16px', padding: '16px 0', 
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '24px'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '4px' }}>ID</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark)' }}>{studentId}</div>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '4px' }}>Contact</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user?.phone || email}>
              {user?.phone || email}
            </div>
          </div>
          {user?.role !== 'student' && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '4px' }}>Course</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={course}>
                {course}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '4px' }}>Last fees</div>
            <input 
              type="date" 
              value={user?.lastFeesDate || ''}
              onChange={async (e) => {
                const newDate = e.target.value;
                try {
                  const { doc, updateDoc } = await import('firebase/firestore');
                  await updateDoc(doc(db, 'users', user.uid), { lastFeesDate: newDate });
                } catch (err) {
                  console.error('Error updating last fees:', err);
                }
              }}
              style={{ 
                fontWeight: 600, fontSize: '0.85rem', color: 'var(--dark)', 
                border: '1px solid var(--border)', borderRadius: '6px', 
                padding: '4px 8px', outline: 'none', background: 'var(--surface)',
                fontFamily: 'inherit', width: '100%', maxWidth: '140px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)', background: 'white' }}
            >
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
              <div>
                {loading ? <div style={{ height: 24, width: 40, background: 'var(--surface)', borderRadius: 4, marginBottom: 4 }} /> : 
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', lineHeight: 1, color: 'var(--dark)', marginBottom: '6px' }}>{s.value}</div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeItem} className="card card-p">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My progress</h2>
          <button style={{ width: 40, height: 40, borderRadius: '10px', border: '1px solid var(--border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Share2 size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: 200, width: '100%', marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData} barSize={40} margin={{ top: 20, right: 0, left: -24, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-light)', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-light)', fontWeight: 500 }} tickFormatter={val => `${val} hr`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="studyHours" radius={[8, 8, 4, 4]}>
                    {progressData.map((entry, index) => {
                      const isMax = entry.studyHours === Math.max(...progressData.map(d => d.studyHours));
                      return <Cell key={`cell-${index}`} fill={isMax ? '#66BB6A' : '#C8E6C9'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '16px', padding: '10px', borderRadius: '10px', background: 'rgba(83,109,254,0.04)',
            }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>Overall Progress:</span>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--success)', background: 'rgba(102,187,106,0.12)', padding: '2px 10px', borderRadius: '6px' }}>{overallGrade}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', minWidth: '180px' }}>
            <CircularProgress percentage={completionPct} size={150} stroke={14} />
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

      {user?.role === 'admin' && (
        <AdminStudentGrid />
      )}
    </motion.div>
  );
};

export default Overview;
