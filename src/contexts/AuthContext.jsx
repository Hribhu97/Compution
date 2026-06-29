import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { setDoc } from '../firebase';;
import { auth, db } from '../firebase';
import { firebaseRecaptcha } from '../services/firebaseRecaptcha';

const AuthContext = createContext(null);

const ADMIN_EMAILS = ['tapadarhribhu@gmail.com', 'biswa.maity2011@gmail.com'];

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const completeUserProfile = async (profileData) => {
    if (!auth.currentUser) throw new Error("No authenticated user found");
    const uid = auth.currentUser.uid;
    const userRef = doc(db, 'users', uid);
    
    const emailLower = profileData.email.trim().toLowerCase();
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

    const providers = auth.currentUser?.providerData.map(p => p.providerId) || [];
    
    let baseProfile = {
      uid: uid,
      name: profileData.name.trim(),
      displayName: profileData.name.trim(),
      fullName: profileData.name.trim(),
      email: emailLower,
      photoURL: profileData.photoURL || '',
      phone: profileData.phone || '',
      mobileNumber: profileData.phone || '',
      phoneNumber: profileData.phone || '',
      dob: profileData.dob || '',
      gender: profileData.gender || '',
      address: profileData.address || '',
      district: profileData.district || '',
      state: profileData.state || '',
      pin: profileData.pin || '',
      emergencyContact: profileData.emergencyContact || '',
      school: profileData.school || '',
      class: profileData.class || '',
      course: profileData.course || 'Not specified',
      guardianName: profileData.guardianName || '',
      guardianPhone: profileData.guardianPhone || '',
      aadhaarNumber: profileData.aadhaarNumber || '',
      aadhaarStatus: profileData.aadhaarNumber ? (profileData.aadhaarStatus || 'pending') : '',
      emailVerified: auth.currentUser?.emailVerified || false,
      phoneVerified: providers.includes('phone') || profileData.phoneVerified || false,
      authProviders: providers,
      role: targetRole,
      permissions: permissions,
      profileCompleted: true,
      updatedAt: serverTimestamp()
    };

    const userSnap = await getDoc(userRef);
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
        console.error("Error fetching fee structure in completeUserProfile:", e);
      }

      const existingData = userSnap.exists() ? userSnap.data() : {};

      baseProfile = {
        ...baseProfile,
        studentId: existingData.studentId || `COMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        assignedFacultyIds: existingData.assignedFacultyIds || [],
        studentGroup: existingData.studentGroup || null,
        classCategory: existingData.classCategory || '',
        stream: existingData.stream || '',
        autoGroup: existingData.autoGroup || '',
        customGroupException: existingData.customGroupException || '',
        feeStatus: existingData.feeStatus || 'pending',
        feeTarget: existingData.feeTarget !== undefined ? existingData.feeTarget : baseMonthly,
        monthlyFee: existingData.monthlyFee || baseMonthly,
        registrationFee: existingData.registrationFee || regFee,
        admissionFee: existingData.admissionFee || admFee,
        feesAmount: existingData.feesAmount || ((baseMonthly * 12) + regFee + admFee),
        joiningDate: existingData.joiningDate || new Date().toISOString()
      };
    }

    if (!userSnap.exists()) {
      baseProfile.createdAt = serverTimestamp();
      baseProfile.lastLogin = serverTimestamp();
      baseProfile.isActive = true;
      baseProfile.assignedCourses = [];
    }

    await setDoc(userRef, baseProfile, { merge: true });
  };

  const registerMobileUser = async (name, email, mobileNumber) => {
    return completeUserProfile({
      name,
      email,
      phone: mobileNumber,
      dob: '',
      gender: '',
      address: '',
      district: '',
      state: '',
      pin: '',
      emergencyContact: '',
      school: '',
      class: '',
      course: 'Not specified',
      guardianName: '',
      guardianPhone: '',
      aadhaarNumber: '',
      phoneVerified: true
    });
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

              const providers = firebaseUser.providerData.map(p => p.providerId);
              const phoneVal = firebaseUser.phoneNumber || '';
              const nameVal = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student';
              let newProfile = {
                uid: firebaseUser.uid,
                name: nameVal,
                displayName: nameVal,
                fullName: nameVal,
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || '',
                phone: phoneVal,
                mobileNumber: phoneVal,
                phoneNumber: phoneVal,
                emailVerified: firebaseUser.emailVerified || false,
                phoneVerified: firebaseUser.phoneNumber ? true : false,
                authProviders: providers,
                role: targetRole,
                permissions: permissions,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
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
            } else {
              // We do NOT write an automatic profile for phone users here anymore,
              // to prevent duplicate/orphaned records during linking.
              // They will be marked with needsRegistration: true in the snapshot listener below.
              console.log(`[Phone Auth Debug] Profile not found for phone user: ${firebaseUser.uid}. Needs registration.`);
            }
          } else {
            // Document exists, merge schema updates and lastLogin
            const providers = firebaseUser.providerData.map(p => p.providerId);
            const phoneVal = firebaseUser.phoneNumber || userSnap.data()?.phoneNumber || userSnap.data()?.phone || '';
            const emailVal = firebaseUser.email?.toLowerCase() || userSnap.data()?.email || '';
            
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: emailVal,
              phoneNumber: phoneVal,
              phone: phoneVal,
              mobileNumber: phoneVal,
              emailVerified: firebaseUser.emailVerified || false,
              phoneVerified: firebaseUser.phoneNumber ? true : (userSnap.data()?.phoneVerified || false),
              authProviders: providers,
              lastLogin: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
        } catch (error) {
          if (error.code === 'permission-denied' || error.message?.toLowerCase().includes('permission')) {
            console.error(`[Firestore Permission Error] Failed checking/creating profile for user ${firebaseUser.uid}:`, error);
          } else {
            console.error("Error checking or creating user profile document:", error);
          }
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
            if (error.code === 'permission-denied' || error.message?.toLowerCase().includes('permission')) {
              console.error(`[Firestore Permission Error] Snapshot listener failed for user ${firebaseUser.uid}:`, error);
            } else {
              console.error("Profile snapshot listener error:", error);
            }
            setLoading(false);
          });
        } catch (err) {
          console.error("AuthContext: ProfileListener - Failed to create snapshot listener", err);
          setLoading(false);
        }
      } else {
        firebaseRecaptcha.destroy();
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
    <AuthContext.Provider value={{ user, loading, registerMobileUser, completeUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
