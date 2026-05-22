import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(34, 37, 43, 0.45)',
              backdropFilter: 'blur(6px)', zIndex: 1100
            }}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: '50%', top: '50%', x: '-50%', y: '-50%',
              width: 'min(500px, calc(100vw - 32px))', maxHeight: 'min(90vh, 90dvh)', overflowY: 'auto',
              background: 'white', borderRadius: '24px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.12)', zIndex: 1101,
              padding: 'clamp(20px, 5vw, 32px)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 id="modal-title" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{title}</h2>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)'
              }}>
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
