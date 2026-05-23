import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, X, Send } from 'lucide-react';
import { format } from 'date-fns';

const FAQ_DATA = [
  { q: ["courses", "offer", "what do you teach"], a: "We offer Computer Science classes for XI, XII, B.Sc, B.Tech and programming courses." },
  { q: ["timing", "class time", "when are classes"], a: "Classes run from 8AM to 8PM depending on batch." },
  { q: ["pay", "fees", "payment"], a: "You can pay from the Fees section or contact administration." },
  { q: ["location", "address", "where is"], a: "20, J.K. Mitra Road, Kolkata 700037." },
  { q: ["tests", "exam", "assessment"], a: "Tests are conducted weekly and monthly." },
  { q: ["contact", "support", "help"], a: "Contact administration or use the help section." }
];

const matchFAQ = (input) => {
  const text = input.toLowerCase();
  for (let faq of FAQ_DATA) {
    if (faq.q.some(keyword => text.includes(keyword))) {
      return faq.a;
    }
  }
  return "I'm unable to find that information. Please contact administration.";
};

const ChatAssistant = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) {
      setMessages([]);
      return;
    }
    const chatRef = query(collection(db, `users/${user.uid}/chatHistory`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(chatRef, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setMessages(data);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    
    if (user?.uid) {
      await addDoc(collection(db, `users/${user.uid}/chatHistory`), {
        message: userMsg,
        sender: 'user',
        createdAt: serverTimestamp()
      });

      if (user.role === 'student') {
        window.open(`https://wa.me/9674035542?text=${encodeURIComponent(userMsg)}`, '_blank');
      }
    } else {
      const newMsg = {
        id: 'temp-' + Date.now(),
        message: userMsg,
        sender: 'user',
        createdAt: { toDate: () => new Date() }
      };
      setMessages(prev => [...prev, newMsg]);
    }

    setIsTyping(true);
    
    setTimeout(async () => {
      const botReply = matchFAQ(userMsg);
      if (user?.uid) {
        await addDoc(collection(db, `users/${user.uid}/chatHistory`), {
          message: botReply,
          sender: 'bot',
          createdAt: serverTimestamp()
        });
      } else {
        const newBotMsg = {
          id: 'temp-bot-' + Date.now(),
          message: botReply,
          sender: 'bot',
          createdAt: { toDate: () => new Date() }
        };
        setMessages(prev => [...prev, newBotMsg]);
      }
      setIsTyping(false);
    }, 1200);
  };

  const getInitials = (name) => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'ST';

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`chat-fab${!isOpen ? ' pulse' : ''}`}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 900,
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, #7C4DFF 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(83,109,254,0.35)',
        }}
      >
        <MessageCircle size={28} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 998, backdropFilter: 'blur(2px)' }}
            />
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="chat-widget-panel"
            >
              <div style={{ background: 'linear-gradient(180deg, #536DFE 0%, #667FFF 100%)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: '1rem' }}>C</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Compution AI</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Online assistant</div>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} style={{ color: 'white', background: 'rgba(255,255,255,0.2)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 20 }}>
                    👋 Hi {(user?.displayName || 'Student').split(' ')[0]}! How can I help you today?
                  </div>
                )}
                {messages.map((m, i) => {
                  const isBot = m.sender === 'bot';
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', alignSelf: isBot ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                      {isBot && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 800 }}>C</div>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isBot ? 'flex-start' : 'flex-end' }}>
                        <div style={{
                          background: isBot ? 'white' : 'var(--primary)',
                          color: isBot ? 'var(--dark)' : 'white',
                          padding: '12px 16px', borderRadius: isBot ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                          fontSize: '0.9rem', lineHeight: 1.4, boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                          {m.message}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-light)' }}>
                          {m.createdAt ? format(m.createdAt.toDate(), 'h:mm a') : 'now'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
                {isTyping && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 800 }}>C</div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-light)' }} />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-light)' }} />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-light)' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: '16px', background: 'white', borderTop: '1px solid var(--border)' }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, background: 'var(--surface)', border: 'none', borderRadius: '100px', padding: '12px 20px', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button type="submit" disabled={!input.trim()} style={{ width: 42, height: 42, borderRadius: '50%', background: input.trim() ? 'var(--primary)' : 'var(--surface)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', opacity: input.trim() ? 1 : 0.5 }}>
                    <Send size={18} style={{ marginLeft: 2 }} />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatAssistant;
