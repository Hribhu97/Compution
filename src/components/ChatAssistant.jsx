import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db, firebaseConfig } from '../firebase';
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

const fetchGeminiReply = async (userMessage, chatHistory = []) => {
  try {
    const apiKey = firebaseConfig.apiKey;
    if (!apiKey) throw new Error("No API key configured");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const contents = chatHistory.map(m => ({
      role: m.sender === 'bot' ? 'model' : 'user',
      parts: [{ text: m.message }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{
            text: "You are Compution AI, a helpful virtual assistant for Compution, an educational CS institute located at 20, J.K. Mitra Road, Kolkata 700037. You assist students, parents, and visitors. Keep your answers concise, friendly, and relevant to Computer Science tuition, coding classes (XI, XII, B.Sc, B.Tech, Python, DSA, Java, C++, Web Dev, Excel, Tally), timing (8AM to 8PM), fees, and general scheduling. IMPORTANT: Answer in plain text only. Do not use Markdown, bold formatting (no asterisks **), lists with bullet characters, or special syntax. Keep it conversational."
          }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) throw new Error("No response text in candidate");
    return replyText.trim();
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw error;
  }
};

const getChatBubbles = (firestoreMsgs) => {
  const bubbles = [];
  firestoreMsgs.forEach(m => {
    if (m.sender === 'user' && m.message && !m.prompt) {
      bubbles.push({
        id: m.id + '-user',
        message: m.message,
        sender: 'user',
        createdAt: m.createdAt
      });
    } else if (m.sender === 'bot' && m.message) {
      bubbles.push({
        id: m.id + '-bot',
        message: m.message,
        sender: 'bot',
        createdAt: m.createdAt
      });
    } else {
      if (m.prompt) {
        bubbles.push({
          id: m.id + '-prompt',
          message: m.prompt,
          sender: 'user',
          createdAt: m.createdAt
        });
      }
      if (m.response) {
        bubbles.push({
          id: m.id + '-response',
          message: m.response,
          sender: 'bot',
          createdAt: m.createdAt
        });
      }
    }
  });
  return bubbles;
};

const ChatAssistant = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const bottomRef = useRef(null);

  const isLastMsgProcessing = () => {
    if (messages.length === 0) return false;
    const last = messages[messages.length - 1];
    if (last.prompt && !last.response) {
      if (last.status?.state === 'ERRORED') return false;
      return true;
    }
    return false;
  };

  const showTyping = isTyping || isLastMsgProcessing();

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
  }, [messages, isOpen, showTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    
    if (user?.uid) {
      await addDoc(collection(db, `users/${user.uid}/chatHistory`), {
        prompt: userMsg,
        message: userMsg,
        sender: 'user',
        createdAt: serverTimestamp()
      });
    } else {
      const newMsg = {
        id: 'temp-' + Date.now(),
        message: userMsg,
        sender: 'user',
        createdAt: { toDate: () => new Date() }
      };
      setMessages(prev => [...prev, newMsg]);

      setIsTyping(true);
      
      let botReply = "";
      try {
        botReply = await fetchGeminiReply(userMsg, messages.slice(-10));
      } catch (err) {
        console.warn("Falling back to local FAQ matching.");
        botReply = matchFAQ(userMsg);
      }

      const newBotMsg = {
        id: 'temp-bot-' + Date.now(),
        message: botReply,
        sender: 'bot',
        createdAt: { toDate: () => new Date() }
      };
      setMessages(prev => [...prev, newBotMsg]);
      setIsTyping(false);
    }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {user && (
                    <a
                      href="https://wa.me/9674035542"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Contact Support on WhatsApp"
                      style={{
                        color: 'white',
                        background: 'rgba(255,255,255,0.15)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        transition: 'var(--transition)'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >
                      <span>WhatsApp Support</span>
                    </a>
                  )}
                  <button onClick={() => setIsOpen(false)} style={{ color: 'white', background: 'rgba(255,255,255,0.2)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)' }}>
                {getChatBubbles(messages).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 20 }}>
                    👋 Hi {(user?.displayName || 'Student').split(' ')[0]}! How can I help you today?
                  </div>
                )}
                {getChatBubbles(messages).map((m, i) => {
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
                {showTyping && (
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
