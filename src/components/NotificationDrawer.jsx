import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { 
  collection, query, orderBy, limit, onSnapshot, 
  doc, writeBatch, deleteDoc, updateDoc 
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bell, X, Check, Trash2, Calendar, CreditCard, 
  FileText, ClipboardList, MessageSquare, Info 
} from 'lucide-react';

const NotificationDrawer = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Listen to real-time notifications
  useEffect(() => {
    if (!isOpen || !user?.uid) return;
    setLoading(true);

    let unsub = () => {};
    try {
      const q = query(
        collection(db, `users/${user.uid}/notifications`),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      unsub = onSnapshot(q, (snap) => {
        const list = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setNotifications(list);
        setLoading(false);
      }, (err) => {
        console.error("NotificationDrawer listener error:", err);
        setLoading(false);
      });
    } catch (err) {
      console.error("NotificationDrawer setup failed:", err);
      setLoading(false);
    }

    return () => unsub();
  }, [isOpen, user?.uid]);

  // 2. Mark all as read
  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      let updatedCount = 0;
      notifications.forEach(n => {
        if (!n.read) {
          const docRef = doc(db, `users/${user.uid}/notifications`, n.id);
          batch.update(docRef, { read: true });
          updatedCount++;
        }
      });
      if (updatedCount > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  // 3. Delete a notification
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/notifications`, id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  // 4. Mark single read
  const handleMarkRead = async (id) => {
    try {
      await updateDoc(doc(db, `users/${user.uid}/notifications`, id), { read: true });
    } catch (err) {
      console.error("Failed to update notification:", err);
    }
  };

  // Helper to resolve icon based on notification type
  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'class_reminder':
      case 'schedule':
        return { icon: Calendar, bg: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' };
      case 'fee':
      case 'payment':
        return { icon: CreditCard, bg: 'rgba(16, 185, 129, 0.08)', color: '#10b981' };
      case 'assignment':
        return { icon: FileText, bg: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' };
      case 'test':
      case 'quiz':
        return { icon: ClipboardList, bg: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6' };
      case 'community':
      case 'chat':
        return { icon: MessageSquare, bg: 'rgba(236, 72, 153, 0.08)', color: '#ec4899' };
      default:
        return { icon: Info, bg: 'rgba(100, 116, 139, 0.08)', color: '#64748b' };
    }
  };

  // Helper to format timestamp
  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to group notifications by date
  const getGroupedNotifications = () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    const groups = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    notifications.forEach(n => {
      const dateStr = n.createdAt ? (n.createdAt.toDate ? n.createdAt.toDate().toDateString() : new Date(n.createdAt).toDateString()) : today;
      if (dateStr === today) {
        groups.Today.push(n);
      } else if (dateStr === yesterday) {
        groups.Yesterday.push(n);
      } else {
        groups.Older.push(n);
      }
    });

    return groups;
  };

  const grouped = getGroupedNotifications();
  const hasUnread = notifications.some(n => !n.read);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Drawer Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.25)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 9990
            }}
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(420px, 100vw)',
              background: 'white',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.08)',
              zIndex: 9991,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Notifications</h3>
              </div>
              <button 
                onClick={onClose}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.03)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Actions Bar */}
            {notifications.length > 0 && (
              <div style={{
                padding: '10px 24px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                background: 'rgba(0,0,0,0.01)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {notifications.filter(n => !n.read).length} unread
                </span>
                {hasUnread && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--primary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Check size={14} /> Mark all read
                  </button>
                )}
              </div>
            )}

            {/* Drawer Body Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <span className="animate-spin" style={{ width: 24, height: 24, border: '2.5px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                  <Bell size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>All caught up!</p>
                  <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>No new notifications found.</p>
                </div>
              ) : (
                Object.entries(grouped).map(([groupName, items]) => {
                  if (items.length === 0) return null;
                  return (
                    <div key={groupName} style={{ marginBottom: '20px' }}>
                      <div style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#94a3b8',
                        marginBottom: '10px',
                        letterSpacing: '0.04em'
                      }}>{groupName}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {items.map(n => {
                          const iconStyle = getIcon(n.type);
                          const IconComp = iconStyle.icon;
                          return (
                            <div
                              key={n.id}
                              style={{
                                display: 'flex',
                                gap: '12px',
                                padding: '14px',
                                borderRadius: '14px',
                                background: n.read ? 'white' : 'rgba(99, 102, 241, 0.03)',
                                border: n.read ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(99, 102, 241, 0.1)',
                                position: 'relative',
                                group: 'true',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: iconStyle.bg,
                                color: iconStyle.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <IconComp size={16} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: '0.82rem',
                                  fontWeight: n.read ? 600 : 700,
                                  color: '#1e293b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>{formatTime(n.createdAt)}</span>
                                </div>
                                <p style={{
                                  margin: '4px 0 0 0',
                                  fontSize: '0.78rem',
                                  color: '#475569',
                                  lineHeight: 1.4
                                }}>{n.message}</p>
                              </div>
                              
                              {/* Hover actions */}
                              <div style={{
                                display: 'flex',
                                gap: '4px',
                                alignSelf: 'flex-start',
                                marginLeft: '8px'
                              }}>
                                {!n.read && (
                                  <button
                                    onClick={() => handleMarkRead(n.id)}
                                    style={{
                                      border: 'none',
                                      background: 'rgba(0,0,0,0.02)',
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#10b981',
                                      cursor: 'pointer'
                                    }}
                                    title="Mark as read"
                                  >
                                    <Check size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(n.id)}
                                  style={{
                                    border: 'none',
                                    background: 'rgba(0,0,0,0.02)',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ef4444',
                                    cursor: 'pointer'
                                  }}
                                  title="Delete notification"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDrawer;
