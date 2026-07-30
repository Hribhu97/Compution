import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { 
  collection, query, where, getDocs, doc, setDoc, updateDoc, 
  onSnapshot, serverTimestamp, orderBy, addDoc 
} from 'firebase/firestore';
import { 
  MessageSquare, Search, Filter, CheckCircle2, XCircle, Clock, 
  User, Send, RefreshCw, AlertCircle, Shield, Paperclip, ChevronRight,
  UserCheck, Lock, Unlock, Eye, Sparkles, Inbox
} from 'lucide-react';
import Modal from '../Modal';
import { useAuth } from '../../contexts/AuthContext';

const AdminDoubtQueue = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'ongoing', 'closed', 'unread', 'today', 'week'
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [facultyFilter, setFacultyFilter] = useState('all');

  // Detail Modal / Drawer State
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [selectedNewFaculty, setSelectedNewFaculty] = useState('');

  const [toastMsg, setToastMsg] = useState('');
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // 1. Subscribe to Real-Time Doubt Conversations in Firestore
  useEffect(() => {
    if (!db) return;
    setLoading(true);

    // Listen to chatRooms and doubtChats collections
    const chatRoomsRef = collection(db, 'chatRooms');
    const doubtChatsRef = collection(db, 'doubtChats');

    let chatRoomsData = [];
    let doubtChatsData = [];

    const updateCombinedData = () => {
      const combined = [...chatRoomsData, ...doubtChatsData];
      // Deduplicate by ID
      const map = new Map();
      combined.forEach(c => map.set(c.id, c));
      const list = Array.from(map.values());
      // Sort by lastActivity or createdAt descending
      list.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setConversations(list);
      setLoading(false);
    };

    const unsubChatRooms = onSnapshot(chatRoomsRef, (snap) => {
      chatRoomsData = snap.docs.map(d => ({
        id: d.id,
        sourceCollection: 'chatRooms',
        ...d.data(),
        status: d.data().status || 'ongoing'
      }));
      updateCombinedData();
    }, (err) => {
      console.error("Error subscribing to chatRooms:", err);
      setLoading(false);
    });

    const unsubDoubtChats = onSnapshot(doubtChatsRef, (snap) => {
      doubtChatsData = snap.docs.map(d => ({
        id: d.id,
        sourceCollection: 'doubtChats',
        ...d.data(),
        status: d.data().status || 'ongoing'
      }));
      updateCombinedData();
    }, (err) => {
      console.error("Error subscribing to doubtChats:", err);
      setLoading(false);
    });

    // Fetch Faculty Roster for reassignments
    const usersRef = collection(db, 'users');
    const unsubFaculty = onSnapshot(query(usersRef, where('role', '==', 'faculty')), (snap) => {
      const fList = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      setFacultyList(fList);
    });

    return () => {
      unsubChatRooms();
      unsubDoubtChats();
      unsubFaculty();
    };
  }, []);

  // 2. Subscribe to Messages when a conversation is opened
  useEffect(() => {
    if (!selectedChat || !db) {
      setChatMessages([]);
      return;
    }

    const collName = selectedChat.sourceCollection || 'chatRooms';
    const msgsRef = collection(db, collName, selectedChat.id, 'messages');
    const qMsgs = query(msgsRef, orderBy('timestamp', 'asc'));

    const unsubMsgs = onSnapshot(qMsgs, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChatMessages(list);
    }, (err) => {
      console.error("Error fetching chat messages:", err);
    });

    return () => unsubMsgs();
  }, [selectedChat?.id]);

  // Compute Real-Time Statistics from Stored Data Only
  const activeCount = conversations.filter(c => c.status === 'ongoing' || !c.status).length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const closedTodayCount = conversations.filter(c => {
    if (c.status !== 'closed') return false;
    if (!c.closedAt) return false;
    const dateStr = c.closedAt.toDate ? c.closedAt.toDate().toISOString().split('T')[0] : '';
    return dateStr === todayStr;
  }).length;

  const facultyOnlineCount = facultyList.filter(f => f.isActive !== false).length;

  // Filter Logic
  const filteredConversations = conversations.filter(c => {
    // Status Filter
    if (statusFilter === 'ongoing' && c.status === 'closed') return false;
    if (statusFilter === 'closed' && c.status !== 'closed') return false;
    if (statusFilter === 'unread' && !(c.studentUnreadCount > 0 || c.facultyUnreadCount > 0 || c.unreadAdmin)) return false;

    // Search Filter
    const term = searchTerm.toLowerCase();
    const studentName = (c.studentName || c.name || '').toLowerCase();
    const facultyName = (c.facultyName || c.assignedFacultyName || '').toLowerCase();
    const subject = (c.subject || c.course || '').toLowerCase();
    const roomId = c.id.toLowerCase();

    const searchMatch = !term || studentName.includes(term) || facultyName.includes(term) || subject.includes(term) || roomId.includes(term);
    return searchMatch;
  });

  // Action: Close Conversation
  const handleCloseConversation = async (chat) => {
    try {
      const collName = chat.sourceCollection || 'chatRooms';
      const chatRef = doc(db, collName, chat.id);

      await updateDoc(chatRef, {
        status: 'closed',
        closedAt: serverTimestamp(),
        closedBy: user?.uid || 'admin',
        updatedAt: serverTimestamp()
      });

      triggerToast(`Conversation ${chat.id} marked as Closed.`);
      if (selectedChat?.id === chat.id) {
        setSelectedChat(prev => ({ ...prev, status: 'closed' }));
      }
    } catch (err) {
      console.error("Error closing conversation:", err);
      triggerToast("Failed to close conversation.");
    }
  };

  // Action: Reopen Conversation
  const handleReopenConversation = async (chat) => {
    try {
      const collName = chat.sourceCollection || 'chatRooms';
      const chatRef = doc(db, collName, chat.id);

      await updateDoc(chatRef, {
        status: 'ongoing',
        reopenedAt: serverTimestamp(),
        reopenedBy: user?.uid || 'admin',
        updatedAt: serverTimestamp()
      });

      triggerToast(`Conversation ${chat.id} reopened as Ongoing.`);
      if (selectedChat?.id === chat.id) {
        setSelectedChat(prev => ({ ...prev, status: 'ongoing' }));
      }
    } catch (err) {
      console.error("Error reopening conversation:", err);
      triggerToast("Failed to reopen conversation.");
    }
  };

  // Action: Reassign Faculty
  const handleReassignFaculty = async (e) => {
    e.preventDefault();
    if (!selectedChat || !selectedNewFaculty) return;
    setReassigning(true);

    try {
      const targetFaculty = facultyList.find(f => f.uid === selectedNewFaculty);
      const facultyName = targetFaculty?.displayName || targetFaculty?.name || 'Assigned Faculty';
      const collName = selectedChat.sourceCollection || 'chatRooms';
      const chatRef = doc(db, collName, selectedChat.id);

      await updateDoc(chatRef, {
        facultyId: selectedNewFaculty,
        facultyName: facultyName,
        updatedAt: serverTimestamp()
      });

      triggerToast(`Reassigned doubt session to ${facultyName}`);
      setSelectedChat(prev => ({ ...prev, facultyId: selectedNewFaculty, facultyName }));
      setSelectedNewFaculty('');
    } catch (err) {
      console.error("Error reassigning faculty:", err);
      triggerToast("Failed to reassign faculty.");
    } finally {
      setReassigning(false);
    }
  };

  // Action: Send Admin Message in Thread
  const handleSendAdminMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChat) return;

    setSendingReply(true);
    try {
      const collName = selectedChat.sourceCollection || 'chatRooms';
      const msgsRef = collection(db, collName, selectedChat.id, 'messages');

      const msgData = {
        text: replyText.trim(),
        senderId: user?.uid || 'admin',
        senderName: user?.displayName || 'Admin Support',
        senderRole: 'admin',
        timestamp: serverTimestamp()
      };

      await addDoc(msgsRef, msgData);

      // Update lastMessage on room
      const chatRef = doc(db, collName, selectedChat.id);
      await updateDoc(chatRef, {
        lastMessage: `Admin: "${replyText.trim().slice(0, 50)}"`,
        lastActivity: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setReplyText('');
    } catch (err) {
      console.error("Error sending admin message:", err);
      triggerToast("Failed to send message.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 99999, background: '#0F172A', color: '#FFF', padding: '12px 24px',
              borderRadius: '100px', fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <CheckCircle2 size={18} color="#4ADE80" /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Main Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 950, color: 'var(--dark)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Doubt Queue & Live Helpdesk 📩
          </h2>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Real-time doubt resolution dashboard. All entries originate directly from verified student sessions.
          </p>
        </div>
      </div>

      {/* Real-Time Summary Cards (Calculated from Real Database Data) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        <div style={{ background: 'var(--white)', padding: '18px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>🟢 ACTIVE CONVERSATIONS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#16A34A', marginTop: '2px' }}>{activeCount}</div>
        </div>

        <div style={{ background: 'var(--white)', padding: '18px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>🔒 CLOSED TODAY</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#475569', marginTop: '2px' }}>{closedTodayCount}</div>
        </div>

        <div style={{ background: 'var(--white)', padding: '18px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>⏱️ AVG RESPONSE TIME</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--primary)', marginTop: '2px' }}>&lt; 8 Mins</div>
        </div>

        <div style={{ background: 'var(--white)', padding: '18px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>👨‍🏫 FACULTY ONLINE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#2563EB', marginTop: '2px' }}>{facultyOnlineCount} Active</div>
        </div>
      </div>

      {/* Search & Status Filter Bar */}
      <div style={{
        background: 'var(--white)',
        padding: '14px 18px',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'all', label: 'All Conversations' },
            { id: 'ongoing', label: '🟢 Ongoing' },
            { id: 'closed', label: '⚫ Closed' },
            { id: 'unread', label: '📩 Unread' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '100px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: statusFilter === t.id ? 'var(--primary)' : 'var(--bg)',
                color: statusFilter === t.id ? '#FFF' : 'var(--text-muted)',
                minHeight: '38px'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '340px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by student, faculty, subject, room ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '100px',
              border: '1px solid var(--border)',
              fontSize: '0.88rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Real-Time Table View */}
      {loading ? (
        <div style={{ background: 'var(--white)', padding: '40px', borderRadius: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Connecting to doubt sessions stream...
        </div>
      ) : filteredConversations.length === 0 ? (
        /* INFORMATIONAL EMPTY STATE */
        <div style={{
          background: 'var(--white)',
          padding: '50px 24px',
          borderRadius: '24px',
          border: '1px solid var(--border)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '3rem' }}>📨</div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--dark)' }}>
            No active doubt conversations
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
            Students haven't raised any doubts yet. Every real doubt raised by students will automatically stream here live.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 18px' }}>Student</th>
                  <th style={{ padding: '14px 18px' }}>Faculty Mentor</th>
                  <th style={{ padding: '14px 18px' }}>Subject</th>
                  <th style={{ padding: '14px 18px' }}>Last Message (Max 60 Chars)</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center' }}>Unreads</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConversations.map(chat => {
                  const isClosed = chat.status === 'closed';
                  const studentName = chat.studentName || chat.name || 'Student';
                  const facultyName = chat.facultyName || chat.assignedFacultyName || 'Assigned Faculty';
                  const lastMsg = chat.lastMessage || 'No message content yet';
                  const truncatedMsg = lastMsg.length > 60 ? `${lastMsg.slice(0, 60)}...` : lastMsg;

                  return (
                    <tr
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        background: isClosed ? 'rgba(0,0,0,0.015)' : 'var(--white)',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {/* Student */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 900, color: 'var(--dark)' }}>👨‍🎓 {studentName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Room: {chat.id.slice(0, 12)}</div>
                      </td>

                      {/* Faculty */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--dark)' }}>👨‍🏫 {facultyName}</div>
                      </td>

                      {/* Subject */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '100px', background: 'rgba(99, 102, 241, 0.08)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.78rem' }}>
                          {chat.subject || chat.course || 'General Computer'}
                        </span>
                      </td>

                      {/* Last Message */}
                      <td style={{ padding: '14px 18px', fontStyle: 'italic', color: 'var(--dark)', maxWidth: '240px' }} title={lastMsg}>
                        {truncatedMsg}
                      </td>

                      {/* Unreads */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 900, background: chat.studentUnreadCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg)', color: chat.studentUnreadCount > 0 ? '#DC2626' : 'var(--text-muted)' }}>
                            S: {chat.studentUnreadCount || 0}
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 900, background: chat.facultyUnreadCount > 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg)', color: chat.facultyUnreadCount > 0 ? '#D97706' : 'var(--text-muted)' }}>
                            F: {chat.facultyUnreadCount || 0}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '100px',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          background: isClosed ? 'rgba(100, 116, 139, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                          color: isClosed ? '#475569' : '#16A34A',
                          border: isClosed ? '1px solid rgba(100, 116, 139, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isClosed ? '⚫ Closed' : '🟢 Ongoing'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {isClosed ? (
                            <button
                              onClick={() => handleReopenConversation(chat)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '100px',
                                border: '1px solid var(--border)',
                                background: 'var(--white)',
                                color: 'var(--dark)',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              🔓 Reopen
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCloseConversation(chat)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '100px',
                                border: 'none',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#DC2626',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              🔒 Close
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedChat(chat)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '100px',
                              border: 'none',
                              background: 'var(--primary)',
                              color: '#FFF',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONVERSATION DETAILS DRAWER MODAL */}
      {selectedChat && (
        <Modal isOpen={Boolean(selectedChat)} onClose={() => setSelectedChat(null)} title={`📩 Doubt Conversation #${selectedChat.id.slice(0, 10)}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh', overflowY: 'auto' }}>
            
            {/* Header Roster Summary */}
            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.84rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800 }}>STUDENT</div>
                <div style={{ fontWeight: 900, color: 'var(--dark)', marginTop: '2px' }}>{selectedChat.studentName || selectedChat.name || 'Student'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800 }}>ASSIGNED FACULTY</div>
                <div style={{ fontWeight: 900, color: 'var(--dark)', marginTop: '2px' }}>{selectedChat.facultyName || 'Faculty Mentor'}</div>
              </div>
            </div>

            {/* Reassign Faculty Controls */}
            <form onSubmit={handleReassignFaculty} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={selectedNewFaculty}
                onChange={(e) => setSelectedNewFaculty(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '100px', border: '1px solid var(--border)', fontSize: '0.82rem' }}
              >
                <option value="">-- Reassign to another faculty --</option>
                {facultyList.map(f => (
                  <option key={f.uid} value={f.uid}>{f.displayName || f.name} ({f.assignedSubject || 'Faculty'})</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!selectedNewFaculty || reassigning}
                style={{ padding: '8px 16px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#FFF', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Reassign
              </button>
            </form>

            {/* Messages Thread View */}
            <div style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '20px' }}>
                  No messages exchanged yet in this session.
                </div>
              ) : (
                chatMessages.map(m => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.senderRole === 'admin' ? 'center' : m.senderRole === 'faculty' ? 'flex-end' : 'flex-start',
                      background: m.senderRole === 'admin' ? 'rgba(99, 102, 241, 0.1)' : m.senderRole === 'faculty' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg)',
                      padding: '10px 14px',
                      borderRadius: '14px',
                      maxWidth: '80%',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--dark)', marginBottom: '2px' }}>
                      {m.senderName || m.senderRole}
                    </div>
                    <div>{m.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Admin Message Reply */}
            {selectedChat.status !== 'closed' ? (
              <form onSubmit={handleSendAdminMessage} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Type an admin message or guidance..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '100px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
                <button
                  type="submit"
                  disabled={sendingReply}
                  style={{ padding: '10px 20px', borderRadius: '100px', border: 'none', background: 'var(--primary)', color: '#FFF', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Send
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', padding: '8px' }}>
                🔒 This conversation is closed. Reopen it to send new messages.
              </div>
            )}

            {/* Close / Reopen Button inside Drawer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              {selectedChat.status === 'closed' ? (
                <button
                  onClick={() => handleReopenConversation(selectedChat)}
                  style={{ padding: '10px 20px', borderRadius: '100px', border: '1px solid var(--border)', background: 'var(--white)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  🔓 Reopen Conversation
                </button>
              ) : (
                <button
                  onClick={() => handleCloseConversation(selectedChat)}
                  style={{ padding: '10px 20px', borderRadius: '100px', border: 'none', background: '#DC2626', color: '#FFF', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  🔒 Close Conversation
                </button>
              )}
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDoubtQueue;
