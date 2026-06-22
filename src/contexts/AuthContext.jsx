import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

const ADMIN_EMAILS = ['tapadarhribhu@gmail.com', 'biswa.maity2011@gmail.com'];

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        setLoading(true);
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
            const nameVal = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || (targetRole === 'admin' ? 'Admin' : targetRole === 'faculty' ? 'Faculty' : targetRole === 'member' ? 'Member' : 'Student');
            let newProfile = {
              uid: firebaseUser.uid,
              name: nameVal,
              displayName: nameVal,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || '',
              phone: '',
              role: targetRole,
              permissions: permissions,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              assignedCourses: []
            };
            
            if (targetRole === 'student') {
              let regFee = 300;
              let admFee = 0;
              let baseMonthly = 500;
              try {
                const fsSnap = await getDoc(doc(db, 'settings', 'feeStructure'));
                if (fsSnap.exists()) {
                  const fs = fsSnap.data();
                  regFee = Number(fs.registrationFee) || 300;
                  admFee = Number(fs.admissionFee) || 0;
                  baseMonthly = Number(fs.class2to5) || 500;
                }
              } catch (e) {
                console.error("Error fetching fee structure in AuthContext:", e);
              }

              newProfile = {
                ...newProfile,
                studentId: `COMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                course: 'Not specified',
                assignedFacultyIds: [],
                studentGroup: null,
                classCategory: '',
                stream: '',
                autoGroup: '',
                customGroupException: '',
                feeStatus: 'Pending',
                monthlyFee: baseMonthly,
                registrationFee: regFee,
                admissionFee: admFee,
                feesAmount: (baseMonthly * 12) + regFee + admFee,
                joiningDate: new Date().toISOString()
              };
            }
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
            if (existingData.assignedCourses === undefined) updates.assignedCourses = [];
            
            if (targetRole === 'student') {
              if (existingData.assignedFacultyIds === undefined) updates.assignedFacultyIds = [];
              if (existingData.studentGroup === undefined) updates.studentGroup = null;
              if (existingData.classCategory === undefined) updates.classCategory = '';
              if (existingData.stream === undefined) updates.stream = '';
              if (existingData.autoGroup === undefined) updates.autoGroup = '';
              if (existingData.customGroupException === undefined) updates.customGroupException = '';
            }
            
            if (Object.keys(updates).length > 0) {
              await setDoc(userRef, updates, { merge: true });
            }
          }
        } catch (error) {
          console.error("Error checking or creating user profile document:", error);
        }

        // Set up snapshot listener
        if (!db) {
          console.error("Firestore not initialized");
          setLoading(false);
          return;
        }

        try {
          unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setUser({
                uid: firebaseUser.uid,
                emailVerified: firebaseUser.emailVerified,
                ...docSnap.data()
              });
            }
            setLoading(false);
          }, (error) => {
            console.error("Profile snapshot listener error:", error);
            setLoading(false);
          });
        } catch (err) {
          console.error("AuthContext: ProfileListener - Failed to create snapshot listener", err);
          setLoading(false);
        }
      } else {
        setUser(null);
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
