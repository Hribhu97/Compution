import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, ChevronRight, ChevronLeft, X, Check } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const GuidedTour = ({ userId, role, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);

  // 1. Define steps for each role
  const stepsByRole = {
    student: [
      {
        target: 'body',
        title: 'Welcome to Compution! 👋',
        content: 'Let\'s take a quick 1-minute tour of your new academic workspace to get you started.',
        placement: 'center'
      },
      {
        target: '#tour-dashboard',
        title: 'Academic Overview 📊',
        content: 'Check your overall attendance rate, enrolled course progress, mock test averages, and weekly schedule here.',
        placement: 'bottom'
      },
      {
        target: '#tour-nav-courses',
        title: 'My Courses 📚',
        content: 'Browse all your enrolled subjects, view assigned lessons, schedules, and read study notes.',
        placement: 'right'
      },
      {
        target: '#tour-nav-attendance',
        title: 'Attendance Logs 📅',
        content: 'Keep track of your present and absent marks to maintain a healthy academic standing.',
        placement: 'right'
      },
      {
        target: '#tour-nav-tests',
        title: 'Test Center ✍️',
        content: 'Take mock tests, view detailed answer papers, and check your rank on the test leaderboard.',
        placement: 'right'
      },
      {
        target: '#tour-nav-minigames',
        title: 'Daily Arcade Games 🎮',
        content: 'Play CS & Google-themed daily mini-games, earn points, gain XP, and climb the global leaderboards.',
        placement: 'right'
      },
      {
        target: '#tour-nav-schedule',
        title: 'Class Timetable 🕒',
        content: 'Review your upcoming classes, Venues, timings, and join online Google Meet classes directly.',
        placement: 'right'
      },
      {
        target: '#tour-nav-community',
        title: 'Peer Discussion 💬',
        content: 'Share code issues, clear doubts, and collaborate with peers and faculty mentors.',
        placement: 'right'
      },
      {
        target: '#tour-notifications',
        title: 'Live Notifications 🔔',
        content: 'Check this bell for direct alerts regarding newly scheduled extra classes, assignments, and announcements.',
        placement: 'bottom'
      },
      {
        target: 'body',
        title: 'Ready to learn! 🚀',
        content: 'That\'s it! Go ahead and level up your skills. Remember, you can restart this tour anytime from your Edit Profile page.',
        placement: 'center'
      }
    ],
    faculty: [
      {
        target: 'body',
        title: 'Welcome Faculty Mentor! 🎓',
        content: 'Let\'s walk through the core features of your teaching and roster control panel.',
        placement: 'center'
      },
      {
        target: '#tour-faculty-roster',
        title: 'Assigned Students 👥',
        content: 'Review your student roster, check who has complete profiles, and view their subject performance.',
        placement: 'bottom'
      },
      {
        target: '#tour-faculty-attendance',
        title: 'Mark Attendance ✅',
        content: 'Log and edit class attendance records for your students quickly.',
        placement: 'bottom'
      },
      {
        target: '#tour-faculty-reports',
        title: 'Academic Reports 📈',
        content: 'View mock test submissions, scores, and class progress charts.',
        placement: 'bottom'
      },
      {
        target: '#tour-nav-community',
        title: 'Doubt Solver 💬',
        content: 'Access community doubt threads to answer questions and review student code.',
        placement: 'right'
      },
      {
        target: '#tour-nav-schedule',
        title: 'Schedule Manager 📅',
        content: 'Create class schedules, extra session alerts, and manage meeting links.',
        placement: 'right'
      },
      {
        target: '#tour-notifications',
        title: 'Faculty Notifications 🔔',
        content: 'Receive system alerts and updates from the administration.',
        placement: 'bottom'
      }
    ],
    admin: [
      {
        target: 'body',
        title: 'Welcome Administrator! 👑',
        content: 'Let\'s take a tour of your institutional command center.',
        placement: 'center'
      },
      {
        target: '#tour-admin-students',
        title: 'Manage Students 👥',
        content: 'View student list, register new profiles, edit course assignments, and verify active groups.',
        placement: 'bottom'
      },
      {
        target: '#tour-admin-faculty',
        title: 'Manage Faculty 🎓',
        content: 'Register and assign subject roles to faculty mentors, and review rosters.',
        placement: 'bottom'
      },
      {
        target: '#tour-admin-payments',
        title: 'Payments & Fees 💳',
        content: 'Track institution billing, record student fee payments, and view transactional analytics.',
        placement: 'bottom'
      },
      {
        target: '#tour-admin-courses',
        title: 'Course Catalog 📚',
        content: 'Create and edit course packages, assign mentors, and schedule semesters.',
        placement: 'bottom'
      },
      {
        target: '#tour-admin-tests',
        title: 'Test Composer ✍️',
        content: 'Publish syllabus tests, write custom question arrays, edit marks, and publish grades.',
        placement: 'bottom'
      },
      {
        target: '#tour-admin-analytics',
        title: 'Institutional Analytics 📊',
        content: 'Check active student growth, monthly collection values, and class schedules.',
        placement: 'bottom'
      },
      {
        target: '#tour-admin-doctor',
        title: 'System Doctor Diagnostics 🔧',
        content: 'Run database scans to automatically repair orphaned records, corrupt maps, and billing mismatches.',
        placement: 'bottom'
      }
    ]
  };

  const activeRole = stepsByRole[role?.toLowerCase()] ? role.toLowerCase() : 'student';
  const steps = stepsByRole[activeRole];

  // 2. Resume tour from Session Storage
  useEffect(() => {
    const savedStep = sessionStorage.getItem(`compution_tour_step_${userId}`);
    if (savedStep !== null) {
      const stepIdx = parseInt(savedStep);
      if (stepIdx >= 0 && stepIdx < steps.length) {
        setCurrentStep(stepIdx);
      }
    }
    setIsVisible(true);
  }, [userId, steps.length]);

  // 3. Track current step and calculate target bounding rect
  useEffect(() => {
    if (!isVisible) return;
    
    // Save current step to session storage for navigation recovery
    sessionStorage.setItem(`compution_tour_step_${userId}`, String(currentStep));

    const findTarget = () => {
      const step = steps[currentStep];
      if (!step || step.target === 'body') {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(step.target);
      if (element) {
        // Scroll element into view smoothly if not visible
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Add active beacon class to target
        element.classList.add('tour-highlighted-element');
        
        // Retrieve bounding rect
        const rect = element.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      } else {
        // Element not rendered on current view; fallback to center modal
        setTargetRect(null);
      }
    };

    // Clean up previous highlights
    steps.forEach(s => {
      if (s.target !== 'body') {
        const el = document.querySelector(s.target);
        if (el) el.classList.remove('tour-highlighted-element');
      }
    });

    // Run positioning logic immediately and on resize
    findTarget();
    window.addEventListener('resize', findTarget);
    
    // Re-check periodically in case layout shifted
    timerRef.current = setInterval(findTarget, 1000);

    return () => {
      window.removeEventListener('resize', findTarget);
      clearInterval(timerRef.current);
      steps.forEach(s => {
        if (s.target !== 'body') {
          const el = document.querySelector(s.target);
          if (el) el.classList.remove('tour-highlighted-element');
        }
      });
    };
  }, [currentStep, isVisible, steps, userId]);

  // 4. Save Tour Completed to Firestore
  const handleFinishTour = async () => {
    setIsVisible(false);
    sessionStorage.removeItem(`compution_tour_step_${userId}`);
    try {
      await setDoc(doc(db, 'userPreferences', userId), { tourCompleted: true }, { merge: true });
      if (onComplete) onComplete();
    } catch (err) {
      console.error("Failed saving tour preference:", err);
      if (onComplete) onComplete();
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinishTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const isCenter = !targetRect || currentStepData.placement === 'center';

  // Calculate Tooltip position based on targetRect
  let tooltipStyle = {
    position: 'fixed',
    zIndex: 999999,
    width: '320px',
    background: 'var(--surface-elevated)',
    border: '1.5px solid var(--border)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 20px 48px rgba(0,0,0,0.15)',
    color: 'var(--text-primary)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  };

  if (isCenter) {
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  } else {
    const gap = 12;
    const { top, left, width, height } = targetRect;

    switch (currentStepData.placement) {
      case 'bottom':
        tooltipStyle.top = `${top + height + gap}px`;
        tooltipStyle.left = `${left + width / 2 - 160}px`;
        break;
      case 'top':
        tooltipStyle.top = `${top - 200 - gap}px`; // estimated height
        tooltipStyle.left = `${left + width / 2 - 160}px`;
        break;
      case 'left':
        tooltipStyle.top = `${top + height / 2 - 100}px`;
        tooltipStyle.left = `${left - 320 - gap}px`;
        break;
      case 'right':
        tooltipStyle.top = `${top + height / 2 - 100}px`;
        tooltipStyle.left = `${left + width + gap}px`;
        break;
      default:
        tooltipStyle.top = `${top + height + gap}px`;
        tooltipStyle.left = `${left + width / 2 - 160}px`;
    }

    // Keep within screen viewport bounds
    const tooltipWidth = 320;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Horizontal adjustment
    let leftVal = parseFloat(tooltipStyle.left);
    if (leftVal < 16) leftVal = 16;
    if (leftVal + tooltipWidth > screenWidth - 16) leftVal = screenWidth - tooltipWidth - 16;
    tooltipStyle.left = `${leftVal}px`;

    // Vertical adjustment if bottom exceeds viewport
    let topVal = parseFloat(tooltipStyle.top);
    if (topVal < 16) topVal = 16;
    if (topVal + 220 > screenHeight - 16) {
      // Shift to top placement if bottom overflows
      tooltipStyle.top = `${top - 220 - gap}px`;
    }
  }

  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 15, 25, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 999998,
          transition: 'all 0.3s'
        }}
        onClick={handleFinishTour} // Skip on backdrop click
      />

      {/* 2. Highlight Spotlight Cutout overlay (adds a subtle beacon target for emphasis) */}
      {!isCenter && targetRect && (
        <div 
          style={{
            position: 'fixed',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: '12px',
            border: '2px dashed var(--primary)',
            boxShadow: '0 0 0 9999px rgba(11, 15, 25, 0.35)',
            zIndex: 999997,
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            animation: 'tourPulse 2.5s infinite'
          }}
        />
      )}

      {/* 3. Tooltip Card */}
      <div style={tooltipStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Compass size={14} /> Guided Walkthrough
          </span>
          <button onClick={handleFinishTour} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} title="Skip Tour">
            <X size={16} />
          </button>
        </div>

        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.08rem', fontWeight: 900, color: 'var(--text-primary)' }}>
          {currentStepData.title}
        </h4>
        
        <p style={{ margin: '0 0 18px 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {currentStepData.content}
        </p>

        {/* Progress Tracker inside Step Card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Step {currentStep + 1} of {steps.length}
          </span>
          <div style={{ width: '120px', height: '6px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${((currentStep + 1) / steps.length) * 100}%`, 
                height: '100%', 
                background: 'var(--primary)', 
                transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
              }} 
            />
          </div>
        </div>

        {/* Actions Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <button 
            onClick={handleFinishTour} 
            style={{ 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              color: 'var(--text-muted)', 
              padding: '6px 12px', 
              cursor: 'pointer' 
            }}
          >
            Skip
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button 
                onClick={handleBack} 
                className="btn btn-ghost" 
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  fontSize: '0.8rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            
            <button 
              onClick={handleNext} 
              className="btn btn-primary" 
              style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                fontSize: '0.8rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px' 
              }}
            >
              {currentStep === steps.length - 1 ? (
                <>Finish <Check size={14} /></>
              ) : (
                <>Next <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tourPulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.02); opacity: 0.5; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        .tour-highlighted-element {
          position: relative !important;
          z-index: 999999 !important;
          background-color: var(--surface-card) !important;
          transition: border-color 0.25s, box-shadow 0.25s !important;
          box-shadow: 0 0 12px rgba(83, 109, 254, 0.45) !important;
        }
      `}</style>
    </>
  );
};

export default GuidedTour;
