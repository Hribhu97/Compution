import { collection, doc, addDoc, query, where, orderBy, limit, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { queryManager } from '../utils/FirestoreQueryManager';

export const gameRepository = {
  subscribeToGames(callback) {
    const q = collection(db, 'games');
    return queryManager.subscribeToQuery(q, callback);
  },

  subscribeToGameAttempts(userId, callback) {
    const q = query(
      collection(db, 'gameAttempts'),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc')
    );
    return queryManager.subscribeToQuery(q, callback);
  },

  async getGameAttemptsForUserToday(userId, gameId) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const q = query(
      collection(db, 'gameAttempts'),
      where('userId', '==', userId),
      where('gameId', '==', gameId)
    );
    const snap = await getDocs(q);
    let playedToday = false;
    snap.forEach(d => {
      const data = d.data();
      if (data.dateStr === today) {
        playedToday = true;
      }
    });
    return playedToday;
  },

  subscribeToGameLeaderboard(gameId, callback) {
    const q = query(
      collection(db, 'gameAttempts'),
      where('gameId', '==', gameId),
      orderBy('score', 'desc'),
      orderBy('timeSpent', 'asc'),
      limit(10)
    );
    return queryManager.subscribeToQuery(q, callback);
  },

  subscribeToGlobalGameLeaderboard(callback) {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      orderBy('gamePoints', 'desc'),
      limit(10)
    );
    return queryManager.subscribeToQuery(q, callback);
  },

  async saveGameAttempt(attemptData) {
    const attemptsRef = collection(db, 'gameAttempts');
    const docRef = await addDoc(attemptsRef, {
      ...attemptData,
      completedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getGames() {
    const snap = await getDocs(collection(db, 'games'));
    const games = [];
    snap.forEach(d => {
      games.push({ id: d.id, ...d.data() });
    });
    return games;
  },

  async seedGames(gamesList) {
    for (const g of gamesList) {
      await setDoc(doc(db, 'games', g.id), {
        title: g.title,
        category: g.category,
        difficulty: g.difficulty,
        points: g.points
      });
    }
  }
};
