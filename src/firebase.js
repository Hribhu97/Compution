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
    const feeRef = doc(db, 'fees', studentId);

    // Fetch existing legacy payment history to backfill if the fees doc doesn't exist
    const legacyPayRef = collection(db, 'paymentHistory');
    const legacyPaySnap = await getDocs(query(legacyPayRef, where('studentId', '==', studentId)));
    const legacyPayments = [];
    legacyPaySnap.forEach(d => {
      const p = d.data();
      if (p.status === 'Approved' || p.status === 'Paid') {
        legacyPayments.push({
          amount: Number(p.amount) || 0,
          date: p.date || p.timestamp || new Date().toISOString(),
          transactionId: p.transactionId || p.utrNumber || d.id,
          mode: p.mode || p.paymentMethod || 'UPI',
          remarks: p.remarks || p.notes || 'Approved',
          feeName: p.feeName || 'Tuition'
        });
      }
    });

    let result = null;

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      if (userData.role !== 'student') return;

      const feeSnap = await transaction.get(feeRef);
      let feeData = feeSnap.exists() ? feeSnap.data() : null;

      // Master fee structure config read
      const feeStructRef = doc(db, 'settings', 'feeStructure');
      const feeStructSnap = await transaction.get(feeStructRef);
      const feeStructure = feeStructSnap.exists() ? feeStructSnap.data() : {
        class2to5: 500, class6to8: 600, class9to10: 700, class11Science: 900, class11Application: 0, basicCourse: 700,
        registrationFee: 300, admissionFee: 0
      };

      // Pricing logic fallback based on classCategory, stream, and course
      let monthlyFee = userData.monthlyFee;
      if (monthlyFee === undefined || monthlyFee === null) {
        const numCat = parseInt(userData.classCategory) || 0;
        const text = `${userData.course || ''} ${userData.classCategory || ''}`.toLowerCase();
        
        if (numCat >= 2 && numCat <= 5) {
          monthlyFee = Number(feeStructure.class2to5) || 500;
        } else if (numCat >= 6 && numCat <= 8) {
          monthlyFee = Number(feeStructure.class6to8) || 600;
        } else if (numCat >= 9 && numCat <= 10) {
          monthlyFee = Number(feeStructure.class9to10) || 700;
        } else if (numCat === 11 || numCat === 12) {
          if (userData.stream === 'science') {
            monthlyFee = Number(feeStructure.class11Science) !== undefined ? Number(feeStructure.class11Science) : 900;
          } else {
            // application or other
            monthlyFee = Number(feeStructure.class11Application) !== undefined ? Number(feeStructure.class11Application) : 700;
          }
        } else if (text.includes('basic') || text.includes('computer')) {
          monthlyFee = Number(feeStructure.basicCourse) || 700;
        } else {
          monthlyFee = 500; // general fallback
        }
      } else {
        monthlyFee = Number(monthlyFee);
      }

      const currentDate = new Date();
      const joiningDate = userData.joiningDate ? new Date(userData.joiningDate) : new Date(userData.createdAt || new Date());
      
      let monthsActive = (currentDate.getFullYear() - joiningDate.getFullYear()) * 12 + (currentDate.getMonth() - joiningDate.getMonth()) + 1;
      if (monthsActive < 1) monthsActive = 1;

      const baseTuition = monthlyFee * monthsActive;
      const registrationFee = userData.registrationFee !== undefined ? Number(userData.registrationFee) : (Number(feeStructure.registrationFee) !== undefined ? Number(feeStructure.registrationFee) : 300);
      const admissionFee = userData.admissionFee !== undefined ? Number(userData.admissionFee) : (Number(feeStructure.admissionFee) !== undefined ? Number(feeStructure.admissionFee) : 0);
      const mandatoryFees = registrationFee + admissionFee;
      const lateFees = Number(userData.lateFee) || 0;
      const adminCharges = Number(userData.adminCharges) || 0;

      const totalFeeDue = baseTuition + mandatoryFees + lateFees + adminCharges;

      // Sum all approved successful transactions from paymentHistory collection (rebuild history array)
      const paymentHistory = legacyPayments;
      const totalPaid = paymentHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const remainingBalance = totalFeeDue - totalPaid;

      // Only PAID and PENDING allowed
      const status = remainingBalance <= 0 ? 'Paid' : 'Pending';

      // Find last payment date
      let lastPaymentDate = null;
      if (paymentHistory.length > 0) {
        const sortedHistory = [...paymentHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
        lastPaymentDate = sortedHistory[0].date;
      }

      const updatedFeeDoc = {
        studentId,
        monthlyFee,
        totalFeeDue,
        totalPaid,
        remainingBalance,
        status,
        paymentHistory,
        dueDate: feeData?.dueDate || '10',
        lastPaymentDate,
        createdAt: feeData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transaction.set(feeRef, updatedFeeDoc, { merge: true });

      transaction.update(userRef, {
        feesAmount: totalFeeDue,
        paidAmount: totalPaid,
        pendingAmount: remainingBalance,
        feeStatus: status,
        monthsActive: monthsActive,
        monthlyFee: monthlyFee, // ensure current monthlyFee is synced back to profile
        updatedAt: new Date().toISOString()
      });

      result = updatedFeeDoc;
    });

    return result;
  } catch (error) {
    console.error("Error syncing student billing engine aggregates:", error);
    return null;
  }
};

export { app, analytics, auth, db, googleProvider };
