import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, ChevronDown, User, BookOpen, GraduationCap, Award, Clock, HelpCircle, ArrowLeft, Mail, Compass } from 'lucide-react';
import LeadCaptureSystem from '../../components/LeadCaptureSystem';
import { useToast } from '../../contexts/ToastContext';

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
                  return (
                    <motion.div
                      layout
                      key={staff.id}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, scale: 0.95 }}
                      custom={idx}
                      className="card animate-card"
                      style={{
                        overflow: 'hidden',
                        background: '#ffffff',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        borderRadius: '28px',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        padding: '0px'
                      }}
                      whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0, 0, 0, 0.08)' }}
                    >
                      <div>
                        {/* Profile Photo band */}
                        <div style={{ position: 'relative', height: '220px', overflow: 'hidden', borderTopLeftRadius: '28px', borderTopRightRadius: '28px' }}>
                          <img
                            src={staff.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300'}
                            alt={staff.name}
                            className="staff-card-img"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
                          />
                          {/* Gradient Overlay */}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to bottom, transparent 40%, #ffffff 100%)'
                          }} />
                          <div style={{
                            position: 'absolute', bottom: 12, right: 12,
                            padding: '4px 10px', borderRadius: '100px',
                            background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(4px)',
                            color: '#1e293b', fontSize: '0.72rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '4px',
                            border: '1px solid rgba(0,0,0,0.06)'
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: staff.availability === 'Available' ? 'var(--success)' : 'var(--warning)' }} />
                            {staff.availability || 'Available'}
                          </div>
                        </div>

                        {/* Roster Details */}
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>{staff.name}</h3>
                              {/* Blue Verified Badge */}
                              <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'inline-block', marginLeft: '6px', flexShrink: 0 }} fill="#3b82f6">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#fff"/>
                              </svg>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                              {staff.role}
                            </div>
                          </div>

                          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.4, margin: 0, height: '38px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={staff.intro}>
                            {staff.intro}
                          </p>

                          {/* Expertise Tags */}
                          {staff.specializations && staff.specializations.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                              {staff.specializations.map((spec, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '4px 10px',
                                    borderRadius: '100px',
                                    fontWeight: 600,
                                    background: 'rgba(0, 0, 0, 0.04)',
                                    color: '#475569',
                                    border: '1px solid rgba(0, 0, 0, 0.06)',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Fast stats row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontSize: '0.85rem', color: '#475569', margin: '4px 0 0', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: '#fbbf24', fontSize: '1rem' }}>★</span>
                              <span>{staff.id === 'seed-biswa' || staff.id === 'seed-hribhu' ? '4.9' : '4.8'}</span>
                            </div>
                            <div style={{ width: '1px', height: '14px', background: 'rgba(0, 0, 0, 0.08)' }} />
                            <div title={staff.qualification} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>
                              {staff.qualification.includes('B.Tech') ? 'B.Tech' : staff.qualification.includes('B.Sc') ? 'B.Sc' : staff.qualification.includes('MCA') ? 'MCA' : 'B.Com'}
                            </div>
                            <div style={{ width: '1px', height: '14px', background: 'rgba(0, 0, 0, 0.08)' }} />
                            <div>
                              {staff.experience}+ Yrs
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Row */}
                      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Buttons Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <a
                            href={`https://wa.me/919674035542?text=Hello,%20I%20would%20like%20to%20get%20in%20touch%20with%20${encodeURIComponent(staff.name)}%20(${encodeURIComponent(staff.role)})%20from%20Compution.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1,
                              height: '46px',
                              borderRadius: '100px',
                              background: '#0f172a',
                              color: '#ffffff',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              transition: 'background-color 0.25s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0f172a'}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* WhatsApp Icon */}
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.082L2 22l5.09-1.33a9.92 9.92 0 004.916 1.306h.005c5.507 0 9.99-4.478 9.99-9.985 0-2.667-1.04-5.176-2.93-7.065A9.913 9.913 0 0012.012 2zm5.72 13.916c-.244.69-1.22 1.35-1.68 1.4-1.25.13-2.78-.45-5.26-1.48a16.27 16.27 0 01-5.18-3.41c-1.34-1.36-2.12-2.9-2.12-4.57 0-1.83 1-2.73 1.37-3.08.31-.3.8-.46 1.29-.46.16 0 .32.01.46.02.42.02.63.05.91.73.28.69.96 2.33 1.04 2.5.08.17.14.37.02.6-.12.23-.18.37-.36.58-.18.21-.38.47-.54.63-.18.18-.37.38-.16.74.21.36.94 1.55 2.01 2.5a10.91 10.91 0 002.92 1.8c.36.18.57.15.79-.1.21-.24.91-1.07 1.16-1.43.25-.36.5-.3.84-.17.34.13 2.16 1.02 2.53 1.21.37.19.62.28.71.44.09.16.09.92-.15 1.61z"/>
                            </svg>
                            Get In Touch
                          </a>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const isSaved = savedStaff[staff.id];
                              setSavedStaff(prev => ({ ...prev, [staff.id]: !isSaved }));
                              showToast(isSaved ? 'Removed from bookmarks' : 'Added bookmark to contacts!', 'success');
                            }}
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              background: 'rgba(0, 0, 0, 0.04)',
                              color: savedStaff[staff.id] ? '#fbbf24' : '#475569',
                              border: '1px solid rgba(0, 0, 0, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s, color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.08)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'}
                            title={savedStaff[staff.id] ? "Saved" : "Save Bookmark"}
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill={savedStaff[staff.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                            </svg>
                          </button>
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
