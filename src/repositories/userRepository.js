import { doc, getDoc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { queryManager } from '../utils/FirestoreQueryManager';

export const userRepository = {
  async getUserProfile(uid) {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async updateUserProfile(uid, data) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
  },

  subscribeToUserProfile(uid, callback) {
    const userRef = doc(db, 'users', uid);
    return queryManager.subscribeToQuery(userRef, callback);
  },

  async getAllUsers() {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    const users = [];
    snap.forEach(d => {
      users.push({ id: d.id, ...d.data() });
    });
    return users;
  },

  subscribeToAllUsers(callback) {
    const usersRef = collection(db, 'users');
    return queryManager.subscribeToQuery(usersRef, callback);
  }
};
