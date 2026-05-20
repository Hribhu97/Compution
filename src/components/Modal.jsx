import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(34, 37, 43, 0.4)',
              backdropFilter: 'blur(4px)', zIndex: 999
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
              width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
              background: 'white', borderRadius: '24px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.1)', zIndex: 1000,
              padding: '32px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{title}</h2>
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
