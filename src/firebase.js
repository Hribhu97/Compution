import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, getDocs, enableIndexedDbPersistence, runTransaction } from "firebase/firestore";

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
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Auth persistence failed:", err);
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

import { query, where } from "firebase/firestore";

export const syncStudentFeeAggregates = async (studentId) => {
  try {
    const userRef = doc(db, 'users', studentId);
    
    // Read payments outside transaction (required as transaction cannot query collections)
    const payRef = collection(db, 'paymentHistory');
    const paySnap = await getDocs(query(payRef, where('studentId', '==', studentId)));
    
    let totalPaymentsReceived = 0;
    paySnap.forEach(d => {
      const p = d.data();
      if (p.status === 'Approved' || p.status === 'Paid') {
        totalPaymentsReceived += Number(p.amount) || 0;
      }
    });

    let result = null;

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      if (userData.role !== 'student') return;

      const monthlyFee = Number(userData.monthlyFee) || 0;
      const joiningDate = userData.joiningDate ? new Date(userData.joiningDate) : new Date(userData.createdAt || new Date());
      const currentDate = new Date();
      
      // Calculate monthsActive (India Billing Year April -> March)
      let academicYearStart = new Date(currentDate.getFullYear(), 3, 1); // April 1
      if (currentDate.getMonth() < 3) {
        academicYearStart = new Date(currentDate.getFullYear() - 1, 3, 1);
      }
      const effectiveStartDate = joiningDate > academicYearStart ? joiningDate : academicYearStart;
      
      let monthsActive = (currentDate.getFullYear() - effectiveStartDate.getFullYear()) * 12;
      monthsActive -= effectiveStartDate.getMonth();
      monthsActive += currentDate.getMonth();
      monthsActive = monthsActive <= 0 ? 1 : monthsActive + 1;

      // Carry forward balances & Fallbacks
      let expectedTotal = 0;
      if (monthlyFee > 0) {
        expectedTotal = (monthlyFee * monthsActive) + (Number(userData.registrationFee) || 0) + (Number(userData.admissionFee) || 0);
      } else {
        expectedTotal = (Number(userData.feesAmount) || 0) + (Number(userData.registrationFee) || 0) + (Number(userData.admissionFee) || 0);
      }

      const lateFee = Number(userData.lateFee) || 0;
      const discount = Number(userData.discount) || 0;

      expectedTotal = expectedTotal + lateFee - discount;
      
      let balance = expectedTotal - totalPaymentsReceived;
      let finalPending = Math.max(0, balance);
      
      // Admin Manual Override Logic
      let computedStatus = userData.feeStatus || 'Pending';
      
      if (userData.statusSource === 'manual') {
        // Retain the manual status
        computedStatus = userData.feeStatus || 'Pending';
      } else {
        if (finalPending <= 0 && expectedTotal > 0) {
          computedStatus = 'Paid';
        } else if (totalPaymentsReceived > 0 && finalPending > 0) {
          computedStatus = 'Partial';
        } else if (totalPaymentsReceived === 0 && finalPending > 0) {
          // If Admin manually set it to Delayed, don't overwrite to Pending
          if (computedStatus !== 'Delayed') {
             computedStatus = 'Pending';
          }
        }
      }

      transaction.update(userRef, {
        feesAmount: expectedTotal,
        paidAmount: totalPaymentsReceived,
        pendingAmount: finalPending,
        feeStatus: computedStatus,
        monthsActive: monthsActive,
        updatedAt: new Date().toISOString()
      });

      result = {
        feesAmount: expectedTotal,
        paidAmount: totalPaymentsReceived,
        pendingAmount: finalPending,
        feeStatus: computedStatus
      };
    });

    return result;
  } catch (error) {
    console.error("Error syncing student billing engine aggregates:", error);
    return null;
  }
};

export { app, analytics, auth, db, googleProvider };
