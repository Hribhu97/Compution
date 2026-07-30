import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HOUSES, SORTING_CEREMONY_V2_QUESTIONS, HOUSE_RESULT_MESSAGES, 
  calculateHouseRecommendation, assignUserHouse, switchUserHouse 
} from '../../services/battleOfMindsService';
import { Shield, Sparkles, ChevronRight, X, Volume2, VolumeX } from 'lucide-react';

/* ─── MAGICAL WEB AUDIO SYNTHESIZER ──────────────────────────────── */
const playMagicalSound = (type = 'chime', isMuted = false) => {
  if (isMuted || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'fanfare') {
      // Triumphant sorting ceremony melody (C5 -> E5 -> G5 -> C6 chord arpeggio)
      const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 1.2);
      });
    } else if (type === 'tick') {
      // Soft chime for option selection
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Soft ambient magical sparkle chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Ignore audio context policies gracefully
  }
};

const HouseSortingModal = ({ user, isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1); // 1: Welcome, 2: Quiz v2, 3: Recommendation, 4: Manual Selection
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [q.id]: targetHouse }
  const [recommendedHouseId, setRecommendedHouseId] = useState('gryffindor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Resume progress from localStorage if student closes mid-quiz
  useEffect(() => {
    if (isOpen && user?.uid) {
      playMagicalSound('chime', isMuted);
      const storageKey = `battleOfMinds_quizProgress_${user.uid}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            setAnswers(parsed.answers);
            const savedIndex = Number(parsed.index) || 0;
            if (savedIndex < SORTING_CEREMONY_V2_QUESTIONS.length) {
              setCurrentQIndex(savedIndex);
              setStep(2); // Directly resume quiz
            }
          }
        } catch (e) {
          console.warn("Failed to parse saved sorting quiz progress:", e);
        }
      }
    }
  }, [isOpen, user?.uid]);

  if (!isOpen || !user || user?.role?.toLowerCase() !== 'student') return null;

  const currentQ = SORTING_CEREMONY_V2_QUESTIONS[currentQIndex];

  const handleOptionSelect = (targetHouse) => {
    playMagicalSound('tick', isMuted);
    const updatedAnswers = { ...answers, [currentQ.id]: targetHouse };
    setAnswers(updatedAnswers);

    const nextIndex = currentQIndex + 1;
    const storageKey = `battleOfMinds_quizProgress_${user.uid}`;

    if (nextIndex < SORTING_CEREMONY_V2_QUESTIONS.length) {
      setCurrentQIndex(nextIndex);
      localStorage.setItem(storageKey, JSON.stringify({ index: nextIndex, answers: updatedAnswers }));
    } else {
      // Quiz Complete - Calculate recommendation
      localStorage.removeItem(storageKey);
      const rec = calculateHouseRecommendation(updatedAnswers);
      setRecommendedHouseId(rec);
      setStep(3);
      playMagicalSound('fanfare', isMuted);
    }
  };

  const handleJoinRecommended = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await assignUserHouse(user.uid, recommendedHouseId, false);
      localStorage.removeItem(`battleOfMinds_quizProgress_${user.uid}`);
      playMagicalSound('fanfare', isMuted);
      if (onComplete) onComplete(recommendedHouseId);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to join House');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSelection = async (houseId) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      if (user?.houseAssigned) {
        await switchUserHouse(user, houseId, user.role === 'admin');
      } else {
        await assignUserHouse(user.uid, houseId, true);
      }
      localStorage.removeItem(`battleOfMinds_quizProgress_${user.uid}`);
      playMagicalSound('fanfare', isMuted);
      if (onComplete) onComplete(houseId);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to switch House');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(10px)',
      padding: '16px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: '#0B1329',
          color: '#FFFFFF',
          borderRadius: '28px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '560px',
          boxSizing: 'border-box',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.15)',
          position: 'relative',
          maxHeight: '90dvh',
          overflowY: 'auto'
        }}
      >
        {/* Top Controls: Audio & Close */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '8px', zIndex: 10 }}>
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              color: '#FFF',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMuted ? <VolumeX size={16} color="#F87171" /> : <Volume2 size={16} color="#4ADE80" />}
          </button>
          
          <button
            onClick={onClose}
            title="Close Modal"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              color: '#FFF',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1.5px solid rgba(239, 68, 68, 0.5)',
            color: '#FCA5A5',
            padding: '12px 16px',
            borderRadius: '14px',
            fontSize: '0.88rem',
            marginBottom: '18px',
            fontWeight: 800
          }}>
            {errorMessage}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: WELCOME CARD */}
          {step === 1 && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #F59E0B, #DC2626)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 10px 30px rgba(245, 158, 11, 0.35)'
                }}>
                  <Shield size={38} color="#FFFFFF" />
                </div>
                <h2 style={{ fontSize: '1.7rem', fontWeight: 950, margin: '0 0 10px', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  Sorting Ceremony 🏰
                </h2>
                <p style={{ color: '#CBD5E1', fontSize: '0.95rem', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                  Discover your natural learning style and mindset through 15 real-life scenarios. Every choice represents a unique strength!
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '16px 20px',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <span style={{ fontSize: '0.88rem', color: '#94A3B8', fontWeight: 700 }}>Estimated Time</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#F59E0B' }}>✨ 1–2 Minutes</span>
              </div>

              <button
                onClick={() => {
                  setStep(2);
                  playMagicalSound('chime', isMuted);
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '100px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366F1, #3B82F6)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
                }}
              >
                Begin Ceremony <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {/* STEP 2: 15 SCENARIO-BASED QUESTIONS */}
          {step === 2 && currentQ && (
            <motion.div key={`quiz-${currentQIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {/* Progress Indicator */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94A3B8', fontWeight: 800, marginBottom: '8px' }}>
                  <span>Question {currentQIndex + 1} of {SORTING_CEREMONY_V2_QUESTIONS.length}</span>
                  <span style={{ color: '#60A5FA' }}>{Math.round(((currentQIndex + 1) / SORTING_CEREMONY_V2_QUESTIONS.length) * 100)}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', borderRadius: '100px', background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                  <div style={{ width: `${((currentQIndex + 1) / SORTING_CEREMONY_V2_QUESTIONS.length) * 100}%`, height: '100%', borderRadius: '100px', background: 'linear-gradient(90deg, #6366F1, #3B82F6)', transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* Scenario Question Text */}
              <div style={{ textAlign: 'center', margin: '24px 0 28px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.5, color: '#FFFFFF', margin: 0 }}>
                  "{currentQ.scenario}"
                </h3>
              </div>

              {/* 4 Option Buttons (Equal Weight & High Contrast) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentQ.options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionSelect(opt.target)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      border: '1.5px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      lineHeight: 1.4,
                      cursor: 'pointer',
                      minHeight: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <span style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.25)',
                      border: '1px solid rgba(99, 102, 241, 0.5)',
                      color: '#818CF8',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {opt.id}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: HOUSE RECOMMENDATION RESULT */}
          {step === 3 && (
            <motion.div key="recommendation" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              {(() => {
                const recHouse = HOUSES[recommendedHouseId];
                const resultMessage = HOUSE_RESULT_MESSAGES[recommendedHouseId] || recHouse.motto;
                return (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                      {recHouse.logo ? (
                        <img 
                          src={recHouse.logo} 
                          alt={recHouse.name} 
                          style={{ width: 110, height: 110, objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))' }} 
                        />
                      ) : (
                        <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))' }}>{recHouse.emoji}</div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#FCD34D', letterSpacing: '0.12em' }}>
                      Welcome to
                    </span>
                    <h2 style={{ fontSize: '2.4rem', fontWeight: 950, color: recHouse.primaryColor, margin: '4px 0 14px', letterSpacing: '-0.02em' }}>
                      {recHouse.name.toUpperCase()}
                    </h2>
                    <p style={{ color: '#E2E8F0', fontSize: '0.96rem', lineHeight: 1.65, maxWidth: '460px', margin: '0 auto 24px', fontWeight: 500 }}>
                      {resultMessage}
                    </p>

                    {/* Traits Pills */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
                      {recHouse.traits.map(t => (
                        <span key={t} style={{
                          padding: '6px 14px',
                          borderRadius: '100px',
                          background: 'rgba(255,255,255,0.12)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          color: '#FFFFFF'
                        }}>
                          ✨ {t}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <button
                        onClick={handleJoinRecommended}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          padding: '16px',
                          borderRadius: '100px',
                          border: 'none',
                          background: `linear-gradient(135deg, ${recHouse.primaryColor}, #0F172A)`,
                          color: '#FFFFFF',
                          fontWeight: 900,
                          fontSize: '1.05rem',
                          cursor: isSubmitting ? 'wait' : 'pointer',
                          minHeight: '44px',
                          boxShadow: `0 8px 24px ${recHouse.primaryColor}50`
                        }}
                      >
                        {isSubmitting ? 'Joining House...' : `Join ${recHouse.name}`}
                      </button>

                      <button
                        onClick={() => setStep(4)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          padding: '8px',
                          minHeight: '44px'
                        }}
                      >
                        Choose Another House Manually
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* STEP 4: MANUAL HOUSE SELECTION */}
          {step === 4 && (
            <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 950, margin: '0 0 6px', color: '#FFFFFF' }}>Select Your House</h3>
                <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>
                  {user?.houseAssigned ? 'House changes enforce a 30-day cooldown period.' : 'Pick the house you want to represent.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                {Object.values(HOUSES).map(h => (
                  <div
                    key={h.id}
                    onClick={() => handleManualSelection(h.id)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: `2px solid ${h.primaryColor}80`,
                      borderRadius: '20px',
                      padding: '18px 12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      minHeight: '44px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                      {h.logo ? (
                        <img src={h.logo} alt={h.name} style={{ width: 44, height: 44, objectFit: 'contain' }} />
                      ) : (
                        <div style={{ fontSize: '2.2rem', marginBottom: '4px' }}>{h.emoji}</div>
                      )}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 950, color: h.primaryColor }}>{h.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#CBD5E1', marginTop: '4px', fontWeight: 600 }}>
                      {h.traits.slice(0, 2).join(' • ')}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(3)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '100px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                ← Back to Recommended House
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default HouseSortingModal;
