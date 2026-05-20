import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, db, googleProvider };
