import { collection, addDoc, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { queryManager } from '../utils/FirestoreQueryManager';

export const attendanceRepository = {
  subscribeToAttendanceLogs(studentId, callback) {
    const ref = collection(db, 'users', studentId, 'attendance');
    return queryManager.subscribeToQuery(ref, callback);
  },

  async addAttendanceLog(studentId, logData) {
    const ref = collection(db, 'users', studentId, 'attendance');
    await addDoc(ref, {
      ...logData,
      createdAt: serverTimestamp()
    });
  },

  async getAttendanceLogs(studentId) {
    const ref = collection(db, 'users', studentId, 'attendance');
    const snap = await getDocs(ref);
    const logs = [];
    snap.forEach(d => {
      logs.push({ id: d.id, ...d.data() });
    });
    return logs;
  }
};
