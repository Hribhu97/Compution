import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

const ADMIN_EMAILS = ['tapadarhribhu@gmail.com', 'biswa.maity2011@gmail.com'];

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const role = ADMIN_EMAILS.includes(firebaseUser.email?.toLowerCase()) ? 'admin' : 'student';
          const newProfile = {
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || (role === 'admin' ? 'Admin' : 'Student'),
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || '',
            studentId: `COMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            course: 'Not specified',
            phone: '',
            role: role,
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newProfile);
        }
        // For existing users: role is READ from Firestore, never modified by the app

        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({
              uid: firebaseUser.uid,
              emailVerified: firebaseUser.emailVerified,
              ...docSnap.data()
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
