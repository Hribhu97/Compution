import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, serverTimestamp, where, doc, increment, getDocs } from 'firebase/firestore';
import { addDoc, setDoc, updateDoc, deleteDoc } from '../../firebase';;
import { MessageSquare, Plus, Clock, Search, Send, Image, FileText, Check, CheckCheck, Loader2, User, Phone, Smile, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const Community = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'chat'
  const isDarkMode = false;

  // Post Board state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [editingPost, setEditingPost] = useState(null);

  // Private Chat state
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [chatUsers, setChatUsers] = useState([]); // List of students/teachers you can chat with
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  
  // Attachments
  const [attachment, setAttachment] = useState(null); // { data: base64, type: 'image'|'pdf', name }
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  
  // Post Attachments
  const [postAttachment, setPostAttachment] = useState(null); // { data: base64, type: 'image', name }
  const [postAttachmentLoading, setPostAttachmentLoading] = useState(false);

  // Typing & Presence
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef({});
  const [lastMessageSentTime, setLastMessageSentTime] = useState(0);
  const messagesEndRef = useRef(null);

  const isFaculty = user?.role?.toLowerCase() === 'faculty';
  const isStudent = user?.role?.toLowerCase() === 'student';
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isMember = user?.role?.toLowerCase() === 'member';

  const renderRoleBadge = (role) => {
    const normalizedRole = (role || 'student').toLowerCase();
    const config = {
      admin: { label: 'Admin', bg: 'rgba(239, 83, 80, 0.1)', color: '#EF5350' },
      faculty: { label: 'Faculty', bg: 'rgba(102, 187, 106, 0.1)', color: '#66BB6A' },
      member: { label: 'Member', bg: 'rgba(171, 71, 188, 0.1)', color: '#AB47BC' },
      student: { label: 'Student', bg: 'rgba(83, 109, 254, 0.1)', color: '#536DFE' }
    };
    const theme = config[normalizedRole] || config.student;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.65rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        background: theme.bg,
        color: theme.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {theme.label}
      </span>
    );
  };

  // 1. POST BOARD - FETCH NOTES
  useEffect(() => {
    if (!user || activeTab !== 'board') return;
    
    if (!db) {
      console.error("Community: Firestore not initialized");
      return;
    }

    let unsub = () => {};
    try {
      const commRef = query(collection(db, 'community'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(commRef, (snap) => {
        const data = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setPosts(data);
        setPostsLoading(false);
      }, (err) => {
        console.error("Community: posts board listener error:", err);
        setPostsLoading(false);
      });
    } catch (err) {
      console.error("Community: posts board listener creation failed", err);
      setPostsLoading(false);
    }

    return () => unsub();
  }, [user, activeTab]);

  // 2. CHAT - FETCH LIST OF USERS & ACTIVE ROOMS
  useEffect(() => {
    if (!user || activeTab !== 'chat') return;

    if (!db) {
      console.error("Community: Firestore not initialized");
      return;
    }

    let unsubUsers = () => {};
    let unsubRooms = () => {};

    // Fetch all users to find potential chat partners based on assignment & fallbacks
    try {
      const usersRef = collection(db, 'users');
      unsubUsers = onSnapshot(usersRef, (snap) => {
        const allUsers = [];
        snap.forEach(doc => {
          allUsers.push({ id: doc.id, ...doc.data() });
        });

        if (isStudent) {
          // Students can message assigned faculty
          const assigned = user.assignedFaculty || [];
          let matchingFaculty = allUsers.filter(u => 
            u.role?.toLowerCase() === 'faculty' && (assigned.includes(u.id) || assigned.includes(u.email))
          );
          // Fallback matchmaking if not assigned
          if (matchingFaculty.length === 0) {
            const course = user.course || '';
            const isPythonClass = course.toLowerCase().includes('python') || course.toLowerCase().includes('basic computer') || course.toLowerCase().includes('class 11') || course.toLowerCase().includes('class 12') || course.toLowerCase().includes('tally') || course.toLowerCase().includes('excel');
            matchingFaculty = allUsers.filter(u => {
              if (u.role?.toLowerCase() !== 'faculty') return false;
              if (u.email === 'sharmisthaghosh855@gmail.com' && isPythonClass) return true;
              if (u.email === 'tapadarhribhu350@gmail.com' && !isPythonClass) return true;
              return false;
            });
          }
          setChatUsers(matchingFaculty);
        } else if (isFaculty) {
          // Faculty can message assigned students
          const facultyEmail = user.email?.toLowerCase();
          const facultyId = user.uid;
          const matchingStudents = allUsers.filter(u => {
            if (u.role?.toLowerCase() !== 'student') return false;
            const assigned = u.assignedFaculty || [];
            if (assigned.includes(facultyId) || assigned.includes(facultyEmail)) return true;
            if (assigned.length === 0) {
              const course = u.course || '';
              const isPythonClass = course.toLowerCase().includes('python') || course.toLowerCase().includes('basic computer') || course.toLowerCase().includes('class 11') || course.toLowerCase().includes('class 12') || course.toLowerCase().includes('tally') || course.toLowerCase().includes('excel');
              if (facultyEmail === 'sharmisthaghosh855@gmail.com' && isPythonClass) return true;
              if (facultyEmail === 'tapadarhribhu350@gmail.com' && !isPythonClass) return true;
            }
            return false;
          });
          setChatUsers(matchingStudents);
        } else if (isAdmin || isMember) {
          // Admin & Member can chat with anyone
          const chatPartners = allUsers.filter(u => u.id !== user.uid);
          setChatUsers(chatPartners);
        }
      }, (err) => {
        console.error("Community: users list listener error:", err);
      });
    } catch (err) {
      console.error("Community: users list listener creation failed", err);
    }

    // Fetch active chat rooms
    try {
      const roomsQuery = query(
        collection(db, 'communityThreads'),
        where('participants', 'array-contains', user.uid)
      );

      unsubRooms = onSnapshot(roomsQuery, (snap) => {
        const roomList = [];
        snap.forEach(doc => {
          roomList.push({ id: doc.id, ...doc.data() });
        });
        roomList.sort((a, b) => (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));
        setRooms(roomList);
      }, (err) => {
        console.error("Community: active rooms listener error:", err);
      });
    } catch (err) {
      console.error("Community: active rooms listener creation failed", err);
    }

    return () => {
      unsubUsers();
      unsubRooms();
    };
  }, [user, activeTab]);

  // 3. CHAT - FETCH MESSAGES OF ACTIVE ROOM
  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }

    if (!db) {
      console.error("Community: Firestore not initialized");
      return;
    }

    setMessagesLoading(true);

    let unsubMsg = () => {};
    let unsubRoom = () => {};

    try {
      const msgQuery = query(
        collection(db, `communityThreads/${activeRoom.id}/messages`),
        orderBy('timestamp', 'asc')
      );

      unsubMsg = onSnapshot(msgQuery, (snap) => {
        const list = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setMessages(list);
        setMessagesLoading(false);

        // Scroll to bottom on load/new message
        setTimeout(scrollToBottom, 100);

        // Mark messages as seen/read
        markMessagesAsRead(activeRoom.id);
      }, (err) => {
        console.error("Community: messages list listener error:", err);
        setMessagesLoading(false);
      });
    } catch (err) {
      console.error("Community: messages list listener creation failed", err);
      setMessagesLoading(false);
    }

    // Listen to typing status
    try {
      unsubRoom = onSnapshot(doc(db, 'communityThreads', activeRoom.id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTypingUsers(data.typing || {});
        }
      }, (err) => {
        console.error("Community: typing status listener error:", err);
      });
    } catch (err) {
      console.error("Community: typing status listener creation failed", err);
    }

    return () => {
      unsubMsg();
      unsubRoom();
    };
  }, [activeRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markMessagesAsRead = async (roomId) => {
    try {
      const roomRef = doc(db, 'communityThreads', roomId);
      if (isFaculty || isAdmin || isMember) {
        await setDoc(roomRef, { facultyUnreadCount: 0 }, { merge: true });
      } else {
        await setDoc(roomRef, { studentUnreadCount: 0 }, { merge: true });
      }
      
      // Update messages where senderId != user.uid and readStatus is not true
      const unreadSnap = await getDocs(
        query(
          collection(db, `communityThreads/${roomId}/messages`), 
          where('senderId', '!=', user.uid)
        )
      );
      unreadSnap.forEach(async (messageDoc) => {
        const data = messageDoc.data();
        if (data.readStatus === false || data.seen === false) {
          await setDoc(doc(db, `communityThreads/${roomId}/messages`, messageDoc.id), { 
            readStatus: true, 
            seen: true 
          }, { merge: true });
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ── CREATE/EDIT POST ──
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!message.trim() && !postAttachment) return;
    setIsSubmitting(true);
    try {
      if (editingPost) {
        // Update existing notice
        const postRef = doc(db, 'community', editingPost.id);
        const updateObj = {
          message: message.trim(),
          attachmentData: postAttachment ? postAttachment.data : null,
          attachmentType: postAttachment ? postAttachment.type : null,
          attachmentName: postAttachment ? postAttachment.name : null,
          updatedAt: serverTimestamp()
        };
        await setDoc(postRef, updateObj, { merge: true });
      } else {
        // Create new notice
        const postObj = {
          message: message.trim(),
          author: user?.displayName || 'Student',
          authorId: user?.uid || '',
          authorRole: user?.role || 'student',
          authorPhoto: user?.photoURL || '',
          createdAt: serverTimestamp()
        };
        if (postAttachment) {
          postObj.attachmentData = postAttachment.data;
          postObj.attachmentType = postAttachment.type;
          postObj.attachmentName = postAttachment.name;
        }
        await addDoc(collection(db, 'community'), postObj);
      }
      handleCloseModal();
      showToast("Notice saved successfully! 📢", "success");
    } catch(err) {
      console.error(err);
      showToast("Failed to save notice: " + (err.message || err), "error");
    }
    setIsSubmitting(false);
  };

  // ── DELETE POST ──
  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this notice note?")) {
      try {
        await deleteDoc(doc(db, 'community', postId));
        showToast("Notice deleted successfully", "info");
      } catch (err) {
        console.error("Error deleting post:", err);
        showToast("Failed to delete notice: " + (err.message || err), "error");
      }
    }
  };

  // ── CLOSE/RESET MODAL ──
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMessage('');
    setPostAttachment(null);
    setEditingPost(null);
  };

  // ── START CHAT ROOM ──
  const handleStartChat = async (targetUser) => {
    const roomId = user.uid < targetUser.id ? `${user.uid}_${targetUser.id}` : `${targetUser.id}_${user.uid}`;
    
    // Check if room exists
    const roomRef = doc(db, 'communityThreads', roomId);
    try {
      await setDoc(roomRef, {
        id: roomId,
        participants: [user.uid, targetUser.id],
        studentId: isStudent ? user.uid : targetUser.id,
        studentName: isStudent ? user.displayName : targetUser.displayName,
        studentPhoto: isStudent ? (user.photoURL || '') : (targetUser.photoURL || ''),
        facultyId: isFaculty ? user.uid : targetUser.id,
        facultyName: isFaculty ? user.displayName : targetUser.displayName,
        facultyPhoto: isFaculty ? (user.photoURL || '') : (targetUser.photoURL || ''),
        lastMessage: 'Chat started',
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        studentUnreadCount: 0,
        facultyUnreadCount: 0,
        typing: { [user.uid]: false, [targetUser.id]: false }
      }, { merge: true });

      setActiveRoom({
        id: roomId,
        displayName: targetUser.displayName,
        photoURL: targetUser.photoURL,
        role: targetUser.role,
        email: targetUser.email,
        phone: targetUser.phone,
        availability: targetUser.availability || 'Available',
        officeTimings: targetUser.officeTimings || 'Flexible Hours'
      });
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  };

  // Auto-redirect chat handler
  useEffect(() => {
    if (location.state?.startChatWith && chatUsers.length > 0) {
      const target = chatUsers.find(u => u.id === location.state.startChatWith || u.email?.toLowerCase() === location.state.startChatWith?.toLowerCase());
      if (target) {
        setActiveTab('chat');
        handleStartChat(target);
      }
    }
  }, [location.state, chatUsers]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !attachment) return;

    const now = Date.now();
    if (now - lastMessageSentTime < 3000) {
      showToast("Slow down! Please wait a few seconds between messages.", "warning");
      return;
    }
    setLastMessageSentTime(now);

    const currentText = newMessage.trim();
    const currentAttachment = attachment;
    
    setNewMessage('');
    setAttachment(null);

    const roomDocId = activeRoom.id;
    const isRoomFacultyMsg = isFaculty || isAdmin || isMember;
    const receiverId = activeRoom.id.split('_').find(id => id !== user.uid) || '';

    try {
      // Create message object matching new schema
      const msgObj = {
        senderId: user.uid,
        senderName: user.displayName,
        senderRole: user?.role || 'student',
        receiverId: receiverId,
        message: currentText,
        text: currentText, // Legacy compatibility
        readStatus: false,
        seen: false, // Legacy compatibility
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(), // Legacy compatibility
        attachments: currentAttachment ? [currentAttachment] : [],
        messageType: currentAttachment ? currentAttachment.type : 'text'
      };

      // 1. Add to messages subcollection
      await addDoc(collection(db, `communityThreads/${roomDocId}/messages`), msgObj);

      // 2. Update room document metadata
      const updateObj = {
        lastMessage: currentAttachment ? `Sent a ${currentAttachment.type}` : currentText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        typing: { ...typingUsers, [user.uid]: false }
      };

      if (isRoomFacultyMsg) {
        updateObj.studentUnreadCount = increment(1);
      } else {
        updateObj.facultyUnreadCount = increment(1);
      }

      await setDoc(doc(db, 'communityThreads', roomDocId), updateObj, { merge: true });

      // 3. Email Copy / Notification system if sender is faculty
      if (isFaculty) {
        try {
          const studentEmail = activeRoom.email || '';
          const studentName = activeRoom.displayName || 'Student';
          const studentPhone = activeRoom.phone || 'N/A';
          
          const emailHeader = `From: Compution Academy <notifications@compution.in>\nTo: ${studentEmail}\nSubject: New doubt reply from your mentor ${user.displayName}`;
          const mockEmailBody = `Hi ${studentName},\n\nYour assigned mentor ${user.displayName} has posted a new reply to your doubt thread:\n\n"${currentText}"\n\nLog in to your dashboard to view the full discussion and reply.\n\nBest Regards,\nCompution Support Team`;
          
          await addDoc(collection(db, 'notificationHistory'), {
            studentId: receiverId,
            studentName: studentName,
            parentName: `${studentName} Parent`,
            parentPhone: studentPhone,
            message: `${emailHeader}\n\n${mockEmailBody}`,
            status: 'sent_email',
            type: 'email',
            subject: `New Doubt Reply from ${user.displayName}`,
            timestamp: serverTimestamp()
          });
        } catch (err) {
          console.error("Error writing mock email notification log:", err);
        }
      }

    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // ── FILE HANDLING (Base64) ──
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      showToast("File is too large. Keep it under 1MB for Firestore upload.", "warning");
      return;
    }

    setUploadingAttachment(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const type = file.type.startsWith('image/') ? 'image' : 'pdf';
      setAttachment({
        data: reader.result,
        type: type,
        name: file.name
      });
      setUploadingAttachment(false);
    };
    reader.onerror = () => {
      showToast("Failed to read file", "error");
      setUploadingAttachment(false);
    };
    reader.readAsDataURL(file);
  };

  // ── POST BOARD FILE HANDLING (Base64) ──
  const handlePostFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      showToast("File is too large. Keep it under 1MB for Firestore upload.", "warning");
      return;
    }

    setPostAttachmentLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPostAttachment({
        data: reader.result,
        type: 'image',
        name: file.name
      });
      setPostAttachmentLoading(false);
    };
    reader.onerror = () => {
      showToast("Failed to read file", "error");
      setPostAttachmentLoading(false);
    };
    reader.readAsDataURL(file);
  };

  // ── TYPING STATUS INDICATOR ──
  const handleTyping = async () => {
    if (!activeRoom) return;

    // Send typing: true
    if (!typingUsers[user.uid]) {
      await setDoc(doc(db, 'communityThreads', activeRoom.id), {
        [`typing.${user.uid}`]: true
      }, { merge: true });
    }

    // Reset typing status after 3 seconds of inactivity
    if (typingTimeoutRef.current[activeRoom.id]) {
      clearTimeout(typingTimeoutRef.current[activeRoom.id]);
    }

    typingTimeoutRef.current[activeRoom.id] = setTimeout(async () => {
      await setDoc(doc(db, 'communityThreads', activeRoom.id), {
        [`typing.${user.uid}`]: false
      }, { merge: true });
    }, 3000);
  };

  const getInitials = (name) => name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'ST';

  // Filtered chats based on search query
  const filteredChatUsers = chatUsers.filter(u => 
    u.displayName?.toLowerCase().includes(chatSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(chatSearch.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar Menu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>Community Workspace</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ask doubt queries, collaborate, and access classroom announcement logs</p>
        </div>

        {/* Tab switcher button */}
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '100px', padding: '3px' }}>
          <button onClick={() => setActiveTab('board')} style={{ padding: '8px 18px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700, background: activeTab === 'board' ? 'white' : 'transparent', color: activeTab === 'board' ? 'var(--dark)' : 'var(--text-muted)' }}>
            📢 Announcements
          </button>
          <button onClick={() => setActiveTab('chat')} style={{ padding: '8px 18px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700, background: activeTab === 'chat' ? 'white' : 'transparent', color: activeTab === 'chat' ? 'var(--dark)' : 'var(--text-muted)' }}>
            💬 Doubt Clearing Chat
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, background: 'var(--white)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        
        {/* ==================== TAB 1: POST BOARD ==================== */}
        {activeTab === 'board' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Student Announcement Board</h2>
              {(isAdmin || isFaculty || isStudent) && (
                <button onClick={() => { setEditingPost(null); setMessage(''); setPostAttachment(null); setIsModalOpen(true); }} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem', borderRadius: '10px' }}>
                  <Plus size={16} /> Create Notice Note
                </button>
              )}
            </div>

            {postsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 120, background: 'var(--surface)', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />)}
              </div>
            ) : posts.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', color: 'var(--text-light)' }}>
                <MessageSquare size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <h3>No announcement notices logged</h3>
                <p style={{ fontSize: '0.85rem' }}>Be the first to post a study tip or notification query!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {posts.map(post => (
                  <div key={post.id} className="card card-p" style={{ padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {post.authorPhoto ? (
                          <img src={post.authorPhoto} alt={post.author} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-on-primary)', fontWeight: 700, fontSize: '0.8rem' }}>
                            {getInitials(post.author)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {post.author}
                            {renderRoleBadge(post.authorRole)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} /> {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action buttons visible only to author and admin */}
                      {(user?.uid === post.authorId || isAdmin) && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingPost(post);
                              setMessage(post.message || '');
                              setPostAttachment(post.attachmentData ? { data: post.attachmentData, type: post.attachmentType || 'image', name: post.attachmentName || '' } : null);
                              setIsModalOpen(true);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
                            title="Edit Notice"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
                            title="Delete Notice"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p style={{ color: 'var(--dark)', lineHeight: 1.5, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{post.message}</p>
                    {post.attachmentData && (
                      <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', maxWidth: '100%', maxHeight: '400px' }}>
                        <img src={post.attachmentData} alt={post.attachmentName || 'Notice Attachment'} style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: PRIVATE DOUBT CHAT ==================== */}
        {activeTab === 'chat' && (
          <div style={{ height: '100%', display: 'flex' }}>
            
            {/* Left pane: chats and directory list */}
            <div style={{ width: '320px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
              
              {/* Search Bar */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input
                    placeholder={isStudent ? "Search assigned faculty..." : "Search assigned students..."}
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* List Pane */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.05em', paddingLeft: '8px', marginBottom: '10px' }}>
                  {isStudent ? 'Assigned Mentors' : isFaculty ? 'Assigned Students' : 'Direct Contacts'}
                </h3>

                {filteredChatUsers.length === 0 ? (
                  <div style={{ padding: '24px 8px', textLight: 'center', color: 'var(--text-light)', fontSize: '0.8rem', textAlign: 'center' }}>
                    No assigned profiles found matching query.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {filteredChatUsers.map(itemUser => {
                      const roomId = user.uid < itemUser.id ? `${user.uid}_${itemUser.id}` : `${itemUser.id}_${user.uid}`;
                      const roomDoc = rooms.find(r => r.id === roomId);
                      const isUnread = roomDoc ? (isFaculty ? roomDoc.facultyUnreadCount > 0 : roomDoc.studentUnreadCount > 0) : false;
                      const unreadCount = roomDoc ? (isFaculty ? roomDoc.facultyUnreadCount : roomDoc.studentUnreadCount) : 0;
                      const isUserActive = activeRoom?.id === roomId;

                      return (
                        <div
                          key={itemUser.id}
                          onClick={() => handleStartChat(itemUser)}
                          style={{
                            display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '12px',
                            background: isUserActive ? 'var(--primary-light)' : 'transparent',
                            cursor: 'pointer', transition: 'var(--transition)'
                          }}
                          onMouseEnter={e => !isUserActive && (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                          onMouseLeave={e => !isUserActive && (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ position: 'relative' }}>
                            <img src={itemUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} alt={itemUser.displayName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                            <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: itemUser.availability === 'Busy' ? 'var(--warning)' : 'var(--success)', border: '2px solid var(--surface)' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <h4 style={{ fontSize: '0.88rem', fontWeight: isUnread ? 800 : 700, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {itemUser.displayName}
                                {renderRoleBadge(itemUser.role)}
                              </h4>
                              {isUnread && (
                                <span style={{ background: 'var(--primary)', color: 'var(--text-on-primary)', fontSize: '0.65rem', fontWeight: 800, minWidth: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}>
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: isUnread ? 'var(--dark)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isUnread ? 600 : 400 }}>
                              {roomDoc ? roomDoc.lastMessage : itemUser.role || 'Student'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right pane: message window */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
              {activeRoom ? (
                <>
                  {/* Chat header */}
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={activeRoom.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} alt={activeRoom.displayName} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {activeRoom.displayName}
                          {renderRoleBadge(activeRoom.role)}
                        </h4>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: activeRoom.availability === 'Busy' ? 'var(--warning)' : 'var(--success)' }} />
                          {activeRoom.availability === 'Busy' ? `Busy (Office Hours: ${activeRoom.officeTimings || 'Flexible'})` : 'Available'}
                        </div>
                      </div>
                    </div>
                    {/* Secondary details */}
                    <div style={{ textAlignment: 'right', fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', gap: '8px' }}>
                      {activeRoom.phone && <a href={`tel:${activeRoom.phone}`} style={{ padding: '8px', borderRadius: '8px', background: 'var(--surface)', color: 'var(--primary)' }}><Phone size={14} /></a>}
                    </div>
                  </div>

                  {/* Messages window stream */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {messagesLoading ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 className="spinning" size={24} style={{ color: 'var(--primary)' }} />
                      </div>
                    ) : (
                      <>
                        {messages.map((msg, index) => {
                          const isMe = msg.senderId === user.uid;
                          return (
                            <div key={msg.id || index} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', width: '100%' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '70%' }}>
                                {!isMe && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px', paddingLeft: '4px' }}>
                                    <span style={{ fontWeight: 600 }}>{msg.senderName}</span>
                                    {renderRoleBadge(msg.senderRole)}
                                  </div>
                                )}
                                <div style={{
                                  padding: '12px 16px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                  background: isMe ? 'var(--primary)' : 'var(--surface-elevated)',
                                  color: isMe ? 'var(--text-on-primary)' : 'var(--text-primary)',
                                  boxShadow: 'var(--shadow-sm)',
                                  border: isMe ? 'none' : '1px solid var(--border)'
                                }}>
                                  
                                  {/* Attachment block if exists */}
                                  {(msg.attachments?.[0] || msg.attachmentData) && (() => {
                                    const att = msg.attachments?.[0] || { data: msg.attachmentData, type: msg.attachmentType, name: msg.attachmentName };
                                    return (
                                      <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                                        {att.type === 'image' ? (
                                          <img src={att.data} alt={att.name || 'attachment'} style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                                        ) : (
                                          <a href={att.data} download={att.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--surface)', borderRadius: '6px', color: isMe ? 'white' : 'var(--primary)', fontWeight: 600, fontSize: '0.8rem' }}>
                                            <FileText size={16} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{att.name}</span>
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* Text message */}
                                  {(msg.message || msg.text) && <p style={{ fontSize: '0.88rem', wordBreak: 'break-word', lineHeight: 1.4 }}>{msg.message || msg.text}</p>}
                                </div>
                                
                                {/* Timestamp and seen ticks */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.68rem', color: 'var(--text-light)', padding: '0 4px' }}>
                                  <span>
                                    {msg.timestamp ? (msg.timestamp.toDate ? format(msg.timestamp.toDate(), 'h:mm a') : format(new Date(msg.timestamp), 'h:mm a')) : msg.createdAt ? (msg.createdAt.toDate ? format(msg.createdAt.toDate(), 'h:mm a') : format(new Date(msg.createdAt), 'h:mm a')) : 'sending...'}
                                  </span>
                                  {isMe && (
                                    <span>
                                      {(msg.readStatus === true || msg.seen === true) ? <CheckCheck size={12} style={{ color: 'var(--success)' }} /> : <Check size={12} />}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {/* Typing indicator */}
                        {Object.entries(typingUsers).map(([userId, typingVal]) => {
                          if (userId !== user.uid && typingVal) {
                            return (
                              <div key={userId} style={{ display: 'flex', justifyContent: 'flex-start', padding: '4px' }}>
                                <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', borderRadius: '12px', background: isDarkMode ? '#1E2D4A' : '#E2E8F0', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                                  <span>{activeRoom.displayName} is typing</span>
                                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>.</motion.span>
                                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}>.</motion.span>
                                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}>.</motion.span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Attachment Preview panel */}
                  {attachment && (
                    <div style={{ padding: '8px 24px', background: 'var(--surface-secondary)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {attachment.type === 'image' ? <Image size={18} style={{ color: 'var(--primary)' }} /> : <FileText size={18} style={{ color: 'var(--danger)' }} />}
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dark)' }}>{attachment.name}</span>
                      </div>
                      <button onClick={() => setAttachment(null)} style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>Remove</button>
                    </div>
                  )}

                  {/* Input entry bar */}
                  <form onSubmit={handleSendMessage} style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--white)', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                    {/* Attachment trigger */}
                    <div style={{ position: 'relative' }}>
                      <label htmlFor="chat-attachment-file" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                        <Paperclip size={18} />
                      </label>
                      <input
                        id="chat-attachment-file"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        disabled={uploadingAttachment}
                        style={{ display: 'none' }}
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Type a doubt message..."
                      value={newMessage}
                      onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
                      style={{ flex: 1, padding: '10px 16px', borderRadius: '100px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.9rem' }}
                    />
                    
                    <button type="submit" className="btn btn-primary" style={{ width: '38px', height: '38px', borderRadius: '50%', padding: 0 }} disabled={!newMessage.trim() && !attachment}>
                      <Send size={16} />
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)', padding: '24px' }}>
                  <MessageSquare size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                  <h3>No chat selected</h3>
                  <p style={{ fontSize: '0.85rem' }}>Select a student or teacher from the roster to start direct doubt clearing.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE/EDIT BOARD POST MODAL */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPost ? "Edit Notice Note" : "Create Notice Note"}>
        <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <textarea 
              className="form-input" 
              required={!postAttachment} 
              rows="5" 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Type announcement description details here..." 
              style={{ resize: 'none' }} 
            />
          </div>
          {/* Image upload trigger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--primary)', width: 'fit-content' }}>
              <Image size={18} />
              <span>Attach Image (Optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePostFileChange}
                disabled={postAttachmentLoading}
                style={{ display: 'none' }}
              />
            </label>
            {postAttachmentLoading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reading image file...</span>}
            {postAttachment && (
              <div style={{ position: 'relative', marginTop: '8px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', maxWidth: '100%', height: '140px' }}>
                <img src={postAttachment.data} alt="Post Attachment Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => setPostAttachment(null)}
                  style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'var(--danger)', color: 'var(--text-on-primary)',
                    border: 'none', borderRadius: '50%', width: '24px', height: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem'
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={handleCloseModal} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting || postAttachmentLoading} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? (editingPost ? 'Saving Changes...' : 'Posting Notice...') : (editingPost ? 'Save Changes' : 'Log Notice')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Styling */}
      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

    </div>
  );
};

export default Community;
