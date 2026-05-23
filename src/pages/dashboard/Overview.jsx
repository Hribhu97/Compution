import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Users, Send, Clock, UserMinus, ChevronDown, Share2,
  Sparkles, ShieldCheck, Download, ExternalLink, Calendar,
  ChevronRight, BookOpen, Clock3, CheckCircle, Info, Play, MessageSquare, ShieldAlert,
  FileEdit, Trash2, Plus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AdminStudentGrid from '../../components/AdminStudentGrid';
import AdminDashboard from '../../components/AdminDashboard';
import Modal from '../../components/Modal';

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

/* ── TOAST NOTIFICATION ────────────────────────────── */
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
      animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
      exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      style={{
        position: 'fixed',
        top: '32px',
        left: '50%',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 24px',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06)',
        color: 'var(--dark)',
        fontFamily: 'var(--font-support)',
        fontWeight: 600,
        fontSize: '0.95rem',
      }}
    >
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: 'var(--success)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}>
        <ShieldCheck size={14} />
      </div>
      <span>{message}</span>
    </motion.div>
  );
};

const StudentOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0, doubts: 0 });
  const [progressData, setProgressData] = useState([]);
  const [completionPct, setCompletionPct] = useState(0);
  const [overallGrade, setOverallGrade] = useState('N/A');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  
  // Simulator State
  const [simulatedPeriod, setSimulatedPeriod] = useState(() => {
    const saved = localStorage.getItem('simulatedPeriod');
    if (saved) return saved;
    return 'new';
  });

  // Interactive Checklist State
  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem(`onboarding_checklist_${user?.uid || 'temp'}`);
    if (saved) return JSON.parse(saved);
    return { profile: true, syllabus: false, whatsapp: false, orientation: false };
  });

  // Toast message
  const [toast, setToast] = useState(null);

  // Notes Modal & Form States
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ id: '', title: '', subject: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddNote = () => {
    setNoteForm({ id: '', title: '', subject: '', content: '' });
    setIsNoteModalOpen(true);
  };

  const handleOpenEditNote = (note) => {
    setNoteForm({ id: note.id, title: note.title, subject: note.subject, content: note.content });
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteForm.title || !noteForm.subject || !noteForm.content) return;
    setIsSubmitting(true);
    try {
      if (noteForm.id) {
        // Update existing note
        await updateDoc(doc(db, `users/${user.uid}/notes`, noteForm.id), {
          title: noteForm.title,
          subject: noteForm.subject,
          content: noteForm.content,
          updatedAt: serverTimestamp()
        });
        setToast('Note updated successfully!');
      } else {
        // Create new note
        await addDoc(collection(db, `users/${user.uid}/notes`), {
          title: noteForm.title,
          subject: noteForm.subject,
          content: noteForm.content,
          createdAt: serverTimestamp()
        });
        setToast('Note created successfully!');
      }
      setIsNoteModalOpen(false);
      setNoteForm({ id: '', title: '', subject: '', content: '' });
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (e, noteId) => {
    e.stopPropagation(); // Prevent opening edit modal
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/notes`, noteId));
        setToast('Note deleted successfully!');
      } catch (err) {
        console.error("Error deleting note:", err);
      }
    }
  };

  useEffect(() => {
    if (user?.uid) {
      localStorage.setItem(`onboarding_checklist_${user.uid}`, JSON.stringify(checklist));
    }
  }, [checklist, user]);

  // Keep simulatedPeriod in sync with user progress / completionPct if no manual override is set
  useEffect(() => {
    const saved = localStorage.getItem('simulatedPeriod');
    if (!saved) {
      const progress = user?.courseProgress !== undefined ? user.courseProgress : completionPct;
      setSimulatedPeriod(progress >= 80 ? 'established' : 'new');
    }
  }, [user?.courseProgress, completionPct]);

  // Sync simulator state across tabs if they change it
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('simulatedPeriod');
      if (saved) {
        setSimulatedPeriod(saved);
      } else {
        const progress = user?.courseProgress !== undefined ? user.courseProgress : completionPct;
        setSimulatedPeriod(progress >= 80 ? 'established' : 'new');
      }
    };
    window.addEventListener('simulatedPeriodChanged', handleSync);
    return () => window.removeEventListener('simulatedPeriodChanged', handleSync);
  }, [user?.courseProgress, completionPct]);

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
          { day: 'Mon', studyHours: 2.0 }, { day: 'Tue', studyHours: 2.1 },
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

    const notesRef = query(collection(db, `users/${user.uid}/notes`), orderBy('createdAt', 'desc'));
    const unsubNotes = onSnapshot(notesRef, (snap) => {
      const data = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setNotes(data);
    });

    return () => { 
      unsubAtt(); 
      unsubProg(); 
      unsubNotes();
    };
  }, [user]);

  const displayName = user?.displayName || 'Student';
  const email = user?.email || 'student@compution.in';
  const studentId = user?.studentId || 'COMP25007';
  const course = user?.course || 'Python Mastery';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const stats = [
    { icon: <Users size={22} />, value: attendanceStats.present, label: 'Total Attendance', color: 'var(--primary)', bg: 'rgba(83,109,254,0.08)' },
    { icon: <Send size={22} />, value: '200+', label: 'Doubts solved', color: 'var(--success)', bg: 'rgba(102,187,106,0.08)' },
    { icon: <Clock size={22} />, value: attendanceStats.late, label: 'Late present', color: '#FFA726', bg: 'rgba(255,167,38,0.08)' },
    { icon: <UserMinus size={22} />, value: attendanceStats.absent, label: 'Total Absent', color: 'var(--danger)', bg: 'rgba(239,83,80,0.08)' },
  ];

  const handleDownloadSyllabus = () => {
    setToast('Downloading syllabus outline... Let\'s get learning!');
    
    // Create text file blob to simulate syllabus download
    const syllabusContent = `COMPUTION ACADEMY COURSE SYLLABUS\n\nCourse: ${course}\nDuration: 3-4 Months\nFormat: Online & Offline Live Classes\n\nModules:\n1. Intro & Environments\n2. Fundamentals & Core Logic\n3. Advanced Implementation\n4. Live Case Projects\n\nOfficial Compution Student Support Team.`;
    const blob = new Blob([syllabusContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${course.replace(/\s+/g, '_')}_Syllabus.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setChecklist(prev => ({ ...prev, syllabus: true }));
  };

  const handleJoinWhatsApp = () => {
    setToast('Opening Official WhatsApp Student Community Group...');
    setChecklist(prev => ({ ...prev, whatsapp: true }));
    
    setTimeout(() => {
      const text = encodeURIComponent(`Hi! I'm ${displayName}, enrolled in "${course}". Just finished onboarding on the student portal and wanted to connect with the official student group.`);
      window.open(`https://wa.me/919674035542?text=${text}`, '_blank');
    }, 1500);
  };

  const handleScheduleOrientation = () => {
    setToast('1-on-1 Orientation Call booked! A mentor will call you soon.');
    setChecklist(prev => ({ ...prev, orientation: true }));
  };

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const onboardingProgressPct = Math.round((checkedCount / 4) * 100);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      


      {simulatedPeriod === 'new' ? (
        /* ── NEW STUDENT ONBOARDING DASHBOARD ──────────────── */
        <>
          <motion.div variants={fadeItem} className="card" style={{
            background: 'linear-gradient(135deg, #4A00E0, #8E2DE2)',
            color: 'white',
            borderRadius: '24px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px',
              borderRadius: '50%', background: 'rgba(255,255,255,0.06)', blur: '40px', pointerEvents: 'none'
            }} />
            <div className="card-p" style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.2)', padding: '4px 12px', borderRadius: '100px',
                  fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  🎉 Setup Workspace
                </span>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Joined Compution</span>
              </div>
              <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 800 }}>Welcome to your workspace, {displayName}!</h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', maxWidth: '600px', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Let's set up your environment, resources, and live channels. Complete the checklist items below to get fully certified.
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9 }}>Your course track:</span>
                <span style={{
                  background: 'white', color: '#4A00E0', padding: '4px 12px', borderRadius: '8px',
                  fontWeight: 700, fontSize: '0.85rem', boxShadow: 'var(--shadow-sm)'
                }}>
                  {course}
                </span>
              </div>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }} className="grid-2-col-mobile">
            {/* Checklist Container */}
            <motion.div variants={fadeItem} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Orientation Checklist</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interactive setup steps for fresh learners</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', color: 'var(--primary)' }}>{onboardingProgressPct}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{checkedCount}/4 items ready</div>
                </div>
              </div>

              {/* Progress Track */}
              <div style={{ margin: '-4px 0 12px' }}>
                <div className="progress-track" style={{ height: '8px', background: 'var(--surface)', borderRadius: '10px' }}>
                  <motion.div className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${onboardingProgressPct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: 'linear-gradient(90deg, var(--primary), var(--success))', height: '100%', borderRadius: '100px' }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Profile Complete */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px',
                  background: 'rgba(102,187,106,0.06)', border: '1.5px solid rgba(102,187,106,0.15)',
                  transition: 'var(--transition)'
                }}>
                  <div style={{ color: 'var(--success)' }}><CheckCircle size={22} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)', textDecoration: 'line-through', opacity: 0.7 }}>1. Complete your onboarding profile details</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Personal, school/college, and guardian contacts synchronized</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(102,187,106,0.12)', padding: '2px 8px', borderRadius: '4px' }}>Done</span>
                </div>

                {/* Syllabus Download */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px',
                  background: checklist.syllabus ? 'rgba(102,187,106,0.06)' : 'white',
                  border: checklist.syllabus ? '1.5px solid rgba(102,187,106,0.15)' : '1.5px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.01)', transition: 'var(--transition)'
                }}>
                  <div style={{ color: checklist.syllabus ? 'var(--success)' : 'var(--text-light)', cursor: 'pointer' }} onClick={handleDownloadSyllabus}>
                    {checklist.syllabus ? <CheckCircle size={22} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--text-light)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)', textDecoration: checklist.syllabus ? 'line-through' : 'none', opacity: checklist.syllabus ? 0.7 : 1 }}>2. Download course syllabus outline</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Get the lesson plans, topics, and code compiler targets</div>
                  </div>
                  <button 
                    onClick={handleDownloadSyllabus}
                    className={`btn ${checklist.syllabus ? 'btn-ghost' : 'btn-primary'}`} 
                    style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', height: 'fit-content' }}
                  >
                    {checklist.syllabus ? <><ShieldCheck size={12} /> Downloaded</> : <><Download size={12} /> Get Syllabus</>}
                  </button>
                </div>

                {/* WhatsApp Group */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px',
                  background: checklist.whatsapp ? 'rgba(102,187,106,0.06)' : 'white',
                  border: checklist.whatsapp ? '1.5px solid rgba(102,187,106,0.15)' : '1.5px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.01)', transition: 'var(--transition)'
                }}>
                  <div style={{ color: checklist.whatsapp ? 'var(--success)' : 'var(--text-light)', cursor: 'pointer' }} onClick={handleJoinWhatsApp}>
                    {checklist.whatsapp ? <CheckCircle size={22} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--text-light)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)', textDecoration: checklist.whatsapp ? 'line-through' : 'none', opacity: checklist.whatsapp ? 0.7 : 1 }}>3. Join WhatsApp student group</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Join live chat and doubt solving channels with classmates</div>
                  </div>
                  <button 
                    onClick={handleJoinWhatsApp}
                    className={`btn ${checklist.whatsapp ? 'btn-ghost' : 'btn-primary'}`} 
                    style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', height: 'fit-content' }}
                  >
                    {checklist.whatsapp ? <><ShieldCheck size={12} /> Joined Group</> : <><ExternalLink size={12} /> Join WhatsApp</>}
                  </button>
                </div>

                {/* Orientation Call */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px',
                  background: checklist.orientation ? 'rgba(102,187,106,0.06)' : 'white',
                  border: checklist.orientation ? '1.5px solid rgba(102,187,106,0.15)' : '1.5px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.01)', transition: 'var(--transition)'
                }}>
                  <div style={{ color: checklist.orientation ? 'var(--success)' : 'var(--text-light)', cursor: 'pointer' }} onClick={handleScheduleOrientation}>
                    {checklist.orientation ? <CheckCircle size={22} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--text-light)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)', textDecoration: checklist.orientation ? 'line-through' : 'none', opacity: checklist.orientation ? 0.7 : 1 }}>4. Schedule 1-on-1 orientation call</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confirm syllabus, offline bench allocation, or portal questions</div>
                  </div>
                  <button 
                    onClick={handleScheduleOrientation}
                    className={`btn ${checklist.orientation ? 'btn-ghost' : 'btn-primary'}`} 
                    style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', height: 'fit-content' }}
                  >
                    {checklist.orientation ? <><ShieldCheck size={12} /> Scheduled</> : <><Calendar size={12} /> Book Slot</>}
                  </button>
                </div>

              </div>

              {/* Checklist Fully Complete Celebration */}
              <AnimatePresence>
                {checkedCount === 4 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    style={{
                      background: 'linear-gradient(135deg, #11998e, #38ef7d)',
                      color: 'white',
                      padding: '20px',
                      borderRadius: '16px',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      boxShadow: '0 10px 24px rgba(56,239,125,0.2)'
                    }}
                  >
                    <div style={{ fontSize: '2.2rem' }}>🏆</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ color: 'white', fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>All Tasks Completed!</h4>
                      <p style={{ fontSize: '0.82rem', opacity: 0.9 }}>Your workspace is completely active. Let's start coding!</p>
                    </div>
                    <button 
                      onClick={() => navigate('/dashboard/courses')}
                      className="btn" 
                      style={{ background: 'white', color: '#11998e', padding: '10px 18px', fontSize: '0.85rem', borderRadius: '10px' }}
                    >
                      Go to Courses <ChevronRight size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Quick Resources / FAQ Guides */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Profile Card Summary */}
              <motion.div variants={fadeItem} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Profile Sync</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem',
                    }}>{initials}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{displayName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {studentId}</div>
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <strong>Note:</strong> Profile photo upload and class adjustments can be edited dynamically in the profile section.
                </div>
              </motion.div>

              {/* Guides */}
              <motion.div variants={fadeItem} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Quick Guide</h3>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '8px', background: 'rgba(83,109,254,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0
                  }}>
                    <Play size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '2px' }}>How to Join Classes?</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Go to "Course" page, find your active class and click "Continue" to launch the online classroom portal.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '8px', background: 'rgba(102,187,106,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0
                  }}>
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '2px' }}>Ask Doubts 24/7</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Use the floating Chat Assistant in the bottom right corner to clear coding questions immediately.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '8px', background: 'rgba(255,167,38,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', flexShrink: 0
                  }}>
                    <Clock3 size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '2px' }}>Submit Assignments</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Head to "Assignments", view questions, complete coding homeworks and upload files before due dates.</p>
                  </div>
                </div>

              </motion.div>

            </div>
          </div>
        </>
      ) : (
        /* ── ESTABLISHED STUDENT METRICS DASHBOARD ────────── */
        <>
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

            <div className={`grid-profile-meta ${user?.role !== 'student' ? 'grid-profile-meta--4' : ''}`} style={{
              padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '24px'
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
                  className="custom-date-picker"
                />
              </div>
            </div>

            <div className="grid-stats-4">
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

            <div className="grid-progress-row">
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
                  margin: '16px 0 0', padding: '10px', borderRadius: '10px', background: 'rgba(83,109,254,0.04)',
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

          <motion.div variants={fadeItem} className="card card-p" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Personal Notes</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Quick workspace notes and class reference sheets</p>
              </div>
              <button onClick={handleOpenAddNote} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: '10px' }}>
                <Plus size={16} /> Add Note
              </button>
            </div>

            {notes.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)', border: '1px dashed var(--border-strong)', borderRadius: '16px' }}>
                <FileEdit size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.1rem', color: 'var(--dark)', marginBottom: '6px' }}>No notes saved yet</h3>
                <p style={{ fontSize: '0.85rem' }}>Use notes to jot down snippets, tasks, or lesson summaries.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {notes.map(n => (
                  <motion.div
                    key={n.id}
                    onClick={() => handleOpenEditNote(n)}
                    whileHover={{ translateY: -2 }}
                    style={{
                      padding: '20px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'var(--transition)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span className="badge badge-primary" style={{ background: 'var(--white)', color: 'var(--primary)', border: '1.5px solid var(--border-strong)', fontSize: '0.75rem' }}>
                        {n.subject}
                      </span>
                      <button
                        onClick={(e) => handleDeleteNote(e, n.id)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
                        title="Delete note"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px', color: 'var(--dark)' }}>{n.title}</h3>
                    <p style={{
                      color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, flex: 1, whiteSpace: 'pre-wrap',
                      display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {n.content}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ADD / EDIT NOTE MODAL */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title={noteForm.id ? "Edit Note" : "Add Note"}>
        <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-input"
              required
              value={noteForm.title}
              onChange={e => setNoteForm({ ...noteForm, title: e.target.value })}
              placeholder="Note title"
            />
          </div>
          <div>
            <label className="form-label">Subject</label>
            <input
              type="text"
              className="form-input"
              required
              value={noteForm.subject}
              onChange={e => setNoteForm({ ...noteForm, subject: e.target.value })}
              placeholder="e.g. DSA"
            />
          </div>
          <div>
            <label className="form-label">Content</label>
            <textarea
              className="form-input"
              required
              rows={6}
              value={noteForm.content}
              onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
              placeholder="Write your notes here..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsNoteModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </Modal>

      {user?.role === 'admin' && (
        <AdminStudentGrid />
      )}

      {/* Global CSS styles for animations */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(83, 109, 254, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(83, 109, 254, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(83, 109, 254, 0); }
        }
      `}</style>

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default function Overview() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '50vh' }}>
        <div className="spinning" style={{ width: '32px', height: '32px', border: '3px solid rgba(83,109,254,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
      </div>
    );
  }
  
  if (user?.role === 'admin') return <AdminDashboard />;
  
  return <StudentOverview />;
}
