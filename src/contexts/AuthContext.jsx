import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
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

        const emailLower = firebaseUser.email?.toLowerCase();
        let targetRole = 'student';
        let permissions = [];

        if (ADMIN_EMAILS.includes(emailLower)) {
          targetRole = 'admin';
          permissions = ['all'];
        } else if (['sharmisthaghosh855@gmail.com', 'tapadarhribhu350@gmail.com'].includes(emailLower)) {
          targetRole = 'faculty';
          permissions = ['manage schedules', 'chat with assigned students', 'upload materials'];
        } else if (['piyali0903@gmail.com'].includes(emailLower)) {
          targetRole = 'member';
          permissions = ['limited dashboard access', 'student support tools'];
        }

        if (!userSnap.exists()) {
          const isStudent = targetRole === 'student';
          const newProfile = {
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || (targetRole === 'admin' ? 'Admin' : targetRole === 'faculty' ? 'Faculty' : targetRole === 'member' ? 'Member' : 'Student'),
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || '',
            studentId: isStudent ? `COMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` : '',
            course: isStudent ? 'Not specified' : '',
            phone: '',
            role: targetRole,
            permissions: permissions,
            feeStatus: isStudent ? 'Pending' : '',
            feesAmount: isStudent ? 2400 : 0,
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newProfile);
        } else {
          // If document exists, ensure roles are assigned correctly if they match our seeded emails
          const existingData = userSnap.data();
          if (existingData.role !== targetRole) {
            await updateDoc(userRef, { role: targetRole, permissions: permissions });
          }
        }

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
