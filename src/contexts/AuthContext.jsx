import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

const ADMIN_EMAILS = ['tapadarhribhu@gmail.com', 'biswa.maity2011@gmail.com'];

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfileLoaded, setUserProfileLoaded] = useState(false);

  const loading = !authReady || (auth.currentUser && !userProfileLoaded);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthReady(true);

      if (firebaseUser) {
        setUserProfileLoaded(false);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        try {
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
            const nameVal = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || (targetRole === 'admin' ? 'Admin' : targetRole === 'faculty' ? 'Faculty' : targetRole === 'member' ? 'Member' : 'Student');
            const newProfile = {
              uid: firebaseUser.uid,
              name: nameVal,
              displayName: nameVal,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || '',
              studentId: isStudent ? `COMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` : '',
              course: isStudent ? 'Not specified' : '',
              phone: '',
              role: targetRole,
              assignedFacultyIds: [],
              assignedStudentIds: [],
              studentGroup: null,
              classCategory: '',
              stream: '',
              autoGroup: '',
              customGroupException: '',
              permissions: permissions,
              feeStatus: isStudent ? 'Pending' : '',
              feesAmount: isStudent ? 2400 : 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
          } else {
            const existingData = userSnap.data();
            const isHardcodedStaff = ADMIN_EMAILS.includes(emailLower) || 
                                     ['sharmisthaghosh855@gmail.com', 'tapadarhribhu350@gmail.com'].includes(emailLower) || 
                                     ['piyali0903@gmail.com'].includes(emailLower);
            
            let updates = {};
            if (!existingData.role || (isHardcodedStaff && existingData.role !== targetRole)) {
              updates.role = targetRole;
              updates.permissions = permissions;
            }
            if (existingData.uid === undefined) updates.uid = firebaseUser.uid;
            if (existingData.name === undefined) updates.name = existingData.displayName || firebaseUser.displayName || '';
            if (existingData.assignedFacultyIds === undefined) updates.assignedFacultyIds = [];
            if (existingData.assignedStudentIds === undefined) updates.assignedStudentIds = [];
            if (existingData.studentGroup === undefined) updates.studentGroup = null;
            if (existingData.classCategory === undefined) updates.classCategory = '';
            if (existingData.stream === undefined) updates.stream = '';
            if (existingData.autoGroup === undefined) updates.autoGroup = '';
            if (existingData.customGroupException === undefined) updates.customGroupException = '';
            
            if (Object.keys(updates).length > 0) {
              updates.updatedAt = serverTimestamp();
              await setDoc(userRef, updates, { merge: true });
            }
          }
        } catch (error) {
          console.error("Error checking or creating user profile document:", error);
        }

        // Set up snapshot listener
        unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUser({
              uid: firebaseUser.uid,
              emailVerified: firebaseUser.emailVerified,
              ...docSnap.data()
            });
          } else {
            console.warn("User profile document deleted. Auto-recreating minimal profile...");
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

            const isStudent = targetRole === 'student';
            const nameVal = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || (targetRole === 'admin' ? 'Admin' : targetRole === 'faculty' ? 'Faculty' : targetRole === 'member' ? 'Member' : 'Student');
            const newProfile = {
              uid: firebaseUser.uid,
              name: nameVal,
              displayName: nameVal,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || '',
              studentId: isStudent ? `COMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` : '',
              course: isStudent ? 'Not specified' : '',
              phone: '',
              role: targetRole,
              assignedFacultyIds: [],
              assignedStudentIds: [],
              studentGroup: null,
              classCategory: '',
              stream: '',
              autoGroup: '',
              customGroupException: '',
              permissions: permissions,
              feeStatus: isStudent ? 'Pending' : '',
              feesAmount: isStudent ? 2400 : 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            try {
              await setDoc(userRef, newProfile);
            } catch (err) {
              console.error("Auto-recreation of profile failed:", err);
            }
          }
          setUserProfileLoaded(true);
        }, (error) => {
          console.error("Profile snapshot listener error:", error);
          setUserProfileLoaded(true);
        });
      } else {
        setUser(null);
        setUserProfileLoaded(true);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authReady, userProfileLoaded }}>
      {children}
    </AuthContext.Provider>
  );
};
