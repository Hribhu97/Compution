import { collection, doc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { setDoc, addDoc, deleteDoc } from '../firebase';;
import { db } from '../firebase';
import { queryManager } from '../utils/FirestoreQueryManager';

export const testRepository = {
  subscribeToTests(callback) {
    const q = collection(db, 'tests');
    return queryManager.subscribeToQuery(q, callback);
  },

  subscribeToTestAttempts(studentId, callback) {
    const q = query(
      collection(db, 'testAttempts'),
      where('studentId', '==', studentId),
      orderBy('submittedAt', 'desc')
    );
    return queryManager.subscribeToQuery(q, callback);
  },

  subscribeToTestAttemptsForTest(testId, callback) {
    const q = query(
      collection(db, 'testAttempts'),
      where('testId', '==', testId),
      orderBy('score', 'desc'),
      orderBy('timeTaken', 'asc')
    );
    return queryManager.subscribeToQuery(q, callback);
  },

  subscribeToLeaderboard(testId, callback) {
    const docRef = doc(db, 'leaderboards', testId);
    return queryManager.subscribeToQuery(docRef, callback);
  },

  async createTest(testData) {
    const testsRef = collection(db, 'tests');
    const docRef = await addDoc(testsRef, {
      ...testData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  async deleteTest(testId) {
    await deleteDoc(doc(db, 'tests', testId));
  },

  async saveTestAttempt(attemptData) {
    const attemptsRef = collection(db, 'testAttempts');
    const docRef = await addDoc(attemptsRef, {
      ...attemptData,
      submittedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getTestAttemptsForTest(testId) {
    const q = query(
      collection(db, 'testAttempts'),
      where('testId', '==', testId),
      orderBy('score', 'desc'),
      orderBy('timeTaken', 'asc')
    );
    const snap = await getDocs(q);
    const attempts = [];
    snap.forEach(d => {
      attempts.push({ id: d.id, ...d.data() });
    });
    return attempts;
  },

  async updateTestAttemptRank(attemptId, rank) {
    const attemptRef = doc(db, 'testAttempts', attemptId);
    await setDoc(attemptRef, { rank }, { merge: true });
  },

  async updateTestAttemptScore(attemptId, score, percentage) {
    const attemptRef = doc(db, 'testAttempts', attemptId);
    await setDoc(attemptRef, { score, percentage }, { merge: true });
  },

  async saveLeaderboard(testId, leaderboardData) {
    const leaderboardRef = doc(db, 'leaderboards', testId);
    await setDoc(leaderboardRef, leaderboardData, { merge: true });
  }
};
