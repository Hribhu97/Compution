import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  ClipboardList, Clock, Award, CheckCircle2, AlertCircle, 
  Play, Plus, Search, Filter, HelpCircle, Check, ArrowRight
} from 'lucide-react';
import Modal from '../../../components/Modal';

const SAMPLE_TESTS = [
  {
    id: 'test-python-1',
    title: 'Python Fundamentals & Logic Quiz',
    subject: 'Python Mastery',
    color: '#4F46E5',
    category: 'Chapter Quizzes',
    totalQuestions: 20,
    timeLimitMins: 30,
    totalPoints: 50,
    status: 'Available',
    dueDate: 'July 30, 2026',
    attemptsAllowed: 2,
    attemptsCount: 0
  },
  {
    id: 'test-c-pointers',
    title: 'C/C++ Pointers & Memory Management',
    subject: 'Basic Coding',
    color: '#10B981',
    category: 'Subject Tests',
    totalQuestions: 15,
    timeLimitMins: 25,
    totalPoints: 40,
    status: 'Available',
    dueDate: 'August 5, 2026',
    attemptsAllowed: 3,
    attemptsCount: 1,
    lastScore: '36/40'
  },
  {
    id: 'test-dsa-trees',
    title: 'DSA: Binary Search Trees & Heap Arrays',
    subject: 'Data Structures',
    color: '#EC4899',
    category: 'Subject Tests',
    totalQuestions: 10,
    timeLimitMins: 20,
    totalPoints: 30,
    status: 'Upcoming',
    dueDate: 'August 12, 2026',
    attemptsAllowed: 1,
    attemptsCount: 0
  },
  {
    id: 'test-ai-prompting',
    title: 'Basic+AI System Prompting Evaluation',
    subject: 'AI & Tools',
    color: '#8B5CF6',
    category: 'Chapter Quizzes',
    totalQuestions: 12,
    timeLimitMins: 15,
    totalPoints: 25,
    status: 'Completed',
    dueDate: 'July 20, 2026',
    attemptsAllowed: 1,
    attemptsCount: 1,
    lastScore: '24/25'
  },
  {
    id: 'test-tally-gst',
    title: 'Tally Prime Ledger & GST Accounting Test',
    subject: 'Tally Expert',
    color: '#06B6D4',
    category: 'Subject Tests',
    totalQuestions: 20,
    timeLimitMins: 30,
    totalPoints: 50,
    status: 'Available',
    dueDate: 'August 2, 2026',
    attemptsAllowed: 2,
    attemptsCount: 0
  },
  {
    id: 'test-school-cs',
    title: 'Class X Computer Application Mid-Term Exam',
    subject: 'School Syllabus',
    color: '#F59E0B',
    category: 'Subject Tests',
    totalQuestions: 25,
    timeLimitMins: 45,
    totalPoints: 60,
    status: 'Available',
    dueDate: 'August 15, 2026',
    attemptsAllowed: 1,
    attemptsCount: 0
  }
];

const Tests = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState(SAMPLE_TESTS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTest, setActiveTest] = useState(null);

  // Firestore Sync
  useEffect(() => {
    try {
      const q = query(collection(db, 'tests'), orderBy('dueDate', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTests(list);
        }
      }, (err) => {
        console.warn("Firestore tests subscription fallback:", err);
      });
      return () => unsub();
    } catch (err) {
      console.warn("Error setting up tests snapshot listener:", err);
    }
  }, []);

  const categories = ['All', 'Subject Tests', 'Chapter Quizzes', 'Completed'];

  const filteredTests = tests.filter(test => {
    const matchesCategory = selectedCategory === 'All' || 
                            (selectedCategory === 'Completed' ? test.status === 'Completed' : test.category === selectedCategory);
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          test.subject.toLowerCase().includes(searchQuery.toLowerCase());
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
            placeholder="Search tests..."
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

      {/* Tests Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: '18px',
        width: '100%'
      }}>
        {filteredTests.map(test => {
          const isCompleted = test.status === 'Completed';
          return (
            <motion.div
              key={test.id}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: test.color || 'var(--primary)',
                    letterSpacing: '0.05em',
                    background: 'rgba(83, 109, 254, 0.08)',
                    padding: '4px 10px',
                    borderRadius: '100px'
                  }}>
                    {test.subject}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '100px',
                    background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: isCompleted ? 'var(--success)' : 'var(--warning)'
                  }}>
                    {test.status}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--dark)' }}>
                  {test.title}
                </h3>

                {/* Details Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HelpCircle size={14} /> {test.totalQuestions} Questions
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> {test.timeLimitMins} Mins
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={14} /> {test.totalPoints} Points
                  </span>
                </div>

                {test.lastScore && (
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 12px', borderRadius: '8px', marginBottom: '8px' }}>
                    Previous Score: {test.lastScore}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => setActiveTest(test)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '100px',
                  border: 'none',
                  background: isCompleted ? 'var(--bg)' : `linear-gradient(135deg, ${test.color || 'var(--primary)'}, var(--dark))`,
                  color: isCompleted ? 'var(--text-main)' : '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                {isCompleted ? <CheckCircle2 size={16} color="var(--success)" /> : <Play size={14} fill="#ffffff" />}
                {isCompleted ? 'Review Test Results' : 'Start Subject Test'}
                <ArrowRight size={14} />
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Test Launcher Modal */}
      {activeTest && (
        <Modal isOpen={!!activeTest} onClose={() => setActiveTest(null)} title={activeTest.title}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px' }}>
            <div style={{ background: 'rgba(83, 109, 254, 0.08)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 900, color: 'var(--primary)' }}>Test Instructions</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li>Time Limit: {activeTest.timeLimitMins} minutes.</li>
                <li>Questions: {activeTest.totalQuestions} multiple choice questions.</li>
                <li>Do not refresh or close the browser during test execution.</li>
              </ul>
            </div>
            <button
              onClick={() => {
                alert(`Starting test: ${activeTest.title}`);
                setActiveTest(null);
              }}
              className="btn btn-primary"
              style={{ padding: '12px 24px', borderRadius: '100px', width: '100%', justifyContent: 'center' }}
            >
              Begin Test Now
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Tests;
