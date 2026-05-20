import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

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

        // Create new user profile if doesn't exist
        if (!userSnap.exists()) {
          const newProfile = {
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || '',
            studentId: `COMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            course: 'Not specified',
            phone: '',
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newProfile);
        }

        // Subscribe to realtime profile updates
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({
              uid: firebaseUser.uid,
              emailVerified: firebaseUser.emailVerified,
              ...docSnap.data()
            });
          }
        });
      } else {
        setUser(null);
        if (unsubscribeProfile) unsubscribeProfile();
      }
      setLoading(false);
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
