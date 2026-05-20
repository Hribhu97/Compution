import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { CalendarCheck, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';

const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const Attendance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    
    const attRef = query(collection(db, `users/${user.uid}/attendance`), orderBy('date', 'desc'));
    const unsub = onSnapshot(attRef, (snap) => {
      const data = [];
      let present = 0, absent = 0, late = 0;
      
      // Group for chart (Subject wise or daily)
      const weekly = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
      
      snap.forEach(doc => {
        const r = { id: doc.id, ...doc.data() };
        data.push(r);
        
        if (r.status === 'present') present++;
        else if (r.status === 'absent') absent++;
        else if (r.status === 'late') late++;
        
        if (r.date && (r.status === 'present' || r.status === 'late')) {
          try {
            const dayName = format(parseISO(r.date), 'EEE');
            if (weekly[dayName] !== undefined) weekly[dayName]++;
          } catch(e) {}
        }
      });
      
      setRecords(data);
      setStats({ present, absent, late, total: snap.size });
      
      const cData = Object.keys(weekly).map(day => ({ day, count: weekly[day] }));
      setChartData(cData);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const attPct = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: 40, width: 200, background: 'var(--surface)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 120, background: 'white', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)}
        </div>
        <div style={{ height: 300, background: 'white', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <motion.div variants={item}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>My Attendance</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track your class presence and performance</p>
      </motion.div>

      {/* STATS ROW */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {[
          { label: 'Total Present', val: stats.present + stats.late, color: 'var(--success)', icon: <CheckCircle2 size={24} color="var(--success)" />, bg: 'rgba(102,187,106,0.08)' },
          { label: 'Total Absent', val: stats.absent, color: 'var(--danger)', icon: <AlertCircle size={24} color="var(--danger)" />, bg: 'rgba(239,83,80,0.08)' },
          { label: 'Attendance %', val: `${attPct}%`, color: 'var(--primary)', icon: <TrendingUp size={24} color="var(--primary)" />, bg: 'rgba(83,109,254,0.08)' },
        ].map(s => (
          <div key={s.label} className="card card-p" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '2rem', color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* CHART */}
        <motion.div variants={item} className="card card-p">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '24px' }}>Weekly Presence</h3>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-light)', fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-light)', fontWeight: 500 }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: 'var(--shadow-sm)' }} />
                <Bar dataKey="count" radius={[6, 6, 4, 4]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="var(--primary)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* LIST */}
        <motion.div variants={item} className="card card-p" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Recent Records</h3>
          {records.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
              <CalendarCheck size={40} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p>No attendance records</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {records.slice(0, 10).map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.subject || 'Class'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.date ? format(parseISO(r.date), 'MMM do, yyyy') : 'Unknown date'}</div>
                  </div>
                  <span className={`badge ${r.status === 'present' ? 'badge-success' : r.status === 'late' ? 'badge-warning' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Attendance;
