import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA_HF7oefhK3DEYO99jG7zVj4vWUCERo-4",
  authDomain: "studio-7096192330-872dc.firebaseapp.com",
  projectId: "studio-7096192330-872dc",
  storageBucket: "studio-7096192330-872dc.firebasestorage.app",
  messagingSenderId: "440539934571",
  appId: "1:440539934571:web:a659b682d3f7f36262662e",
  measurementId: "G-5HRE6MEKEC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initFeeStructure() {
  const feeStructureRef = doc(db, "settings", "feeStructure");
  
  const defaultStructure = {
    class2to5: 500,
    class6to8: 600,
    class9to10: 700,
    class11Science: 900,
    class11Application: 0, // Manual entry
    basicCourse: 700,
    gracePeriodDays: 5,
    lateFeeType: 'flat', // 'flat' or 'percentage'
    lateFeeValue: 50,
    upiId: 'institutelogo@upi',
    upiName: 'Compution Institute'
  };

  try {
    await setDoc(feeStructureRef, defaultStructure, { merge: true });
    console.log("Successfully initialized feeStructure settings!");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing feeStructure:", error);
    process.exit(1);
  }
}

initFeeStructure();
