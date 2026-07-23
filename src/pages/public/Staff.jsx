import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, ChevronDown, User, BookOpen, GraduationCap, Award, Clock, HelpCircle, ArrowLeft, Mail, Compass } from 'lucide-react';
import LeadCaptureSystem from '../../components/LeadCaptureSystem';
import { useToast } from '../../contexts/ToastContext';
import StaffCard from '../../components/StaffCard';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }
  })
};

const SEED_STAFF = [
  {
    id: 'seed-biswa',
    name: 'Biswajit Maity',
    category: 'management',
    role: 'CEO',
    subjects: [],
    qualification: 'B.Tech in Computer Science',
    experience: 14,
    intro: 'Experienced technology leader with over 14 years of industry experience, passionate about software development, technical leadership, and building future-ready education through practical learning.',
    specializations: ['C', 'C++', 'Java', 'Python'],
    availability: 'Available',
    photoURL: '/team/biswajit.jpg'
  },
  {
    id: 'seed-hribhu',
    name: 'Hribhu Tapadar',
    category: 'teaching',
    role: 'Team Lead',
    subjects: ['UX/UI Design', 'Student Psychology', 'AI Prompt Engineering'],
    qualification: 'B.Sc in Computer Science',
    experience: 7,
    intro: 'Focused on creating engaging educational experiences by combining UX design, student psychology, and AI-driven solutions to make learning simple, interactive, and enjoyable.',
    specializations: ['UX/UI Design', 'Student Psychology', 'AI Prompt Engineering'],
    availability: 'Available',
    photoURL: '/team/hribhu.jpg'
  },
  {
    id: 'seed-sharmistha',
    name: 'Sharmistha Ghosh',
    category: 'teaching',
    role: 'Tally Expert',
    subjects: ['Basic Computer', 'Tally', 'Advanced Excel', 'GST', 'TDS'],
    qualification: 'B.Com (Hons.) in Accountancy',
    experience: 5,
    intro: 'Specializes in practical accounting education with expertise in Tally, taxation, Excel, GST, and TDS, helping students build job-ready accounting skills.',
    specializations: ['Basic Computer', 'Tally', 'Advanced Excel', 'GST', 'TDS'],
    availability: 'Available',
    photoURL: '/team/sharmistha.jpeg'
  },
  {
    id: 'seed-piyali',
    name: 'Piyali Das',
    category: 'management',
    role: 'Back Office Coordinator',
    subjects: [],
    qualification: 'B.Com',
    experience: 3,
    intro: 'Ensures smooth day-to-day academic operations by coordinating schedules, fee management, student support, and administrative workflows.',
    specializations: ['Accounting', 'Class Scheduling', 'Class Management', 'Fees Management'],
    availability: 'Available',
    photoURL: '/team/piyali.jpg'
  },
  {
    id: 'seed-support-ram',
    name: 'Rajdeep Mistry',
    category: 'support',
    role: 'Back Office Coordinator',
    qualification: 'B.Com',
    experience: 5,
    intro: 'Coordinates institutional operations, event execution, and student management while ensuring smooth communication across departments.',
    specializations: ['Liaisoning', 'Class Management', 'Event Handling', 'Event Management'],
    availability: 'Available',
    photoURL: '/team/rajdeep.jpg'
  },
  {
    id: 'seed-sreeparna',
    name: 'Sreeparna Panja',
    category: 'support',
    role: 'Backend Developer',
    subjects: [],
    qualification: 'B.Tech in Computer Science',
    experience: 3,
    intro: 'Passionate backend developer focused on scalable application architecture, Java development, secure databases, and reliable server-side systems.',
    specializations: ['Backend Development', 'Java Development', 'Database Management'],
    availability: 'Available',
    photoURL: '/team/sreeparna.jpeg'
  },
  {
    id: 'seed-rupam',
    name: 'Rupam Das',
    category: 'teaching',
    role: 'Programming Mentor',
    subjects: ['Programming Languages', 'Problem Solving', 'Coding Fundamentals'],
    qualification: 'Master of Computer Applications (MCA)',
    experience: 2,
    intro: 'Dedicated programming mentor helping students strengthen coding fundamentals, logical thinking, and confidence across multiple programming languages.',
    specializations: ['Programming Languages', 'Problem Solving', 'Coding Fundamentals'],
    availability: 'Available',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300'
  }
];

const Staff = () => {
  const { showToast } = useToast();
  const [dbStaff, setDbStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'teaching' | 'management' | 'support'
  const [savedStaff, setSavedStaff] = useState({});

  useEffect(() => {
    if (!db) {
      console.error("Staff: Firestore not initialized");
      setLoading(false);
      return;
    }

    let unsub = () => {};
    try {
      unsub = onSnapshot(collection(db, 'staff'), (snap) => {
        const data = [];
        snap.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setDbStaff(data);
        setLoading(false);
      }, (error) => {
        console.error("Error loading staff from Firestore:", error);
        setLoading(false);
      });
    } catch (err) {
      console.error("Staff: staff listener creation failed", err);
      setLoading(false);
    }
    return () => unsub();
  }, []);

  const mergedStaff = dbStaff.length > 0 ? dbStaff : SEED_STAFF;

  const filteredStaff = mergedStaff.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.role.toLowerCase().includes(search.toLowerCase()) ||
      (item.subjects && item.subjects.some(sub => sub.toLowerCase().includes(search.toLowerCase()))) ||
      (item.specializations && item.specializations.some(spec => spec.toLowerCase().includes(search.toLowerCase())));
    const matchesCategory = filter === 'all' || item.category === filter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', padding: '40px 0 80px', color: '#1e293b' }}>
        
        {/* Header navigation bar */}
        <div className="container" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'rgba(30,41,59,0.6)', fontWeight: 600, fontSize: '0.95rem', transition: 'color 0.25s' }} onMouseEnter={e => e.currentTarget.style.color = '#1e293b'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(30,41,59,0.6)'}>
              <ArrowLeft size={18} /> Back to Home
            </Link>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.04em', color: '#1e293b' }}>
              COMP<span style={{ color: 'var(--primary)' }}>UTION</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="container" style={{ textAlign: 'center', marginBottom: '56px' }}>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="badge badge-primary" style={{ marginBottom: '16px' }}>Academic Roster</span>
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '16px', color: '#0f172a' }}>Meet Our Team</h1>
            <p style={{ color: '#475569', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              The mentors, coordinators, and administrators building Kolkata&apos;s premier Computer Science experience.
            </p>
          </motion.div>
        </div>

        {/* Filters and Search Bar */}
        <div className="container" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* Category Chips */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All Staff' },
                { key: 'teaching', label: 'Faculty & Mentors' },
                { key: 'management', label: 'Management' },
                { key: 'support', label: 'Support Operations' }
              ].map(chip => (
                <button
                  key={chip.key}
                  onClick={() => { setFilter(chip.key); }}
                  className={`chip ${filter === chip.key ? 'active' : ''}`}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '100px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: filter === chip.key ? 'var(--primary)' : 'rgba(0,0,0,0.04)',
                    color: filter === chip.key ? '#ffffff' : '#475569',
                    border: filter === chip.key ? '1px solid var(--primary)' : '1px solid rgba(0,0,0,0.06)',
                    boxShadow: 'none'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.4)' }} />
              <input
                placeholder="Search staff, roles, subjects..."
                value={search}
                onChange={e => { setSearch(e.target.value); }}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 46px',
                  borderRadius: '100px',
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  background: 'rgba(0,0,0,0.03)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  color: '#1e293b',
                  boxShadow: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.background = 'rgba(0,0,0,0.05)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(0,0,0,0.08)';
                  e.target.style.background = 'rgba(0,0,0,0.03)';
                }}
              />
            </div>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="container">
          <style>{`
            .staff-grid {
              display: grid;
              gap: 32px;
              grid-template-columns: repeat(3, 1fr);
            }
            @media (max-width: 1024px) {
              .staff-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            @media (max-width: 640px) {
              .staff-grid {
                grid-template-columns: 1fr;
              }
            }
            .animate-card:hover .staff-card-img {
              transform: scale(1.04) !important;
            }
          `}</style>
          {loading ? (
            <div className="staff-grid">
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '320px', background: 'var(--white)', borderRadius: '24px', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="card card-p" style={{ textAlign: 'center', padding: '64px 32px', border: '1px dashed var(--border-strong)', background: 'var(--white)' }}>
              <HelpCircle size={48} style={{ margin: '0 auto 16px', color: 'var(--text-light)', opacity: 0.7 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No staff found</h3>
              <p style={{ color: 'var(--text-muted)' }}>Try resetting filters or searching with a different term.</p>
            </div>
          ) : (
            <motion.div layout className="staff-grid">
              <AnimatePresence mode="popLayout">
                {filteredStaff.map((staff, idx) => {
                  const isSaved = !!savedStaff[staff.id];
                  return (
                    <motion.div
                      layout
                      key={staff.id}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, scale: 0.95 }}
                      custom={idx}
                      style={{ height: '100%' }}
                    >
                      <StaffCard
                        staff={staff}
                        isAdmin={false}
                        isBookmarked={isSaved}
                        onBookmark={() => {
                          setSavedStaff(prev => ({ ...prev, [staff.id]: !isSaved }));
                          showToast(isSaved ? 'Removed from bookmarks' : 'Added bookmark to contacts!', 'success');
                        }}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
        <LeadCaptureSystem />
      </div>
    );
};

export default Staff;
