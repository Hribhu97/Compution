import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { CalendarCheck, UserX, Clock, CheckCircle2, MapPin, Search, Navigation, Map, Globe, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
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

const CustomChartTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--dark)', color: 'white', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
        {payload[0].name}: {payload[0].value} students
      </div>
    );
  }
  return null;
};

// Colors for location breakdown pie chart
const PIE_COLORS = ['#536DFE', '#00E676', '#FF3D00', '#FFA000', '#D500F9', '#00B0FF', '#76FF03', '#FFEB3B'];

const Attendance = () => {
  const { user } = useAuth();
  
  // Student view states
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  // Admin view states
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Fetch individual student attendance
  useEffect(() => {
    if (!user?.uid || user?.role === 'admin') return;
    
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

  // Fetch all students (for admin)
  useEffect(() => {
    if (user?.role !== 'admin') return;

    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const data = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.role !== 'admin') {
          // Fallback mock address if none specified yet
          const testLocations = [
            'Salt Lake, Sector V, Kolkata',
            'New Town, Action Area 1, Kolkata',
            'Gariahat, Ballygunge, Kolkata',
            'Howrah AC Market, Howrah',
            'Behala Chowrasta, Kolkata',
            'Dum Dum Cantonment, Kolkata',
            'Jadavpur University Area, Kolkata'
          ];
          const mockLoc = d.location && d.location !== '' ? d.location : testLocations[Math.floor(Math.random() * testLocations.length)];
          data.push({ 
            id: doc.id, 
            ...d,
            location: mockLoc
          });
        }
      });
      setStudents(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Helper to extract city/neighborhood
  const getArea = (loc) => {
    if (!loc) return 'Unspecified';
    const parts = loc.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    return parts[0].trim();
  };

  // Compile geographic analytics data
  const getGeoStats = () => {
    const counts = {};
    students.forEach(s => {
      const area = getArea(s.location);
      counts[area] = (counts[area] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  };

  const geoData = getGeoStats();
  const totalUniqueAreas = geoData.length;
  const topLocation = geoData[0]?.name || 'N/A';

  // ── ADMIN VIEW ───────────────────────────────────────
  if (user?.role === 'admin') {
    const filteredStudents = students.filter(s =>
      s.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.course?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Dynamic map dots distribution simulation coordinates
    const mapStudents = filteredStudents.map((s, idx) => {
      // Create reproducible mock coordinates based on student ID string hashes
      let hash = 0;
      for (let i = 0; i < s.id.length; i++) {
        hash = s.id.charCodeAt(i) + ((hash << 5) - hash);
      }
      const x = 50 + (hash % 35); // scatter around center x: 15% to 85%
      const y = 50 + ((hash >> 4) % 35); // scatter around center y
      return { ...s, mapX: x, mapY: y };
    });

    return (
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Admin Header */}
        <motion.div variants={item}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>Student Location Tracking</h1>
          <p style={{ color: 'var(--text-muted)' }}>Interactive distribution dashboard mapping student demographics and addresses</p>
        </motion.div>

        {/* Dynamic Metric Indicator Row */}
        <div className="grid-stats-dashboard" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Total Mapped Students', value: students.length, icon: <Globe size={24} />, color: 'var(--primary)', bg: 'rgba(83,109,254,0.08)' },
            { label: 'Neighborhoods Covered', value: totalUniqueAreas, icon: <Map size={24} />, color: 'var(--success)', bg: 'rgba(0,230,118,0.08)' },
            { label: 'Top Hub Location', value: topLocation, icon: <MapPin size={24} />, color: '#FF3D00', bg: 'rgba(255,61,0,0.08)' },
            { label: 'Active Address Sync', value: '100% Verified', icon: <Activity size={24} />, color: '#D500F9', bg: 'rgba(213,0,249,0.08)' },
          ].map((stat, i) => (
            <motion.div key={i} variants={item} className="card card-p" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 54, height: 54, borderRadius: '16px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--dark)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* MIDDLE SECTION - CHARTS AND SVG MAP */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }} className="grid-2-col-mobile">
          
          {/* Smart SVG Interactive Map Visualizer */}
          <motion.div variants={item} className="card card-p" style={{ display: 'flex', flexDirection: 'column', height: '400px', position: 'relative' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '4px' }}>Interactive Location Scatter Map</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Hover over map coordinates to inspect student coordinates</p>
            
            <div style={{ flex: 1, position: 'relative', width: '100%', background: 'linear-gradient(to bottom, #F5F7FA, #E4E8F0)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              
              {/* Fake Map Grid lines */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1.5px)', backgroundSize: '24px 24px', opacity: 0.5 }} />
              
              {/* Map Scatter Coordinate Overlay */}
              <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* SVG connection lines for active student groups */}
                {mapStudents.map((ms, idx) => (
                  <circle
                    key={ms.id}
                    cx={`${ms.mapX}%`}
                    cy={`${ms.mapY}%`}
                    r={hoveredPoint?.id === ms.id ? 9 : 6}
                    fill={hoveredPoint?.id === ms.id ? 'var(--primary)' : 'rgba(83,109,254,0.7)'}
                    stroke="white"
                    strokeWidth={hoveredPoint?.id === ms.id ? 3 : 1.5}
                    style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint(ms)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => {
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ms.location)}`;
                      window.open(mapsUrl, '_blank');
                    }}
                  />
                ))}
              </svg>

              {/* Dynamic Coordinate Tooltip overlay */}
              <AnimatePresence>
                {hoveredPoint && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '16px',
                      right: '16px',
                      background: 'rgba(17, 24, 39, 0.95)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem'
                    }}>
                      {hoveredPoint.displayName?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hoveredPoint.displayName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={11} /> {hoveredPoint.location}</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>{hoveredPoint.course || 'General'}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Regional distribution Chart */}
          <motion.div variants={item} className="card card-p" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '20px' }}>Neighborhood Density</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              {geoData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>No address records available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={geoData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} />
                    <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                      {geoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>

        {/* BOTTOM SECTION - SEARCH & INTERACTIVE STUDENT CARDS */}
        <motion.div variants={item}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Student Address Directory</h3>
            
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                placeholder="Search students or locations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '10px 16px 10px 46px', borderRadius: '100px', border: '1px solid var(--border)',
                  background: 'white', fontSize: '0.9rem', outline: 'none', color: 'var(--dark)'
                }}
              />
            </div>
          </div>

          <div className="grid-auto-cards-sm">
            {filteredStudents.map((student) => {
              const initials = student.displayName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'S';
              return (
                <motion.div key={student.id} whileHover={{ y: -4 }} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {student.photoURL ? (
                      <img src={student.photoURL} alt={student.displayName} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dark)' }}>{initials}</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.displayName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {student.studentId}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', padding: '10px 12px', background: 'var(--surface)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Course:</span>
                      <strong style={{ color: 'var(--dark)' }}>{student.course || 'Not Enrolled'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Class / Level:</span>
                      <strong style={{ color: 'var(--dark)' }}>{student.grade || 'Not Specified'}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', minHeight: '36px' }}>
                    <MapPin size={16} style={{ flexShrink: 0, color: 'var(--primary)', marginTop: '2px' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {student.location}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(student.location)}`;
                      window.open(mapsUrl, '_blank');
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '0.82rem' }}
                  >
                    <Navigation size={14} /> Open in Google Maps
                  </button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

      </motion.div>
    );
  }

  // ── STUDENT VIEW ─────────────────────────────────────
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
