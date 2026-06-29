import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, Command, User, Users, GraduationCap, 
  Calendar, FileText, ClipboardList, MessageSquare, 
  CreditCard, Play, Plus, X, CornerDownLeft 
} from 'lucide-react';

const CommandPalette = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Data lists for search
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isFaculty = user?.role?.toLowerCase() === 'faculty';

  // 1. Fetch Students and Faculty on open to ensure fast local search
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);

    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'users'), limit(150));
        const snap = await getDocs(q);
        const studs = [];
        const facs = [];
        snap.forEach(docSnap => {
          const u = { id: docSnap.id, ...docSnap.data() };
          if (u.role?.toLowerCase() === 'student' && u.status !== 'inactive' && u.status !== 'deleted') {
            studs.push(u);
          } else if (u.role?.toLowerCase() === 'faculty') {
            facs.push(u);
          }
        });
        setStudents(studs);
        setFaculty(facs);
      } catch (err) {
        console.error('CommandPalette data fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen]);

  // 2. Navigation items definition
  const navItems = [
    { label: 'Dashboard Overview', path: '/dashboard', icon: Command, roles: ['admin', 'faculty', 'member', 'student'] },
    { label: 'Courses Roster', path: '/dashboard/courses', icon: GraduationCap, roles: ['admin', 'faculty', 'member', 'student'] },
    { label: 'Schedules & Slots', path: '/dashboard/schedule', icon: Calendar, roles: ['admin', 'faculty', 'member', 'student'] },
    { label: 'Tuition Fees Ledger', path: '/dashboard/fees', icon: CreditCard, roles: ['admin', 'student'] },
    { label: 'Mini Games & Arcade', path: '/dashboard/mini-games', icon: Play, roles: ['admin', 'student'] },
    { label: 'Attendance Records', path: '/dashboard/attendance', icon: Users, roles: ['admin', 'faculty', 'student'] },
    { label: 'Homework Assignments', path: '/dashboard/assignments', icon: FileText, roles: ['admin', 'faculty', 'student'] },
    { label: 'Mock Practice Tests', path: '/dashboard/tests', icon: ClipboardList, roles: ['admin', 'faculty', 'student'] },
    { label: 'Community Board & Notice', path: '/dashboard/community', icon: MessageSquare, roles: ['admin', 'faculty', 'member', 'student'] },
  ].filter(item => item.roles.includes(user?.role?.toLowerCase()));

  // 3. Quick Actions definition
  const quickActions = [
    { label: 'Add Student Record', event: 'open-add-student', icon: Plus, roles: ['admin'] },
    { label: 'Register New Faculty', event: 'open-add-faculty', icon: Plus, roles: ['admin'] },
    { label: 'Register staff Member', event: 'open-add-member', icon: Plus, roles: ['admin'] },
    { label: 'Create New Assignment', event: 'open-create-assignment', icon: FileText, roles: ['admin', 'faculty'] },
    { label: 'Create New Test', event: 'open-create-test', icon: ClipboardList, roles: ['admin', 'faculty'] },
    { label: 'Schedule Class Slot', event: 'open-schedule-class', icon: Calendar, roles: ['admin', 'faculty'] },
    { label: 'Add Announcement Notice', event: 'open-create-announcement', icon: MessageSquare, roles: ['admin', 'faculty'] },
  ].filter(act => act.roles.includes(user?.role?.toLowerCase()));

  // 4. Combined items filter based on searchQuery
  const getFilteredItems = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      // Return default/recent recommendations
      return [
        { type: 'section', label: 'Navigation Routes' },
        ...navItems.slice(0, 4),
        { type: 'section', label: 'Quick Operations' },
        ...quickActions.slice(0, 4)
      ];
    }

    const matchedNavs = navItems.filter(item => item.label.toLowerCase().includes(q));
    const matchedActions = quickActions.filter(act => act.label.toLowerCase().includes(q));
    
    const matchedStudents = students.filter(s => 
      s.displayName?.toLowerCase().includes(q) || 
      s.email?.toLowerCase().includes(q) || 
      s.course?.toLowerCase().includes(q)
    ).map(s => ({
      label: s.displayName,
      sublabel: `Student • ${s.course || 'No Course'}`,
      student: s,
      icon: User
    }));

    const matchedFaculty = faculty.filter(f => 
      f.displayName?.toLowerCase().includes(q) || 
      f.email?.toLowerCase().includes(q)
    ).map(f => ({
      label: f.displayName,
      sublabel: `Faculty Mentor`,
      faculty: f,
      icon: Users
    }));

    const results = [];
    if (matchedNavs.length > 0) {
      results.push({ type: 'section', label: 'Pages' });
      results.push(...matchedNavs);
    }
    if (matchedActions.length > 0) {
      results.push({ type: 'section', label: 'Quick Actions' });
      results.push(...matchedActions);
    }
    if (matchedStudents.length > 0) {
      results.push({ type: 'section', label: 'Students' });
      results.push(...matchedStudents.slice(0, 6)); // cap at 6 results
    }
    if (matchedFaculty.length > 0) {
      results.push({ type: 'section', label: 'Faculty Mentors' });
      results.push(...matchedFaculty.slice(0, 4));
    }
    return results;
  };

  const filteredItems = getFilteredItems();
  const actionableItems = filteredItems.filter(item => item.type !== 'section');

  // Handle arrow navigation and select keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, actionableItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + actionableItems.length) % Math.max(1, actionableItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (actionableItems[selectedIndex]) {
          handleSelect(actionableItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, actionableItems]);

  const handleSelect = (item) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.event) {
      // Trigger global custom event
      window.dispatchEvent(new CustomEvent(item.event));
      // If we need to go to dashboard to open these modals, navigate there
      if (['open-add-student', 'open-add-faculty', 'open-add-member'].includes(item.event)) {
        navigate('/dashboard');
      }
    } else if (item.student) {
      // Open student details drawer via CustomEvent
      window.dispatchEvent(new CustomEvent('open-student-details', { detail: item.student }));
      navigate('/dashboard');
    } else if (item.faculty) {
      // Open faculty details or search results
      window.dispatchEvent(new CustomEvent('open-faculty-details', { detail: item.faculty }));
      navigate('/dashboard');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '15vh',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            width: '100%',
            maxWidth: '640px',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '480px',
            height: 'fit-content',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <Search size={20} style={{ color: '#64748b', marginRight: '12px' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search students, courses, assignments, or type commands..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '0.95rem',
                color: '#1e293b',
                background: 'transparent'
              }}
            />
            <kbd style={{
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '6px',
              padding: '2px 6px',
              fontSize: '0.75rem',
              color: '#64748b',
              marginLeft: '8px'
            }}>ESC</kbd>
          </div>

          {/* Results List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {loading && searchQuery && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                <span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid #64748b', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                <span>Searching databases...</span>
              </div>
            )}
            
            {actionableItems.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No results found for "{searchQuery}"
              </div>
            ) : (
              (() => {
                let actionCounter = -1;
                return filteredItems.map((item, idx) => {
                  if (item.type === 'section') {
                    return (
                      <div 
                        key={`sec-${idx}`}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#94a3b8',
                          padding: '12px 16px 6px 16px',
                          letterSpacing: '0.05em'
                        }}
                      >
                        {item.label}
                      </div>
                    );
                  }

                  actionCounter++;
                  const isSelected = actionCounter === selectedIndex;
                  const Icon = item.icon || Command;

                  return (
                    <div
                      key={`item-${idx}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(actionableItems.indexOf(item))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isSelected ? 'white' : 'rgba(0,0,0,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isSelected ? 'var(--primary)' : '#64748b',
                          boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                        }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                            {item.label}
                          </div>
                          {item.sublabel && (
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>
                              {item.sublabel}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.72rem' }}>
                          <span>Select</span>
                          <CornerDownLeft size={12} />
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
          
          {/* Footer Shortcuts Help */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            background: 'rgba(0,0,0,0.01)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span><kbd style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)', padding: '1px 4px', borderRadius: '4px' }}>↑↓</kbd> Navigate</span>
              <span><kbd style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)', padding: '1px 4px', borderRadius: '4px' }}>Enter</kbd> Select</span>
              <span><kbd style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)', padding: '1px 4px', borderRadius: '4px' }}>Esc</kbd> Close</span>
            </div>
            <div>
              <span>⌘K / Ctrl+K to toggle</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CommandPalette;
