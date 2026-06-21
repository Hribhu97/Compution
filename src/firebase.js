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

export const syncStudentFeeAggregates = async (studentId) => {
  try {
    const userRef = doc(db, 'users', studentId);
    const feesRef = collection(db, 'users', studentId, 'fees');
    
    // Read subcollection outside transaction (required as transaction cannot query collections)
    const feesSnap = await getDocs(feesRef);
    let initialFeesList = [];
    feesSnap.forEach(d => {
      initialFeesList.push({ id: d.id, ref: d.ref });
    });

    let result = null;

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      if (userData.role !== 'student') return;

      let totalAmount = 0;
      let totalPaid = 0;
      let finalPending = 0;
      let computedStatus = 'Pending';
      let currentFeesList = [];

      if (initialFeesList.length === 0) {
        // Dynamic Migration Fallback (Step 0 & 1)
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
        transaction.set(defaultFeeRef, defaultFee);

        totalAmount = defaultAmount;
        totalPaid = defaultPaid;
        computedStatus = defaultStatus;
        currentFeesList = [{ id: 'tuition_default', ...defaultFee }];
      } else {
        // Fetch snapshot data inside the transaction to avoid stale values
        const feeSnaps = await Promise.all(initialFeesList.map(item => transaction.get(item.ref)));
        feeSnaps.forEach(snap => {
          if (snap.exists()) {
            const feeData = snap.data();
            currentFeesList.push({ id: snap.id, ref: snap.ref, ...feeData });
            totalAmount += Number(feeData.amount) || 0;
            totalPaid += Number(feeData.paidAmount) || 0;
          }
        });
      }

      // ── VALIDATION RULES ──
      // 1. Prevent paidAmount > feesAmount
      if (totalPaid > totalAmount) {
        totalPaid = totalAmount;
      }

      // 2. Prevent negative pending amounts
      let totalPending = totalAmount - totalPaid;
      finalPending = Math.max(0, totalPending);

      // Status Calculation
      if (finalPending <= 0 && totalAmount > 0) {
        computedStatus = 'Paid';
      } else if (totalPaid > 0) {
        computedStatus = 'Partially Paid';
      } else {
        computedStatus = 'Pending';
      }

      // 3. If feeStatus === "Paid", force pendingAmount = 0 and paidAmount = feesAmount
      if (computedStatus === 'Paid' || userData.feeStatus === 'Paid') {
        computedStatus = 'Paid';
        finalPending = 0;
        totalPaid = totalAmount;

        // Automatically update all fee documents to Paid inside transaction
        if (initialFeesList.length > 0) {
          currentFeesList.forEach(fee => {
            if (fee.status !== 'Paid' || fee.paidAmount !== fee.amount) {
              transaction.update(fee.ref, {
                status: 'Paid',
                paidAmount: Number(fee.amount) || 0
              });
            }
          });
        }
      }

      transaction.update(userRef, {
        feesAmount: totalAmount,
        paidAmount: totalPaid,
        pendingAmount: finalPending,
        feeStatus: computedStatus,
        updatedAt: new Date().toISOString()
      });

      result = {
        feesAmount: totalAmount,
        paidAmount: totalPaid,
        pendingAmount: finalPending,
        feeStatus: computedStatus,
        feesList: currentFeesList
      };
    });

    return result;
  } catch (error) {
    console.error("Error syncing student fee aggregates:", error);
    return null;
  }
};

export { app, analytics, auth, db, googleProvider };
