import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, ChevronDown, User, BookOpen, GraduationCap, Award, Clock, HelpCircle, ArrowLeft, Mail, Compass } from 'lucide-react';
import LeadCaptureSystem from '../../components/LeadCaptureSystem';

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
    role: 'Owner',
    subjects: [],
    qualification: 'B.Sc in Psychology & Counseling',
    experience: 5,
    intro: 'Your point of contact for onboarding assistance, doubt alignment, and administrative resolutions. Helping students navigate their learning journey stress-free.',
    specializations: ['Student Onboarding', 'Conflict Resolution', 'Parent Consultations'],
    availability: 'Available',
    photoURL: '/team/biswajit.jpg'
  },
  {
    id: 'seed-hribhu',
    name: 'Hribhu Tapadar',
    category: 'teaching',
    role: 'TeamLead',
    subjects: ['Data Structures & Algorithms', 'C & C++', 'Java Development'],
    qualification: 'B.Tech in CSE, Senior Engineer',
    experience: 6,
    intro: 'Helping students bridge the gap between classroom theory and industry requirements. Specializing in advanced algorithms, memory management, and competitive programming.',
    specializations: ['Algorithm Analysis', 'System Design', 'Web Architecture'],
    availability: 'Available',
    photoURL: '/team/hribhu.jpg'
  },
  {
    id: 'seed-sharmistha',
    name: 'Sharmistha Ghosh',
    category: 'teaching',
    role: 'Tally exp',
    subjects: ['Python Mastery', 'Basic Computer', 'Class XI/XII CS'],
    qualification: 'M.Tech in Computer Science',
    experience: 8,
    intro: 'Passionate about coding education and structural logic. I focus on making fundamental programming concepts easy and intuitive for school and college learners.',
    specializations: ['Python Syntax', 'Logic Building', 'File Handling'],
    availability: 'Available',
    photoURL: '/team/sharmistha.jpeg'
  },
  {
    id: 'seed-piyali',
    name: 'Piyali Das',
    category: 'management',
    role: 'Back office coordinator',
    subjects: [],
    qualification: 'MBA in Operations Management',
    experience: 7,
    intro: 'Overseeing daily institute activities and coordinating schedules. Dedicated to ensuring a seamless and distraction-free learning ecosystem for all students.',
    specializations: ['Resource Allocation', 'Batch Coordination', 'Student Care'],
    availability: 'Available',
    photoURL: '/team/piyali.jpg'
  },
  {
    id: 'seed-support-ram',
    name: 'Rajdeep Mistry',
    category: 'support',
    role: 'Back office coordinator',
    subjects: [],
    qualification: 'Graduate in Commerce',
    experience: 4,
    intro: 'Managing computer laboratory maintenance, offline seat planning, and technical hardware troubleshooting so that classes face zero downtime.',
    specializations: ['Lab Systems Setup', 'Network Troubleshooting', 'Hardware Care'],
    availability: 'Available',
    photoURL: '/team/rajdeep.jpg'
  }
];

const Staff = () => {
  const [dbStaff, setDbStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'teaching' | 'management' | 'support'
  const [expandedId, setExpandedId] = useState(null);

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
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '40px 0 80px' }}>
        
        {/* Header navigation bar */}
        <div className="container" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.95rem', transition: 'var(--transition)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--dark)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <ArrowLeft size={18} /> Back to Home
            </Link>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.04em', color: 'var(--dark)' }}>
              COMP<span style={{ color: 'var(--primary)' }}>UTION</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="container" style={{ textAlign: 'center', marginBottom: '56px' }}>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="badge badge-primary" style={{ marginBottom: '16px' }}>Academic Roster</span>
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '16px' }}>Meet Our Team</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
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
                  onClick={() => { setFilter(chip.key); setExpandedId(null); }}
                  className={`chip ${filter === chip.key ? 'active' : ''}`}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '100px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: filter === chip.key ? 'var(--primary)' : 'var(--white)',
                    color: filter === chip.key ? 'var(--white)' : 'var(--text-main)',
                    border: '1px solid rgba(83,109,254,0.15)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                placeholder="Search staff, roles, subjects..."
                value={search}
                onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 46px',
                  borderRadius: '100px',
                  border: '1.5px solid rgba(83,109,254,0.2)',
                  background: 'var(--white)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  color: 'var(--dark)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'rgba(83,109,254,0.2)'}
              />
            </div>
          </div>
        </div>

        {/* Staff Grid */}
        <div className="container">
          {loading ? (
            <div className="grid-auto-cards" style={{ gap: '28px' }}>
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
            <motion.div layout className="grid-auto-cards" style={{ gap: '32px' }}>
              <AnimatePresence mode="popLayout">
                {filteredStaff.map((staff, idx) => {
                  const isExpanded = expandedId === staff.id;
                  return (
                    <motion.div
                      layout
                      key={staff.id}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, scale: 0.95 }}
                      custom={idx}
                      className="card"
                      onClick={() => setExpandedId(isExpanded ? null : staff.id)}
                      style={{
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'var(--white)',
                        border: isExpanded ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                        borderRadius: '24px',
                        boxShadow: isExpanded ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'border-color 0.25s, box-shadow 0.25s'
                      }}
                      whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
                    >
                      <div>
                        {/* Profile Photo band */}
                        <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                          <img
                            src={staff.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300'}
                            alt={staff.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute', bottom: 12, right: 12,
                            padding: '4px 10px', borderRadius: '100px',
                            background: 'rgba(34, 37, 43, 0.85)', backdropFilter: 'blur(4px)',
                            color: 'var(--text-on-primary)', fontSize: '0.72rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: staff.availability === 'Available' ? 'var(--success)' : 'var(--warning)' }} />
                            {staff.availability || 'Available'}
                          </div>
                        </div>

                        {/* Roster Details */}
                        <div className="card-p" style={{ padding: '24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark)' }}>{staff.name}</h3>
                          </div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '14px', textTransform: 'capitalize' }}>
                            {staff.role}
                          </div>

                          <div className="divider" style={{ marginBottom: '16px' }} />

                          {/* Fast stats row */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <GraduationCap size={15} style={{ color: 'var(--text-light)' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={staff.qualification}>{staff.qualification.split(',')[0]}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={15} style={{ color: 'var(--text-light)' }} />
                              <span>{staff.experience} years exp</span>
                            </div>
                          </div>

                          {/* Subjects taught (Teaching staff only) */}
                          {staff.category === 'teaching' && staff.subjects && staff.subjects.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
                              {staff.subjects.slice(0, 3).map((sub, i) => (
                                <span key={i} className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>{sub}</span>
                              ))}
                            </div>
                          )}

                          {/* Expanded Info */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                style={{ overflow: 'hidden', marginTop: '16px' }}
                              >
                                <div className="divider" style={{ marginBottom: '16px' }} />
                                <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '16px' }}>
                                  {staff.intro}
                                </p>
                                
                                {staff.specializations && staff.specializations.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.05em', marginBottom: '8px' }}>Specializations</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {staff.specializations.map((spec, i) => (
                                        <span key={i} style={{ fontSize: '0.72rem', background: 'var(--surface)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>{spec}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Expand CTA footer */}
                      <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', transition: 'transform 0.2s' }} className="expand-trigger">
                          {isExpanded ? 'Show less ▲' : 'Read Bio ▼'}
                        </div>
                      </div>
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
