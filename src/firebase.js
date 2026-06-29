import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, setPersistence, browserLocalPersistence } from "firebase/auth";
import { 
  getFirestore, collection, doc, getDoc, getDocs, enableIndexedDbPersistence, query, where,
  addDoc as fsAddDoc, setDoc as fsSetDoc, updateDoc as fsUpdateDoc, 
  deleteDoc as fsDeleteDoc, runTransaction as fsRunTransaction 
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA_HF7oefhK3DEYO99jG7zVj4vWUCERo-4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "studio-7096192330-872dc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "studio-7096192330-872dc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "studio-7096192330-872dc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "440539934571",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:440539934571:web:a659b682d3f7f36262662e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5HRE6MEKEC"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Configure local storage persistence to survive browser refreshes
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("[Auth Error] Failed to set persistence to browserLocalPersistence:", err);
});

const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Firestore offline persistence failed: multiple tabs open");
  } else if (err.code === 'unimplemented') {
    console.warn("Firestore offline persistence failed: browser unimplemented");
  }
});
const googleProvider = new GoogleAuthProvider();

export const addDoc = async (reference, data, ...args) => {
  try {
    return await fsAddDoc(reference, data, ...args);
  } catch (error) {
    console.error(`[Firestore Error - addDoc] Collection: ${reference?.path || 'unknown'}`, error);
    throw error;
  }
};

export const setDoc = async (reference, data, ...args) => {
  try {
    return await fsSetDoc(reference, data, ...args);
  } catch (error) {
    console.error(`[Firestore Error - setDoc] Document: ${reference?.path || 'unknown'}`, error);
    throw error;
  }
};

export const updateDoc = async (reference, data, ...args) => {
  try {
    return await fsUpdateDoc(reference, data, ...args);
  } catch (error) {
    console.error(`[Firestore Error - updateDoc] Document: ${reference?.path || 'unknown'}`, error);
    throw error;
  }
};

export const deleteDoc = async (reference, ...args) => {
  try {
    return await fsDeleteDoc(reference, ...args);
  } catch (error) {
    console.error(`[Firestore Error - deleteDoc] Document: ${reference?.path || 'unknown'}`, error);
    throw error;
  }
};

export const runTransaction = async (firestoreInstance, updateFunction, ...args) => {
  try {
    return await fsRunTransaction(firestoreInstance, async (transaction) => {
      const wrappedTransaction = {
        get: (ref) => transaction.get(ref),
        set: (ref, data, options) => {
          try {
            return transaction.set(ref, data, options);
          } catch (error) {
            console.error(`[Firestore Error - transaction.set] Document: ${ref?.path || 'unknown'}`, error);
            throw error;
          }
        },
        update: (ref, data) => {
          try {
            return transaction.update(ref, data);
          } catch (error) {
            console.error(`[Firestore Error - transaction.update] Document: ${ref?.path || 'unknown'}`, error);
            throw error;
          }
        },
        delete: (ref) => {
          try {
            return transaction.delete(ref);
          } catch (error) {
            console.error(`[Firestore Error - transaction.delete] Document: ${ref?.path || 'unknown'}`, error);
            throw error;
          }
        }
      };
      return await updateFunction(wrappedTransaction);
    }, ...args);
  } catch (error) {
    console.error(`[Firestore Error - runTransaction]`, error);
    throw error;
  }
};

export const syncStudentFeeAggregates = async (studentId) => {
  if (!db) return null;
  try {
    const monthlyRef = collection(db, 'fees', studentId, 'monthly');
    const monthlySnap = await getDocs(monthlyRef);
    
    let totalAmount = 0;
    let totalPaid = 0;
    
    monthlySnap.forEach(docSnap => {
      const data = docSnap.data();
      totalAmount += Number(data.amountDue) || 0;
      totalPaid += Number(data.amountPaid) || 0;
    });
    
    const pendingAmount = Math.max(0, totalAmount - totalPaid);
    let feeStatus = 'pending';
    if (pendingAmount <= 0 && totalAmount > 0) {
      feeStatus = 'paid';
    }
    
    const studentRef = doc(db, 'users', studentId);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const studentData = studentSnap.data();
      const nextStatus = studentData.statusSource === 'manual' ? (studentData.feeStatus || 'pending') : feeStatus;
      
      await updateDoc(studentRef, {
        feesAmount: totalAmount,
        paidAmount: totalPaid,
        pendingAmount: pendingAmount,
        feeStatus: nextStatus
      });
      console.log(`[Sync Helper] Successfully synced aggregates for ${studentId}: Billed=${totalAmount}, Paid=${totalPaid}, Status=${nextStatus}`);
    }
  } catch (err) {
    console.error(`[Sync Helper Error] Failed to sync student fee aggregates for ${studentId}:`, err);
  }
};;

export { app, analytics, auth, db, googleProvider, RecaptchaVerifier, signInWithPhoneNumber };
