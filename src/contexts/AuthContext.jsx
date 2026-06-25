import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { setDoc } from '../firebase';;
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

const ADMIN_EMAILS = ['tapadarhribhu@gmail.com', 'biswa.maity2011@gmail.com'];

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const registerMobileUser = async (name, email, mobileNumber) => {
    if (!auth.currentUser) throw new Error("No authenticated user found");
    const uid = auth.currentUser.uid;
    const userRef = doc(db, 'users', uid);
    
    const emailLower = email.trim().toLowerCase();
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

    const nameVal = name.trim();
    let newProfile = {
      uid: uid,
      name: nameVal,
      displayName: nameVal,
      fullName: nameVal,
      email: emailLower,
      photoURL: '',
      phone: mobileNumber,
      mobileNumber: mobileNumber,
      role: targetRole,
      permissions: permissions,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      isActive: true,
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
        console.error("Error fetching fee structure in AuthContext registration:", e);
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
        feeStatus: 'pending',
        feeTarget: baseMonthly,
        monthlyFee: baseMonthly,
        registrationFee: regFee,
        admissionFee: admFee,
        feesAmount: (baseMonthly * 12) + regFee + admFee,
        joiningDate: new Date().toISOString()
      };
    }

    await setDoc(userRef, newProfile);
  };

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
          const isPhone = firebaseUser.phoneNumber || firebaseUser.providerData.some(p => p.providerId === 'phone');

          if (!userSnap.exists()) {
            if (!isPhone) {
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

              const nameVal = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student';
              let newProfile = {
                uid: firebaseUser.uid,
                name: nameVal,
                displayName: nameVal,
                fullName: nameVal,
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || '',
                phone: '',
                mobileNumber: '',
                role: targetRole,
                permissions: permissions,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                isActive: true,
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
                  feeStatus: 'pending',
                  feeTarget: baseMonthly,
                  monthlyFee: baseMonthly,
                  registrationFee: regFee,
                  admissionFee: admFee,
                  feesAmount: (baseMonthly * 12) + regFee + admFee,
                  joiningDate: new Date().toISOString()
                };
              }
              await setDoc(userRef, newProfile);
            }
          } else {
            // Document exists, update lastLogin
            await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
          }
        } catch (error) {
          console.error("Error checking or creating user profile document:", error);
        }

        // Set up snapshot listener
        try {
          unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setUser({
                uid: firebaseUser.uid,
                emailVerified: firebaseUser.emailVerified,
                ...docSnap.data()
              });
            } else {
              // Document does not exist (phone user needing registration)
              setUser({
                uid: firebaseUser.uid,
                phoneNumber: firebaseUser.phoneNumber || '',
                needsRegistration: true
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
    <AuthContext.Provider value={{ user, loading, registerMobileUser }}>
      {children}
    </AuthContext.Provider>
  );
};
