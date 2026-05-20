import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { CalendarCheck, UserX, Clock, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';

const stagger = { show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'var(--dark)', color: 'white', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '4px' }}>{data.date}</div>
        <div style={{ textTransform: 'capitalize', color: data.status === 'present' ? '#66BB6A' : data.status === 'absent' ? '#EF5350' : '#FFA726' }}>
          {data.status}
        </div>
      </div>
    );
  }
  return null;
};

const Attendance = () => {
  const { user } = useAuth();
  
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    
    const attRef = query(collection(db, `users/${user.uid}/attendance`), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(attRef, (snap) => {
      const data = [];
      let p = 0, a = 0, l = 0, t = 0;
      
      snap.forEach(doc => {
        const d = { id: doc.id, ...doc.data() };
        data.push(d);
        t++;
        if (d.status === 'present') p++;
        else if (d.status === 'absent') a++;
        else if (d.status === 'late') { l++; p++; }
      });
      
      setRecords(data);
      setStats({
        total: t, present: p, absent: a, late: l,
        percentage: t === 0 ? 0 : Math.round((p / t) * 100)
      });
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const chartData = [...records].reverse().slice(-14).map((r, i) => ({
    name: `Class ${i+1}`,
    date: r.date,
    status: r.status,
    val: 1
  }));

  const statCards = [
    { label: 'Total Present', value: stats.present, icon: <CheckCircle2 size={24} />, color: 'var(--success)', bg: 'rgba(102,187,106,0.1)' },
    { label: 'Total Absent', value: stats.absent, icon: <UserX size={24} />, color: 'var(--danger)', bg: 'rgba(239,83,80,0.1)' },
    { label: 'Late Present', value: stats.late, icon: <Clock size={24} />, color: '#FFA726', bg: 'rgba(255,167,38,0.1)' },
    { label: 'Attendance %', value: `${stats.percentage}%`, icon: <CalendarCheck size={24} />, color: 'var(--primary)', bg: 'rgba(83,109,254,0.1)' },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <motion.div variants={item} style={{ marginBottom: '8px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>My Attendance</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track your class presence and overview your history</p>
      </motion.div>

      <div className="grid-stats-dashboard">
        {statCards.map((s, i) => (
          <motion.div key={i} variants={item} className="card card-p" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 54, height: 54, borderRadius: '16px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
            <div>
              {loading ? <div style={{ height: 28, width: 48, background: 'var(--surface)', borderRadius: 6, marginBottom: 4 }} /> : 
              <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>{s.value}</div>}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={item} className="card card-p" style={{ height: '300px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '24px' }}>Recent Timeline</h3>
        {loading ? (
          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            {[...Array(14)].map((_, i) => <div key={i} style={{ flex: 1, background: 'var(--surface)', height: `${Math.random() * 60 + 20}%`, borderRadius: '4px 4px 0 0' }} />)}
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
            No attendance data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={32}>
              <XAxis dataKey="name" hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
              <Bar dataKey="val" radius={[6, 6, 6, 6]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.status === 'present' ? '#66BB6A' : entry.status === 'absent' ? '#EF5350' : '#FFA726'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <motion.div variants={item} className="card card-p" style={{ padding: '0' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Attendance Logs</h3>
        </div>
        <div style={{ padding: '0 24px' }}>
          {loading ? (
            <div style={{ padding: '24px 0' }}>Loading logs...</div>
          ) : records.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-light)' }}>No records found.</div>
          ) : (
            records.map((r, i) => (
              <div key={r.id} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '16px 0', borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none' 
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--dark)' }}>{r.date}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.subject || 'General Class'}</div>
                </div>
                <div style={{ 
                  padding: '6px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                  background: r.status === 'present' ? 'rgba(102,187,106,0.1)' : r.status === 'absent' ? 'rgba(239,83,80,0.1)' : 'rgba(255,167,38,0.1)',
                  color: r.status === 'present' ? 'var(--success)' : r.status === 'absent' ? 'var(--danger)' : '#FFA726'
                }}>
                  {r.status}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

    </motion.div>
  );
};

export default Attendance;
