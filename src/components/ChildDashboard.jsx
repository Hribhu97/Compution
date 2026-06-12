import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Gamepad2, Award, Sparkles, Plus, Search, Users, 
  Check, X, ChevronRight, Play, Swords, Star, UserPlus, Copy, Send, Flame, Share2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ChildDashboard = ({ 
  user, showToast, isDarkMode, xp, setXp, level, setLevel, 
  rankPoints, setRankPoints, streak, setStreak, friends, setFriends, 
  duels, setDuels, studentHasCrown, setStudentHasCrown, 
  hasPlayedGame, setHasPlayedGame, referralCode, referralLink
}) => {
  const [friendSearch, setFriendSearch] = useState('');
  const [newFriendName, setNewFriendName] = useState('');
  
  // Transients
  const [activeGame, setActiveGame] = useState(null);
  const [duelOpponentId, setDuelOpponentId] = useState(null);
  const [duelOpponentName, setDuelOpponentName] = useState('');
  const [gameState, setGameState] = useState({ score: 0, questionIndex: 0, questions: [], completed: false });
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);

  // Daily Streak Quiz transients
  const [isStreakQuizOpen, setIsStreakQuizOpen] = useState(false);
  const [streakQuizState, setStreakQuizState] = useState({ active: false, questionIndex: 0, questions: [], score: 0, completed: false, failed: false });
  const [streakSelectedAns, setStreakSelectedAns] = useState(null);
  const [streakAnsResult, setStreakAnsResult] = useState(null);

  // WhatsApp Add Friend referral share
  const handleAddFriendWhatsApp = () => {
    const message = encodeURIComponent(`Hey! Join me on Compution to learn computer science and play educational games together! Sign up here: https://compution.vercel.app (My Student ID is: ${referralCode})`);
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  // Add Friend by searching ID
  const handleAddFriendById = (e) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    const idStr = newFriendName.trim().toUpperCase();
    if (!idStr.startsWith("COMP2K26") || idStr.length !== 12) {
      showToast("Please enter a 12-character Student ID (e.g. COMP2K260024)", "error");
      return;
    }
    const friendName = `Friend #${idStr.slice(-4)}`;
    showToast(`Friend request sent to Student ID ${idStr}! 👥`, "success");
    setFriends(prev => [
      ...prev,
      { id: idStr, name: friendName, rank: 'Beginner', points: 0, active: false, hasCrown: false }
    ]);
    setNewFriendName('');
  };

  // Send challenge match
  const handleSendMatchChallenge = (friend) => {
    const newDuel = {
      id: 'duel_' + friend.id + '_' + Date.now(),
      friendId: friend.id,
      challenger: friend.name,
      points: Math.floor(Math.random() * 50) + 60,
      time: 'Just now'
    };
    setDuels(prev => [newDuel, ...prev]);
    showToast(`Challenge match invitation sent to ${friend.name}! ⚔️`, "info");
  };

  // Mini Games Data Generators
  const startMathGame = (opponentId = null, opponentName = '') => {
    setDuelOpponentId(opponentId);
    setDuelOpponentName(opponentName);
    const questions = [];
    for (let i = 0; i < 5; i++) {
      const num1 = Math.floor(Math.random() * 10) + 2;
      const num2 = Math.floor(Math.random() * 10) + 2;
      const operation = Math.random() > 0.5 ? '+' : 'x';
      const ans = operation === '+' ? num1 + num2 : num1 * num2;
      const choices = [ans];
      while (choices.length < 3) {
        const wrong = ans + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1);
        if (wrong >= 0 && !choices.includes(wrong)) choices.push(wrong);
      }
      choices.sort(() => Math.random() - 0.5);
      questions.push({ q: `What is ${num1} ${operation} ${num2}?`, a: ans, options: choices });
    }
    setGameState({ score: 0, questionIndex: 0, questions, completed: false });
    setSelectedAnswer(null);
    setAnswerResult(null);
    setActiveGame('math');
  };

  const startLanguageGame = (opponentId = null, opponentName = '') => {
    setDuelOpponentId(opponentId);
    setDuelOpponentName(opponentName);
    const questions = [
      { q: "Which keyword defines a function in Python?", a: "def", options: ["def", "function", "func"] },
      { q: "Which symbol starts a comment in Python?", a: "#", options: ["//", "#", "/*"] },
      { q: "What is the correct way to output 'Hello' in Python?", a: "print('Hello')", options: ["echo('Hello')", "print('Hello')", "console.log('Hello')"] },
      { q: "Which data type stores True or False?", a: "boolean", options: ["string", "integer", "boolean"] },
      { q: "Which symbol is used for multiplication in coding?", a: "*", options: ["x", "*", "^"] }
    ];
    questions.sort(() => Math.random() - 0.5);
    setGameState({ score: 0, questionIndex: 0, questions, completed: false });
    setSelectedAnswer(null);
    setAnswerResult(null);
    setActiveGame('lang');
  };

  const startHistoryGame = (opponentId = null, opponentName = '') => {
    setDuelOpponentId(opponentId);
    setDuelOpponentName(opponentName);
    const questions = [
      { q: "Who designed the Analytical Engine, the first computer design?", a: "Charles Babbage", options: ["Alan Turing", "Charles Babbage", "Bill Gates"] },
      { q: "Who is celebrated as the first computer programmer?", a: "Ada Lovelace", options: ["Ada Lovelace", "Grace Hopper", "Steve Jobs"] },
      { q: "Who created the Python programming language?", a: "Guido van Rossum", options: ["Dennis Ritchie", "Guido van Rossum", "James Gosling"] },
      { q: "Which machine cracked the Enigma code in World War II?", a: "The Bombe", options: ["ENIAC", "The Bombe", "Colossus"] },
      { q: "In which decade was the World Wide Web invented?", a: "1980s", options: ["1970s", "1980s", "1990s"] }
    ];
    questions.sort(() => Math.random() - 0.5);
    setGameState({ score: 0, questionIndex: 0, questions, completed: false });
    setSelectedAnswer(null);
    setAnswerResult(null);
    setActiveGame('history');
  };

  const handleAnswerSubmit = (option) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    const correct = option === gameState.questions[gameState.questionIndex].a;
    setAnswerResult(correct ? 'correct' : 'wrong');
    if (correct) {
      setGameState(prev => ({ ...prev, score: prev.score + 1 }));
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setAnswerResult(null);
    if (gameState.questionIndex < 4) {
      setGameState(prev => ({ ...prev, questionIndex: prev.questionIndex + 1 }));
    } else {
      setGameState(prev => ({ ...prev, completed: true }));
      setHasPlayedGame(true);

      const addedXp = gameState.score * 100;
      const addedPoints = gameState.score * 20;
      
      const newXp = xp + addedXp;
      const newPoints = rankPoints + addedPoints;
      
      setXp(newXp);
      setRankPoints(newPoints);
      setLevel(Math.max(1, Math.floor(newXp / 400) + 1));

      if (duelOpponentId) {
        const opponentScore = Math.floor(Math.random() * 4) + 1;
        const studentWon = gameState.score > opponentScore;
        if (studentWon) {
          setStudentHasCrown(true);
          setFriends(prev => prev.map(f => f.id === duelOpponentId ? { ...f, hasCrown: false } : f));
          showToast(`YOU WON the duel against ${duelOpponentName}! 👑`, "success");
        } else {
          setStudentHasCrown(false);
          setFriends(prev => prev.map(f => f.id === duelOpponentId ? { ...f, hasCrown: true } : f));
          showToast(`${duelOpponentName} won the duel. Better luck next time!`, "info");
        }
        setDuelOpponentId(null);
        setDuelOpponentName('');
      } else {
        showToast(`Game Over! Earned +${addedXp} XP! 🎮`, "success");
      }
    }
  };

  const handleDuelAction = (duelId, action, friendId, challenger) => {
    setDuels(prev => prev.filter(d => d.id !== duelId));
    if (action === 'accept') {
      showToast(`Duel Accepted! Preparing Arena... ⚔️`, "info");
      startMathGame(friendId, challenger);
    } else {
      showToast("Duel Declined.", "info");
    }
  };

  // Daily Streak Quiz Generators
  const startDailyStreakQuiz = () => {
    const numCat = parseInt(user?.classCategory) || 2;
    let questionsPool = [];
    if (numCat >= 2 && numCat <= 5) {
      questionsPool = [
        { q: "Which part of a computer do you use to type letters?", a: "Keyboard", options: ["Mouse", "Keyboard", "Printer", "Monitor"] },
        { q: "What is 5 + 3?", a: "8", options: ["7", "8", "9", "10"] },
        { q: "Which of these is a computer mouse used for?", a: "Clicking items", options: ["Typing", "Printing", "Clicking items", "Eating"] },
        { q: "What is 10 - 4?", a: "6", options: ["4", "5", "6", "7"] },
        { q: "Which of these is a type of computer?", a: "Laptop", options: ["Laptop", "Bicycle", "Toaster", "Fridge"] }
      ];
    } else {
      questionsPool = [
        { q: "What does HTML stand for?", a: "Hypertext Markup Language", options: ["Hypertext Markup Language", "HighText Machine Language", "Hyperlink Text Markup Language", "Hypertext Machine Language"] },
        { q: "Which of these is a secure website protocol?", a: "HTTPS", options: ["HTTP", "HTTPS", "FTP", "SMTP"] },
        { q: "What is 12 x 8?", a: "96", options: ["84", "92", "96", "104"] },
        { q: "Who is known as the father of modern computers?", a: "Alan Turing", options: ["Alan Turing", "Charles Babbage", "Bill Gates", "Ada Lovelace"] },
        { q: "Which of these is a programming language?", a: "Python", options: ["Python", "HTML", "CSS", "Excel"] }
      ];
    }
    const selectedQuestions = [...questionsPool].sort(() => Math.random() - 0.5).slice(0, 5);
    setStreakQuizState({ active: true, questionIndex: 0, questions: selectedQuestions, score: 0, completed: false, failed: false });
    setStreakSelectedAns(null);
    setStreakAnsResult(null);
    setIsStreakQuizOpen(true);
  };

  const handleStreakAnswer = (option) => {
    if (streakSelectedAns !== null) return;
    setStreakSelectedAns(option);
    const correct = option === streakQuizState.questions[streakQuizState.questionIndex].a;
    setStreakAnsResult(correct ? 'correct' : 'wrong');
    if (correct) {
      setStreakQuizState(prev => ({ ...prev, score: prev.score + 1 }));
    } else {
      setStreakQuizState(prev => ({ ...prev, failed: true }));
      setStreak(0);
    }
  };

  const handleStreakNext = () => {
    setStreakSelectedAns(null);
    setStreakAnsResult(null);
    if (streakQuizState.failed) {
      setIsStreakQuizOpen(false);
      showToast("Better luck next time! Streak ended.", "error");
      return;
    }
    if (streakQuizState.questionIndex < 4) {
      setStreakQuizState(prev => ({ ...prev, questionIndex: prev.questionIndex + 1 }));
    } else {
      setStreakQuizState(prev => ({ ...prev, completed: true }));
      setStreak(streak + 1);
      setXp(xp + 250);
      showToast("Streak Saved! +250 XP added. 🔥", "success");
    }
  };

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(friendSearch.toLowerCase())
  );

  // Styling properties depending on Dark Mode
  const bgMain = isDarkMode ? '#0B0F19' : 'transparent';
  const cardBg = isDarkMode ? '#151F32' : '#FFFFFF';
  const cardBorder = isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.04)';
  const textPrimary = isDarkMode ? '#F1F5F9' : 'var(--dark)';
  const textSecondary = isDarkMode ? '#94A3B8' : 'var(--text-muted)';
  const friendRowBg = isDarkMode ? '#18253E' : '#F8FAFC';
  const searchInputBg = isDarkMode ? '#18253E' : '#F8FAFC';
  const searchInputBorder = isDarkMode ? '1.5px solid rgba(255, 255, 255, 0.08)' : '1.5px solid rgba(0,0,0,0.08)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 0.9fr', gap: '32px', background: bgMain, padding: isDarkMode ? '24px' : '0', borderRadius: '32px', transition: 'all 0.3s ease' }} className="grid-2-col-mobile">
      
      {/* Styles injecting */}
      <style>{`
        .card-premium-child {
          background: ${cardBg};
          border-radius: 28px;
          border: ${cardBorder};
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.03);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .card-premium-child:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 48px rgba(83, 109, 254, 0.12);
        }
        .candy-progress-track {
          height: 12px;
          background: ${isDarkMode ? '#202D45' : '#EAEFF8'};
          border-radius: 100px;
          position: relative;
          overflow: hidden;
        }
        .candy-progress-fill {
          height: 100%;
          border-radius: 100px;
          background: linear-gradient(90deg, #FF9966, #FF5E62);
          box-shadow: 0 2px 6px rgba(255, 94, 98, 0.4);
          position: relative;
        }
        .candy-progress-fill::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(45deg, 
            rgba(255,255,255,0.15) 25%, 
            transparent 25%, 
            transparent 50%, 
            rgba(255,255,255,0.15) 50%, 
            rgba(255,255,255,0.15) 75%, 
            transparent 75%, 
            transparent);
          background-size: 16px 16px;
        }
        .friend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px;
          background: ${friendRowBg};
          border-radius: 20px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .friend-row:hover {
          background: ${isDarkMode ? '#1E2E4E' : '#FFFFFF'};
          border-color: rgba(83, 109, 254, 0.3);
          box-shadow: 0 8px 24px rgba(83, 109, 254, 0.08);
          transform: scale(1.01);
        }
        .game-card-child {
          padding: 24px;
          border-radius: 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .game-card-child:hover {
          transform: translateY(-6px) scale(1.02);
        }
        .game-btn-arcade {
          padding: 10px 20px;
          border: none;
          background: #F3F4F6;
          font-weight: 800;
          font-size: 0.82rem;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.25s ease;
        }
        .game-btn-arcade:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(0,0,0,0.25);
        }
        .pulse-online {
          position: absolute;
          bottom: 0; right: 0;
          width: 9px; height: 9px;
          border-radius: 50%;
          background: #66BB6A;
          border: 2px solid ${cardBg};
          box-shadow: 0 0 0 0 rgba(102, 187, 106, 0.7);
          animation: pulseOnlineKey 2s infinite;
        }
        @keyframes pulseOnlineKey {
          0% { box-shadow: 0 0 0 0 rgba(102, 187, 106, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(102, 187, 106, 0); }
          100% { box-shadow: 0 0 0 0 rgba(102, 187, 106, 0); }
        }
        .text-offwhite-override {
          color: ${textPrimary} !important;
        }
        .text-slate-muted-override {
          color: ${textSecondary} !important;
        }
        input::placeholder {
          color: ${isDarkMode ? '#64748B' : '#94A3B8'} !important;
          opacity: 0.8;
        }
      `}</style>

      {/* LEFT COLUMN: Main Gaming Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Child Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
          borderRadius: '32px',
          padding: '36px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 48px rgba(255, 107, 107, 0.2)'
        }}>
          <div style={{
            position: 'absolute', top: '-20%', right: '-5%', width: '260px', height: '260px',
            borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none'
          }} />
          
          <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, marginRight: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 900, background: 'rgba(255,255,255,0.22)', color: 'white', padding: '3px 10px', borderRadius: '8px', letterSpacing: '0.04em' }}>
                STUDENT ID: {referralCode}
              </span>
              {studentHasCrown && <span style={{ fontSize: '1.2rem' }} title="Duel Champion Crown! 👑">👑</span>}
            </div>
            <h2 style={{ color: '#FFFFFF', fontSize: '2.4rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', textShadow: '0 3px 6px rgba(0,0,0,0.12)', lineHeight: 1.25 }}>
              Learn, Play and <br/>Earn Free Gifts!
            </h2>
            <p style={{ color: '#F1F5F9', margin: 0, opacity: 0.95, fontSize: '1rem', maxWidth: '440px', lineHeight: 1.6, fontWeight: 500 }}>
              Challenge your friends in quiz games and increase rank points to get exclusive prizes from us!
            </p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => showToast("Shop Coming Soon! 🎁 Earn more points to redeem toys & books.", "info")}
                style={{ 
                  padding: '13px 26px', borderRadius: '18px', border: '2.5px solid rgba(255,255,255,0.6)', 
                  background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', fontWeight: 800, fontSize: '0.92rem', 
                  cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
              >
                View Rewards
              </button>
              <button 
                onClick={() => startMathGame(null, '')}
                style={{ 
                  padding: '13px 26px', borderRadius: '18px', border: 'none', background: '#00E5FF', 
                  color: '#00363A', fontWeight: 900, fontSize: '0.92rem', cursor: 'pointer', 
                  boxShadow: '0 8px 24px rgba(0,229,255,0.4)', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
              >
                Get Started <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Lottie Trophy player */}
          <div style={{ zIndex: 2 }} className="hide-mobile">
            <dotlottie-player
              src="/animations/cup.lottie"
              background="transparent"
              speed="1"
              style={{ width: '130px', height: '130px' }}
              loop
              autoplay
            ></dotlottie-player>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div>
          <h3 className="text-offwhite-override" style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '18px', letterSpacing: '-0.01em' }}>Overview</h3>
            <div className="grid-3-col-responsive">
            
            {/* Level Card */}
            <div className="card-premium-child" style={{ padding: '26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '14px', background: 'rgba(255, 152, 0, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF9800' }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h4 className="text-slate-muted-override" style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Level Badge</h4>
                  <div className="text-offwhite-override" style={{ fontSize: '1.35rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Lv. {level} <span style={{ fontSize: '0.78rem', background: 'rgba(255,152,0,0.12)', color: '#FF9800', padding: '2px 8px', borderRadius: '8px', fontWeight: 800 }}>Star</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: textSecondary, marginBottom: '8px' }}>
                  <span className="text-slate-muted-override">XP progress</span>
                  <span className="text-offwhite-override" style={{ fontWeight: 800 }}>{xp}/400 XP</span>
                </div>
                <div className="candy-progress-track">
                  <div className="candy-progress-fill" style={{ width: `${Math.min(100, (xp/400)*100)}%` }} />
                </div>
              </div>
            </div>

            {/* Rank Card */}
            <div className="card-premium-child" style={{ padding: '26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ filter: 'drop-shadow(0 6px 12px rgba(156, 39, 176, 0.25))' }}>
                  <svg width="46" height="46" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 10L80 25V55C80 72 67 87 50 92C33 87 20 72 20 55V25L50 10Z" fill="url(#shieldGrad)" stroke="#AB47BC" strokeWidth="2.5" />
                    <path d="M50 18L74 30V55C74 69 64 81 50 85C36 81 26 69 26 55V30L50 18Z" fill="rgba(255, 255, 255, 0.15)" />
                    <path d="M50 32L55 42L66 43.5L58 51L60 62L50 56.5L40 62L42 51L34 43.5L45 42L50 32Z" fill="#FFF" stroke="#FFD700" strokeWidth="1" />
                    <defs>
                      <linearGradient id="shieldGrad" x1="20" y1="10" x2="80" y2="92">
                        <stop offset="0%" stopColor="#E040FB" />
                        <stop offset="100%" stopColor="#6A1B9A" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-muted-override" style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>League Rank</h4>
                  <div className="text-offwhite-override" style={{ fontSize: '1.35rem', fontWeight: 900 }}>
                    {rankPoints === 0 ? "UNRANKED" : rankPoints >= 80 ? "MASTER" : "BEGINNER"}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <div>
                  <div className="text-slate-muted-override" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>Points Balance</div>
                  <div className="text-offwhite-override" style={{ fontWeight: 900, fontSize: '1rem' }}>{rankPoints} pts</div>
                </div>
                <button 
                  onClick={() => startLanguageGame(null, '')}
                  style={{ 
                    padding: '8px 16px', borderRadius: '12px', border: 'none', background: '#9C27B0', 
                    color: 'white', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(156, 39, 176, 0.25)'
                  }}
                >
                  Play Now
                </button>
              </div>
            </div>

            {/* Performance Card */}
            <div className="card-premium-child" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
              <h4 className="text-slate-muted-override" style={{ margin: 0, fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, alignSelf: 'flex-start', letterSpacing: '0.05em' }}>Performance Radar</h4>
              <svg width="120" height="120" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                <polygon points="50,15 80,38 70,75 30,75 20,38" fill="rgba(83,109,254,0.01)" stroke={isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"} strokeWidth="1" />
                <polygon points="50,25 70,42 62,68 38,68 30,42" fill="rgba(83,109,254,0.02)" stroke={isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"} strokeWidth="0.5" />
                
                {/* Axes */}
                <line x1="50" y1="50" x2="50" y2="15" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"} strokeWidth="0.5" strokeDasharray="2" />
                <line x1="50" y1="50" x2="80" y2="38" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"} strokeWidth="0.5" strokeDasharray="2" />
                <line x1="50" y1="50" x2="70" y2="75" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"} strokeWidth="0.5" strokeDasharray="2" />
                <line x1="50" y1="50" x2="30" y2="75" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"} strokeWidth="0.5" strokeDasharray="2" />
                <line x1="50" y1="50" x2="20" y2="38" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"} strokeWidth="0.5" strokeDasharray="2" />
                
                <polygon points="50,22 75,40 68,70 40,65 25,38" fill="rgba(0, 229, 255, 0.25)" stroke="#00E5FF" strokeWidth="2" />
                
                <circle cx="50" cy="22" r="3" fill="#00E5FF" stroke={cardBg} strokeWidth="1"/>
                <circle cx="75" cy="40" r="3" fill="#00E5FF" stroke={cardBg} strokeWidth="1"/>
                <circle cx="68" cy="70" r="3" fill="#00E5FF" stroke={cardBg} strokeWidth="1"/>
                <circle cx="40" cy="65" r="3" fill="#00E5FF" stroke={cardBg} strokeWidth="1"/>
                <circle cx="25" cy="38" r="3" fill="#00E5FF" stroke={cardBg} strokeWidth="1"/>
                
                <text x="50" y="8" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#94A3B8">Teamwork</text>
                <text x="84" y="38" textAnchor="start" fontSize="6.5" fontWeight="900" fill="#94A3B8">Solving</text>
                <text x="74" y="82" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#94A3B8">Discipline</text>
                <text x="26" y="82" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#94A3B8">Curiosity</text>
                <text x="16" y="38" textAnchor="end" fontSize="6.5" fontWeight="900" fill="#94A3B8">Creative</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Mini Games List */}
        <div>
          <h3 className="text-offwhite-override" style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '18px', letterSpacing: '-0.01em' }}>Mini Games</h3>
          <div className="grid-3-col-equal-responsive">
            
            <div className="game-card-child" style={{ 
              background: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
              boxShadow: '0 12px 28px rgba(244, 63, 94, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px' }}><Gamepad2 size={22} color="white" /></div>
                <span className="text-offwhite-override" style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.25)', padding: '3px 10px', borderRadius: '100px', fontWeight: 800, letterSpacing: '0.04em' }}>QUIZ RUN</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <h4 className="text-offwhite-override" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>History Heroes</h4>
                <p className="text-offwhite-override" style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Test computer science history!</p>
              </div>
              <button onClick={() => startHistoryGame(null, '')} className="game-btn-arcade" style={{ color: '#F43F5E', marginTop: '12px' }}>
                <Play size={14} fill="#F43F5E" /> Play Now
              </button>
            </div>

            <div className="game-card-child" style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              boxShadow: '0 12px 28px rgba(217, 119, 6, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px' }}><Award size={22} color="white" /></div>
                <span className="text-offwhite-override" style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.25)', padding: '3px 10px', borderRadius: '100px', fontWeight: 800, letterSpacing: '0.04em' }}>CODE RUN</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <h4 className="text-offwhite-override" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>Language War</h4>
                <p className="text-offwhite-override" style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Show off coding syntax power!</p>
              </div>
              <button onClick={() => startLanguageGame(null, '')} className="game-btn-arcade" style={{ color: '#D97706', marginTop: '12px' }}>
                <Play size={14} fill="#D97706" /> Play Now
              </button>
            </div>

            <div className="game-card-child" style={{ 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 12px 28px rgba(5, 150, 105, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ padding: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px' }}><Trophy size={22} color="white" /></div>
                <span className="text-offwhite-override" style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.25)', padding: '3px 10px', borderRadius: '100px', fontWeight: 800, letterSpacing: '0.04em' }}>MATH RUN</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <h4 className="text-offwhite-override" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>Math Master</h4>
                <p className="text-offwhite-override" style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Solve math operations at speed!</p>
              </div>
              <button onClick={() => startMathGame(null, '')} className="game-btn-arcade" style={{ color: '#059669', marginTop: '12px' }}>
                <Play size={14} fill="#059669" /> Play Now
              </button>
            </div>
          </div>
        </div>

        {/* Daily Quests side-by-side with locked Leaderboard */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '24px' }} className="grid-2-col-mobile">
          
          {/* Leaderboard Lock card */}
          <div className="card-premium-child" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '220px', textAlign: 'center' }}>
            <h3 className="text-offwhite-override" style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
              🏆 Leaderboard
            </h3>
            <div style={{ margin: 'auto' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔒</div>
              <div className="text-offwhite-override" style={{ fontSize: '1.05rem', fontWeight: 800 }}>This page will be available soon</div>
              <div className="text-slate-muted-override" style={{ fontSize: '0.78rem', marginTop: '4px' }}>We are calibrating ranking data streams.</div>
            </div>
          </div>

          {/* Daily Quests */}
          <div className="card-premium-child" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 className="text-offwhite-override" style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎯 Daily Streak
              </h3>
              {streak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,152,0,0.15)', color: '#FF9800', padding: '2px 10px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 900 }}>
                  <Flame size={14} fill="#FF9800" /> {streak} Days
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', background: friendRowBg, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div className="text-offwhite-override" style={{ fontSize: '0.85rem', fontWeight: 800 }}>Daily Streak Quiz</div>
                    <span style={{ fontSize: '0.72rem', color: '#FF9800', fontWeight: 800 }}>+250 XP bonus</span>
                  </div>
                  <button onClick={startDailyStreakQuiz} style={{ padding: '6px 12px', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>Start</button>
                </div>
                <div className="text-slate-muted-override" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>
                  Maintain your daily streak by answering fundamental computer questions!
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Sidebar (Duel Arena & Friends) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Duel Arena Widget */}
        <div className="card-premium-child" style={{ padding: '28px' }}>
          <h3 className="text-offwhite-override" style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚔️ Duel Arena
          </h3>
          
          {duels.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 10px', textAlign: 'center' }}>
              <div className="animate-float" style={{ color: textSecondary, opacity: 0.45, marginBottom: '12px' }}>
                <Swords size={40} />
              </div>
              <div className="text-offwhite-override" style={{ fontSize: '0.82rem', fontWeight: 800 }}>Arena is empty.</div>
              <div className="text-slate-muted-override" style={{ fontSize: '0.72rem', marginTop: '4px' }}>Click the Swords icon ⚔️ next to a friend to send a challenge match!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {duels.map(d => (
                <div key={d.id} style={{ padding: '14px', background: 'rgba(239,83,80,0.02)', border: '1px solid rgba(239,83,80,0.08)', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', justify: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                    <span className="text-offwhite-override" style={{ fontWeight: 800, fontSize: '0.88rem' }}>{d.challenger}</span>
                    <span className="text-slate-muted-override" style={{ fontSize: '0.68rem', fontWeight: 700 }}>{d.time}</span>
                  </div>
                  <p className="text-slate-muted-override" style={{ margin: '0 0 10px 0', fontSize: '0.75rem', lineHeight: 1.4 }}>Challenged you to a match! <span style={{ color: '#00E5FF', fontWeight: 800 }}>(+{d.points} pts)</span></p>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleDuelAction(d.id, 'decline', d.friendId, d.challenger)} style={{ flex: 1, padding: '6px 10px', border: '1.5px solid rgba(255,255,255,0.08)', background: 'transparent', color: textSecondary, borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>Decline</button>
                    <button onClick={() => handleDuelAction(d.id, 'accept', d.friendId, d.challenger)} style={{ flex: 1, padding: '6px 10px', border: 'none', background: 'var(--success)', color: 'white', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>Accept</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friend List with search & WhatsApp invite */}
        <div className="card-premium-child" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
            <h3 className="text-offwhite-override" style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              👤 Friends
            </h3>
            <button 
              onClick={handleAddFriendWhatsApp}
              style={{ 
                background: 'rgba(76, 175, 80, 0.15)', border: 'none', color: '#4CAF50', 
                padding: '6px 12px', borderRadius: '8px', display: 'flex', 
                alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800
              }}
              title="Add Friend (Invite via WhatsApp)"
            >
              <Share2 size={12} /> Invite
            </button>
          </div>

          <div className="text-slate-muted-override" style={{ fontSize: '0.72rem', lineHeight: 1.4, background: isDarkMode ? '#1E2D4A' : '#F1F5F9', padding: '10px 14px', borderRadius: '12px' }}>
            💡 Friends need to create a profile to appear in your list. Type their Student ID below to find them!
          </div>

          {/* Search ID Friend Input */}
          <form onSubmit={handleAddFriendById} style={{ display: 'flex', gap: '8px' }}>
            <input 
              placeholder="Search ID (e.g. COMP2K260000)" 
              value={newFriendName}
              onChange={e => setNewFriendName(e.target.value)}
              style={{ 
                flex: 1, padding: '8px 10px', borderRadius: '10px', 
                border: searchInputBorder, fontSize: '0.78rem', outline: 'none',
                background: searchInputBg, color: textPrimary
              }}
            />
            <button 
              type="submit"
              style={{ 
                background: 'var(--primary)', color: 'white', border: 'none', 
                padding: '8px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
              }}
            >
              Search
            </button>
          </form>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textSecondary }} />
            <input 
              placeholder="Filter friends..." 
              value={friendSearch}
              onChange={e => setFriendSearch(e.target.value)}
              style={{ 
                width: '100%', padding: '8px 12px 8px 34px', borderRadius: '12px', 
                border: searchInputBorder, fontSize: '0.82rem', outline: 'none',
                background: searchInputBg, color: textPrimary
              }}
            />
          </div>

          {/* Friends List displaying crowns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredFriends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: textSecondary, fontSize: '0.82rem', fontWeight: 600 }}>
                👥 Add friends to enjoy learning together
              </div>
            ) : (
              filteredFriends.map(f => (
                <div key={f.id} className="friend-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                      {f.hasCrown && <span style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', fontSize: '1.1rem', zIndex: 10 }}>👑</span>}
                      <div style={{ 
                        width: 38, height: 38, borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #FF5E62 0%, #00B4D8 100%)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: 'white', fontWeight: 800, fontSize: '0.78rem'
                      }}>
                        {f.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                      </div>
                      {f.active && <span className="pulse-online" />}
                    </div>
                    <div>
                      <h4 className="text-offwhite-override" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>{f.name}</h4>
                      <span className="text-slate-muted-override" style={{ fontSize: '0.68rem', fontWeight: 700 }}>{f.rank}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="text-slate-muted-override" style={{ fontSize: '0.78rem', fontWeight: 800 }}>{f.points.toLocaleString()}</span>
                    <button 
                      style={{ color: textSecondary, border: 'none', background: 'transparent', padding: '4px', cursor: 'pointer' }} 
                      onClick={() => handleSendMatchChallenge(f)}
                      title="Send Duel challenge match"
                    >
                      <Swords size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* ==================== PLAYABLE GAME MODALS ==================== */}
      <AnimatePresence>
        {activeGame && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(11,15,25,0.7)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
          }}>
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="modal-responsive-card"
              style={{
                width: '100%', maxWidth: '500px', background: cardBg,
                boxShadow: '0 32px 80px rgba(0,0,0,0.3)', border: cardBorder
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', color: textPrimary }}>
                  🎮 {activeGame === 'math' ? 'Math Master' : activeGame === 'lang' ? 'Language War' : 'History Heroes'}
                </h3>
                <button 
                  onClick={() => setActiveGame(null)}
                  style={{ background: isDarkMode ? '#1E2E4E' : '#E2E8F0', border: 'none', color: isDarkMode ? '#94A3B8' : '#475569', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {!gameState.completed ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, color: '#94A3B8', marginBottom: '10px' }}>
                    <span>Question {gameState.questionIndex + 1} of 5</span>
                    <span style={{ color: 'var(--primary)' }}>Score: {gameState.score}/5</span>
                  </div>
                  <div className="candy-progress-track" style={{ height: '8px', marginBottom: '28px' }}>
                    <div className="candy-progress-fill" style={{ width: `${((gameState.questionIndex)/5)*100}%` }} />
                  </div>

                  <div className="modal-question-box" style={{
                    background: friendRowBg, border: cardBorder,
                    fontWeight: 900, color: textPrimary, textAlign: 'center', marginBottom: '28px', lineHeight: 1.45
                  }}>
                    {gameState.questions[gameState.questionIndex]?.q}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {gameState.questions[gameState.questionIndex]?.options.map((opt, i) => {
                      const isSelected = selectedAnswer === opt;
                      const isCorrectAnswer = opt === gameState.questions[gameState.questionIndex].a;
                      
                      let bg = friendRowBg;
                      let border = searchInputBorder;
                      let txtColor = textPrimary;

                      if (selectedAnswer !== null) {
                        if (isCorrectAnswer) { bg = 'rgba(16,185,129,0.15)'; border = '2px solid var(--success)'; txtColor = 'var(--success)'; }
                        else if (isSelected) { bg = 'rgba(239,83,80,0.15)'; border = '2px solid var(--danger)'; txtColor = 'var(--danger)'; }
                        else { bg = isDarkMode ? '#1E2D4A' : '#E2E8F0'; border = isDarkMode ? '1.5px solid rgba(255,255,255,0.04)' : '1.5px solid rgba(0,0,0,0.04)'; txtColor = textSecondary; }
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => handleAnswerSubmit(opt)}
                          disabled={selectedAnswer !== null}
                          className="modal-option-btn"
                          style={{
                            width: '100%', background: bg,
                            border, color: txtColor, fontWeight: 800,
                            textAlign: 'left', cursor: selectedAnswer !== null ? 'default' : 'pointer'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {selectedAnswer !== null && (
                    <button
                      onClick={handleNextQuestion}
                      style={{
                        width: '100%', padding: '16px', border: 'none', background: 'var(--primary)',
                        color: 'white', fontWeight: 800, fontSize: '0.95rem', borderRadius: '20px',
                        cursor: 'pointer', marginTop: '28px', boxShadow: '0 8px 20px rgba(83,109,254,0.3)'
                      }}
                    >
                      {gameState.questionIndex === 4 ? 'See Results' : 'Next Question'}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ margin: '0 auto 24px', width: '100px', height: '100px' }}>
                    <dotlottie-player
                      src="/animations/task completed successfully.lottie"
                      background="transparent"
                      speed="1"
                      style={{ width: '100px', height: '100px' }}
                      autoplay
                    ></dotlottie-player>
                  </div>
                  
                  <h4 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: textPrimary }}>Game Completed!</h4>
                  <p style={{ fontSize: '0.95rem', marginTop: '8px', color: textSecondary }}>
                    You scored <strong style={{ color: 'var(--primary)' }}>{gameState.score} out of 5</strong> correct!
                  </p>

                  <button
                    onClick={() => setActiveGame(null)}
                    style={{
                      width: '100%', padding: '16px', border: 'none', background: 'var(--primary)',
                      color: 'white', fontWeight: 800, fontSize: '0.95rem', borderRadius: '20px',
                      cursor: 'pointer'
                    }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== DAILY STREAK QUIZ MODAL ==================== */}
      <AnimatePresence>
        {isStreakQuizOpen && streakQuizState.active && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(11,15,25,0.7)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
          }}>
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="modal-responsive-card"
              style={{
                width: '100%', maxWidth: '500px', background: cardBg,
                boxShadow: '0 32px 80px rgba(0,0,0,0.3)', border: cardBorder
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', color: textPrimary }}>
                  🔥 Daily Streak Challenge
                </h3>
                <button 
                  onClick={() => setIsStreakQuizOpen(false)}
                  style={{ background: isDarkMode ? '#1E2E4E' : '#E2E8F0', border: 'none', color: isDarkMode ? '#94A3B8' : '#475569', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {!streakQuizState.completed && !streakQuizState.failed ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '10px' }}>
                    <span>Question {streakQuizState.questionIndex + 1} of 5</span>
                    <span>Streak: {streak} 🔥</span>
                  </div>
                  <div className="progress-track" style={{ height: '8px', background: isDarkMode ? '#202D45' : '#E2E8F0', borderRadius: '100px', marginBottom: '28px', overflow: 'hidden' }}>
                    <div style={{ width: `${((streakQuizState.questionIndex)/5)*100}%`, height: '100%', background: '#FF9800', borderRadius: '100px' }} />
                  </div>

                  <div className="modal-question-box" style={{
                    background: friendRowBg, border: cardBorder,
                    fontWeight: 900, color: textPrimary, textAlign: 'center', marginBottom: '28px', lineHeight: 1.45
                  }}>
                    {streakQuizState.questions[streakQuizState.questionIndex]?.q}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {streakQuizState.questions[streakQuizState.questionIndex]?.options.map((opt, i) => {
                      const isSelected = streakSelectedAns === opt;
                      const isCorrectAnswer = opt === streakQuizState.questions[streakQuizState.questionIndex].a;
                      
                      let bg = friendRowBg;
                      let border = searchInputBorder;
                      let txtColor = textPrimary;

                      if (streakSelectedAns !== null) {
                        if (isCorrectAnswer) { bg = 'rgba(16,185,129,0.15)'; border = '2px solid var(--success)'; txtColor = 'var(--success)'; }
                        else if (isSelected) { bg = 'rgba(239,83,80,0.15)'; border = '2px solid var(--danger)'; txtColor = 'var(--danger)'; }
                        else { bg = isDarkMode ? '#1E2D4A' : '#E2E8F0'; border = isDarkMode ? '1.5px solid rgba(255,255,255,0.04)' : '1.5px solid rgba(0,0,0,0.04)'; txtColor = textSecondary; }
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => handleStreakAnswer(opt)}
                          disabled={streakSelectedAns !== null}
                          className="modal-option-btn"
                          style={{
                            width: '100%', background: bg,
                            border, color: txtColor, fontWeight: 800,
                            textAlign: 'left', cursor: streakSelectedAns !== null ? 'default' : 'pointer'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {streakSelectedAns !== null && (
                    <button
                      onClick={handleStreakNext}
                      style={{
                        width: '100%', padding: '16px', border: 'none', background: '#FF9800',
                        color: '#000', fontWeight: 900, fontSize: '0.95rem', borderRadius: '20px',
                        cursor: 'pointer', marginTop: '28px', boxShadow: '0 8px 20px rgba(255,152,0,0.3)'
                      }}
                    >
                      Next
                    </button>
                  )}
                </div>
              ) : streakQuizState.failed ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ margin: '0 auto 20px', width: '120px', height: '120px' }}>
                    <dotlottie-player
                      src="/animations/fail.lottie"
                      background="transparent"
                      speed="1"
                      style={{ width: '120px', height: '120px' }}
                      autoplay
                    ></dotlottie-player>
                  </div>
                  
                  <h4 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: textPrimary }}>Better luck next time!</h4>
                  <p style={{ fontSize: '0.92rem', marginTop: '8px', lineHeight: 1.5, color: textSecondary }}>
                    Daily streak has been reset to 0. Keep trying!
                  </p>

                  <button
                    onClick={() => setIsStreakQuizOpen(false)}
                    style={{
                      width: '100%', padding: '16px', border: 'none', background: 'var(--primary)',
                      color: 'white', fontWeight: 800, fontSize: '0.95rem', borderRadius: '20px',
                      cursor: 'pointer', marginTop: '24px'
                    }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ margin: '0 auto 20px', width: '140px', height: '140px' }}>
                    <dotlottie-player
                      src="/animations/streak on.lottie"
                      background="transparent"
                      speed="1"
                      style={{ width: '140px', height: '140px' }}
                      autoplay
                    ></dotlottie-player>
                  </div>
                  
                  <h4 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: textPrimary }}>Streak Saved! 🔥</h4>
                  <p style={{ fontSize: '0.92rem', marginTop: '8px', lineHeight: 1.5, color: textSecondary }}>
                    You got all 5 correct! Your daily streak is now {streak}!
                  </p>

                  <button
                    onClick={() => setIsStreakQuizOpen(false)}
                    style={{
                      width: '100%', padding: '16px', border: 'none', background: 'var(--primary)',
                      color: 'white', fontWeight: 800, fontSize: '0.95rem', borderRadius: '20px',
                      cursor: 'pointer'
                    }}
                  >
                    Claim Reward
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ChildDashboard;
