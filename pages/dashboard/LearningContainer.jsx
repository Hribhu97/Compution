import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, TrendingUp } from 'lucide-react';
import Courses from './Courses';
import ClassTracker from './ClassTracker';

const LearningContainer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(
    activeTabParam === 'progress' ? 'progress' : 'courses'
  );

  useEffect(() => {
    if (activeTabParam === 'progress' && activeTab !== 'progress') {
      setActiveTab('progress');
    } else if ((!activeTabParam || activeTabParam === 'courses') && activeTab !== 'courses') {
      setActiveTab('courses');
    }
  }, [activeTabParam]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Segmented Tab Header */}
      <div
        className="card card-p"
        style={{
          background: 'var(--white)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderRadius: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: 'rgba(83, 109, 254, 0.1)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Learning Workspace</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Courses, curriculum & chapter progress tracking</span>
          </div>
        </div>

        {/* Segmented Control Buttons */}
        <div style={{ display: 'flex', background: 'var(--bg)', padding: '4px', borderRadius: '100px', gap: '4px' }}>
          <button
            onClick={() => handleTabChange('courses')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'courses' ? 'var(--white)' : 'transparent',
              color: activeTab === 'courses' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === 'courses' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={16} /> Courses
          </button>

          <button
            onClick={() => handleTabChange('progress')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'progress' ? 'var(--white)' : 'transparent',
              color: activeTab === 'progress' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === 'progress' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <TrendingUp size={16} /> Progress Tracker
          </button>
        </div>
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'courses' && <Courses />}
        {activeTab === 'progress' && <ClassTracker />}
      </div>
    </div>
  );
};

export default LearningContainer;
