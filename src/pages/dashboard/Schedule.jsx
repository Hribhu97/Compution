import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { addDoc, deleteDoc, updateDoc } from '../../firebase';
import {
  Calendar as CalendarIcon, Clock, MapPin, FileText, Plus, Trash2, Edit2,
  Search, Check, AlertCircle, CalendarRange, List, ArrowLeft, ArrowRight,
  User, Video, BookOpen, Clock3
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addMonths, subMonths, isSameMonth } from 'date-fns';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const fadeItem = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// Enforce end time is exactly 1 Hour 30 Minutes after start time
const computeEndTime = (startTimeStr) => {
  if (!startTimeStr) return '';
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  let endHours = hours + 1;
  let endMinutes = minutes + 30;
  if (endMinutes >= 60) {
    endHours += 1;
    endMinutes -= 60;
  }
  const endHoursStr = String(endHours % 24).padStart(2, '0');
  const endMinutesStr = String(endMinutes).padStart(2, '0');
  return `${endHoursStr}:${endMinutesStr}`;
};

const Schedule = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week'); // 'calendar' | 'week' | 'agenda'
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentMonthStart, setCurrentMonthStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  
  // Faculty/Admin management states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [startDate, setStartDate] = useState('Monday'); // Represents Day of week (e.g. "Monday")
  const [startTime, setStartTime] = useState('17:30');
  const [assignedFacultyId, setAssignedFacultyId] = useState('');
  const [assignedFacultyName, setAssignedFacultyName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [meetLink, setMeetLink] = useState('');
  const [venue, setVenue] = useState('Room 4B');
  const [toast, setToast] = useState('');
  const [facultyUsers, setFacultyUsers] = useState([]);

  // Student slot booking states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState('17:30');
  const [bookingSubject, setBookingSubject] = useState('Python Mastery');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Search/Filter for Staff
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');

  const canManage = user?.role === 'admin' || user?.role === 'faculty';
  const isMember = user?.role === 'member';

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
  }, [user, canManage]);

  // Fetch Schedules & Students
  useEffect(() => {
    if (!user) return;

    if (!db) {
      console.error("Schedule: Firestore not initialized");
      triggerToast("Firestore not initialized");
      return;
    }

    let unsubSched = () => {};
    let unsubStudents = () => {};

    try {
      // Fetch classSchedules in real-time
      const schedQuery = query(collection(db, 'classSchedules'));
      unsubSched = onSnapshot(schedQuery, (snap) => {
        const list = [];
        snap.forEach(doc => {
          const d = doc.data();
          list.push({ 
            id: doc.id, 
            ...d
          });
        });
        setSchedules(list);
        setLoading(false);
      }, (error) => {
        console.error("Schedule: Error fetching classSchedules", error);
        setLoading(false);
      });
    } catch (err) {
      console.error("Schedule: Failed to setup classSchedules listener", err);
      triggerToast("Failed to connect to schedules");
      setLoading(false);
    }

    try {
      if (canManage) {
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        unsubStudents = onSnapshot(studentsQuery, (snap) => {
          const list = [];
          snap.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
          });
          setStudents(list);
        }, (error) => {
          console.error("Schedule: Error fetching students list", error);
        });
      }
    } catch (err) {
      console.error("Schedule: Failed to setup students roster listener", err);
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
    setIsSubmitting(true);

    try {
      let facName = assignedFacultyName;
      if (user?.role === 'admin' && assignedFacultyId) {
        const matchedFac = facultyUsers.find(f => f.id === assignedFacultyId);
        if (matchedFac) facName = matchedFac.displayName || matchedFac.name || '';
      }

      const payload = {
        subject: eventTitle.trim(),
        description: eventDesc.trim(),
        day: startDate,
        startTime,
        endTime: computeEndTime(startTime),
        duration: '1 Hour 30 Minutes',
        facultyId: assignedFacultyId || user.uid,
        facultyName: facName || user.displayName || 'Faculty Mentor',
        batch: selectedGroups[0] || 'class_2_5',
        studentIds: selectedStudents,
        meetLink,
        room: venue,
        status: 'upcoming',
        updatedAt: serverTimestamp()
      };

      if (editingSchedule) {
        await updateDoc(doc(db, 'classSchedules', editingSchedule.id), payload);
        triggerToast('Class schedule updated successfully! 📅');
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'classSchedules'), payload);
        triggerToast('Class scheduled successfully! 📅');
      }

      setIsAddModalOpen(false);
      setEditingSchedule(null);
      setEventTitle('');
      setEventDesc('');
      setMeetLink('');
      setSelectedGroups([]);
      setSelectedStudents([]);
    } catch (err) {
      console.error("Error saving schedule:", err);
      triggerToast('Failed to save class schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id, title) => {
    if (window.confirm(`Are you sure you want to cancel this class slot: ${title}?`)) {
      try {
        await deleteDoc(doc(db, 'classSchedules', id));
        triggerToast('Class slot cancelled successfully');
      } catch (err) {
        console.error(err);
        triggerToast('Failed to cancel event');
      }
    }
  };

  // Student slot booking request
  const handleBookSlot = async (e) => {
    e.preventDefault();
    if (!bookingDate) {
      triggerToast('Please select a date');
      return;
    }
    setBookingSubmitting(true);

    try {
      await addDoc(collection(db, 'slotRequests'), {
        studentId: user.uid,
        studentName: user.displayName || 'Student',
        requestedDate: bookingDate,
        requestedTime: bookingTime,
        subject: bookingSubject,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      triggerToast('Slot request submitted successfully! 📅');
      setIsBookingModalOpen(false);
    } catch (err) {
      console.error("Error requesting slot:", err);
      triggerToast('Failed to request slot');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Filtered schedules based on active user
  const userGroup = user?.studentGroup || '';
  const displayedSchedules = schedules.filter(item => {
    if (user?.role?.toLowerCase() === 'student') {
      const isInStudents = item.studentIds?.includes(user.uid);
      const isInGroups = item.batch === userGroup;
      return isInStudents || isInGroups;
    }
    
    if (user?.role?.toLowerCase() === 'faculty') {
      return item.facultyId === user.uid;
    }
    
    // Admin and Member
    if (selectedStudentFilter === 'all') return true;
    return item.studentIds?.includes(selectedStudentFilter);
  });

  // Helper to map date to day-of-week string
  const getDayName = (dateObj) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dateObj.getDay()];
  };

  // Calendar view dates calculations
  const monthDays = [];
  const startDayOfWeek = startOfWeek(currentMonthStart, { weekStartsOn: 1 });
  for (let i = 0; i < 35; i++) {
    monthDays.push(addDays(startDayOfWeek, i));
  }

  // Week view dates
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(currentWeekStart, i));
  }

  // Filter schedules matching the selected date's day of week
  const selectedDayName = getDayName(selectedDate);
  const selectedDaySchedules = displayedSchedules.filter(item => item.day === selectedDayName);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} style={{ position: 'fixed', top: 32, left: '50%', zIndex: 9999, background: 'rgba(34,37,43,0.95)', color: 'var(--text-on-primary)', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', fontWeight: 600, fontSize: '0.9rem' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <motion.div variants={fadeItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>
            {canManage ? 'Schedule Management' : 'Academic Class Timetable'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {canManage ? 'Allocate offline/online batches and coordinate class schedules' : 'Personal class slots and upcoming batches'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '100px', padding: '3px' }}>
            <button onClick={() => setViewMode('calendar')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 700, background: viewMode === 'calendar' ? 'white' : 'transparent', color: viewMode === 'calendar' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <CalendarRange size={14} /> Calendar
            </button>
            <button onClick={() => setViewMode('week')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 700, background: viewMode === 'week' ? 'white' : 'transparent', color: viewMode === 'week' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <List size={14} /> Week
            </button>
            <button onClick={() => setViewMode('agenda')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 700, background: viewMode === 'agenda' ? 'white' : 'transparent', color: viewMode === 'agenda' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
              <Clock3 size={14} /> Agenda
            </button>
          </div>

          {user?.role?.toLowerCase() === 'student' && (
            <button onClick={() => setIsBookingModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.88rem', borderRadius: '10px' }}>
              Book Reschedule Slot
            </button>
          )}

          {canManage && (
            <button onClick={() => { setEditingSchedule(null); setIsAddModalOpen(true); }} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.88rem', borderRadius: '10px' }}>
              <Plus size={16} /> Add Class Slot
            </button>
          )}
        </div>
      </motion.div>

      {/* FILTER BAR FOR FACULTY/ADMIN */}
      {canManage && (
        <motion.div variants={fadeItem} className="card card-p" style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--white)' }}>
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
            {displayedSchedules.length} scheduled slots
          </div>
        </motion.div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)', borderRadius: 20 }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(83,109,254,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* 1. MONTHLY CALENDAR VIEW */}
          {viewMode === 'calendar' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }} className="grid-2-col-mobile">
              {/* Calendar grid */}
              <motion.div variants={fadeItem} className="card card-p" style={{ background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                    {format(currentMonthStart, 'MMMM yyyy')}
                  </h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setCurrentMonthStart(prev => subMonths(prev, 1))} style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', background: 'none' }}><ArrowLeft size={14} /></button>
                    <button onClick={() => setCurrentMonthStart(prev => addMonths(prev, 1))} style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', background: 'none' }}><ArrowRight size={14} /></button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase' }}>{d}</div>
                  ))}
                  {monthDays.map((day, idx) => {
                    const isSelected = isSameDay(selectedDate, day);
                    const isCurrentMonth = isSameMonth(currentMonthStart, day);
                    const daySchedulesList = displayedSchedules.filter(item => item.day === getDayName(day));

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        style={{
                          aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          color: isSelected ? 'white' : isCurrentMonth ? 'var(--dark)' : 'var(--text-light)',
                          border: isSameDay(new Date(), day) ? '1.5px solid var(--primary)' : '1px solid transparent'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{format(day, 'd')}</span>
                        {/* Dot indicator for classes */}
                        <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '4px' }}>
                          {daySchedulesList.slice(0, 3).map((item, i) => (
                            <span key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? 'white' : 'var(--primary)' }} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Day details panel */}
              <motion.div variants={fadeItem} className="card card-p" style={{ background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  Classes for {format(selectedDate, 'EEEE, d MMMM')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedDaySchedules.map(item => (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)' }}>{item.batch}</span>
                        {canManage && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setEditingSchedule(item);
                                setEventTitle(item.subject);
                                setEventDesc(item.description || '');
                                setStartDate(item.day);
                                setStartTime(item.startTime);
                                setVenue(item.room);
                                setSelectedGroups([item.batch]);
                                setSelectedStudents(item.studentIds || []);
                                setMeetLink(item.meetLink || '');
                                setIsAddModalOpen(true);
                              }}
                              style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDeleteSchedule(item.id, item.subject)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>{item.subject}</h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {item.startTime} - {item.endTime}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {item.room}</div>
                      </div>
                      {item.meetLink && (
                        <a href={item.meetLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          <Video size={12} /> Join Meet Link
                        </a>
                      )}
                    </div>
                  ))}
                  {selectedDaySchedules.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', padding: '40px 0' }}>
                      No classes scheduled for this day.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* 2. WEEK VIEW GRID */}
          {viewMode === 'week' && (
            <motion.div variants={fadeItem} className="card card-p" style={{ background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: '20px', overflowX: isMobile ? 'visible' : 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: isMobile ? 'auto' : '700px', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '10px' }}>
                <button onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <ArrowLeft size={16} /> Previous Week
                </button>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  Week of {format(currentWeekStart, 'MMMM d, yyyy')}
                </h3>
                <button onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Next Week <ArrowRight size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(7, 1fr)', gap: '12px', minWidth: isMobile ? 'auto' : '700px', marginTop: '10px' }}>
                {weekDays.map((day, idx) => {
                  const dayName = getDayName(day);
                  const daySchedules = displayedSchedules.filter(item => item.day === dayName);
                  const isToday = isSameDay(new Date(), day);

                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: isToday ? 'rgba(83,109,254,0.02)' : 'transparent', border: isToday ? '1px solid rgba(83,109,254,0.2)' : '1px solid var(--border)', borderRadius: '16px', padding: '12px', minHeight: isMobile ? 'auto' : '280px' }}>
                      <div style={{
                        paddingBottom: '8px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: isMobile ? 'row' : 'column',
                        justifyContent: isMobile ? 'space-between' : 'center',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'var(--text-light)', textTransform: 'uppercase' }}>{format(day, 'eee')}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: isToday ? 'var(--primary)' : 'var(--dark)' }}>{format(day, 'd')}</div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                        {daySchedules.map(item => (
                          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', background: 'rgba(83,109,254,0.05)', borderLeft: '3px solid var(--primary)', borderRadius: '8px', fontSize: '0.72rem', position: 'relative' }}>
                            <div style={{ fontWeight: 800, color: 'var(--dark)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{item.startTime}</span>
                              <span style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 700 }}>{item.batch}</span>
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{item.subject}</div>
                            <div style={{ color: 'var(--text-light)', fontWeight: 600 }}>{item.facultyName}</div>
                            {canManage && (
                              <button onClick={() => handleDeleteSchedule(item.id, item.subject)} style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}>×</button>
                            )}
                          </div>
                        ))}
                        {daySchedules.length === 0 && (
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center' }}>
                            Free Day
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* 3. AGENDA VIEW */}
          {viewMode === 'agenda' && (
            <motion.div variants={stagger} className="grid-auto-cards-sm" style={{ gap: '20px' }}>
              {displayedSchedules.map(item => (
                <motion.div key={item.id} variants={fadeItem} className="card card-p" style={{ background: 'var(--white)', borderLeft: '5px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="badge" style={{ background: 'rgba(83,109,254,0.1)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>
                        {item.day} Slot
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '4px' }}>{item.subject}</h3>
                    </div>
                    {canManage && (
                      <button onClick={() => handleDeleteSchedule(item.id, item.subject)} style={{ color: 'var(--danger)', background: 'rgba(239,83,80,0.1)', padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={14} style={{ color: 'var(--primary)' }} />
                      <span>{item.startTime} - {item.endTime} (1.5 hrs)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={14} style={{ color: 'var(--primary)' }} />
                      <span>Faculty: {item.facultyName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={14} style={{ color: 'var(--primary)' }} />
                      <span>Batch: {item.batch}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} style={{ color: 'var(--primary)' }} />
                      <span>Venue: {item.room}</span>
                    </div>
                    {item.meetLink && (
                      <a href={item.meetLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '0.75rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                        <Video size={14} /> Join Meeting Link
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* MODAL: ADD/EDIT SCHEDULE (ADMIN/FACULTY ONLY) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={editingSchedule ? "Edit Class Schedule" : "Schedule Academic Class Event"}>
        <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Subject Title</label>
            <input
              required
              type="text"
              className="form-input"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              placeholder="e.g. Python Loops and Functions"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Day of Week</label>
              <select
                required
                className="form-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ background: 'var(--white)' }}
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Faculty Mentor</label>
              {user?.role === 'admin' ? (
                <select
                  required
                  className="form-input"
                  value={assignedFacultyId}
                  onChange={e => setAssignedFacultyId(e.target.value)}
                  style={{ background: 'var(--white)' }}
                >
                  <option value="" disabled>Choose Faculty</option>
                  {facultyUsers.map(f => (
                    <option key={f.id} value={f.id}>{f.displayName || f.name}</option>
                  ))}
                </select>
              ) : (
                <input disabled className="form-input" value={assignedFacultyName} />
              )}
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
              <label className="form-label">End Time (Auto: 1h 30m duration)</label>
              <input
                type="text"
                disabled
                className="form-input"
                value={computeEndTime(startTime)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-2-col-mobile">
            <div>
              <label className="form-label">Assign Batch Group</label>
              <select
                required
                className="form-input"
                value={selectedGroups[0] || ''}
                onChange={e => setSelectedGroups([e.target.value])}
                style={{ background: 'var(--white)' }}
              >
                <option value="" disabled>Choose Batch</option>
                <option value="class_2_5">Class 2-5</option>
                <option value="class_6_8">Class 6-8</option>
                <option value="class_9_10">Class 9-10</option>
                <option value="class_11_12_science">Class 11-12 Sci</option>
                <option value="class_11_12_application">Class 11-12 App</option>
              </select>
            </div>
            <div>
              <label className="form-label">Venue / Room / Location</label>
              <input
                type="text"
                required
                className="form-input"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Room 4B, Campus"
              />
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

          {canManage && (
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
                      />
                      <span>{stud.displayName} ({stud.course || 'No course'})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Description / Lesson Notes (Optional)</label>
            <textarea
              className="form-input"
              value={eventDesc}
              onChange={e => setEventDesc(e.target.value)}
              placeholder="e.g. Bring Python File I/O homework, dry run of recursion loops"
              rows={2}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? 'Saving...' : 'Save Class Slot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: SLOT BOOKING REQUEST (STUDENTS ONLY) */}
      <Modal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} title="Book Reschedule / Alternative Class Slot">
        <form onSubmit={handleBookSlot} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Subject Course</label>
            <select
              required
              className="form-input"
              value={bookingSubject}
              onChange={e => setBookingSubject(e.target.value)}
              style={{ background: 'var(--white)' }}
            >
              {['Python Mastery', 'Data Structures & Algorithms', 'Web Development', 'Basic Computer'].map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Preferred Date</label>
            <input
              type="date"
              required
              min={format(new Date(), 'yyyy-MM-dd')}
              className="form-input"
              value={bookingDate}
              onChange={e => setBookingDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Preferred Time Slot</label>
            <select
              required
              className="form-input"
              value={bookingTime}
              onChange={e => setBookingTime(e.target.value)}
              style={{ background: 'var(--white)' }}
            >
              {['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '17:30', '19:00'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsBookingModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={bookingSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {bookingSubmitting ? 'Requesting...' : 'Request Slot'}
            </button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};

export default Schedule;
