import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db, firebaseConfig } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { MessageCircle, X, Send } from 'lucide-react';
import { format } from 'date-fns';

const KNOWLEDGE_BASE = {
  greetings: "Hello! Welcome to Compution. How can I help you today?",
  fees: "You can contact our administration team regarding fees and payment details.",
  courses: "We provide structured coaching and learning support for students. Please contact us for current course details.",
  faculty: "Our faculty members are available to guide students academically and personally.",
  contact: "You can reach us through WhatsApp or the contact details provided on our website.",
  admissions: "For admission assistance, please contact our support team and we will guide you through the process.",
  schedules: "Class schedules and batch timings can be viewed in the schedule section or obtained by contacting administration.",
  attendance: "Attendance is recorded regularly. You can track your attendance records in the student dashboard.",
  tests: "Tests and weekly/monthly assessments are conducted regularly to track student performance.",
  study_materials: "Study materials and learning resources are uploaded by mentors. You can view them in the dashboard under study materials.",
  default: "Sorry, I'm having trouble connecting right now, but I can still help with admissions, courses, fees, schedules, attendance, and study materials."
};

const matchKnowledgeBase = (input) => {
  const text = input.toLowerCase().trim();
  
  if (/\b(hi|hello|hey|greetings|hola)\b/.test(text)) {
    return KNOWLEDGE_BASE.greetings;
  }
  if (/\b(fee|fees|pay|payment|paid|pending|due|dues)\b/.test(text)) {
    return KNOWLEDGE_BASE.fees;
  }
  if (/\b(course|courses|subject|subjects|class|classes|batch|batches|teach|learn|programming|coding)\b/.test(text)) {
    return KNOWLEDGE_BASE.courses;
  }
  if (/\b(faculty|faculties|mentor|mentors|teacher|teachers|staff)\b/.test(text)) {
    return KNOWLEDGE_BASE.faculty;
  }
  if (/\b(admission|admissions|admission assistance|enrol|enroll|enrollment|register|registration|join)\b/.test(text)) {
    return KNOWLEDGE_BASE.admissions;
  }
  if (/\b(schedule|schedules|timing|timings|time|batch timing|routine|routines)\b/.test(text)) {
    return KNOWLEDGE_BASE.schedules;
  }
  if (/\b(attendance|absent|present|late|leave)\b/.test(text)) {
    return KNOWLEDGE_BASE.attendance;
  }
  if (/\b(test|tests|exam|exams|examination|examinations|assessment|assessments|score|scores|mark|marks)\b/.test(text)) {
    return KNOWLEDGE_BASE.tests;
  }
  if (/\b(material|materials|note|notes|study|study materials|book|books|pdf|resource|resources)\b/.test(text)) {
    return KNOWLEDGE_BASE.study_materials;
  }
  if (/\b(contact|support|help|whatsapp|phone|number|reach|email|address|location|where)\b/.test(text)) {
    return KNOWLEDGE_BASE.contact;
  }
  
  return KNOWLEDGE_BASE.default;
};

const formatMessageTime = (createdAt) => {
  if (!createdAt) return 'now';
  try {
    if (typeof createdAt.toDate === 'function') {
      return format(createdAt.toDate(), 'h:mm a');
    }
    if (createdAt instanceof Date) {
      return format(createdAt, 'h:mm a');
    }
    if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      return format(new Date(createdAt), 'h:mm a');
    }
    return 'now';
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'now';
  }
};

const fetchGeminiReply = async (userMessage, chatHistory = []) => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || firebaseConfig.apiKey;
    if (!apiKey) throw new Error("No API key configured");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
      
      // Safety check: if message is older than 30s, don't show typing indicator
      if (last.createdAt) {
        try {
          const createdTime = typeof last.createdAt.toDate === 'function' 
            ? last.createdAt.toDate().getTime() 
            : new Date(last.createdAt).getTime();
          if (Date.now() - createdTime > 30000) {
            return false;
          }
        } catch (e) {
          console.warn("Error checking message age:", e);
        }
      }
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
      try {
        // 1. Add user prompt to Firestore
        const docRef = await addDoc(collection(db, `users/${user.uid}/chatHistory`), {
          prompt: userMsg,
          message: userMsg,
          sender: 'user',
          createdAt: serverTimestamp()
        });

        // 2. Set typing state locally to show immediate indicator
        setIsTyping(true);

        // 3. Fetch reply from Gemini or local Knowledge Base fallback
        let botReply = "";
        try {
          botReply = await fetchGeminiReply(userMsg, getChatBubbles(messages).slice(-10));
        } catch (err) {
          console.warn("Gemini API failed, falling back to local Knowledge Base:", err);
          botReply = matchKnowledgeBase(userMsg);
        }

        // 4. Update the document in Firestore with the bot's response
        await updateDoc(doc(db, `users/${user.uid}/chatHistory`, docRef.id), {
          response: botReply,
          status: { state: 'COMPLETED' },
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error in chat send flow for logged-in user:", error);
      } finally {
        setIsTyping(false);
      }
    } else {
      // Guest/Anonymous user flow (Local state only)
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
        console.warn("Gemini API failed, falling back to local Knowledge Base:", err);
        botReply = matchKnowledgeBase(userMsg);
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
                          {formatMessageTime(m.createdAt)}
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
