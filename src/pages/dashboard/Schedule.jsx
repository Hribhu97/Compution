import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Calendar as CalendarIcon, Clock, MapPin, FileText, Plus, Trash2, Edit2, Search, Check, AlertCircle, CalendarRange, List, ArrowLeft, ArrowRight, User } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const fadeItem = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const Schedule = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('card'); // 'calendar' | 'card'
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Faculty management states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subject, setSubject] = useState('Python Mastery');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('17:00');
  const [mode, setMode] = useState('online'); // 'online' | 'offline'
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState('');

  // Search/Filter for Faculty
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');

  const canManage = user?.role === 'admin' || user?.role === 'faculty';

  // Fetch Schedules & Students
  useEffect(() => {
    if (!user) return;

    let schedQuery;
    if (canManage) {
      // Faculty and Admins can see all schedules
      schedQuery = query(collection(db, 'studentSchedules'));
    } else {
      // Students see only their personal schedules
      schedQuery = query(collection(db, 'studentSchedules'), where('studentId', '==', user.uid));
    }

    const unsubSched = onSnapshot(schedQuery, (snap) => {
      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort by date and time
      list.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
      setSchedules(list);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    // Fetch student users list for schedule assignments (for faculty/admin)
    let unsubStudents = () => {};
    if (canManage) {
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      unsubStudents = onSnapshot(studentsQuery, (snap) => {
        const list = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (user?.role === 'faculty') {
            if (data.assignedFaculty?.includes(user.uid) || data.assignedFaculty?.includes(user.email)) {
              list.push({ id: doc.id, ...data });
            }
          } else {
            list.push({ id: doc.id, ...data });
          }
        });
        setStudents(list);
      });
    }

    return () => {
      unsubSched();
      unsubStudents();
    };
  }, [user]);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      triggerToast('Please select a student');
      return;
    }
    setIsSubmitting(true);

    try {
      const student = students.find(s => s.id === selectedStudentId);
      const studentName = student ? student.displayName : 'Student';

      await addDoc(collection(db, 'studentSchedules'), {
        studentId: selectedStudentId,
        studentName: studentName,
        subject,
        faculty: user.displayName || 'Faculty Mentor',
        facultyId: user.uid,
        date,
        time,
        mode,
        notes,
        createdAt: serverTimestamp()
      });

      triggerToast(`Schedule created for ${studentName}!`);
      setIsAddModalOpen(false);
      setNotes('');
    } catch (err) {
      console.error("Error creating schedule:", err);
      triggerToast('Failed to create schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id, studentName) => {
    if (window.confirm(`Are you sure you want to cancel this class slot for ${studentName}?`)) {
      try {
        await deleteDoc(doc(db, 'studentSchedules', id));
        triggerToast('Schedule deleted successfully');
      } catch (err) {
        console.error(err);
        triggerToast('Failed to delete schedule');
      }
    }
  };

  // Calendar dates generation
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(currentWeekStart, i));
  }

  // Filtered schedules for Faculty UI filter
  const displayedSchedules = schedules.filter(item => {
    if (user?.role === 'faculty') {
      const isAssigned = students.some(s => s.id === item.studentId);
      if (!(item.facultyId === user.uid || isAssigned)) return false;
    }
    if (!canManage) return true;
    if (selectedStudentFilter === 'all') return true;
    return item.studentId === selectedStudentFilter;
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} style={{ position: 'fixed', top: 32, left: '50%', zIndex: 9999, background: 'rgba(34,37,43,0.95)', color: 'white', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', fontWeight: 600, fontSize: '0.9rem' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <motion.div variants={fadeItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>
            {canManage ? 'Schedule Management' : 'My Personal Schedule'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {canManage ? 'Allocate offline/online batches and coordinate class schedules' : 'Personal class slots and upcoming batches'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '100px', padding: '3px' }}>
            <button onClick={() => setViewMode('card')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 700, background: viewMode === 'card' ? 'white' : 'transparent', color: viewMode === 'card' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <List size={14} /> Cards
            </button>
            <button onClick={() => setViewMode('calendar')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 700, background: viewMode === 'calendar' ? 'white' : 'transparent', color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <CalendarRange size={14} /> Calendar
            </button>
          </div>

          {canManage && (
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.88rem', borderRadius: '10px' }}>
              <Plus size={16} /> Add Class Slot
            </button>
          )}
        </div>
      </motion.div>

      {/* Filter bar for Faculty */}
      {canManage && (
        <motion.div variants={fadeItem} className="card card-p" style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Filter by Student:</span>
            <select
              value={selectedStudentFilter}
              onChange={e => setSelectedStudentFilter(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--white)', outline: 'none', fontSize: '0.88rem' }}
            >
              <option value="all">All Students</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.displayName} ({s.course})</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {displayedSchedules.length} scheduled class slots
          </div>
        </motion.div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: 20 }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(83,109,254,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : displayedSchedules.length === 0 ? (
        <motion.div variants={fadeItem} className="card card-p" style={{ textAlign: 'center', padding: '60px 20px', background: 'white' }}>
          <CalendarIcon size={48} style={{ margin: '0 auto 16px', color: 'var(--text-light)', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No classes scheduled</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {canManage ? 'There are no active scheduled slots. Click "Add Class Slot" to schedule classes.' : 'You have no scheduled classes at the moment.'}
          </p>
        </motion.div>
      ) : viewMode === 'card' ? (
        /* CARD VIEW */
        <motion.div variants={stagger} className="grid-auto-cards-sm" style={{ gap: '20px' }}>
          {displayedSchedules.map((item, idx) => {
            const isToday = isSameDay(new Date(), parseISO(item.date));
            return (
              <motion.div key={item.id} variants={fadeItem} className="card card-p" style={{ background: 'white', display: 'flex', flexDirection: 'column', gap: '14px', border: isToday ? '1.5px solid var(--success)' : '1px solid var(--border)' }}>
                
                {/* Top Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge badge-primary" style={{ marginBottom: '8px' }}>{item.subject}</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{item.studentName}</h3>
                  </div>
                  {canManage && (
                    <button onClick={() => handleDeleteSchedule(item.id, item.studentName)} style={{ color: 'var(--danger)', background: 'rgba(239,83,80,0.1)', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Cancel Class">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Details list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarIcon size={14} style={{ color: 'var(--primary)' }} />
                    <span>{format(parseISO(item.date), 'PPPP')}</span>
                    {isToday && <span style={{ marginLeft: 'auto', background: 'var(--success)', color: 'white', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px' }}>TODAY</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} style={{ color: 'var(--primary)' }} />
                    <span>{item.time} ({item.mode})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} style={{ color: 'var(--primary)' }} />
                    <span>Faculty: {item.faculty}</span>
                  </div>
                  {item.notes && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '6px', padding: '10px', background: 'var(--surface)', borderRadius: '8px' }}>
                      <FileText size={14} style={{ color: 'var(--text-light)', marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', fontStyle: 'italic', lineHeight: 1.4 }}>{item.notes}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        /* CALENDAR WEEKLY VIEW */
        <motion.div variants={fadeItem} className="card card-p" style={{ background: 'white', display: 'flex', flexDirection: 'column', gap: '20px', overflowX: 'auto' }}>
          
          {/* Week Changer header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '600px' }}>
            <button onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
              <ArrowLeft size={16} /> Previous Week
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              Week of {format(currentWeekStart, 'MMMM d, yyyy')}
            </h3>
            <button onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
              Next Week <ArrowRight size={16} />
            </button>
          </div>

          {/* Grid structure */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', minWidth: '700px', marginTop: '10px' }}>
            {weekDays.map((day, idx) => {
              const daySchedules = displayedSchedules.filter(item => isSameDay(day, parseISO(item.date)));
              const isToday = isSameDay(new Date(), day);

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: isToday ? 'rgba(83,109,254,0.02)' : 'transparent', border: isToday ? '1px solid rgba(83,109,254,0.2)' : '1px solid var(--border)', borderRadius: '16px', padding: '12px', minHeight: '280px' }}>
                  
                  {/* Day Date labels */}
                  <div style={{ textAlign: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{format(day, 'eee')}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: isToday ? 'var(--primary)' : 'var(--dark)' }}>{format(day, 'd')}</div>
                  </div>

                  {/* Day class list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                    {daySchedules.map(item => (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', background: 'var(--surface)', borderRadius: '8px', fontSize: '0.72rem', position: 'relative' }}>
                        <div style={{ fontWeight: 800, color: 'var(--dark)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{item.time}</span>
                          <span style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 700 }}>{item.mode.toUpperCase()}</span>
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{item.studentName}</div>
                        <div style={{ color: 'var(--text-light)', fontWeight: 500 }}>{item.subject}</div>
                        {canManage && (
                          <button onClick={() => handleDeleteSchedule(item.id, item.studentName)} style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }} title="Cancel Class">
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {daySchedules.length === 0 && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center' }}>
                        Free day
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* CREATE CLASS SLOT MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Schedule Student Class Slot">
        <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Select Student</label>
            <select
              required
              className="form-input"
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
            >
              <option value="" disabled>Choose student profile</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.displayName} ({s.course})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Subject Track</label>
            <select
              required
              className="form-input"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            >
              <option value="Python Mastery">Python Mastery</option>
              <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
              <option value="Class 11 CS">Class 11 CS</option>
              <option value="Class 11 App">Class 11 App</option>
              <option value="Class 12 CS">Class 12 CS</option>
              <option value="Class 12 App">Class 12 App</option>
              <option value="Web Development (HTML/CSS/JS)">Web Development (HTML/CSS/JS)</option>
              <option value="Java Development">Java Development</option>
              <option value="C & C++ Fundamentals">C & C++ Fundamentals</option>
              <option value="Tally Prime">Tally Prime</option>
              <option value="Advanced Excel">Advanced Excel</option>
              <option value="Basic Computer">Basic Computer</option>
              <option value="BCA">BCA</option>
              <option value="B.Tech">B.Tech</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Class Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Class Time</label>
              <input
                type="time"
                required
                className="form-input"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Delivery Mode</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['online', 'offline'].map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: mode === m ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    background: mode === m ? 'var(--primary-light)' : 'white',
                    color: mode === m ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '0.85rem', textTransform: 'capitalize', cursor: 'pointer'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Lesson Notes / Target Topics (Optional)</label>
            <textarea
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Bring Python File I/O homework, dry run of recursion loops"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Class'}
            </button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};

export default Schedule;
