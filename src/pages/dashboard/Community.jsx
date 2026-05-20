import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Plus, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Modal from '../../components/Modal';

const stagger = { show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

const Community = () => {
  const { user } = useAuth();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    
    // Listen to personal community feed (as per specific security rule request)
    const commRef = query(collection(db, `users/${user.uid}/community`), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(commRef, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/community`), {
        message,
        author: user?.displayName || 'Student',
        authorPhoto: user?.photoURL || '',
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setMessage('');
    } catch(err) { console.error(err); }
    setIsSubmitting(false);
  };

  const getInitials = (name) => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'ST';

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Student Community</h1>
          <p style={{ color: 'var(--text-muted)' }}>Discuss, share, and learn with your peers</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '10px' }}>
          <Plus size={18} /> Create Post
        </button>
      </motion.div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 140, background: 'white', borderRadius: 20, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : posts.length === 0 ? (
        <motion.div variants={item} style={{ textAlign: 'center', padding: '80px', color: 'var(--text-light)', background: 'white', borderRadius: 20, border: '1px dashed var(--border-strong)' }}>
          <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--dark)', marginBottom: '8px' }}>No posts yet</h3>
          <p>Be the first to start a discussion!</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {posts.map(post => (
            <motion.div key={post.id} variants={item} className="card card-p" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {post.authorPhoto ? (
                  <img src={post.authorPhoto} alt={post.author} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
                    {getInitials(post.author)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{post.author}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                  </div>
                </div>
              </div>
              <p style={{ color: 'var(--dark)', lineHeight: 1.6, fontSize: '0.95rem' }}>{post.message}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* CREATE POST MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Post">
        <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <textarea className="form-input" required rows="5" value={message} onChange={e => setMessage(e.target.value)} placeholder="What's on your mind? Ask a question or share a thought..." style={{ resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </Modal>

    </motion.div>
  );
};

export default Community;
