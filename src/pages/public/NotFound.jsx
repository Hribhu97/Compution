import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Home, HelpCircle } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F7F6F3 0%, #EAEFF8 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
      }}
    >
      {/* Decorative Background Elements */}
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 6,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: '120px',
          height: '120px',
          borderRadius: '30%',
          background: 'rgba(83, 109, 254, 0.05)',
          filter: 'blur(8px)',
          zIndex: 1,
        }}
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          rotate: [0, -8, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 8,
          ease: 'easeInOut',
          delay: 1,
        }}
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '15%',
          width: '160px',
          height: '160px',
          borderRadius: '40%',
          background: 'rgba(126, 200, 255, 0.08)',
          filter: 'blur(12px)',
          zIndex: 1,
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          maxWidth: '560px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 36px',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Animated Icon Header */}
        <motion.div
          variants={itemVariants}
          style={{
            position: 'relative',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'rgba(83, 109, 254, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <AlertCircle size={48} strokeWidth={1.5} />
          </motion.div>
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--white)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)',
              border: '1px solid rgba(0,0,0,0.02)',
            }}
          >
            <HelpCircle size={18} strokeWidth={2} />
          </motion.div>
        </motion.div>

        {/* Status Code */}
        <motion.h1
          variants={itemVariants}
          style={{
            fontSize: 'clamp(4rem, 10vw, 6.5rem)',
            fontWeight: 900,
            lineHeight: 1,
            marginBottom: '8px',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </motion.h1>

        {/* Heading */}
        <motion.h2
          variants={itemVariants}
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--dark)',
            marginBottom: '16px',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '-0.02em',
          }}
        >
          Page Not Found
        </motion.h2>

        {/* Subheading */}
        <motion.p
          variants={itemVariants}
          style={{
            fontSize: '1.05rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '40px',
            maxWidth: '440px',
            fontFamily: 'var(--font-body)',
          }}
        >
          We couldn&apos;t resolve this route. Let&apos;s reconnect you with your workflow.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            maxWidth: '320px',
          }}
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '16px 28px',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <Home size={18} />
            Return to Dashboard
          </button>

          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost"
            style={{
              width: '100%',
              padding: '16px 28px',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
