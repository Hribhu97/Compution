import { collection, query, where, documentId, doc, serverTimestamp } from 'firebase/firestore';
import { addDoc, deleteDoc } from '../firebase';;
import { db } from '../firebase';
import { queryManager } from '../utils/FirestoreQueryManager';

export const courseRepository = {
  subscribeToCourses(callback) {
    const q = collection(db, 'courses');
    return queryManager.subscribeToQuery(q, callback);
  },

  subscribeToAssignedCourses(assignedCourseIds, callback) {
    if (!assignedCourseIds || assignedCourseIds.length === 0) {
      callback([]);
      return () => {};
    }
    // Firestore "in" query limits to 30 items
    const slicedIds = assignedCourseIds.slice(0, 30);
    const q = query(collection(db, 'courses'), where(documentId(), 'in', slicedIds));
    return queryManager.subscribeToQuery(q, callback);
  },

  async createCourse(courseData) {
    const coursesRef = collection(db, 'courses');
    await addDoc(coursesRef, {
      ...courseData,
      createdAt: serverTimestamp()
    });
  },

  async deleteCourse(courseId) {
    const courseRef = doc(db, 'courses', courseId);
    await deleteDoc(courseRef);
  }
};
