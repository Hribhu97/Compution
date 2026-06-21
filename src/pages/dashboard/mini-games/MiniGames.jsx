import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useGames } from '../../../hooks/useGames';
import { gameRepository } from '../../../repositories/gameRepository';
import { 
  Gamepad2, Clock, Trophy, Play, CheckCircle, HelpCircle, 
  Terminal, Shield, Keyboard, Zap, Binary, Cpu, FileSpreadsheet, Brackets, Code
} from 'lucide-react';

// Import JSON question data from mini games subfolders
import progLogicData from '../../../../mini games/programming_logic/questions.json';
import compFundData from '../../../../mini games/computer_fundamentals/questions.json';
import typingData from '../../../../mini games/typing_challenge/questions.json';
import memoryData from '../../../../mini games/memory_match/questions.json';
import binaryData from '../../../../mini games/binary_conversion/questions.json';
import shortcutData from '../../../../mini games/shortcut_challenge/questions.json';
import hardwareData from '../../../../mini games/hardware_quiz/questions.json';
import officeData from '../../../../mini games/office_speed/questions.json';
import pythonPuzzleData from '../../../../mini games/python_puzzle/questions.json';
import htmlBuilderData from '../../../../mini games/html_builder/questions.json';

const GAME_METADATA = [
  { id: 'prog_logic', title: 'Programming Logic', icon: Terminal, category: 'Logic', difficulty: 'Medium', points: 10, bg: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
  { id: 'comp_fund', title: 'Computer Fundamentals', icon: Shield, category: 'Fundamentals', difficulty: 'Easy', points: 5, bg: 'linear-gradient(135deg, #10B981, #047857)' },
  { id: 'typing_chal', title: 'Typing Challenge', icon: Keyboard, category: 'Speed', difficulty: 'Medium', points: 10, bg: 'linear-gradient(135deg, #F59E0B, #B45309)' },
  { id: 'memory_match', title: 'Memory Match', icon: Trophy, category: 'Memory', difficulty: 'Medium', points: 10, bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
  { id: 'binary_conv', title: 'Binary Conversion', icon: Binary, category: 'Math', difficulty: 'Hard', points: 15, bg: 'linear-gradient(135deg, #EF4444, #B91C1C)' },
  { id: 'shortcut_key', title: 'Shortcut Key Challenge', icon: Zap, category: 'Speed', difficulty: 'Medium', points: 10, bg: 'linear-gradient(135deg, #EC4899, #BE185D)' },
  { id: 'hardware_quiz', title: 'Computer Hardware Quiz', icon: Cpu, category: 'Hardware', difficulty: 'Easy', points: 5, bg: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
  { id: 'office_speed', title: 'MS Office Speed Challenge', icon: FileSpreadsheet, category: 'Office', difficulty: 'Easy', points: 5, bg: 'linear-gradient(135deg, #14B8A6, #0F766E)' },
  { id: 'python_puzzle', title: 'Python Puzzle', icon: Brackets, category: 'Logic', difficulty: 'Hard', points: 15, bg: 'linear-gradient(135deg, #6366F1, #4338CA)' },
  { id: 'html_builder', title: 'HTML Builder', icon: Code, category: 'Web Dev', difficulty: 'Medium', points: 10, bg: 'linear-gradient(135deg, #F43F5E, #BE123C)' }
];

const MiniGames = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { games, globalLeaderboard, submitScore, hasPlayedToday, loading } = useGames(user?.uid);
  
  const [activeGameId, setActiveGameId] = useState(null);
  const [gameLeaderboard, setGameLeaderboard] = useState([]);
  const [leaderboardTab, setLeaderboardTab] = useState('global'); // 'global' | 'game'
  const [gameStartTime, setGameStartTime] = useState(null);

  // Load game leaderboard from firestore in real time when activeGameId is selected
  useEffect(() => {
    if (!activeGameId) {
      setGameLeaderboard([]);
      return;
    }
    const unsub = gameRepository.subscribeToGameLeaderboard(activeGameId, (data) => {
      setGameLeaderboard(data);
    });
    return () => unsub();
  }, [activeGameId]);

  // Trigger seeding of games metadata in firestore if not exists
  useEffect(() => {
    if (user?.role === 'admin' && !loading && games.length === 0) {
      gameRepository.seedGames(GAME_METADATA)
        .then(() => showToast("Games collection seeded successfully", "success"))
        .catch(err => console.error("Games seeding failed:", err));
    }
  }, [user, games, loading]);

  const handleLaunchGame = (gameId) => {
    if (hasPlayedToday(gameId) && user?.role !== 'admin') {
      showToast("You have already played this game today! Come back tomorrow.", "warning");
      return;
    }
    setActiveGameId(gameId);
    setGameStartTime(Date.now());
  };

  const handleGameComplete = async (score, pointsEarned) => {
    const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);
    const gameMeta = GAME_METADATA.find(g => g.id === activeGameId);

    try {
      showToast("Saving game score...", "info");
      const res = await submitScore(
        user.displayName || user.name,
        activeGameId,
        gameMeta.title,
        score,
        timeSpent,
        pointsEarned
      );
      
      showToast(`Success! Earned ${pointsEarned} Points and +${res.addedXp} XP! 🚀`, "success");
      setActiveGameId(null);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to submit score", "error");
      setActiveGameId(null);
    }
  };

  // -----------------------------------------------------------------
  // RENDER GAME CONTROLLER
  // -----------------------------------------------------------------
  const renderActiveGame = () => {
    switch (activeGameId) {
      case 'prog_logic':
        return <QuizGame title="Programming Logic" questions={progLogicData.questions} onComplete={handleGameComplete} maxPoints={10} />;
      case 'comp_fund':
        return <QuizGame title="Computer Fundamentals" questions={compFundData.questions} onComplete={handleGameComplete} maxPoints={5} />;
      case 'hardware_quiz':
        return <QuizGame title="Computer Hardware Quiz" questions={hardwareData.questions} onComplete={handleGameComplete} maxPoints={5} />;
      case 'office_speed':
        return <QuizGame title="MS Office Speed Challenge" questions={officeData.questions} onComplete={handleGameComplete} maxPoints={5} />;
      case 'html_builder':
        return <QuizGame title="HTML Builder" questions={htmlBuilderData.challenges.map(c => ({ q: c.target, options: c.options, a: c.options[c.correctIndex] }))} onComplete={handleGameComplete} maxPoints={10} />;
      case 'typing_chal':
        return <TypingChallenge paragraphs={typingData.paragraphs} onComplete={handleGameComplete} maxPoints={10} />;
      case 'memory_match':
        return <MemoryMatch pairs={memoryData.pairs} onComplete={handleGameComplete} maxPoints={10} />;
      case 'binary_conv':
        return <BinaryConversion challenges={binaryData.challenges} onComplete={handleGameComplete} maxPoints={15} />;
      case 'shortcut_key':
        return <ShortcutKeyChallenge shortcuts={shortcutData.shortcuts} onComplete={handleGameComplete} maxPoints={10} />;
      case 'python_puzzle':
        return <PythonPuzzle puzzles={pythonPuzzleData.puzzles} onComplete={handleGameComplete} maxPoints={15} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: activeGameId ? '1fr' : '2.1fr 0.9fr', gap: '28px', color: 'var(--text-primary)' }} className="grid-2-col-mobile">
      
      {/* Active Game Overlay */}
      {activeGameId ? (
        <div style={{ background: 'var(--surface-card)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              🎮 Playing: {GAME_METADATA.find(g => g.id === activeGameId).title}
            </h2>
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to quit? You will lose progress and today's attempt.")) {
                  setActiveGameId(null);
                }
              }} 
              style={{ background: 'none', border: '1.5px solid var(--border-strong)', color: '#EF4444', fontWeight: 700, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
            >
              Quit Game
            </button>
          </div>
          {renderActiveGame()}
        </div>
      ) : (
        <>
          {/* Main Games Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>Daily Mini Games</h1>
              <p style={{ color: 'var(--text-muted)' }}>Sharpen your computer science skills and climb the leaderboard! Only 1 attempt per game daily.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {GAME_METADATA.map(game => {
                const played = hasPlayedToday(game.id);
                const IconComp = game.icon;

                return (
                  <div 
                    key={game.id} 
                    style={{ 
                      borderRadius: '20px', 
                      background: 'var(--surface-card)', 
                      border: '1px solid var(--border)', 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Header Banner */}
                    <div style={{ background: game.bg, padding: '24px', color: 'var(--text-on-primary)', position: 'relative' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, opacity: 0.8, letterSpacing: '0.05em' }}>
                        {game.category} • {game.difficulty}
                      </div>
                      <h3 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', color: 'var(--text-on-primary)', fontWeight: 800 }}>{game.title}</h3>
                      <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', opacity: 0.25 }}>
                        <IconComp size={48} />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Reward Points:</span>
                        <strong style={{ color: 'var(--primary)' }}>+{game.points} Points</strong>
                      </div>

                      {played ? (
                        <div style={{ 
                          marginTop: 'auto', 
                          padding: '12px', 
                          background: 'rgba(34,197,94,0.08)', 
                          color: '#22C55E', 
                          textAlign: 'center', 
                          borderRadius: '10px', 
                          fontWeight: 700, 
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}>
                          <CheckCircle size={16} /> Played Today
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleLaunchGame(game.id)}
                          style={{ 
                            marginTop: 'auto', 
                            background: 'var(--primary)', 
                            color: 'var(--text-on-primary)', 
                            border: 'none', 
                            borderRadius: '10px', 
                            padding: '12px', 
                            fontWeight: 700, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background 0.2s'
                          }}
                        >
                          <Play size={14} fill="white" /> Launch Game
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar Leaderboards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              
              {/* Leaderboard Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: '#F8F7F4', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
                <button 
                  onClick={() => setLeaderboardTab('global')}
                  style={{
                    flex: 1, border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem',
                    background: leaderboardTab === 'global' ? 'white' : 'transparent',
                    color: leaderboardTab === 'global' ? '#1A1A1A' : 'var(--text-muted)',
                    boxShadow: leaderboardTab === 'global' ? 'var(--shadow-xs)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  🏆 Global
                </button>
                <button 
                  onClick={() => setLeaderboardTab('game')}
                  style={{
                    flex: 1, border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem',
                    background: leaderboardTab === 'game' ? 'white' : 'transparent',
                    color: leaderboardTab === 'game' ? '#1A1A1A' : 'var(--text-muted)',
                    boxShadow: leaderboardTab === 'game' ? 'white' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  🎯 Game Specific
                </button>
              </div>

              {leaderboardTab === 'global' ? (
                <>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 16px 0' }}>Global Arcade Champions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {globalLeaderboard.length === 0 ? (
                      <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-light)', padding: '20px' }}>No points logged yet.</div>
                    ) : (
                      globalLeaderboard.map((student, idx) => (
                        <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: student.id === user?.uid ? 'rgba(37,99,235,0.06)' : '#F8F7F4', borderRadius: '10px', border: student.id === user?.uid ? '1.5px solid rgba(37,99,235,0.2)' : '1px solid var(--border)' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)', width: '20px' }}>#{idx + 1}</span>
                          <span style={{ fontWeight: 700, flex: 1, fontSize: '0.88rem' }}>{student.name || student.displayName}</span>
                          <strong style={{ color: '#2563EB', fontSize: '0.88rem' }}>{student.gamePoints || 0} pts</strong>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 16px 0' }}>Select a game to view leaderboard</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '-8px' }}>Launch a game to see top plays in this panel during game configuration.</p>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// -----------------------------------------------------------------
// GAME SUB-COMPONENTS
// -----------------------------------------------------------------

// 1. QUIZ GAME (Programming Logic, Fundamentals, Hardware, Office, HTML Builder)
const QuizGame = ({ title, questions, onComplete, maxPoints }) => {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const currentQ = questions[qIndex];

  const handleNext = () => {
    const isCorrect = selectedOpt === currentQ.a;
    const nextScore = isCorrect ? score + 1 : score;
    setScore(nextScore);

    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
      setSelectedOpt(null);
      setSubmitted(false);
    } else {
      const finalScorePercentage = (nextScore / questions.length);
      const pointsEarned = Math.round(finalScorePercentage * maxPoints);
      onComplete(nextScore, pointsEarned);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <span>Question {qIndex + 1} of {questions.length}</span>
        <span>Score: {score}</span>
      </div>

      <div style={{ padding: '24px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '16px', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.5 }}>
        {currentQ.q}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {currentQ.options.map((opt, i) => {
          let optBg = 'var(--surface-card)';
          let optBorder = '1px solid var(--border)';
          
          if (selectedOpt === opt) {
            optBg = 'var(--primary-light)';
            optBorder = '2px solid var(--primary)';
          }
          if (submitted) {
            if (opt === currentQ.a) {
              optBg = 'var(--success-light)';
              optBorder = '2px solid var(--success)';
            } else if (selectedOpt === opt) {
              optBg = 'var(--danger-light)';
              optBorder = '2px solid var(--danger)';
            }
          }

          return (
            <button
              key={i}
              disabled={submitted}
              onClick={() => setSelectedOpt(opt)}
              style={{
                textAlign: 'left', padding: '16px 20px', borderRadius: '12px', background: optBg, border: optBorder,
                fontSize: '0.95rem', fontWeight: 600, cursor: submitted ? 'default' : 'pointer', transition: 'all 0.15s'
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          disabled={!selectedOpt}
          onClick={() => setSubmitted(true)}
          style={{
            background: 'var(--text-primary)', color: 'var(--bg)', border: 'none', borderRadius: '10px', padding: '14px',
            fontWeight: 700, cursor: selectedOpt ? 'pointer' : 'not-allowed', marginTop: '10px', opacity: selectedOpt ? 1 : 0.5
          }}
        >
          Check Answer
        </button>
      ) : (
        <button
          onClick={handleNext}
          style={{
            background: 'var(--primary)', color: 'var(--text-on-primary)', border: 'none', borderRadius: '10px', padding: '14px',
            fontWeight: 700, cursor: 'pointer', marginTop: '10px'
          }}
        >
          {qIndex + 1 === questions.length ? 'Finish Game' : 'Next Question'}
        </button>
      )}
    </div>
  );
};

// 2. TYPING CHALLENGE
const TypingChallenge = ({ paragraphs, onComplete, maxPoints }) => {
  const [pIndex] = useState(() => Math.floor(Math.random() * paragraphs.length));
  const targetText = paragraphs[pIndex];
  const [typedText, setTypedText] = useState('');
  const [completed, setCompleted] = useState(false);

  const calculateScore = () => {
    const targetWords = targetText.split(' ');
    const typedWords = typedText.trim().split(' ');
    
    let correctCount = 0;
    typedWords.forEach((word, idx) => {
      if (word === targetWords[idx]) correctCount++;
    });

    const accuracy = Math.min(100, Math.round((correctCount / targetWords.length) * 100));
    const scoreVal = accuracy; // score represents percentage accuracy
    const pointsEarned = Math.round((accuracy / 100) * maxPoints);
    
    onComplete(scoreVal, pointsEarned);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Type the paragraph below as accurately as possible. The score is calculated based on matching words accuracy.</p>
      
      <div style={{ padding: '24px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '16px', fontSize: '1rem', lineHeight: 1.6, select: 'none', userSelect: 'none' }}>
        {targetText}
      </div>

      <textarea
        className="form-input"
        value={typedText}
        onChange={e => setTypedText(e.target.value)}
        rows={4}
        placeholder="Start typing here..."
        style={{ width: '100%', fontFamily: 'Courier New, monospace', fontSize: '0.98rem', padding: '16px', lineHeight: 1.5 }}
      />

      <button
        onClick={calculateScore}
        style={{
          background: 'var(--primary)', color: 'var(--text-on-primary)', border: 'none', borderRadius: '10px', padding: '14px',
          fontWeight: 700, cursor: 'pointer', marginTop: '10px'
        }}
      >
        Submit and Score
      </button>
    </div>
  );
};

// 3. MEMORY MATCH
const MemoryMatch = ({ pairs, onComplete, maxPoints }) => {
  const [cards, setCards] = useState([]);
  const [flippedIdxs, setFlippedIdxs] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [turns, setTurns] = useState(0);

  // Initialize cards
  useEffect(() => {
    const cardList = [];
    pairs.forEach((p, idx) => {
      cardList.push({ id: `term-${idx}`, val: p.term, matchId: idx, type: 'term' });
      cardList.push({ id: `def-${idx}`, val: p.definition, matchId: idx, type: 'def' });
    });
    // Shuffle cards
    cardList.sort(() => Math.random() - 0.5);
    setCards(cardList);
  }, [pairs]);

  const handleCardClick = (idx) => {
    if (flippedIdxs.length === 2 || flippedIdxs.includes(idx) || matchedPairs.includes(cards[idx].matchId)) {
      return;
    }

    const nextFlipped = [...flippedIdxs, idx];
    setFlippedIdxs(nextFlipped);

    if (nextFlipped.length === 2) {
      setTurns(turns + 1);
      const firstCard = cards[nextFlipped[0]];
      const secondCard = cards[nextFlipped[1]];

      if (firstCard.matchId === secondCard.matchId && firstCard.type !== secondCard.type) {
        setMatchedPairs([...matchedPairs, firstCard.matchId]);
        setFlippedIdxs([]);
        
        // Check game complete
        if (matchedPairs.length + 1 === pairs.length) {
          setTimeout(() => {
            const finalScore = Math.max(1, 100 - (turns * 5));
            const pointsEarned = turns <= 8 ? maxPoints : turns <= 12 ? Math.round(maxPoints * 0.8) : Math.round(maxPoints * 0.5);
            onComplete(finalScore, pointsEarned);
          }, 600);
        }
      } else {
        setTimeout(() => {
          setFlippedIdxs([]);
        }, 1000);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <span>Turns: {turns}</span>
        <span>Matched Pairs: {matchedPairs.length} of {pairs.length}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {cards.map((card, idx) => {
          const isFlipped = flippedIdxs.includes(idx) || matchedPairs.includes(card.matchId);
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(idx)}
              style={{
                height: '110px', borderRadius: '12px', cursor: 'pointer',
                background: isFlipped ? '#F8F7F4' : '#1E293B',
                color: isFlipped ? '#1A1A1A' : '#1E293B',
                border: isFlipped ? '2.5px solid #2563EB' : 'none',
                fontWeight: 700, fontSize: '0.78rem', padding: '10px',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
              }}
            >
              {isFlipped ? card.val : '❓'}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 4. BINARY CONVERSION
const BinaryConversion = ({ challenges, onComplete, maxPoints }) => {
  const [chIndex, setChIndex] = useState(0);
  const [bits, setBits] = useState([0, 0, 0, 0]); // 8 4 2 1
  const [pointsTotal, setPointsTotal] = useState(0);

  const activeChallenge = challenges[chIndex];

  const handleToggleBit = (idx) => {
    const nextBits = [...bits];
    nextBits[idx] = nextBits[idx] === 1 ? 0 : 1;
    setBits(nextBits);
  };

  const getBinaryVal = () => {
    return bits.join('');
  };

  const getDecimalVal = () => {
    return bits[0]*8 + bits[1]*4 + bits[2]*2 + bits[3]*1;
  };

  const handleSubmitValue = () => {
    const correct = getBinaryVal() === activeChallenge.binary;
    const addedPoints = correct ? 1 : 0;
    const newTotal = pointsTotal + addedPoints;
    setPointsTotal(newTotal);

    if (chIndex + 1 < challenges.length) {
      setChIndex(chIndex + 1);
      setBits([0, 0, 0, 0]);
    } else {
      const finalScorePercentage = (newTotal / challenges.length);
      const pointsEarned = Math.round(finalScorePercentage * maxPoints);
      onComplete(newTotal, pointsEarned);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <span>Target {chIndex + 1} of {challenges.length}</span>
        <span>Score: {pointsTotal}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px', background: '#F8F7F4', borderRadius: '16px', width: '100%' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Match the Decimal Target Below:</div>
        <div style={{ fontSize: '3rem', fontWeight: 900, color: '#2563EB' }}>{activeChallenge.decimal}</div>
      </div>

      {/* Bit Switches */}
      <div style={{ display: 'flex', gap: '16px', margin: '20px 0' }}>
        {[8, 4, 2, 1].map((weight, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>{weight}</span>
            <button
              onClick={() => handleToggleBit(i)}
              style={{
                width: '60px', height: '60px', borderRadius: '14px', border: 'none',
                background: bits[i] === 1 ? '#22C55E' : '#E2E8F0',
                color: bits[i] === 1 ? 'white' : '#64748B',
                fontSize: '1.4rem', fontWeight: 900, cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s'
              }}
            >
              {bits[i]}
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Binary Output: <strong style={{ fontFamily: 'Courier New, monospace', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{getBinaryVal()}</strong>
        {' '} (Decimal: {getDecimalVal()})
      </div>

      <button
        onClick={handleSubmitValue}
        style={{
          width: '100%', background: 'var(--primary)', color: 'var(--text-on-primary)', border: 'none', borderRadius: '10px', padding: '14px',
          fontWeight: 700, cursor: 'pointer', marginTop: '10px'
        }}
      >
        Submit Value
      </button>
    </div>
  );
};

// 5. SHORTCUT KEY CHALLENGE
const ShortcutKeyChallenge = ({ shortcuts, onComplete, maxPoints }) => {
  const [scIndex, setScIndex] = useState(0);
  const [pointsTotal, setPointsTotal] = useState(0);
  const activeChallenge = shortcuts[scIndex];

  const handleKeyPress = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Map modifiers
    const pressedKeys = [];
    if (e.ctrlKey) pressedKeys.push("Ctrl");
    if (e.shiftKey) pressedKeys.push("Shift");
    if (e.altKey) pressedKeys.push("Alt");
    
    // Map key values
    const keyName = e.key.toUpperCase();
    if (keyName !== "CONTROL" && keyName !== "SHIFT" && keyName !== "ALT") {
      pressedKeys.push(keyName === " " ? "SPACE" : keyName);
    }

    const shortcutStr = pressedKeys.join("+");
    const targetStr = activeChallenge.keys.toUpperCase();

    const correct = shortcutStr === targetStr;
    const addedPoints = correct ? 1 : 0;
    const newTotal = pointsTotal + addedPoints;
    setPointsTotal(newTotal);

    if (scIndex + 1 < shortcuts.length) {
      setScIndex(scIndex + 1);
    } else {
      const finalScorePercentage = (newTotal / shortcuts.length);
      const pointsEarned = Math.round(finalScorePercentage * maxPoints);
      onComplete(newTotal, pointsEarned);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scIndex, pointsTotal]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <span>Shortcut {scIndex + 1} of {shortcuts.length}</span>
        <span>Score: {pointsTotal}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px', background: '#F8F7F4', borderRadius: '16px', width: '100%', minHeight: '180px', justifyContent: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Press the Keyboard Shortcut for:</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>{activeChallenge.action}</div>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
        Press the keys directly on your physical keyboard to trigger evaluations.
      </p>
    </div>
  );
};

// 6. PYTHON PUZZLE
const PythonPuzzle = ({ puzzles, onComplete, maxPoints }) => {
  const [pzIndex, setPzIndex] = useState(0);
  const [currentLines, setCurrentLines] = useState([]);
  const [pointsTotal, setPointsTotal] = useState(0);

  const activePuzzle = puzzles[pzIndex];

  // Initialize scrambled lines
  useEffect(() => {
    const linesCopy = activePuzzle.lines.map((l, i) => ({ val: l, origIdx: i }));
    // Scramble according to json directions
    const scrambledLines = activePuzzle.scrambled.map(idx => linesCopy[idx]);
    setCurrentLines(scrambledLines);
  }, [pzIndex, activePuzzle]);

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    const nextLines = [...currentLines];
    const temp = nextLines[idx];
    nextLines[idx] = nextLines[idx - 1];
    nextLines[idx - 1] = temp;
    setCurrentLines(nextLines);
  };

  const handleMoveDown = (idx) => {
    if (idx === currentLines.length - 1) return;
    const nextLines = [...currentLines];
    const temp = nextLines[idx];
    nextLines[idx] = nextLines[idx + 1];
    nextLines[idx + 1] = temp;
    setCurrentLines(nextLines);
  };

  const handleVerifyPuzzle = () => {
    const correct = currentLines.every((line, idx) => line.origIdx === idx);
    const addedPoints = correct ? 1 : 0;
    const newTotal = pointsTotal + addedPoints;
    setPointsTotal(newTotal);

    if (pzIndex + 1 < puzzles.length) {
      setPzIndex(pzIndex + 1);
    } else {
      const finalScorePercentage = (newTotal / puzzles.length);
      const pointsEarned = Math.round(finalScorePercentage * maxPoints);
      onComplete(newTotal, pointsEarned);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <span>Puzzle {pzIndex + 1} of {puzzles.length}</span>
        <span>Score: {pointsTotal}</span>
      </div>

      <div style={{ padding: '16px 20px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem' }}>
        💡 Target Task: {activePuzzle.title}
      </div>

      {/* Code Blocks list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#1A202C', padding: '16px', borderRadius: '16px' }}>
        {currentLines.map((line, idx) => (
          <div 
            key={idx} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '10px 14px', 
              background: '#2D3748', 
              borderRadius: '8px', 
              border: '1px solid #4A5568' 
            }}
          >
            <code style={{ color: '#E2E8F0', fontFamily: 'Courier New, monospace', whiteSpace: 'pre', fontSize: '0.9rem' }}>
              {line.val}
            </code>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => handleMoveUp(idx)} 
                disabled={idx === 0}
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: '0.72rem' }}
              >
                ▲
              </button>
              <button 
                onClick={() => handleMoveDown(idx)} 
                disabled={idx === currentLines.length - 1}
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', cursor: idx === currentLines.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.72rem' }}
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleVerifyPuzzle}
        style={{
          background: 'var(--primary)', color: 'var(--text-on-primary)', border: 'none', borderRadius: '10px', padding: '14px',
          fontWeight: 700, cursor: 'pointer', marginTop: '10px'
        }}
      >
        Submit Ordered Code
      </button>
    </div>
  );
};

export default MiniGames;
