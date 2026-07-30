import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  BookOpen, Clock, Users, ChevronRight, Play, CheckCircle2, 
  Lock, Plus, Search, Filter, Sparkles, Award, Star, BookMarked
} from 'lucide-react';
import Modal from '../../components/Modal';

const COURSE_CATALOG = [
  {
    id: 'python-mastery',
    title: 'Python Mastery',
    category: 'Programming',
    color: '#4F46E5',
    emoji: '🐍',
    description: 'Master core Python programming from basic syntax, data structures, and functions to OOP and automation.',
    nextLesson: 'Lesson 1: Python Basics & Environment Setup',
    totalLessons: 24,
    completedLessons: 6,
    duration: '3 Months',
    schedule: 'Mon, Wed · 5 PM',
    instructor: 'Biswajit Maity & Team',
    enrolledCount: 142
  },
  {
    id: 'basic-coding',
    title: 'Basic Coding (C, C++, Java, Python)',
    category: 'Programming',
    color: '#10B981',
    emoji: '💻',
    description: 'Foundational programming principles, logic building, algorithms, and multi-language syntax exposure.',
    nextLesson: 'Lesson 4: Conditionals & Loops in C/C++',
    totalLessons: 24,
    completedLessons: 12,
    duration: '6 Months',
    schedule: 'Mon, Wed · 5 PM',
    instructor: 'Biswajit Maity',
    enrolledCount: 188
  },
  {
    id: 'advance-coding',
    title: 'Advance Coding & Code Architecture',
    category: 'Programming',
    color: '#F59E0B',
    emoji: '🚀',
    description: 'Advanced OOP, software design patterns, memory management, and production-grade software development.',
    nextLesson: 'Lesson 8: Object-Oriented Design Patterns',
    totalLessons: 30,
    completedLessons: 4,
    duration: '6 Months – 1 Year',
    schedule: 'Tue, Thu · 7 PM',
    instructor: 'Biswajit Maity',
    enrolledCount: 95
  },
  {
    id: 'dsa',
    title: 'Data Structures & Algorithms',
    category: 'Programming',
    color: '#EC4899',
    emoji: '🧩',
    description: 'Arrays, Linked Lists, Trees, Graphs, Sorting, Searching, and Dynamic Programming problem solving.',
    nextLesson: 'Lesson 12: Binary Search Trees & Heaps',
    totalLessons: 28,
    completedLessons: 2,
    duration: '6 Months',
    schedule: 'Tue, Thu · 6 PM',
    instructor: 'Hribhu Tapadar',
    enrolledCount: 110
  },
  {
    id: 'basic-ai',
    title: 'Basic + AI (Prompt Engineering)',
    category: 'AI & Tools',
    color: '#8B5CF6',
    emoji: '🤖',
    description: 'Generative AI tools, LLM prompting techniques, automated workflows, and practical AI productivity.',
    nextLesson: 'Lesson 3: Advanced System Prompting Strategies',
    totalLessons: 16,
    completedLessons: 5,
    duration: '8 Months',
    schedule: 'Mon, Wed · 4 PM',
    instructor: 'Hribhu Tapadar',
    enrolledCount: 165
  },
  {
    id: 'tally-expert',
    title: 'Tally & Accounting Expert',
    category: 'Accounting',
    color: '#06B6D4',
    emoji: '📊',
    description: 'Practical business accounting, Tally Prime, GST filing, TDS compliance, and financial reporting.',
    nextLesson: 'Lesson 5: Ledger Entries & GST Computations',
    totalLessons: 20,
    completedLessons: 8,
    duration: '6 Months',
    schedule: 'Tue, Fri · 4 PM',
    instructor: 'Sharmistha Ghosh',
    enrolledCount: 130
  },
  {
    id: 'school-2-5',
    title: 'School Syllabus (Classes 2 to 5)',
    category: 'Academic',
    color: '#FF7043',
    emoji: '🎒',
    description: 'Computer fundamentals, typing, MS Office basics, Scratch block coding, and digital literacy.',
    nextLesson: 'Lesson 2: Intro to Computers & Keyboard Mastery',
    totalLessons: 12,
    completedLessons: 3,
    duration: 'As per class',
    schedule: 'Mon, Thu · 3 PM',
    instructor: 'Piyali & Team',
    enrolledCount: 84
  },
  {
    id: 'school-6-10',
    title: 'School Syllabus (Classes 6 to 10)',
    category: 'Academic',
    color: '#FFA726',
    emoji: '🏫',
    description: 'School board curriculum, flowchart design, Python/Java basics, HTML/CSS web design, and practical lab.',
    nextLesson: 'Lesson 6: HTML & CSS Web Page Creation',
    totalLessons: 20,
    completedLessons: 10,
    duration: 'As per class',
    schedule: 'Tue, Fri · 3 PM',
    instructor: 'Rajdeep & Team',
    enrolledCount: 175
  },
  {
    id: 'class-11-12-cs',
    title: 'Class XI & XII Computer Science / Application',
    category: 'Academic',
    color: '#3B82F6',
    emoji: '📘',
    description: 'WBCHSE / CBSE / ICSE computer board examination preparation, Python/SQL syllabus, and project work.',
    nextLesson: 'Lesson 9: SQL Queries & Relational Databases',
    totalLessons: 22,
    completedLessons: 7,
    duration: '1-2 Years',
    schedule: 'Mon–Sat · 3 PM',
    instructor: 'Biswajit Maity',
    enrolledCount: 210
  }
];

const Courses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState(COURSE_CATALOG);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Firestore Sync
  useEffect(() => {
    try {
      const q = query(collection(db, 'courses'), orderBy('title', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCourses(list);
        }
      }, (err) => {
        console.warn("Firestore courses subscription fallback to catalog:", err);
      });
      return () => unsub();
    } catch (err) {
      console.warn("Error setting up courses snapshot listener:", err);
    }
  }, []);

  const categories = ['All', 'Academic', 'Programming', 'AI & Tools', 'Accounting'];

  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Filter Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--white)',
        padding: '12px 16px',
        borderRadius: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: selectedCategory === cat ? 'var(--primary)' : 'var(--bg)',
                color: selectedCategory === cat ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
                minHeight: '36px'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '100px',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
              outline: 'none',
              background: 'var(--bg)',
              color: 'var(--text-main)',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Course Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: '18px',
        width: '100%'
      }}>
        {filteredCourses.map(course => {
          const progressPct = course.totalLessons ? Math.round(((course.completedLessons || 0) / course.totalLessons) * 100) : 0;
          return (
            <motion.div
              key={course.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'var(--white)',
                borderRadius: '20px',
                padding: '20px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div>
                {/* Course Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{course.emoji || '📘'}</span>
                    <div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: course.color || 'var(--primary)',
                        letterSpacing: '0.05em'
                      }}>
                        {course.category}
                      </span>
                      <h3 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--dark)' }}>
                        {course.title}
                      </h3>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                  {course.description}
                </p>

                {/* Progress Bar */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>
                    <span>Progress</span>
                    <span>{progressPct}% ({course.completedLessons || 0}/{course.totalLessons || 0} Lessons)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', borderRadius: '100px', background: 'var(--bg)', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: '100px', background: course.color || 'var(--primary)', transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Info Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg)', padding: '4px 8px', borderRadius: '6px' }}>
                    <Clock size={12} /> {course.schedule}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg)', padding: '4px 8px', borderRadius: '6px' }}>
                    <Users size={12} /> {course.enrolledCount || 100}+ Enrolled
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSelectedCourse(course)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '100px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${course.color || 'var(--primary)'}, var(--dark))`,
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  minHeight: '44px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <Play size={14} fill="#ffffff" /> Continue Course <ChevronRight size={14} />
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <Modal isOpen={!!selectedCourse} onClose={() => setSelectedCourse(null)} title={selectedCourse.title}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '2.4rem' }}>{selectedCourse.emoji}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>{selectedCourse.title}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>Instructor: {selectedCourse.instructor}</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              {selectedCourse.description}
            </p>
            <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--dark)' }}>Current Chapter Module:</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>{selectedCourse.nextLesson}</div>
            </div>
            <button
              onClick={() => setSelectedCourse(null)}
              className="btn btn-primary"
              style={{ padding: '12px 24px', borderRadius: '100px', width: '100%', justifyContent: 'center', marginTop: '8px' }}
            >
              Start Interactive Lesson
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Courses;
