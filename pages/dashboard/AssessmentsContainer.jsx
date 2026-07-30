import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, ClipboardList, Users } from 'lucide-react';
import Assignments from './Assignments';
import Tests from './tests/Tests';
import CollaborativeAssignmentsPage from './CollaborativeAssignmentsPage';

const AssessmentsContainer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(
    activeTabParam === 'tests' ? 'tests' : activeTabParam === 'collaborative' ? 'collaborative' : 'assignments'
  );

  useEffect(() => {
    if (activeTabParam === 'tests' && activeTab !== 'tests') {
      setActiveTab('tests');
    } else if (activeTabParam === 'collaborative' && activeTab !== 'collaborative') {
      setActiveTab('collaborative');
    } else if ((!activeTabParam || activeTabParam === 'assignments') && activeTab !== 'assignments') {
      setActiveTab('assignments');
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
            <ClipboardList size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Assessments & Workspace Hub</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Classroom assignments, real-time group workspaces & subject tests</span>
          </div>
        </div>

        {/* Segmented Control Buttons */}
        <div style={{ display: 'flex', background: 'var(--bg)', padding: '4px', borderRadius: '100px', gap: '4px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleTabChange('assignments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'assignments' ? 'var(--white)' : 'transparent',
              color: activeTab === 'assignments' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === 'assignments' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FileText size={16} /> Individual Assignments
          </button>

          <button
            onClick={() => handleTabChange('collaborative')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'collaborative' ? 'var(--white)' : 'transparent',
              color: activeTab === 'collaborative' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === 'collaborative' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={16} /> Collaborative Workspaces
          </button>

          <button
            onClick={() => handleTabChange('tests')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'tests' ? 'var(--white)' : 'transparent',
              color: activeTab === 'tests' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === 'tests' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <ClipboardList size={16} /> Subject Tests
          </button>
        </div>
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'assignments' && <Assignments />}
        {activeTab === 'collaborative' && <CollaborativeAssignmentsPage />}
        {activeTab === 'tests' && <Tests />}
      </div>
    </div>
  );
};

export default AssessmentsContainer;
