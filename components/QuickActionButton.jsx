import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, UserPlus, Users, FileText, 
  ClipboardList, Calendar, MessageSquare, CreditCard, Play 
} from 'lucide-react';

const QuickActionButton = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const role = user?.role?.toLowerCase() || 'student';

  // Define action menus per role
  const actions = {
    admin: [
      { label: 'Add Student', icon: UserPlus, event: 'open-add-student' },
      { label: 'Register Mentor', icon: Users, event: 'open-add-faculty' },
      { label: 'Schedule Class', icon: Calendar, event: 'open-schedule-class' },
      { label: 'Create Assignment', icon: FileText, event: 'open-create-assignment' },
      { label: 'Create Practice Test', icon: ClipboardList, event: 'open-create-test' },
      { label: 'Add Announcement', icon: MessageSquare, event: 'open-create-announcement' },
    ],
    faculty: [
      { label: 'Schedule Class', icon: Calendar, event: 'open-schedule-class' },
      { label: 'Create Assignment', icon: FileText, event: 'open-create-assignment' },
      { label: 'Create Practice Test', icon: ClipboardList, event: 'open-create-test' },
      { label: 'Add Announcement', icon: MessageSquare, event: 'open-create-announcement' },
    ],
    member: [
      { label: 'Add Announcement', icon: MessageSquare, event: 'open-create-announcement' },
    ],
    student: [
      { label: 'Pay Monthly Tuition', icon: CreditCard, path: '/dashboard/fees' },
      { label: 'Start Coding Arcade', icon: Play, path: '/dashboard/mini-games' },
      { label: 'Ask Doubt Room', icon: MessageSquare, path: '/dashboard/community' },
    ]
  }[role] || [];

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  const handleAction = (act) => {
    setIsOpen(false);
    if (act.path) {
      navigate(act.path);
    } else if (act.event) {
      window.dispatchEvent(new CustomEvent(act.event));
      if (['open-add-student', 'open-add-faculty'].includes(act.event)) {
        navigate('/dashboard');
      }
    }
  };

  if (actions.length === 0) return null;

  return (
    <div 
      ref={menuRef}
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 12px))',
        right: '20px',
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '12px'
      }}
    >
      {/* Mini actions drawer menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '8px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '200px'
            }}
          >
            {actions.map((act, i) => {
              const Icon = act.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleAction(act)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: '#334155',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    background: 'rgba(94, 107, 255, 0.08)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={14} />
                  </div>
                  <span>{act.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Floating Action Toggle */}
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4), 0 4px 6px -4px rgba(99, 102, 241, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={24} />
        </motion.div>
      </motion.button>
    </div>
  );
};

export default QuickActionButton;
