import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, UploadCloud, FileText, CheckCircle, AlertCircle, RefreshCw, 
  Users, Shield, Calendar, Award, Sparkles, Check, File, FileSpreadsheet, ArrowRight 
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  parseAssignmentMetadata, validateAssignmentFile 
} from '../../utils/documentExtractor';
import { 
  createCollaborativeAssignment, uploadAssignmentFileToStorage, checkForDuplicateAssignment 
} from '../../services/collaborativeAssignmentService';

const TeamAssignmentModal = ({ isOpen, onClose, currentUser, onCreated }) => {
  const fileInputRef = useRef(null);

  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Workflow Stage: 'upload' | 'extracting' | 'preview' | 'duplicate_warning'
  const [stage, setStage] = useState('upload');
  
  // File & Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStageText, setUploadStageText] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Extracted AI Metadata States
  const [extractedMetadata, setExtractedMetadata] = useState(null);
  const [uploadedFileData, setUploadedFileData] = useState(null);

  // Essential Editable Inputs (Defaults from AI Extraction)
  const [selectedStudentUids, setSelectedStudentUids] = useState([]);
  const [selectedFacultyUid, setSelectedFacultyUid] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [marks, setMarks] = useState(100);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      resetModalState();
      return;
    }
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach(d => {
          const u = d.data();
          list.push({
            uid: d.id,
            displayName: u.displayName || u.name || u.email,
            email: u.email,
            role: (u.role || 'student').toLowerCase()
          });
        });
        setAllUsers(list);
      } catch (err) {
        console.error('Error fetching users for team assignment:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [isOpen]);

  const resetModalState = () => {
    setStage('upload');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStageText('');
    setRetryCount(0);
    setExtractedMetadata(null);
    setUploadedFileData(null);
    setSelectedStudentUids([]);
    setSelectedFacultyUid('');
    setDueDate('');
    setMarks(100);
    setErrorMsg('');
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  const students = allUsers.filter(u => u.role === 'student');
  const faculties = allUsers.filter(u => u.role === 'faculty' || u.role === 'admin');

  // Handle Document Selection & Processing
  const handleFileProcess = async (file) => {
    setErrorMsg('');
    try {
      validateAssignmentFile(file);
      setSelectedFile(file);
      setStage('extracting');
      setUploadProgress(10);
      setUploadStageText('Reading document...');

      // 1. Extract Metadata using AI Parser Heuristics
      const metadata = await parseAssignmentMetadata(file);
      setExtractedMetadata(metadata);
      setDueDate(metadata.dueDate || '');
      setMarks(metadata.marks || 100);

      // 2. Check for duplicate assignment title
      setUploadStageText('Checking duplicate assignments...');
      setUploadProgress(30);
      const isDuplicate = await checkForDuplicateAssignment(metadata.title);
      if (isDuplicate) {
        setStage('duplicate_warning');
        return;
      }

      // 3. Upload File to Firebase Storage with Retry Logic
      await performStorageUpload(file, metadata);

    } catch (err) {
      console.error('File process error:', err);
      setErrorMsg(err.message || 'Failed to process document.');
      setStage('upload');
    }
  };

  const performStorageUpload = async (file, metadata, currentRetries = 0) => {
    try {
      setUploadStageText('Uploading document to Firebase Storage...');
      const fileData = await uploadAssignmentFileToStorage(file, (progress) => {
        setUploadProgress(30 + Math.round(progress * 0.5)); // 30% -> 80%
      });

      setUploadStageText('Extracting assignment AI metrics...');
      setUploadProgress(90);
      setUploadedFileData(fileData);

      setUploadStageText('Almost done...');
      setUploadProgress(100);

      setTimeout(() => {
        setStage('preview');
      }, 500);

    } catch (err) {
      if (currentRetries < 3) {
        setUploadStageText(`Network interrupt. Retrying upload (${currentRetries + 1}/3)...`);
        setRetryCount(currentRetries + 1);
        await new Promise(r => setTimeout(r, 1500));
        return performStorageUpload(file, metadata, currentRetries + 1);
      } else {
        setErrorMsg('Upload failed due to network error. Please try again.');
        setStage('upload');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const toggleStudentSelection = (studentUid) => {
    setErrorMsg('');
    if (selectedStudentUids.includes(studentUid)) {
      setSelectedStudentUids(prev => prev.filter(id => id !== studentUid));
    } else {
      if (selectedStudentUids.length >= 4) {
        setErrorMsg('Maximum 4 students per team allowed.');
        return;
      }
      setSelectedStudentUids(prev => [...prev, studentUid]);
    }
  };

  const handlePublishAssignment = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedStudentUids.length === 0) {
      setErrorMsg('Please select at least 1 student for the team.');
      return;
    }

    if (!dueDate) {
      setErrorMsg('Please select a valid Due Date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedStudentObjs = students.filter(s => selectedStudentUids.includes(s.uid));
      const selectedFacultyObj = faculties.find(f => f.uid === selectedFacultyUid) || null;

      await createCollaborativeAssignment({
        title: extractedMetadata.title,
        subject: extractedMetadata.subject,
        level: extractedMetadata.level,
        difficulty: extractedMetadata.difficulty,
        dueDate,
        marks,
        description: extractedMetadata.instructions,
        objectives: extractedMetadata.objectives,
        studentMembers: selectedStudentObjs,
        facultyLeader: selectedFacultyObj,
        fileData: uploadedFileData
      }, currentUser);

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to publish team assignment:', err);
      setErrorMsg(err.message || 'Failed to publish team assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          style={{
            background: 'var(--white, #FFFFFF)',
            color: 'var(--text-primary, #121212)',
            borderRadius: '24px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90dvh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: 'var(--shadow-xl)',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(83,109,254,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UploadCloud size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Document-First Assignment Creation</h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Upload assignment document · AI metadata extraction</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STAGE 1: DRAG & DROP FILE UPLOAD ZONE */}
          {stage === 'upload' && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--primary)',
                borderRadius: '20px',
                padding: '48px 24px',
                textAlign: 'center',
                background: 'rgba(83, 109, 254, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.pdf,.xlsx,.xls,.txt,.md"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
              />
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(83,109,254,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UploadCloud size={32} />
              </div>

              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 900 }}>Drag & Drop Assignment Document Here</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Supports <strong>.DOCX</strong>, <strong>.PDF</strong>, <strong>.XLSX</strong> · Maximum 25 MB
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <span style={{ background: 'var(--white)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', border: '1px solid var(--border)', fontWeight: 700 }}>
                  📄 .DOCX
                </span>
                <span style={{ background: 'var(--white)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', border: '1px solid var(--border)', fontWeight: 700 }}>
                  📕 .PDF
                </span>
                <span style={{ background: 'var(--white)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', border: '1px solid var(--border)', fontWeight: 700 }}>
                  📊 .XLSX
                </span>
              </div>
            </div>
          )}

          {/* STAGE 2: UPLOADING & AI EXTRACTION PROGRESS BAR */}
          {stage === 'extracting' && (
            <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
              <RefreshCw size={36} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 900 }}>{uploadStageText}</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedFile?.name} ({Math.round((selectedFile?.size || 0) / 1024)} KB)</span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px' }}>
                  <span>Uploading & Extracting</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ height: 10, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #536DFE, #7C4DFF)', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            </div>
          )}

          {/* DUPLICATE WARNING MODAL STAGE */}
          {stage === 'duplicate_warning' && (
            <div className="card card-p" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1.5px solid #F59E0B', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
              <AlertCircle size={36} style={{ color: '#F59E0B', marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 900 }}>Duplicate Assignment Detected</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: '0 0 20px 0' }}>
                An assignment titled <strong>"{extractedMetadata?.title}"</strong> already exists in the system. Would you like to create another copy?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => performStorageUpload(selectedFile, extractedMetadata)}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', borderRadius: '100px', fontWeight: 800 }}
                >
                  Create Copy
                </button>
                <button
                  onClick={resetModalState}
                  className="btn btn-secondary"
                  style={{ padding: '10px 24px', borderRadius: '100px', fontWeight: 700 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: AI ASSIGNMENT PREVIEW & ESSENTIAL INPUTS ONLY */}
          {stage === 'preview' && extractedMetadata && (
            <form onSubmit={handlePublishAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* AI Extracted Preview Card */}
              <div style={{ background: 'linear-gradient(135deg, rgba(83,109,254,0.08) 0%, rgba(124,77,255,0.08) 100%)', border: '1.5px solid rgba(83,109,254,0.3)', borderRadius: '20px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ background: 'var(--primary)', color: 'white', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ✨ AI Extracted Metadata
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {extractedMetadata.level} · {extractedMetadata.difficulty}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 900 }}>{extractedMetadata.title}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{extractedMetadata.subject}</span>

                {/* Detected Objectives List */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '6px' }}>Detected Objectives:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {extractedMetadata.objectives.map((obj, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                        <CheckCircle size={14} style={{ color: '#10B981' }} />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ESSENTIAL INPUTS ONLY */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="form-label">Due Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}
                  />
                </div>

                <div>
                  <label className="form-label">Total Marks *</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    required
                    className="form-input"
                    value={marks}
                    onChange={e => setMarks(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              {/* Student Selection */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                    Assign Students ({selectedStudentUids.length} / 4 Selected) *
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max 4 students</span>
                </div>

                {loadingUsers ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading student directory...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                    {students.map(s => {
                      const isSelected = selectedStudentUids.includes(s.uid);
                      return (
                        <div
                          key={s.uid}
                          onClick={() => toggleStudentSelection(s.uid)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                            background: isSelected ? 'rgba(83,109,254,0.1)' : 'var(--white)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.82rem',
                            fontWeight: isSelected ? 800 : 500
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.displayName}</span>
                          {isSelected && <Check size={14} style={{ color: 'var(--primary)' }} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Faculty Leader */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Shield size={16} style={{ color: 'var(--primary)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Faculty Leader (Optional)</h4>
                </div>
                <select
                  value={selectedFacultyUid}
                  onChange={e => setSelectedFacultyUid(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--white)', fontSize: '0.85rem' }}
                >
                  <option value="">None</option>
                  {faculties.map(f => (
                    <option key={f.uid} value={f.uid}>{f.displayName} ({f.email})</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 900, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isSubmitting ? 'Publishing Workspace...' : 'Publish Collaborative Workspace'} <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={resetModalState}
                  className="btn btn-secondary"
                  style={{ padding: '14px 20px', borderRadius: '12px', fontWeight: 700 }}
                >
                  Change File
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TeamAssignmentModal;
