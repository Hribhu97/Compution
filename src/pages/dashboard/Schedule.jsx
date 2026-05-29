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
  
  // Faculty management states for new engine
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState('Regular Class');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('18:00');
  const [assignedFacultyId, setAssignedFacultyId] = useState('');
  const [assignedFacultyName, setAssignedFacultyName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [meetLink, setMeetLink] = useState('');
  const [venue, setVenue] = useState('Compution Campus');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('none');
  const [toast, setToast] = useState('');
  const [facultyUsers, setFacultyUsers] = useState([]);

  // Search/Filter for Staff
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');

  const canManage = user?.role === 'admin' || user?.role === 'faculty';

  // Load active user details
  useEffect(() => {
    if (user) {
      setAssignedFacultyId(user.uid || '');
      setAssignedFacultyName(user.displayName || user.name || '');
    }
  }, [user]);

  // Fetch all faculty for dropdown (admin only)
  useEffect(() => {
    if (canManage && user?.role === 'admin') {
      const q = query(collection(db, 'users'), where('role', '==', 'faculty'));
      getDocs(q).then(snap => {
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setFacultyUsers(list);
      });
    }
  }, [user]);

  // Fetch Schedules & Students
  useEffect(() => {
    if (!user) return;

    // Fetch calendarEvents for real-time calendar sync
    const schedQuery = query(collection(db, 'calendarEvents'));
    const unsubSched = onSnapshot(schedQuery, (snap) => {
      const list = [];
      snap.forEach(doc => {
        const d = doc.data();
        list.push({ 
          id: doc.id, 
          ...d,
          date: d.startDate || d.date || '',
          time: d.startTime || d.time || '',
          subject: d.title || d.subject || '',
          mode: d.eventType === 'Google Meet Session' ? 'online' : 'offline',
          faculty: d.assignedFacultyName || d.faculty || 'Faculty Mentor'
        });
      });
      // Sort by date and time
      list.sort((a, b) => {
        const dateCompare = (a.date || '').localeCompare(b.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
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
            const hasAssignedIds = data.assignedFacultyIds?.includes(user.uid);
            const hasAssignedLegacy = data.assignedFaculty?.includes(user.uid) || data.assignedFaculty?.includes(user.email);
            if (hasAssignedIds || hasAssignedLegacy) {
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
  }, [user?.uid, canManage]);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      triggerToast('Please enter an event title');
      return;
    }
    if (selectedGroups.length === 0 && selectedStudents.length === 0) {
      triggerToast('Please assign to at least one student or group');
      return;
    }
    setIsSubmitting(true);

    try {
      let facName = assignedFacultyName;
      if (user?.role === 'admin' && assignedFacultyId) {
        const matchedFac = facultyUsers.find(f => f.id === assignedFacultyId);
        if (matchedFac) facName = matchedFac.displayName || matchedFac.name || '';
      }

      await addDoc(collection(db, 'calendarEvents'), {
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        eventType,
        startDate,
        endDate,
        startTime,
        endTime,
        assignedFacultyId,
        assignedFacultyName: facName || user.displayName || 'Faculty Mentor',
        assignedGroups: selectedGroups,
        assignedStudents: selectedStudents,
        meetLink,
        venue,
        recurring: isRecurring,
        recurrenceType: isRecurring ? recurrenceType : 'none',
        createdBy: user.displayName || user.name || 'System',
        createdAt: serverTimestamp()
      });

      triggerToast('Class Scheduled successfully! 📅');
      setIsAddModalOpen(false);
      
      // Reset form
      setEventTitle('');
      setEventDesc('');
      setMeetLink('');
      setSelectedGroups([]);
      setSelectedStudents([]);
    } catch (err) {
      console.error("Error creating schedule:", err);
      triggerToast('Failed to create class schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id, title) => {
    if (window.confirm(`Are you sure you want to cancel this event: ${title}?`)) {
      try {
        await deleteDoc(doc(db, 'calendarEvents', id));
        triggerToast('Event cancelled successfully');
      } catch (err) {
        console.error(err);
        triggerToast('Failed to cancel event');
      }
    }
  };

  // Calendar dates generation
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(currentWeekStart, i));
  }

  // Filtered schedules (Phase 5)
  const userGroup = user?.studentGroup || '';
  const displayedSchedules = schedules.filter(item => {
    if (user?.role?.toLowerCase() === 'student') {
      const isInStudents = item.assignedStudents?.includes(user.uid);
      const isInGroups = item.assignedGroups?.includes(userGroup);
      return isInStudents || isInGroups;
    }
    
    if (user?.role?.toLowerCase() === 'faculty') {
      const isCreator = item.assignedFacultyId === user.uid;
      const isStudentAssigned = item.assignedStudents?.some(sid => students.some(s => s.id === sid));
      return isCreator || isStudentAssigned;
    }
    
    // Admin and Member
    if (selectedStudentFilter === 'all') return true;
    return item.assignedStudents?.includes(selectedStudentFilter);
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
            const eventColor = getEventColor(item.eventType);
            return (
              <motion.div key={item.id} variants={fadeItem} className="card card-p" style={{ background: 'white', display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: `5px solid ${eventColor}`, borderTop: isToday ? '1.5px solid var(--success)' : '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                
                {/* Top Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge" style={{ marginBottom: '8px', background: `${eventColor}15`, color: eventColor, fontWeight: 800, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>
                      {item.eventType || 'Regular Class'}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '4px' }}>{item.title || item.subject}</h3>
                  </div>
                  {canManage && (
                    <button onClick={() => handleDeleteSchedule(item.id, item.title || item.subject)} style={{ color: 'var(--danger)', background: 'rgba(239,83,80,0.1)', padding: '6px', borderRadius: '6px', cursor: 'pointer', border: 'none' }} title="Cancel Event">
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
                    <span>{item.startTime} - {item.endTime || 'End Time'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} style={{ color: 'var(--primary)' }} />
                    <span>Faculty: {item.assignedFacultyName || 'Faculty Mentor'}</span>
                  </div>
                  {item.venue && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <MapPin size={14} style={{ color: 'var(--primary)' }} />
                      <span>{item.venue}</span>
                    </div>
                  )}
                  {item.description && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '6px', padding: '10px', background: 'var(--surface)', borderRadius: '8px' }}>
                      <FileText size={14} style={{ color: 'var(--text-light)', marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', fontStyle: 'italic', lineHeight: 1.4 }}>{item.description}</span>
                    </div>
                  )}
                  {item.meetLink && (
                    <a
                      href={item.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '8px 12px', fontSize: '0.75rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}
                    >
                      Join Meeting Link
                    </a>
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
            <button onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <ArrowLeft size={16} /> Previous Week
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              Week of {format(currentWeekStart, 'MMMM d, yyyy')}
            </h3>
            <button onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
                    {daySchedules.map(item => {
                      const eventColor = getEventColor(item.eventType);
                      return (
                        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', background: `${eventColor}08`, borderLeft: `3px solid ${eventColor}`, borderRadius: '8px', fontSize: '0.72rem', position: 'relative' }}>
                          <div style={{ fontWeight: 800, color: 'var(--dark)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{item.startTime}</span>
                            <span style={{ fontSize: '0.62rem', color: eventColor, fontWeight: 700 }}>{item.eventType?.split(' ')[0] || 'Class'}</span>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{item.title || item.subject}</div>
                          <div style={{ color: 'var(--text-light)', fontWeight: 600 }}>{item.assignedFacultyName || 'Mentor'}</div>
                          {canManage && (
                            <button onClick={() => handleDeleteSchedule(item.id, item.title || item.subject)} style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }} title="Cancel Class">
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
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

      {/* CREATE CALENDAR EVENT MODAL (Phase 4) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Schedule Academic Class Event">
        <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Event Title</label>
            <input
              required
              type="text"
              className="form-input"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              placeholder="e.g. Regular Class: Intro to Python loops"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Event Type</label>
              <select
                required
                className="form-input"
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                style={{ background: 'white' }}
              >
                <option value="Regular Class">Regular Class</option>
                <option value="Extra Class">Extra Class</option>
                <option value="Practical Class">Practical Class</option>
                <option value="Practice Session">Practice Session</option>
                <option value="Google Meet Session">Google Meet Session</option>
                <option value="Exam Revision Session">Exam Revision Session</option>
              </select>
            </div>
            <div>
              <label className="form-label">Faculty Leader</label>
              {user?.role?.toLowerCase() === 'admin' ? (
                <select
                  required
                  className="form-input"
                  value={assignedFacultyId}
                  onChange={e => setAssignedFacultyId(e.target.value)}
                  style={{ background: 'white' }}
                >
                  <option value="" disabled>Choose Faculty</option>
                  {facultyUsers.map(f => (
                    <option key={f.id} value={f.id}>{f.displayName || f.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  disabled
                  className="form-input"
                  value={assignedFacultyName}
                />
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setEndDate(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Start Time</label>
              <input
                type="time"
                required
                className="form-input"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">End Time</label>
              <input
                type="time"
                required
                className="form-input"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Group assignment checkboxes */}
          <div>
            <label className="form-label" style={{ fontWeight: 800 }}>Assign Academic Student Groups</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {[
                { id: 'class_2_5', label: 'Class 2-5' },
                { id: 'class_6_8', label: 'Class 6-8' },
                { id: 'class_9_10', label: 'Class 9-10' },
                { id: 'class_11_12_science', label: 'Class 11-12 Sci' },
                { id: 'class_11_12_application', label: 'Class 11-12 App' }
              ].map(grp => {
                const isSelected = selectedGroups.includes(grp.id);
                return (
                  <button
                    type="button"
                    key={grp.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGroups(selectedGroups.filter(g => g !== grp.id));
                      } else {
                        setSelectedGroups([...selectedGroups, grp.id]);
                      }
                    }}
                    style={{
                      padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                      background: isSelected ? 'var(--primary)' : 'var(--surface)',
                      color: isSelected ? 'white' : 'var(--text-muted)',
                      border: '1px solid ' + (isSelected ? 'var(--primary)' : 'var(--border)'),
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {grp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student selection scrollbox */}
          <div>
            <label className="form-label" style={{ fontWeight: 800 }}>Assign Individual Students</label>
            <div style={{
              maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px',
              marginTop: '6px', background: '#F9FAFB'
            }}>
              {students.map(stud => {
                const isSelected = selectedStudents.includes(stud.id);
                return (
                  <label key={stud.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setSelectedStudents(selectedStudents.filter(id => id !== stud.id));
                        } else {
                          setSelectedStudents([...selectedStudents, stud.id]);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{stud.displayName} ({stud.course || 'No course'})</span>
                  </label>
                );
              })}
              {students.length === 0 && (
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-light)', fontStyle: 'italic', padding: '12px 0' }}>
                  No students assigned to you yet
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="form-label">Google Meet Link (Optional)</label>
            <input
              type="url"
              className="form-input"
              value={meetLink}
              onChange={e => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij"
            />
          </div>

          <div>
            <label className="form-label">Venue / Location</label>
            <input
              type="text"
              className="form-input"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="e.g. Room 4B, Compution Campus"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="isRecurring" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Recurring Event</label>
            </div>
            {isRecurring && (
              <div>
                <select
                  required
                  className="form-input"
                  value={recurrenceType}
                  onChange={e => setRecurrenceType(e.target.value)}
                  style={{ background: 'white' }}
                >
                  <option value="none" disabled>Choose Type</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Description / Lesson Notes (Optional)</label>
            <textarea
              className="form-input"
              value={eventDesc}
              onChange={e => setEventDesc(e.target.value)}
              placeholder="e.g. Bring Python File I/O homework, dry run of recursion loops"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};

// Color coding mapping
const getEventColor = (type) => {
  switch (type) {
    case 'Regular Class': return '#3B82F6'; // Blue
    case 'Extra Class': return '#8B5CF6'; // Purple
    case 'Practical Class': return '#F97316'; // Orange
    case 'Exam Revision Session': return '#EF4444'; // Red
    case 'Practice Session': return '#10B981'; // Green
    case 'Google Meet Session': return '#06B6D4'; // Cyan
    default: return '#536DFE'; // Theme color
  }
};

export default Schedule;
