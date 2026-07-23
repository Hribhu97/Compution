import { db, storage } from '../firebase';
import { 
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, 
  serverTimestamp, onSnapshot, updateDoc, setDoc, addDoc, deleteDoc, runTransaction 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// ── BONUS BADGES DEFINITIONS ──────────────────────────────
export const BONUS_BADGES = [
  { id: 'fast_finish', title: 'Fast Finish', icon: '⚡', color: '#10B981', desc: 'Completed well ahead of deadline' },
  { id: 'perfect_docs', title: 'Perfect Documentation', icon: '📘', color: '#3B82F6', desc: 'Impeccable formatting & clarity' },
  { id: 'creative_thinkers', title: 'Creative Thinkers', icon: '💡', color: '#F59E0B', desc: 'Innovative problem approach' },
  { id: 'problem_solver', title: 'Problem Solver', icon: '🧩', color: '#8B5CF6', desc: 'Mastery over complex logic' },
  { id: 'teamwork', title: 'Outstanding Teamwork', icon: '🤝', color: '#EC4899', desc: 'Exceptional group collaboration' },
  { id: 'innovation', title: 'Innovation Award', icon: '🚀', color: '#06B6D4', desc: 'Out-of-the-box solution' },
  { id: 'research_master', title: 'Research Master', icon: '🔬', color: '#6366F1', desc: 'Exhaustive background study' },
  { id: 'presentation_star', title: 'Presentation Star', icon: '🌟', color: '#EAB308', desc: 'Stunning visual layout' },
  { id: 'debug_hero', title: 'Debug Hero', icon: '🐛', color: '#EF4444', desc: 'Zero defect implementation' }
];

// ── DEFAULT CHECKLIST TEMPLATE ────────────────────────────
export const DEFAULT_CHECKLIST = [
  { id: 'chk_1', text: 'Problem Analysis & Requirement Gathering', category: 'Research', completed: false, assignedTo: '' },
  { id: 'chk_2', text: 'System Architecture & UI/UX Design Mockups', category: 'Design', completed: false, assignedTo: '' },
  { id: 'chk_3', text: 'Core Module Implementation & Integration', category: 'Documentation', completed: false, assignedTo: '' },
  { id: 'chk_4', text: 'Unit Testing & Bug Verification', category: 'Testing', completed: false, assignedTo: '' },
  { id: 'chk_5', text: 'Final Documentation & Code Review', category: 'Documentation', completed: false, assignedTo: '' }
];

/**
 * Checks if a duplicate assignment document title already exists.
 */
export const checkForDuplicateAssignment = async (title) => {
  try {
    const q = query(collection(db, 'collaborativeAssignments'), where('title', '==', title.trim()));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error('Error checking duplicate assignment:', err);
    return false;
  }
};

/**
 * Uploads assignment file to Firebase Storage with progress tracking.
 */
export const uploadAssignmentFileToStorage = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `assignments/docs/${Date.now()}_${sanitizedName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('Firebase storage upload failed:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadURL,
            storagePath,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size
          });
        }
      );
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Creates a new Document-Driven Collaborative Assignment (Admin only).
 * Limits: Max 4 students + 1 optional faculty leader (total max 5 members).
 */
export const createCollaborativeAssignment = async (assignmentData, creatorUser) => {
  try {
    const {
      title,
      subject,
      dueDate,
      description,
      objectives,
      level = 'Class 10',
      difficulty = 'Intermediate',
      marks = 100,
      studentMembers = [], // Array of student user objects { uid, name, email }
      facultyLeader = null, // Faculty user object or null
      fileData = null // { downloadURL, storagePath, fileName, fileType, fileSize }
    } = assignmentData;

    // Enforce team limit validation
    if (studentMembers.length > 4) {
      throw new Error('A team cannot have more than 4 student members.');
    }

    const assignmentRef = doc(collection(db, 'collaborativeAssignments'));
    const assignmentId = assignmentRef.id;

    // Combine team members list
    const teamMembersList = studentMembers.map(s => ({
      uid: s.uid,
      displayName: s.displayName || s.name || s.email,
      role: 'student',
      isLeader: false
    }));

    if (facultyLeader) {
      teamMembersList.unshift({
        uid: facultyLeader.uid,
        displayName: facultyLeader.displayName || facultyLeader.name || facultyLeader.email,
        role: 'faculty',
        isLeader: true
      });
    }

    const payload = {
      id: assignmentId,
      title,
      subject,
      dueDate,
      description: description || '',
      objectives: objectives || 'Complete assigned research, design, documentation, and testing tasks collaboratively.',
      level,
      difficulty,
      marks: Number(marks) || 100,
      status: 'in_progress', // 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'locked'
      createdAt: serverTimestamp(),
      createdBy: creatorUser.uid,
      creatorName: creatorUser.displayName || 'Admin',
      facultyLeaderId: facultyLeader?.uid || null,
      facultyLeaderName: facultyLeader?.displayName || null,
      studentMemberIds: studentMembers.map(s => s.uid),
      teamMembers: teamMembersList,
      fileURL: fileData?.downloadURL || null,
      storagePath: fileData?.storagePath || null,
      fileName: fileData?.fileName || null,
      fileType: fileData?.fileType || null,
      fileSize: fileData?.fileSize || null,
      evaluatedMarks: null, // 0 - 100
      feedback: '',
      bonusBadges: [],
      progress: 0 // 0 - 100%
    };

    await setDoc(assignmentRef, payload);

    // Build initial checklist from objectives array if present
    const checklistItems = Array.isArray(objectives) && objectives.length > 0
      ? objectives.map((obj, i) => ({
          id: `chk_${i + 1}`,
          text: typeof obj === 'string' ? obj : obj.text || `Objective ${i + 1}`,
          category: i === 0 ? 'Research' : i === 1 ? 'Design' : i === 2 ? 'Documentation' : 'Testing',
          completed: false,
          assignedTo: ''
        }))
      : DEFAULT_CHECKLIST;

    // Initialize Workspace Document
    const workspaceRef = doc(db, 'collaborativeWorkspace', assignmentId);
    await setDoc(workspaceRef, {
      assignmentId,
      title,
      content: `## ${title}\n\n### Subject: ${subject} (${level} · ${difficulty})\n\n**Due Date:** ${dueDate}\n**Total Marks:** ${marks}\n\n### Project Instructions\n${typeof description === 'string' ? description : 'Collaborate live with your team members below to fulfill project requirements.'}\n\n### Original Document\n${fileData?.fileName ? `Uploaded Original File: [${fileData.fileName}](${fileData.downloadURL})` : 'No file attached.'}`,
      checklist: checklistItems,
      sectionProgress: {
        Research: 0,
        Design: 0,
        Documentation: 0,
        Testing: 0,
        Overall: 0
      },
      updatedAt: serverTimestamp(),
      updatedBy: creatorUser.uid
    });

    // Log Initial Activity
    await logWorkspaceActivity(assignmentId, {
      userUid: creatorUser.uid,
      userName: creatorUser.displayName || 'Admin',
      userRole: creatorUser.role || 'admin',
      type: 'assignment_created',
      message: `Created document-driven collaborative assignment "${title}" for ${teamMembersList.length} members.`
    });

    return assignmentId;
  } catch (err) {
    console.error('[collaborativeAssignmentService] create error:', err);
    throw err;
  }
};

/**
 * Subscribes to all collaborative assignments in real-time.
 */
export const subscribeCollaborativeAssignments = (currentUser, callback) => {
  try {
    const q = query(collection(db, 'collaborativeAssignments'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));

      // Filter based on user role if not admin
      let filtered = list;
      if (currentUser?.role?.toLowerCase() !== 'admin') {
        filtered = list.filter(a => {
          const isStudent = a.studentMemberIds && a.studentMemberIds.includes(currentUser.uid);
          const isFacultyLeader = a.facultyLeaderId === currentUser.uid;
          return isStudent || isFacultyLeader;
        });
      }

      callback(filtered);
    }, (err) => {
      console.error('[collaborativeAssignmentService] assignments listener error:', err);
      callback([]);
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] setup listener error:', err);
    callback([]);
    return () => {};
  }
};

/**
 * Subscribes to a single collaborative workspace document in real-time.
 */
export const subscribeWorkspaceDoc = (assignmentId, callback) => {
  if (!assignmentId) return () => {};
  try {
    const docRef = doc(db, 'collaborativeWorkspace', assignmentId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        callback(null);
      }
    }, (err) => {
      console.error('[collaborativeAssignmentService] workspace doc listener error:', err);
      callback(null);
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] workspace listener error:', err);
    return () => {};
  }
};

/**
 * Autosaves live workspace content and updates section progress metrics.
 */
export const autosaveWorkspaceDoc = async (assignmentId, content, checklist, currentUser) => {
  if (!assignmentId || !currentUser) return;
  try {
    // Calculate category completion percentages
    const categoryTotals = { Research: { total: 0, done: 0 }, Design: { total: 0, done: 0 }, Documentation: { total: 0, done: 0 }, Testing: { total: 0, done: 0 } };
    
    (checklist || []).forEach(item => {
      const cat = item.category || 'Documentation';
      if (!categoryTotals[cat]) categoryTotals[cat] = { total: 0, done: 0 };
      categoryTotals[cat].total += 1;
      if (item.completed) categoryTotals[cat].done += 1;
    });

    const calcPct = (cat) => categoryTotals[cat].total > 0 ? Math.round((categoryTotals[cat].done / categoryTotals[cat].total) * 100) : 0;

    const researchPct = calcPct('Research');
    const designPct = calcPct('Design');
    const docPct = calcPct('Documentation');
    const testingPct = calcPct('Testing');
    const totalDone = (checklist || []).filter(i => i.completed).length;
    const overallPct = (checklist || []).length > 0 ? Math.round((totalDone / (checklist || []).length) * 100) : 0;

    const sectionProgress = {
      Research: researchPct,
      Design: designPct,
      Documentation: docPct,
      Testing: testingPct,
      Overall: overallPct
    };

    const workspaceRef = doc(db, 'collaborativeWorkspace', assignmentId);
    await updateDoc(workspaceRef, {
      content,
      checklist,
      sectionProgress,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });

    // Update main assignment overall progress
    const assignmentRef = doc(db, 'collaborativeAssignments', assignmentId);
    await updateDoc(assignmentRef, {
      progress: overallPct
    });

    // Create a Version History Snapshot if content modified significantly
    const versionsRef = collection(db, 'collaborativeWorkspace', assignmentId, 'versions');
    await addDoc(versionsRef, {
      contentSnippet: content.slice(0, 300),
      fullContent: content,
      authorUid: currentUser.uid,
      authorName: currentUser.displayName || currentUser.name || 'Team Member',
      createdAt: serverTimestamp()
    });

  } catch (err) {
    console.error('[collaborativeAssignmentService] autosave error:', err);
  }
};

/**
 * Updates real-time user presence (typing, viewing, active section).
 */
export const updatePresenceState = async (assignmentId, currentUser, isTyping = false, activeBlock = 'Editor') => {
  if (!assignmentId || !currentUser) return;
  try {
    const presenceRef = doc(db, 'collaborativeWorkspace', assignmentId, 'presence', currentUser.uid);
    await setDoc(presenceRef, {
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.name || 'Member',
      role: currentUser.role || 'student',
      isTyping,
      activeBlock,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('[collaborativeAssignmentService] presence update error:', err);
  }
};

/**
 * Subscribes to live presence states of team members.
 */
export const subscribePresenceStates = (assignmentId, callback) => {
  if (!assignmentId) return () => {};
  try {
    const presenceCol = collection(db, 'collaborativeWorkspace', assignmentId, 'presence');
    return onSnapshot(presenceCol, (snap) => {
      const presenceList = [];
      snap.forEach(d => presenceList.push({ id: d.id, ...d.data() }));
      callback(presenceList);
    }, (err) => {
      console.error('[collaborativeAssignmentService] presence listener error:', err);
      callback([]);
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] presence setup error:', err);
    return () => {};
  }
};

/**
 * Subscribes to threaded workspace comments.
 */
export const subscribeWorkspaceComments = (assignmentId, callback) => {
  if (!assignmentId) return () => {};
  try {
    const commentsCol = query(
      collection(db, 'collaborativeWorkspace', assignmentId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(commentsCol, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      callback(list);
    }, (err) => {
      console.error('[collaborativeAssignmentService] comments listener error:', err);
      callback([]);
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] comments setup error:', err);
    return () => {};
  }
};

/**
 * Adds a new comment to the workspace discussion.
 */
export const addWorkspaceComment = async (assignmentId, commentText, currentUser) => {
  if (!assignmentId || !commentText.trim() || !currentUser) return;
  try {
    const commentsCol = collection(db, 'collaborativeWorkspace', assignmentId, 'comments');
    await addDoc(commentsCol, {
      text: commentText,
      authorUid: currentUser.uid,
      authorName: currentUser.displayName || currentUser.name || 'Member',
      authorRole: currentUser.role || 'student',
      createdAt: serverTimestamp()
    });

    await logWorkspaceActivity(assignmentId, {
      userUid: currentUser.uid,
      userName: currentUser.displayName || 'Member',
      userRole: currentUser.role || 'student',
      type: 'comment_added',
      message: `Commented: "${commentText.slice(0, 60)}..."`
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] add comment error:', err);
  }
};

/**
 * Subscribes to workspace activity logs.
 */
export const subscribeWorkspaceActivity = (assignmentId, callback) => {
  if (!assignmentId) return () => {};
  try {
    const activityCol = query(
      collection(db, 'collaborativeWorkspace', assignmentId, 'activity'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    return onSnapshot(activityCol, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      callback(list);
    }, (err) => {
      console.error('[collaborativeAssignmentService] activity listener error:', err);
      callback([]);
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] activity setup error:', err);
    return () => {};
  }
};

/**
 * Logs an activity timeline event.
 */
export const logWorkspaceActivity = async (assignmentId, activityObj) => {
  try {
    const activityCol = collection(db, 'collaborativeWorkspace', assignmentId, 'activity');
    await addDoc(activityCol, {
      ...activityObj,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] log activity error:', err);
  }
};

/**
 * Subscribes to version history snapshots.
 */
export const subscribeWorkspaceVersions = (assignmentId, callback) => {
  if (!assignmentId) return () => {};
  try {
    const versionsCol = query(
      collection(db, 'collaborativeWorkspace', assignmentId, 'versions'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    return onSnapshot(versionsCol, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      callback(list);
    }, (err) => {
      console.error('[collaborativeAssignmentService] versions listener error:', err);
      callback([]);
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] versions setup error:', err);
    return () => {};
  }
};

/**
 * Restores a previous version of the workspace document (Admin/Faculty only).
 */
export const restoreWorkspaceVersion = async (assignmentId, versionDoc, currentUser) => {
  if (!assignmentId || !versionDoc || !currentUser) return;
  try {
    const workspaceRef = doc(db, 'collaborativeWorkspace', assignmentId);
    await updateDoc(workspaceRef, {
      content: versionDoc.fullContent,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });

    await logWorkspaceActivity(assignmentId, {
      userUid: currentUser.uid,
      userName: currentUser.displayName || 'Member',
      userRole: currentUser.role || 'admin',
      type: 'version_restored',
      message: `Restored workspace version from ${new Date(versionDoc.createdAt?.seconds * 1000 || Date.now()).toLocaleString()}`
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] restore version error:', err);
  }
};

/**
 * Submits assignment for review (Student/Team Leader).
 */
export const submitForReview = async (assignmentId, currentUser) => {
  try {
    const assignmentRef = doc(db, 'collaborativeAssignments', assignmentId);
    await updateDoc(assignmentRef, {
      status: 'pending_review',
      submittedAt: serverTimestamp(),
      submittedBy: currentUser.uid
    });

    await logWorkspaceActivity(assignmentId, {
      userUid: currentUser.uid,
      userName: currentUser.displayName || 'Student',
      userRole: currentUser.role || 'student',
      type: 'submitted_for_review',
      message: `Submitted assignment for Admin review!`
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] submit for review error:', err);
    throw err;
  }
};

/**
 * Rejects assignment with feedback and unlocks for redo without deleting work (Admin only).
 */
export const rejectAssignmentSubmission = async (assignmentId, feedbackText, currentUser) => {
  try {
    const assignmentRef = doc(db, 'collaborativeAssignments', assignmentId);
    await updateDoc(assignmentRef, {
      status: 'rejected',
      feedback: feedbackText || 'Reopened for revisions.',
      rejectedAt: serverTimestamp()
    });

    await logWorkspaceActivity(assignmentId, {
      userUid: currentUser.uid,
      userName: currentUser.displayName || 'Admin',
      userRole: 'admin',
      type: 'submission_rejected',
      message: `Reopened assignment for revisions with feedback.`
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] reject submission error:', err);
    throw err;
  }
};

/**
 * Unlocks a rejected assignment for redo (Student/Team Leader action).
 */
export const redoAssignmentAction = async (assignmentId, currentUser) => {
  try {
    const assignmentRef = doc(db, 'collaborativeAssignments', assignmentId);
    await updateDoc(assignmentRef, {
      status: 'in_progress'
    });

    await logWorkspaceActivity(assignmentId, {
      userUid: currentUser.uid,
      userName: currentUser.displayName || 'Student',
      userRole: currentUser.role || 'student',
      type: 'redo_unlocked',
      message: `Unlocked assignment to work on requested improvements.`
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] redo action error:', err);
    throw err;
  }
};

/**
 * Approves assignment and enters final marks (0-100) + Bonus Badges (Admin only).
 */
export const approveAndGradeAssignment = async (assignmentId, marksVal, selectedBadges = [], feedbackText = '', currentUser) => {
  try {
    const assignmentRef = doc(db, 'collaborativeAssignments', assignmentId);
    await updateDoc(assignmentRef, {
      status: 'approved',
      evaluatedMarks: Number(marksVal),
      marks: Number(marksVal),
      bonusBadges: selectedBadges,
      feedback: feedbackText || 'Approved with excellent performance!',
      approvedAt: serverTimestamp()
    });

    await logWorkspaceActivity(assignmentId, {
      userUid: currentUser.uid,
      userName: currentUser.displayName || 'Admin',
      userRole: 'admin',
      type: 'submission_approved',
      message: `Approved assignment with ${marksVal}/100 marks and ${selectedBadges.length} bonus badges!`
    });
  } catch (err) {
    console.error('[collaborativeAssignmentService] approve and grade error:', err);
    throw err;
  }
};

/**
 * Deletes a collaborative assignment (Admin only).
 */
export const deleteCollaborativeAssignment = async (assignmentId) => {
  try {
    await deleteDoc(doc(db, 'collaborativeAssignments', assignmentId));
    await deleteDoc(doc(db, 'collaborativeWorkspace', assignmentId));
  } catch (err) {
    console.error('[collaborativeAssignmentService] delete error:', err);
    throw err;
  }
};
