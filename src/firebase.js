import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, getDocs, enableIndexedDbPersistence } from "firebase/firestore";

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
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Firestore offline persistence failed: multiple tabs open");
  } else if (err.code === 'unimplemented') {
    console.warn("Firestore offline persistence failed: browser unimplemented");
  }
});
const googleProvider = new GoogleAuthProvider();

export const syncStudentFeeAggregates = async (studentId) => {
  try {
    const userRef = doc(db, 'users', studentId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;

    const userData = userSnap.data();
    if (userData.role !== 'student') return null;

    const feesRef = collection(db, 'users', studentId, 'fees');
    const feesSnap = await getDocs(feesRef);

    let feesList = [];
    feesSnap.forEach(doc => {
      feesList.push({ id: doc.id, ...doc.data() });
    });

    // Dynamic Migration Fallback (Step 0 & 1)
    if (feesList.length === 0) {
      const defaultAmount = userData.feesAmount !== undefined ? userData.feesAmount : 2400;
      const defaultStatus = userData.feeStatus || 'Pending';
      const defaultPaid = defaultStatus === 'Paid' ? defaultAmount : 0;
      
      const defaultFee = {
        feeName: 'Tuition',
        amount: defaultAmount,
        paidAmount: defaultPaid,
        month: 'May 2026',
        status: defaultStatus,
        createdAt: new Date().toISOString()
      };

      const defaultFeeRef = doc(db, 'users', studentId, 'fees', 'tuition_default');
      await setDoc(defaultFeeRef, defaultFee);
      feesList = [{ id: 'tuition_default', ...defaultFee }];
    }

    // Recalculate Aggregates (Step 2)
    let totalAmount = 0;
    let totalPaid = 0;
    
    feesList.forEach(fee => {
      totalAmount += Number(fee.amount) || 0;
      totalPaid += Number(fee.paidAmount) || 0;
    });

    const totalPending = totalAmount - totalPaid;

    // Status Calculation (Step 7)
    let computedStatus = 'Pending';
    if (totalPending <= 0) {
      computedStatus = 'Paid';
    } else if (totalPaid > 0) {
      computedStatus = 'Partially Paid';
    }

    const finalPending = Math.max(0, totalPending);

    // Sync back to user profile (Step 5)
    await updateDoc(userRef, {
      feesAmount: totalAmount,
      paidAmount: totalPaid,
      pendingAmount: finalPending,
      feeStatus: computedStatus
    });

    return {
      feesAmount: totalAmount,
      paidAmount: totalPaid,
      pendingAmount: finalPending,
      feeStatus: computedStatus,
      feesList
    };
  } catch (error) {
    console.error("Error syncing student fee aggregates:", error);
    return null;
  }
};

export { app, analytics, auth, db, googleProvider };
