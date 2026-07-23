import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { 
  collection, onSnapshot, query, where, orderBy, doc, 
  serverTimestamp, addDoc, updateDoc, deleteDoc, getDocs 
} from 'firebase/firestore';
import { 
  CalendarCheck, Clock, CheckCircle2, UserX, AlertCircle, Calendar as CalendarIcon, 
  BarChart2, Shield, Plus, Edit3, Trash2, Check, RefreshCw, Sparkles, Filter 
} from 'lucide-react';
import { 
  format, parseISO, startOfWeek, addDays, isSameDay, isSameMonth, 
  startOfMonth, endOfMonth, eachDayOfInterval 
} from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const PIE_COLORS = ['#22C55E', '#EF4444', '#F59E0B']; // Present, Absent, Late

const StudentAttendanceWorkspace = ({ studentId, currentUser, studentName = 'Student' }) => {
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Marking Attendance Modal State (Admin/Faculty)
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [markStatus, setMarkStatus] = useState('present');
  const [markDate, setMarkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markRemarks, setMarkRemarks] = useState('');
  const [selectedClassSubject, setSelectedClassSubject] = useState('Python Mastery');
  const [existingRecordId, setExistingRecordId] = useState(null);

  const [toastMsg, setToastMsg] = useState('');

  const targetStudentId = studentId || currentUser?.uid;
  const userRole = currentUser?.role?.toLowerCase() || 'student';
  const isAdmin = userRole === 'admin';
  const isFaculty = userRole === 'faculty';
  const canMarkAttendance = isAdmin || isFaculty;

  // 1. Real-time Listener for Student Attendance Logs
  useEffect(() => {
    if (!targetStudentId || !db) return;

    setLoading(true);
    const logsRef = collection(db, 'users', targetStudentId, 'attendance');
    const unsubLogs = onSnapshot(logsRef, (snap) => {
      const logs = [];
      snap.forEach(d => {
        logs.push({ id: d.id, ...d.data() });
      });
      // Sort newest date first
      logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setAttendanceLogs(logs);
      setLoading(false);
    }, (err) => {
      console.error('[StudentAttendanceWorkspace] listener error:', err);
      setLoading(false);
    });

    // Fetch class schedules for attendance window verification
    const schedRef = collection(db, 'classSchedules');
    const unsubSched = onSnapshot(schedRef, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setSchedules(list);
    });

    return () => {
      unsubLogs();
      unsubSched();
    };
  }, [targetStudentId]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Calculate Attendance Metrics
  const totalClasses = attendanceLogs.length;
  const presentCount = attendanceLogs.filter(l => l.status === 'present').length;
  const absentCount = attendanceLogs.filter(l => l.status === 'absent').length;
  const lateCount = attendanceLogs.filter(l => l.status === 'late').length;

  const attendedCount = presentCount + lateCount;
  const lifetimePercent = totalClasses > 0 ? Math.round((attendedCount / totalClasses) * 100) : 100;

  // Current Month Stats
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const monthLogs = attendanceLogs.filter(l => (l.date || '').startsWith(currentMonthStr));
  const monthTotal = monthLogs.length;
  const monthAttended = monthLogs.filter(l => l.status === 'present' || l.status === 'late').length;
  const currentMonthPercent = monthTotal > 0 ? Math.round((monthAttended / monthTotal) * 100) : 100;

  // Check Attendance Window Logic (Part 8)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  // Check if class schedule is active right now
  const activeClassSchedule = schedules.find(sch => {
    if (!sch.startTime || !sch.endTime) return false;
    const [sH, sM] = sch.startTime.split(':').map(Number);
    const [eH, eM] = sch.endTime.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    return currentTimeMinutes >= startMins && currentTimeMinutes <= endMins;
  });

  const isWindowActive = Boolean(activeClassSchedule) || isAdmin; // Admin can mark anytime

  // Check duplicate record on selected date
  const checkDuplicateAndSave = async (e) => {
    e.preventDefault();
    if (!targetStudentId) return;

    try {
      const logsRef = collection(db, 'users', targetStudentId, 'attendance');
      const existing = attendanceLogs.find(l => l.date === markDate && l.subject === selectedClassSubject);

      if (existing && !existingRecordId) {
        if (window.confirm(`An attendance record already exists for ${markDate}. Update existing record?`)) {
          await updateDoc(doc(db, 'users', targetStudentId, 'attendance', existing.id), {
            status: markStatus,
            remarks: markRemarks,
            markedBy: currentUser?.displayName || 'Faculty',
            facultyId: currentUser?.uid || '',
            updatedAt: serverTimestamp()
          });
          triggerToast('Attendance record updated successfully!');
        }
      } else if (existingRecordId) {
        await updateDoc(doc(db, 'users', targetStudentId, 'attendance', existingRecordId), {
          status: markStatus,
          remarks: markRemarks,
          updatedAt: serverTimestamp()
        });
        triggerToast('Attendance updated!');
      } else {
        await addDoc(logsRef, {
          date: markDate,
          status: markStatus,
          subject: selectedClassSubject,
          remarks: markRemarks,
          markedBy: currentUser?.displayName || 'Faculty',
          facultyId: currentUser?.uid || '',
          timeIn: format(new Date(), 'hh:mm a'),
          createdAt: serverTimestamp()
        });
        triggerToast('Attendance marked successfully!');
      }
      setIsMarkModalOpen(false);
      setMarkRemarks('');
      setExistingRecordId(null);
    } catch (err) {
      console.error('Error saving attendance:', err);
      triggerToast('Failed to save attendance record.');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!isAdmin) return;
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        await deleteDoc(doc(db, 'users', targetStudentId, 'attendance', recordId));
        triggerToast('Attendance record deleted.');
      } catch (err) {
        console.error('Error deleting record:', err);
      }
    }
  };

  // Calendar Days Generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const pieData = [
    { name: 'Present', value: presentCount },
    { name: 'Absent', value: absentCount },
    { name: 'Late', value: lateCount }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', color: 'var(--text-primary)' }}>
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed', top: 32, left: '50%', zIndex: 99999,
              background: 'rgba(34,197,94,0.95)', color: 'white',
              padding: '12px 24px', borderRadius: '100px', fontWeight: 800,
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attendance Window Active / Alert Banner (Part 8 & Part 9) */}
      <div
        className="card card-p"
        style={{
          background: isWindowActive 
            ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.08) 100%)' 
            : 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.08) 100%)',
          border: `1.5px solid ${isWindowActive ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
          borderRadius: '20px',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: isWindowActive ? '#22C55E' : '#F59E0B',
            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Clock size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
              {isWindowActive ? "Today's Class Window Active" : "Attendance Currently Unavailable"}
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {isWindowActive 
                ? `Live session in progress: ${activeClassSchedule?.subject || 'Class'}`
                : `Next class session begins according to your weekly schedule.`}
            </span>
          </div>
        </div>

        {canMarkAttendance && (
          <button
            onClick={() => {
              setExistingRecordId(null);
              setIsMarkModalOpen(true);
            }}
            className="btn btn-primary"
            style={{
              padding: '10px 20px', borderRadius: '100px', fontWeight: 900,
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Plus size={16} /> Mark Attendance Log
          </button>
        )}
      </div>

      {/* Summary Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Percentage Ring Card */}
        <div className="card card-p" style={{ background: 'var(--white)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={36} cy={36} r={30} fill="none" stroke="var(--border)" strokeWidth={6} />
              <circle
                cx={36} cy={36} r={30} fill="none" stroke={lifetimePercent >= 85 ? '#22C55E' : '#F59E0B'} strokeWidth={6}
                strokeDasharray={2 * Math.PI * 30}
                strokeDashoffset={(2 * Math.PI * 30) - (lifetimePercent / 100) * (2 * Math.PI * 30)}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem' }}>
              {lifetimePercent}%
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Overall Rate</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900 }}>{lifetimePercent}% Lifetime</h3>
            <span style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 700 }}>{currentMonthPercent}% This Month</span>
          </div>
        </div>

        {/* Present Count */}
        <div className="card card-p" style={{ background: 'var(--white)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(34,197,94,0.1)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Classes Attended</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#22C55E' }}>{presentCount} Present</h3>
          </div>
        </div>

        {/* Absent Count */}
        <div className="card card-p" style={{ background: 'var(--white)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserX size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Absences</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#EF4444' }}>{absentCount} Absent</h3>
          </div>
        </div>

        {/* Late Count */}
        <div className="card card-p" style={{ background: 'var(--white)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Late Arrivals</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#F59E0B' }}>{lateCount} Late</h3>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Monthly Calendar & Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }} className="grid-2-col-mobile">
        {/* Monthly Calendar View */}
        <div className="card card-p" style={{ background: 'var(--white)', borderRadius: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={18} style={{ color: 'var(--primary)' }} /> {format(currentMonth, 'MMMM yyyy')} Calendar
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <span key={d} style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', paddingBottom: '6px' }}>{d}</span>
            ))}

            {calendarDays.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const rec = attendanceLogs.find(l => l.date === dayStr);
              const isToday = isSameDay(day, new Date());

              let dotColor = 'transparent';
              if (rec?.status === 'present') dotColor = '#22C55E';
              else if (rec?.status === 'absent') dotColor = '#EF4444';
              else if (rec?.status === 'late') dotColor = '#F59E0B';

              return (
                <div
                  key={dayStr}
                  style={{
                    padding: '8px 4px', borderRadius: '10px', border: isToday ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    background: isToday ? 'rgba(83,109,254,0.06)' : 'var(--bg)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: isToday ? 900 : 600 }}>{format(day, 'd')}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Timeline Feed */}
        <div className="card card-p" style={{ background: 'var(--white)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', height: '420px', justifyContent: 'space-between' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 900 }}>Attendance Timeline Feed</h4>

          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px', flex: 1 }}>
            {attendanceLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>No attendance records yet.<br />Attend your first class to start building your record.</p>
              </div>
            ) : (
              attendanceLogs.map((log) => {
                const isP = log.status === 'present';
                const isA = log.status === 'absent';
                const color = isP ? '#22C55E' : isA ? '#EF4444' : '#F59E0B';

                return (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: '12px', border: `1px solid ${color}30`,
                      background: `${color}08`
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color, textTransform: 'uppercase' }}>
                          {log.status}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{log.date}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Faculty: {log.markedBy || 'Staff'} · Time: {log.timeIn || 'Recorded'}
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteRecord(log.id)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Mark Attendance Modal for Admin/Faculty */}
      {isMarkModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--white)', padding: 28, borderRadius: 24, maxWidth: 450, width: '100%', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 900 }}>Mark Attendance Entry</h3>
            <form onSubmit={checkDuplicateAndSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={markDate}
                  onChange={e => setMarkDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label className="form-label">Status</label>
                <select
                  value={markStatus}
                  onChange={e => setMarkStatus(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--white)' }}
                >
                  <option value="present">Present (Green)</option>
                  <option value="absent">Absent (Red)</option>
                  <option value="late">Late (Orange)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="Optional remarks..."
                  className="form-input"
                  value={markRemarks}
                  onChange={e => setMarkRemarks(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12, fontWeight: 800 }}>
                  Save Attendance
                </button>
                <button type="button" onClick={() => setIsMarkModalOpen(false)} className="btn btn-secondary" style={{ padding: 12, borderRadius: 12 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAttendanceWorkspace;
