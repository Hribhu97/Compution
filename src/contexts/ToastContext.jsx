import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  
  const showToastSafe = useCallback((message, type = 'success', duration = 4000) => {
    try {
      if (context && typeof context.showToast === 'function') {
        context.showToast(message, type, duration);
      } else {
        console.warn(`[Toast Fallback] ${type.toUpperCase()}: ${message}`);
      }
    } catch (err) {
      console.error("Toast notification failed:", err);
    }
  }, [context]);

  const safeToastSuccess = useCallback((message) => {
    showToastSafe(message, 'success');
  }, [showToastSafe]);

  const safeToastError = useCallback((message) => {
    showToastSafe(message, 'error');
  }, [showToastSafe]);

  return {
    showToast: showToastSafe,
    safeToastSuccess,
    safeToastError
  };
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: <CheckCircle size={18} style={{ color: '#10B981' }} />,
    error: <AlertCircle size={18} style={{ color: '#EF4444' }} />,
    warning: <AlertTriangle size={18} style={{ color: '#F59E0B' }} />,
    info: <Info size={18} style={{ color: '#3B82F6' }} />,
  };

  const bgColors = {
    success: 'rgba(240, 253, 244, 0.95)',
    error: 'rgba(254, 242, 242, 0.95)',
    warning: 'rgba(255, 251, 235, 0.95)',
    info: 'rgba(239, 246, 255, 0.95)',
  };

  const borderColors = {
    success: 'rgba(16, 185, 129, 0.2)',
    error: 'rgba(239, 68, 68, 0.2)',
    warning: 'rgba(245, 158, 11, 0.2)',
    info: 'rgba(59, 130, 246, 0.2)',
  };

  const textColors = {
    success: '#065F46',
    error: '#991B1B',
    warning: '#92400E',
    info: '#1E40AF',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '400px',
          width: 'calc(100% - 48px)',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              layout
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 20px',
                borderRadius: '16px',
                background: bgColors[toast.type] || bgColors.info,
                border: `1.5px solid ${borderColors[toast.type] || borderColors.info}`,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.03)',
                color: textColors[toast.type] || textColors.info,
                fontWeight: 600,
                fontSize: '0.88rem',
                backdropFilter: 'blur(10px)',
                pointerEvents: 'auto',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                {icons[toast.type]}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.6,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
