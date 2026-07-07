import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useTests } from '../../../hooks/useTests';
import { testRepository } from '../../../repositories/testRepository';
import { testService } from '../../../services/testService';
import { 
  Play, Clock, Trophy, BarChart2, Plus, Trash2, Search, 
  ChevronRight, CheckCircle2, FileText, ArrowLeft, Award, HelpCircle
} from 'lucide-react';
import Modal from '../../../components/Modal';
import { TestsSkeleton } from '../../../components/SkeletonLoader';
import { db } from '../../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
    assignedStudentId: '',
    questions: []
  });
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0
  });

  const [students, setStudents] = useState([]);
  const [selectedTestAttempts, setSelectedTestAttempts] = useState([]);

  // DOCX Import States
  const [importDocxQuestions, setImportDocxQuestions] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isParsingDocx, setIsParsingDocx] = useState(false);
  const [importError, setImportError] = useState('');
  const docxInputRef = useRef(null);

  // Lazy-load mammoth parser from CDN
  const loadMammoth = () => {
    return new Promise((resolve, reject) => {
      if (window.mammoth) {
        resolve(window.mammoth);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';
      script.onload = () => resolve(window.mammoth);
      script.onerror = () => reject(new Error('Failed to load mammoth parser from CDN'));
      document.head.appendChild(script);
    });
  };

  // Parser: Extract MCQ blocks from plain text
  const parseMcqFromText = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const questions = [];
    let currentQuestion = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match question start: "1. What is...", "Q1. What is...", "Question 1: What is..."
      const questionMatch = line.match(/^(?:Q|Question\s*)?(\d+)\s*[\.:\)-]\s*(.*)$/i);
      // Match option: "A. Option", "B) Option", "(C) Option"
      const optionMatch = line.match(/^([A-D])\s*[\.:\)-]\s*(.*)$/i) || line.match(/^\(([A-D])\)\s*(.*)$/i);
      // Match correct answer: "Answer: A", "Correct Answer: B", "Ans: C"
      const answerMatch = line.match(/^(?:Correct\s+)?Answer\s*[\.:\s]*([A-D])/i) || line.match(/^Ans\s*[\.:\s]*([A-D])/i);

      if (questionMatch) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          id: questions.length + 1,
          questionText: questionMatch[2] || '',
          options: ['', '', '', ''],
          correctAnswerIndex: -1,
          error: ''
        };
      } else if (optionMatch && currentQuestion) {
        const optChar = optionMatch[1].toUpperCase();
        const optText = optionMatch[2] || '';
        const idx = optChar.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        if (idx >= 0 && idx < 4) {
          currentQuestion.options[idx] = optText;
        }
      } else if (answerMatch && currentQuestion) {
        const ansChar = answerMatch[1].toUpperCase();
        currentQuestion.correctAnswerIndex = ansChar.charCodeAt(0) - 65;
      } else if (currentQuestion) {
        // Multi-line question text or trailing option texts
        if (currentQuestion.options.every(o => o === '')) {
          currentQuestion.questionText += ' ' + line;
        }
      }
    }

    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    // Validate questions and mark errors
    return questions.map(q => {
      const missingOpts = q.options.filter(o => !o.trim()).length;
      let error = '';
      if (missingOpts > 0) {
        error = `${4 - missingOpts} options found. Requires exactly 4 options.`;
      } else if (q.correctAnswerIndex === -1) {
        error = 'No correct answer specified (e.g. Answer: A).';
      }
      return { ...q, error };
    });
  };

  const handleImportDocxClick = () => {
    setImportError('');
    if (docxInputRef.current) {
      docxInputRef.current.click();
    }
  };

  const handleDocxImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Friendly validation: accept ONLY .docx
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'docx') {
      showToast("Only .docx files are supported. Please select a valid Word Document.", "error");
      e.target.value = '';
      return;
    }

    setIsParsingDocx(true);
    setImportError('');

    try {
      const mammothInstance = await loadMammoth();
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const result = await mammothInstance.extractRawText({ arrayBuffer });
          const parsed = parseMcqFromText(result.value);
          
          if (parsed.length === 0) {
            setImportError("No questions found in the document. Verify format: 1. Question \\n A. Option A \\n Answer: A");
          } else {
            setImportDocxQuestions(parsed);
            setIsImportModalOpen(true);
          }
        } catch (err) {
          console.error("Mammoth parsing error:", err);
          setImportError("Failed to extract text from DOCX file.");
        } finally {
          setIsParsingDocx(false);
        }
      };

      reader.onerror = () => {
        setImportError("Failed to read file buffer.");
        setIsParsingDocx(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Loader error:", err);
      setImportError("Failed to load DOCX parser library.");
      setIsParsingDocx(false);
    }

    // Reset file input
    e.target.value = '';
  };

  const handleSaveImportedQuestions = () => {
    // Filter out any completely empty/invalid questions
    const validQuestions = importDocxQuestions.filter(q => q.questionText.trim() && q.options.every(o => o.trim()));
    
    if (validQuestions.length === 0) {
      showToast("No valid questions to import.", "warning");
      return;
    }

    // Add imported questions to form
    const currentQuestions = [...testForm.questions];
    validQuestions.forEach(q => {
      currentQuestions.push({
        id: currentQuestions.length + 1,
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex === -1 ? 0 : q.correctAnswerIndex
      });
    });

    setTestForm({ ...testForm, questions: currentQuestions });
    setIsImportModalOpen(false);
    showToast(`Successfully imported ${validQuestions.length} questions!`, "success");
  };

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

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'member') {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      getDocs(q).then((snap) => {
        const list = [];
        snap.forEach(d => {
          list.push({ uid: d.id, ...d.data() });
        });
        setStudents(list);
      }).catch(err => console.error("Error fetching students:", err));
    }
  }, [user]);

  useEffect(() => {
    if (!selectedLeaderboardTestId) {
      setSelectedTestAttempts([]);
      return;
    }
    const unsub = testRepository.subscribeToTestAttemptsForTest(selectedLeaderboardTestId, (data) => {
      setSelectedTestAttempts(data || []);
    });
    return () => unsub();
  }, [selectedLeaderboardTestId]);

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
        assignedStudentId: testForm.assignedStudentId || null,
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
        assignedStudentId: '',
        questions: []
      });
    } catch (err) {
      console.error(err);
      showToast("Failed to publish test", "error");
    }
  };

  const handleAllotMarks = async (testId, testTitle, totalMarks, studentId, studentName, existingAttemptId = null) => {
    const rawScore = window.prompt(`Allot Marks for ${studentName} (out of ${totalMarks}):`);
    if (rawScore === null) return; // cancelled
    
    const score = Number(rawScore);
    if (isNaN(score) || score < 0 || score > totalMarks) {
      showToast(`Please enter a valid score between 0 and ${totalMarks}`, "warning");
      return;
    }

    try {
      const percentage = Math.round((score / totalMarks) * 100);
      if (existingAttemptId) {
        // Update existing attempt
        await testRepository.updateTestAttemptScore(existingAttemptId, score, percentage);
        showToast("Marks updated successfully!", "success");
      } else {
        // Create new attempt
        const attemptData = {
          studentId,
          studentName,
          testId,
          testTitle,
          score,
          percentage,
          timeTaken: 0,
          rank: null,
          allottedBy: user.displayName || user.name || 'Admin/Faculty'
        };
        await testRepository.saveTestAttempt(attemptData);
        showToast("Marks allotted successfully!", "success");
      }
      
      // Recalculate leaderboard
      await testService.recalculateRanksAndLeaderboard(testId, testTitle, totalMarks);
    } catch (err) {
      console.error(err);
      showToast("Failed to allot marks", "error");
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
  const isStaff = user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'member';
  const filteredTests = mergedTests.filter(t => {
    if (!isStaff && t.assignedStudentId && t.assignedStudentId !== user?.uid) {
      return false;
    }
    return t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           t.subject.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
                        {test.assignedStudentId ? (
                          <span style={{ color: '#E11D48', fontWeight: 700 }}>
                            👤 {test.assignedStudentId === user?.uid ? "Assigned to You" : `Assigned Student`}
                          </span>
                        ) : (
                          <span>👥 {test.classGroup}</span>
                        )}
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
            <Trophy size={18} style={{ color: '#F59E0B' }} /> Test Grading & Leaderboard
          </h3>

          {selectedLeaderboardTestId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                Showing grading for: <strong>{mergedTests.find(t => t.id === selectedLeaderboardTestId)?.title}</strong>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Student Submissions:</span>
                {selectedTestAttempts && selectedTestAttempts.length > 0 ? (
                  selectedTestAttempts.map((stud) => (
                    <div key={stud.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 14px', background: stud.studentId === user?.uid ? 'rgba(37,99,235,0.06)' : '#F8F7F4', borderRadius: '8px', border: stud.studentId === user?.uid ? '1.5px solid rgba(37,99,235,0.2)' : '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{stud.studentName}</span>
                        {stud.allottedBy && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Graded by {stud.allottedBy}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#2563EB', fontSize: '0.88rem' }}>{stud.score} pts</strong>
                        {(user?.role === 'admin' || user?.role === 'faculty') && (
                          <button
                            onClick={() => {
                              const testObj = mergedTests.find(t => t.id === selectedLeaderboardTestId);
                              if (testObj) {
                                handleAllotMarks(
                                  selectedLeaderboardTestId,
                                  testObj.title,
                                  testObj.totalMarks,
                                  stud.studentId,
                                  stud.studentName,
                                  stud.id
                                );
                              }
                            }}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                          >
                            Grade
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem', padding: '10px 0' }}>No submissions yet.</div>
                )}
              </div>

              {/* Direct grading dropdown for Admin & Faculty */}
              {(user?.role === 'admin' || user?.role === 'faculty') && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Grade Student Directly:</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      id="direct-grade-student-select"
                      className="form-input"
                      style={{ fontSize: '0.82rem', padding: '8px', background: 'var(--surface-elevated)', flex: 1 }}
                    >
                      <option value="">Select Student...</option>
                      {students.map(s => (
                        <option key={s.uid} value={`${s.uid}|${s.name || s.displayName || 'Student'}`}>
                          {s.name || s.displayName || 'Student'}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const selectEl = document.getElementById('direct-grade-student-select');
                        if (!selectEl?.value) {
                          showToast("Please select a student", "warning");
                          return;
                        }
                        const [studentId, studentName] = selectEl.value.split('|');
                        const testObj = mergedTests.find(t => t.id === selectedLeaderboardTestId);
                        if (testObj) {
                          const existingAttempt = selectedTestAttempts.find(a => a.studentId === studentId);
                          handleAllotMarks(
                            selectedLeaderboardTestId,
                            testObj.title,
                            testObj.totalMarks,
                            studentId,
                            studentName,
                            existingAttempt?.id
                          );
                        }
                      }}
                      className="btn btn-primary"
                      style={{ padding: '8px 12px', fontSize: '0.82rem', borderRadius: '8px' }}
                    >
                      Grade
                    </button>
                  </div>
                </div>
              )}

              {leaderboardData && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>Avg Score: <strong>{leaderboardData.averageScore}</strong></div>
                  <div>Top Score: <strong>{leaderboardData.highestScore}</strong></div>
                  <div style={{ gridColumn: '1 / -1' }}>Participants: <strong>{leaderboardData.totalParticipants} students</strong></div>
                </div>
              )}
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

          <div>
            <label className="form-label">Assign to Specific Student (Optional)</label>
            <select
              className="form-input"
              value={testForm.assignedStudentId}
              onChange={e => setTestForm({ ...testForm, assignedStudentId: e.target.value })}
              style={{ background: 'var(--white)' }}
            >
              <option value="">All Students (Default)</option>
              {students.map(s => (
                <option key={s.uid} value={s.uid}>
                  {s.name || s.displayName || 'Student'} ({s.email || s.phone || 'No Contact'})
                </option>
              ))}
            </select>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Add MCQ Question</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="file"
                  ref={docxInputRef}
                  onChange={handleDocxImport}
                  accept=".docx"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleImportDocxClick}
                  disabled={isParsingDocx}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  {isParsingDocx ? (
                    <span>Parsing...</span>
                  ) : (
                    <>
                      <span>📄</span> Import DOCX
                    </>
                  )}
                </button>
              </div>
            </div>
            {importError && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', fontSize: '0.78rem' }}>
                ⚠️ {importError}
              </div>
            )}
            
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

      {/* DOCX Import Review Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Review & Edit Imported Questions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            We found <strong>{importDocxQuestions.length}</strong> questions in your document. Please review and correct any malformed entries before saving.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {importDocxQuestions.map((q, idx) => (
              <div 
                key={q.id} 
                style={{ 
                  border: q.error ? '1.5px solid var(--danger)' : '1px solid var(--border)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: q.error ? 'rgba(239,68,68,0.02)' : 'var(--white)',
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  position: 'relative'
                }}
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => {
                    const updated = importDocxQuestions.filter(item => item.id !== q.id);
                    setImportDocxQuestions(updated);
                  }}
                  style={{
                    position: 'absolute', top: '12px', right: '12px',
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: '4px'
                  }}
                  title="Remove question"
                >
                  <X size={16} />
                </button>

                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)' }}>
                  Question {idx + 1}
                </div>

                {q.error && (
                  <div style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 700 }}>
                    ⚠️ {q.error}
                  </div>
                )}

                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Question Text</label>
                  <input
                    type="text"
                    className="form-input"
                    value={q.questionText}
                    onChange={e => {
                      const updated = [...importDocxQuestions];
                      updated[idx].questionText = e.target.value;
                      // Clear error if now valid
                      if (e.target.value.trim()) {
                        const missingOpts = updated[idx].options.filter(o => !o.trim()).length;
                        if (missingOpts === 0 && updated[idx].correctAnswerIndex !== -1) {
                          updated[idx].error = '';
                        }
                      }
                      setImportDocxQuestions(updated);
                    }}
                    placeholder="Question text"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx}>
                      <label className="form-label" style={{ fontSize: '0.68rem' }}>Option {oIdx + 1}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={opt}
                        onChange={e => {
                          const updated = [...importDocxQuestions];
                          updated[idx].options[oIdx] = e.target.value;
                          // Recalculate error
                          const missingOpts = updated[idx].options.filter(o => !o.trim()).length;
                          if (missingOpts > 0) {
                            updated[idx].error = `${4 - missingOpts} options found. Requires exactly 4 options.`;
                          } else if (updated[idx].correctAnswerIndex === -1) {
                            updated[idx].error = 'No correct answer specified.';
                          } else {
                            updated[idx].error = '';
                          }
                          setImportDocxQuestions(updated);
                        }}
                        placeholder={`Option ${oIdx + 1}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Correct Option</label>
                  <select
                    className="form-input"
                    value={q.correctAnswerIndex}
                    onChange={e => {
                      const updated = [...importDocxQuestions];
                      updated[idx].correctAnswerIndex = Number(e.target.value);
                      if (updated[idx].questionText.trim() && updated[idx].options.every(o => o.trim())) {
                        updated[idx].error = '';
                      }
                      setImportDocxQuestions(updated);
                    }}
                  >
                    <option value={-1} disabled>Select Correct Option</option>
                    <option value={0}>Option 1 (A)</option>
                    <option value={1}>Option 2 (B)</option>
                    <option value={2}>Option 3 (C)</option>
                    <option value={3}>Option 4 (D)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <button 
              type="button" 
              onClick={() => setIsImportModalOpen(false)} 
              className="btn btn-ghost" 
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSaveImportedQuestions} 
              className="btn btn-primary" 
              style={{ flex: 1.5 }}
            >
              Import {importDocxQuestions.filter(q => q.questionText.trim() && q.options.every(o => o.trim())).length} Questions
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Tests;
