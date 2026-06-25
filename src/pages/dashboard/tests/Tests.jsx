import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useTests } from '../../../hooks/useTests';
import { testRepository } from '../../../repositories/testRepository';
import { 
  Play, Clock, Trophy, BarChart2, Plus, Trash2, Search, 
  ChevronRight, CheckCircle2, FileText, ArrowLeft, Award, HelpCircle
} from 'lucide-react';
import Modal from '../../../components/Modal';
import { TestsSkeleton } from '../../../components/SkeletonLoader';

// Dynamically load local files added in /Test folder
const localTestFiles = import.meta.glob('../../../../Test/*.json', { eager: true });

const CLASS_LEVELS = [
  'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7',
  'Class 8', 'Class 9', 'Class 10', 'Class 11 CS', 'Class 11 App', 'Class 12 CS', 'Class 12 App',
  'BCA', 'B.Tech'
];

const Tests = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { tests, attempts, submitTest, loading } = useTests(user?.uid);

  // States
  const [activeTest, setActiveTest] = useState(null);
  const [selectedLeaderboardTestId, setSelectedLeaderboardTestId] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Quiz Player States
  const [playingQuiz, setPlayingQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizQIdx, setQuizQIdx] = useState(0);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // Create Test Form State
  const [testForm, setTestForm] = useState({
    title: '',
    subject: 'Python',
    classGroup: 'Class 10',
    totalMarks: 100,
    duration: 30,
    difficulty: 'Medium',
    status: 'Published',
    questions: []
  });
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0
  });

  // Resolve local tests from /Test/ folder
  const [localTests, setLocalTests] = useState([]);
  useEffect(() => {
    try {
      const parsed = Object.entries(localTestFiles).map(([filePath, module]) => {
        const content = module.default || module;
        const id = filePath.split('/').pop().replace('.json', '');
        return {
          id: `local_${id}`,
          title: content.title,
          subject: content.subject,
          classGroup: content.classGroup || "Class 10",
          totalMarks: Number(content.totalMarks) || 100,
          duration: Number(content.duration) || 30,
          difficulty: content.difficulty || "Medium",
          questionsCount: content.questions?.length || 0,
          createdBy: "local_file",
          status: content.status || "Published",
          questions: content.questions || [],
          isLocal: true
        };
      });
      setLocalTests(parsed);
    } catch (err) {
      console.error("Error loading local tests from folder:", err);
    }
  }, []);

  const mergedTests = [...tests, ...localTests];

  // Listen to leaderboard of selected test
  useEffect(() => {
    if (!selectedLeaderboardTestId) {
      setLeaderboardData(null);
      return;
    }
    const unsub = testRepository.subscribeToLeaderboard(selectedLeaderboardTestId, (data) => {
      setLeaderboardData(data);
    });
    return () => unsub();
  }, [selectedLeaderboardTestId]);

  // Set default leaderboard test on load
  useEffect(() => {
    if (mergedTests.length > 0 && !selectedLeaderboardTestId) {
      setSelectedLeaderboardTestId(mergedTests[0].id);
    }
  }, [mergedTests, selectedLeaderboardTestId]);

  // Quiz Timer
  useEffect(() => {
    if (!playingQuiz || quizFinished || quizTimeRemaining <= 0) {
      if (playingQuiz && quizTimeRemaining === 0 && !quizFinished) {
        handleQuizSubmit();
      }
      return;
    }
    const timer = setTimeout(() => {
      setQuizTimeRemaining(quizTimeRemaining - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [playingQuiz, quizTimeRemaining, quizFinished]);

  if (loading) {
    return <TestsSkeleton />;
  }

  // Handle launch quiz
  const handleStartQuiz = (test) => {
    if (!test.questions || test.questions.length === 0) {
      showToast("This test has no questions to play!", "error");
      return;
    }
    setActiveTest(test);
    setQuizAnswers({});
    setQuizQIdx(0);
    setQuizTimeRemaining(test.duration * 60);
    setQuizStartTime(Date.now());
    setQuizFinished(false);
    setQuizResult(null);
    setPlayingQuiz(true);
  };

  // Submit Quiz Answers
  const handleQuizSubmit = async () => {
    setQuizFinished(true);
    const timeTaken = Math.round((Date.now() - quizStartTime) / 1000);
    
    try {
      showToast("Grading answers and updating ranks...", "info");
      const res = await submitTest(
        user.displayName || user.name || 'Student',
        activeTest,
        quizAnswers,
        timeTaken
      );
      setQuizResult(res);
      showToast("Test submitted successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to submit test attempts", "error");
    }
  };

  // Add Question to Form
  const handleAddQuestionToForm = () => {
    if (!newQuestion.questionText.trim()) {
      showToast("Please enter question text", "warning");
      return;
    }
    if (newQuestion.options.some(o => !o.trim())) {
      showToast("Please fill in all 4 option slots", "warning");
      return;
    }

    setTestForm({
      ...testForm,
      questions: [...testForm.questions, { ...newQuestion, id: testForm.questions.length + 1 }]
    });

    setNewQuestion({
      questionText: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0
    });
    showToast("Question added to test blueprint!", "success");
  };

  // Create Test in Firestore
  const handlePublishTest = async (e) => {
    e.preventDefault();
    if (testForm.questions.length === 0) {
      showToast("Please add at least 1 question before publishing!", "warning");
      return;
    }

    try {
      await testRepository.createTest({
        title: testForm.title,
        subject: testForm.subject,
        classGroup: testForm.classGroup,
        totalMarks: Number(testForm.totalMarks),
        duration: Number(testForm.duration),
        difficulty: testForm.difficulty,
        questionsCount: testForm.questions.length,
        status: testForm.status,
        questions: testForm.questions
      });

      showToast("Test published successfully!", "success");
      setIsModalOpen(false);
      setTestForm({
        title: '',
        subject: 'Python',
        classGroup: 'Class 10',
        totalMarks: 100,
        duration: 30,
        difficulty: 'Medium',
        status: 'Published',
        questions: []
      });
    } catch (err) {
      console.error(err);
      showToast("Failed to publish test", "error");
    }
  };

  const handleDeleteTest = async (id) => {
    if (window.confirm("Are you sure you want to delete this test?")) {
      try {
        await testRepository.deleteTest(id);
        showToast("Test deleted successfully", "success");
      } catch (err) {
        console.error(err);
        showToast("Failed to delete test", "error");
      }
    }
  };

  // -----------------------------------------------------------------
  // RENDER INTERACTIVE QUIZ PLAYER
  // -----------------------------------------------------------------
  if (playingQuiz && activeTest) {
    const currentQuestion = activeTest.questions[quizQIdx];
    const progressPercent = Math.round(((quizQIdx + 1) / activeTest.questions.length) * 100);

    const formatTime = (secs) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
      <div style={{ background: '#F8F7F4', minHeight: '85vh', padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Results Screen */}
        {quizFinished ? (
          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', background: 'var(--surface-card)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
            <div style={{ background: 'rgba(34,197,94,0.08)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Award size={44} style={{ color: '#22C55E' }} />
            </div>
            
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 10px 0' }}>Quiz Completed!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 24px 0' }}>Here are your performance metrics for: <strong style={{ color: 'var(--text-primary)' }}>{activeTest.title}</strong></p>

            {quizResult ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: '#F8F7F4', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Score</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#2563EB', marginTop: '4px' }}>
                    {quizResult.score}/{activeTest.totalMarks}
                  </div>
                </div>
                <div style={{ background: '#F8F7F4', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Percentage</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: quizResult.percentage >= 70 ? '#22C55E' : '#F59E0B', marginTop: '4px' }}>
                    {quizResult.percentage}%
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Calculating final score...</div>
            )}

            <button 
              onClick={() => {
                setPlayingQuiz(false);
                setActiveTest(null);
              }}
              className="btn btn-primary"
              style={{ padding: '14px 28px', fontSize: '1rem', width: '100%', justifyContent: 'center' }}
            >
              Back to Tests Dashboard
            </button>
          </div>
        ) : (
          // Active Playing Screen
          <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{activeTest.title}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeTest.subject} • {activeTest.difficulty}</span>
              </div>
              <div style={{ background: quizTimeRemaining < 60 ? 'var(--danger-light)' : 'var(--surface)', color: quizTimeRemaining < 60 ? 'var(--danger)' : 'var(--text-primary)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <Clock size={16} /> {formatTime(quizTimeRemaining)}
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>
                <span>Progress</span>
                <span>Question {quizQIdx + 1} of {activeTest.questions.length}</span>
              </div>
              <div className="progress-track" style={{ background: 'var(--border)', height: '6px' }}>
                <div className="progress-fill" style={{ width: `${progressPercent}%`, background: 'var(--primary)' }} />
              </div>
            </div>

            {/* Question Card */}
            <div style={{ background: 'var(--surface-card)', padding: '32px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.5 }}>
                {currentQuestion.questionText}
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentQuestion.options.map((opt, oIdx) => {
                  const isSelected = quizAnswers[quizQIdx] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => setQuizAnswers({ ...quizAnswers, [quizQIdx]: oIdx })}
                      style={{
                        textAlign: 'left', padding: '16px 20px', borderRadius: '12px',
                        background: isSelected ? 'var(--primary-light)' : 'var(--surface-card)',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                        fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button 
                disabled={quizQIdx === 0} 
                onClick={() => setQuizQIdx(quizQIdx - 1)} 
                className="btn btn-ghost" 
                style={{ padding: '12px 24px', opacity: quizQIdx === 0 ? 0.4 : 1 }}
              >
                Previous
              </button>
              
              {quizQIdx + 1 === activeTest.questions.length ? (
                <button 
                  onClick={handleQuizSubmit} 
                  className="btn btn-primary" 
                  style={{ padding: '12px 28px', background: '#22C55E' }}
                >
                  Submit Quiz
                </button>
              ) : (
                <button 
                  onClick={() => setQuizQIdx(quizQIdx + 1)} 
                  className="btn btn-primary" 
                  style={{ padding: '12px 28px' }}
                >
                  Next
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------
  // MAIN PANEL RENDER (Student / Admin / Faculty View)
  // -----------------------------------------------------------------
  const filteredTests = mergedTests.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((acc, a) => acc + a.percentage, 0) / attempts.length) : 0;
  const bestRank = attempts.length > 0 ? Math.min(...attempts.map(a => Number(a.rank) || 99)) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-primary)' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>Mock Tests Module</h1>
          <p style={{ color: 'var(--text-muted)' }}>Build technical proficiency with real-time test simulations.</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'faculty') && (
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Create New Test
          </button>
        )}
      </div>

      {/* Stats Cards Row for Students */}
      {user?.role === 'student' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--surface-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tests Completed</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>{attempts.length} Tests</div>
          </div>
          <div style={{ background: 'var(--surface-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Average Score</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22C55E', marginTop: '4px' }}>{avgScore}%</div>
          </div>
          <div style={{ background: 'var(--surface-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Best Rank</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>{bestRank ? `#${bestRank}` : 'No ranks'}</div>
          </div>
        </div>
      )}

      {/* Filter and Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px' }} className="grid-2-col-mobile">
        
        {/* Left Side: Test list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search tests by title or subject..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '48px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>Loading tests...</div>
            ) : filteredTests.length === 0 ? (
              <div style={{ background: 'var(--surface-card)', padding: '48px', textAlign: 'center', borderRadius: '20px', border: '1.5px dashed var(--border-strong)', color: 'var(--text-light)' }}>
                <FileText size={44} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3>No Tests Available</h3>
                <p style={{ fontSize: '0.9rem' }}>Check back later or compile local tests into the `/Test` directory.</p>
              </div>
            ) : (
              filteredTests.map((test) => {
                const myAttempt = attempts.find(a => a.testId === test.id);
                return (
                  <div 
                    key={test.id} 
                    onClick={() => setSelectedLeaderboardTestId(test.id)}
                    style={{ 
                      background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: selectedLeaderboardTestId === test.id ? '2px solid #2563EB' : '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{test.title}</h3>
                        {test.isLocal && <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1', fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>Local File</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>🎯 {test.subject}</span>
                        <span>👥 {test.classGroup}</span>
                        <span>⏱️ {test.duration} mins</span>
                        <span>📝 {test.questionsCount} Questions</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {myAttempt ? (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Attempted Score:</span>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#22C55E' }}>{myAttempt.score}/{test.totalMarks}</div>
                        </div>
                      ) : (
                        user?.role === 'student' && (
                          <button onClick={(e) => { e.stopPropagation(); handleStartQuiz(test); }} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Play size={14} fill="white" /> Start
                          </button>
                        )
                      )}
                      
                      {(user?.role === 'admin' || user?.role === 'faculty') && !test.isLocal && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id); }} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '8px' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Leaderboard Panel */}
        <div style={{ background: 'var(--surface-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} style={{ color: '#F59E0B' }} /> Test Leaderboard
          </h3>

          {leaderboardData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                Showing rankings for: <strong>{leaderboardData.testTitle}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leaderboardData.topStudents && leaderboardData.topStudents.length > 0 ? (
                  leaderboardData.topStudents.map((stud) => (
                    <div key={stud.studentId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: stud.studentId === user?.uid ? 'rgba(37,99,235,0.06)' : '#F8F7F4', borderRadius: '8px', border: stud.studentId === user?.uid ? '1.5px solid rgba(37,99,235,0.2)' : '1px solid var(--border)' }}>
                      <span style={{ width: '24px', fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.88rem' }}>#{stud.rank}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{stud.name}</span>
                      <strong style={{ color: '#2563EB', fontSize: '0.88rem' }}>{stud.score} pts</strong>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem', padding: '10px 0' }}>No submissions yet.</div>
                )}
              </div>
              
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>Avg Score: <strong>{leaderboardData.averageScore}</strong></div>
                <div>Top Score: <strong>{leaderboardData.highestScore}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}>Participants: <strong>{leaderboardData.totalParticipants} students</strong></div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>Select a test on the left to inspect scores.</div>
          )}
        </div>

      </div>

      {/* Create Test Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Interactive Quiz Blueprint">
        <form onSubmit={handlePublishTest} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '6px' }}>
          <div>
            <label className="form-label">Quiz Title</label>
            <input
              type="text"
              required
              className="form-input"
              value={testForm.title}
              onChange={e => setTestForm({ ...testForm, title: e.target.value })}
              placeholder="e.g. Loops & Arrays Exam"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Subject</label>
              <input
                type="text"
                required
                className="form-input"
                value={testForm.subject}
                onChange={e => setTestForm({ ...testForm, subject: e.target.value })}
                placeholder="e.g. Python"
              />
            </div>
            <div>
              <label className="form-label">Target Class Group</label>
              <select
                className="form-input"
                value={testForm.classGroup}
                onChange={e => setTestForm({ ...testForm, classGroup: e.target.value })}
              >
                {CLASS_LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="form-label">Duration (Minutes)</label>
              <input
                type="number"
                required
                className="form-input"
                value={testForm.duration}
                onChange={e => setTestForm({ ...testForm, duration: Number(e.target.value) })}
                placeholder="e.g. 30"
              />
            </div>
            <div>
              <label className="form-label">Total Marks</label>
              <input
                type="number"
                required
                className="form-input"
                value={testForm.totalMarks}
                onChange={e => setTestForm({ ...testForm, totalMarks: Number(e.target.value) })}
                placeholder="e.g. 100"
              />
            </div>
          </div>

          {/* Builder Section for Questions */}
          <div style={{ border: '1px solid var(--border-strong)', padding: '16px', borderRadius: '12px', background: '#F8F7F4', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Add MCQ Question</h4>
            
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Question Text</label>
              <input
                type="text"
                className="form-input"
                value={newQuestion.questionText}
                onChange={e => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                placeholder="What is the output of..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {newQuestion.options.map((opt, index) => (
                <div key={index}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Option {index + 1}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={opt}
                    onChange={e => {
                      const opts = [...newQuestion.options];
                      opts[index] = e.target.value;
                      setNewQuestion({ ...newQuestion, options: opts });
                    }}
                    placeholder={`Option ${index + 1}`}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Correct Option Index</label>
              <select
                className="form-input"
                value={newQuestion.correctAnswerIndex}
                onChange={e => setNewQuestion({ ...newQuestion, correctAnswerIndex: Number(e.target.value) })}
              >
                <option value={0}>Option 1</option>
                <option value={1}>Option 2</option>
                <option value={2}>Option 3</option>
                <option value={3}>Option 4</option>
              </select>
            </div>

            <button 
              type="button" 
              onClick={handleAddQuestionToForm}
              className="btn btn-secondary" 
              style={{ padding: '8px 16px', width: 'fit-content', marginTop: '4px', fontSize: '0.82rem' }}
            >
              Add Question to List
            </button>
          </div>

          {/* Current added questions count */}
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563EB' }}>
            Questions added: {testForm.questions.length} questions
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Publish Quiz</button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Tests;
