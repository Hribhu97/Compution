import { db } from '../firebase';
import {
  collection, doc, addDoc as fsAddDoc, setDoc as fsSetDoc,
  updateDoc as fsUpdateDoc, deleteDoc as fsDeleteDoc,
  getDocs, getDoc, onSnapshot, query, where, orderBy,
  serverTimestamp, limit, Timestamp
} from 'firebase/firestore';
import { addDoc, setDoc, updateDoc, deleteDoc } from '../firebase';

// ─── XP RULES ────────────────────────────────────────────────────────────────
export const XP_RULES = {
  ATTEND_CLASS:         10,
  COMPLETE_ASSIGNMENT:  15,
  PERFECT_WEEK:         20,
  EXCELLENT_PERFORMANCE: 30,
  TEACHER_APPRECIATION: 50,
  LATE_SUBMISSION:     -5,
};

// ─── COIN RULES ──────────────────────────────────────────────────────────────
export const COIN_RULES = {
  ATTEND_CLASS:         5,
  HOMEWORK_DONE:        8,
  PRACTICAL_DONE:       10,
  TEST_PASS:            15,
  PROJECT_DONE:         25,
};

// ─── CLASS TRACKER ENTRIES ───────────────────────────────────────────────────

/**
 * Subscribe to all tracker entries (admin/faculty filtered).
 */
export const subscribeTrackerEntries = (filters = {}, callback) => {
  try {
    let q = query(collection(db, 'classTrackerEntries'), orderBy('classDate', 'desc'));
    if (filters.course) {
      q = query(collection(db, 'classTrackerEntries'), where('course', '==', filters.course), orderBy('classDate', 'desc'));
    }
    if (filters.facultyId) {
      q = query(collection(db, 'classTrackerEntries'), where('facultyId', '==', filters.facultyId), orderBy('classDate', 'desc'));
    }
    if (filters.studentId) {
      q = query(collection(db, 'classTrackerEntries'), where('studentIds', 'array-contains', filters.studentId), orderBy('classDate', 'desc'));
    }
    return onSnapshot(q, (snap) => {
      const entries = [];
      snap.forEach(d => entries.push({ id: d.id, ...d.data() }));
      callback(entries);
    });
  } catch (err) {
    console.error('[TrackerService] subscribeTrackerEntries error:', err);
    return () => {};
  }
};

/**
 * Add a new class tracker entry. XP & coins are awarded for each tagged student.
 */
export const addTrackerEntry = async (entryData, awardingStudentIds = []) => {
  try {
    const docRef = await addDoc(collection(db, 'classTrackerEntries'), {
      ...entryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Award XP and coins to each enrolled student
    for (const studentId of awardingStudentIds) {
      const xpAmount = entryData.attended ? XP_RULES.ATTEND_CLASS : 0;
      const coinAmount = entryData.attended ? COIN_RULES.ATTEND_CLASS : 0;
      const perfBonus = entryData.performance === 'excellent' ? XP_RULES.EXCELLENT_PERFORMANCE : 0;

      if (xpAmount + perfBonus > 0) {
        await awardXP(studentId, xpAmount + perfBonus, `Class: ${entryData.topic}`, docRef.id);
      }
      if (coinAmount > 0) {
        await awardCoins(studentId, coinAmount, `Class attendance: ${entryData.topic}`, docRef.id);
      }
    }

    return docRef.id;
  } catch (err) {
    console.error('[TrackerService] addTrackerEntry error:', err);
    throw err;
  }
};

/**
 * Update an existing tracker entry (admin only, or faculty within 24h).
 */
export const updateTrackerEntry = async (entryId, updates) => {
  try {
    const ref = doc(db, 'classTrackerEntries', entryId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
  } catch (err) {
    console.error('[TrackerService] updateTrackerEntry error:', err);
    throw err;
  }
};

/**
 * Delete a tracker entry (admin only).
 */
export const deleteTrackerEntry = async (entryId) => {
  try {
    await deleteDoc(doc(db, 'classTrackerEntries', entryId));
  } catch (err) {
    console.error('[TrackerService] deleteTrackerEntry error:', err);
    throw err;
  }
};

// ─── XP SYSTEM ───────────────────────────────────────────────────────────────

/**
 * Get current XP total for a student.
 */
export const subscribeStudentXP = (studentId, callback) => {
  try {
    const q = query(collection(db, 'xpLogs', studentId, 'logs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      let total = 0;
      snap.forEach(d => { total += Number(d.data().amount) || 0; });
      callback(total);
    });
  } catch (err) {
    console.error('[TrackerService] subscribeStudentXP error:', err);
    return () => {};
  }
};

/**
 * Award XP to a student.
 */
export const awardXP = async (studentId, amount, reason, sourceId = null) => {
  try {
    await addDoc(collection(db, 'xpLogs', studentId, 'logs'), {
      amount,
      reason,
      sourceId,
      createdAt: serverTimestamp(),
    });
    // Update total on user doc for quick reads
    const userRef = doc(db, 'users', studentId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = Number(snap.data().totalXP) || 0;
      await updateDoc(userRef, { totalXP: current + amount });
    }
  } catch (err) {
    console.error('[TrackerService] awardXP error:', err);
  }
};

// ─── SEED COINS ──────────────────────────────────────────────────────────────

export const subscribeStudentCoins = (studentId, callback) => {
  try {
    const q = query(collection(db, 'seedCoinLogs', studentId, 'logs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      let total = 0;
      snap.forEach(d => { total += Number(d.data().amount) || 0; });
      callback(total);
    });
  } catch (err) {
    console.error('[TrackerService] subscribeStudentCoins error:', err);
    return () => {};
  }
};

export const awardCoins = async (studentId, amount, reason, sourceId = null) => {
  try {
    await addDoc(collection(db, 'seedCoinLogs', studentId, 'logs'), {
      amount, reason, sourceId, createdAt: serverTimestamp(),
    });
    const userRef = doc(db, 'users', studentId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const current = Number(snap.data().seedCoins) || 0;
      await updateDoc(userRef, { seedCoins: current + amount });
    }
  } catch (err) {
    console.error('[TrackerService] awardCoins error:', err);
  }
};

// ─── STREAKS ─────────────────────────────────────────────────────────────────

export const subscribeStudentStreak = (studentId, callback) => {
  try {
    const ref = doc(db, 'studentStreaks', studentId);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) callback(snap.data());
      else callback({ currentStreak: 0, longestStreak: 0, lastActiveDate: null, attendanceDays: [] });
    });
  } catch (err) {
    console.error('[TrackerService] subscribeStudentStreak error:', err);
    return () => {};
  }
};

export const updateStreak = async (studentId, dateStr) => {
  try {
    const ref = doc(db, 'studentStreaks', studentId);
    const snap = await getDoc(ref);
    const today = new Date(dateStr);
    const todayStr = today.toISOString().split('T')[0];

    if (!snap.exists()) {
      await setDoc(ref, {
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: todayStr,
        attendanceDays: [todayStr],
      });
      return;
    }

    const data = snap.data();
    const days = data.attendanceDays || [];
    if (days.includes(todayStr)) return; // already recorded today

    const last = data.lastActiveDate ? new Date(data.lastActiveDate) : null;
    const diffDays = last ? Math.round((today - last) / 86400000) : null;

    let streak = data.currentStreak || 0;
    if (diffDays === 1) streak += 1;
    else if (diffDays === null || diffDays > 1) streak = 1;

    const longest = Math.max(data.longestStreak || 0, streak);
    await setDoc(ref, {
      currentStreak: streak,
      longestStreak: longest,
      lastActiveDate: todayStr,
      attendanceDays: [...days, todayStr],
    });

    // Award perfect week bonus
    if (streak > 0 && streak % 7 === 0) {
      await awardXP(studentId, XP_RULES.PERFECT_WEEK, '7-day attendance streak!', null);
      await awardCoins(studentId, 20, '7-day streak bonus', null);
    }
  } catch (err) {
    console.error('[TrackerService] updateStreak error:', err);
  }
};

// ─── WEEKLY SUMMARY ──────────────────────────────────────────────────────────

export const getWeeklySummary = async (studentId) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'classTrackerEntries'),
      where('studentIds', 'array-contains', studentId),
      orderBy('classDate', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const thisWeek = [];
    snap.forEach(d => {
      const data = d.data();
      const entryDate = data.classDate?.toDate?.() || new Date(data.classDate);
      if (entryDate >= weekStart) thisWeek.push(data);
    });

    return {
      classesAttended: thisWeek.filter(e => e.attended).length,
      assignmentsGiven: thisWeek.filter(e => e.homework).length,
      topicsCompleted: thisWeek.length,
      xpEarned: thisWeek.reduce((s, e) => s + (e.attended ? XP_RULES.ATTEND_CLASS : 0), 0),
    };
  } catch (err) {
    console.error('[TrackerService] getWeeklySummary error:', err);
    return { classesAttended: 0, assignmentsGiven: 0, topicsCompleted: 0, xpEarned: 0 };
  }
};

// ─── LEVEL CALCULATION ────────────────────────────────────────────────────────

export const getLevel = (totalXP) => {
  const levels = [
    { level: 1, title: 'Seed',       minXP: 0    },
    { level: 2, title: 'Sprout',     minXP: 100  },
    { level: 3, title: 'Sapling',    minXP: 250  },
    { level: 4, title: 'Explorer',   minXP: 500  },
    { level: 5, title: 'Builder',    minXP: 800  },
    { level: 6, title: 'Creator',    minXP: 1200 },
    { level: 7, title: 'Innovator',  minXP: 1700 },
    { level: 8, title: 'Champion',   minXP: 2300 },
    { level: 9, title: 'Legend',     minXP: 3000 },
    { level: 10, title: 'Grandmaster', minXP: 4000 },
  ];

  let current = levels[0];
  let next = levels[1];
  for (let i = 0; i < levels.length; i++) {
    if (totalXP >= levels[i].minXP) {
      current = levels[i];
      next = levels[i + 1] || null;
    } else {
      break;
    }
  }
  const progress = next
    ? Math.round(((totalXP - current.minXP) / (next.minXP - current.minXP)) * 100)
    : 100;
  return { ...current, next, progress, totalXP };
};
