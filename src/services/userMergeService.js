import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithCredential,
  linkWithCredential, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { db, firebaseConfig } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Merges all Firestore user data from sourceUid to targetUid.
 *
 * @param {string} sourceUid - UID of account to merge from (will be deleted)
 * @param {string} targetUid - UID of account to merge into (will be kept)
 */
export const mergeFirestoreUserData = async (sourceUid, targetUid) => {
  console.log(`[Merge Service] Merging Firestore data from ${sourceUid} to ${targetUid}...`);

  const sourceUserRef = doc(db, 'users', sourceUid);
  const targetUserRef = doc(db, 'users', targetUid);

  const [sourceSnap, targetSnap] = await Promise.all([
    getDoc(sourceUserRef),
    getDoc(targetUserRef)
  ]);

  if (!sourceSnap.exists()) {
    console.warn(`[Merge Service] Source profile ${sourceUid} does not exist in Firestore. Skipping profile merge.`);
    return;
  }

  const sourceData = sourceSnap.data();
  const targetData = targetSnap.exists() ? targetSnap.data() : {};

  // 1. Merge Profile Data
  // Prefer preserving the older account unless the newer one has profileCompleted and the older one does not.
  const sourceCreatedAt = sourceData.createdAt?.toDate ? sourceData.createdAt.toDate() : new Date(sourceData.createdAt || Date.now());
  const targetCreatedAt = targetData.createdAt?.toDate ? targetData.createdAt.toDate() : new Date(targetData.createdAt || Date.now());

  let mergedProfile = {};
  if (sourceCreatedAt < targetCreatedAt) {
    mergedProfile = { ...targetData, ...sourceData };
    if (targetData.profileCompleted) mergedProfile.profileCompleted = true;
  } else {
    mergedProfile = { ...sourceData, ...targetData };
    if (sourceData.profileCompleted) mergedProfile.profileCompleted = true;
  }

  // Ensure target credentials and basic fields are correct
  mergedProfile.uid = targetUid;
  mergedProfile.phone = targetData.phone || sourceData.phone || '';
  mergedProfile.phoneNumber = targetData.phoneNumber || sourceData.phoneNumber || '';
  mergedProfile.mobileNumber = targetData.mobileNumber || sourceData.mobileNumber || '';
  mergedProfile.email = targetData.email || sourceData.email || '';
  
  // Merge authProviders
  const mergedProviders = Array.from(new Set([...(sourceData.authProviders || []), ...(targetData.authProviders || [])]));
  mergedProfile.authProviders = mergedProviders;

  // Merge settings & preferences
  mergedProfile.settings = { ...(sourceData.settings || {}), ...(targetData.settings || {}) };
  mergedProfile.notificationPreferences = { ...(sourceData.notificationPreferences || {}), ...(targetData.notificationPreferences || {}) };

  // Save the merged profile to targetUid
  await setDoc(targetUserRef, mergedProfile, { merge: true });

  // 2. Merge Subcollections under users/{uid} (attendance, assignments)
  const collectionsToMigrate = ['attendance', 'assignments'];
  for (const colName of collectionsToMigrate) {
    const sourceColRef = collection(db, 'users', sourceUid, colName);
    const snap = await getDocs(sourceColRef);
    const batch = writeBatch(db);
    snap.forEach(document => {
      const targetDocRef = doc(db, 'users', targetUid, colName, document.id);
      batch.set(targetDocRef, document.data());
      batch.delete(document.ref);
    });
    await batch.commit();
  }

  // 3. Merge fees/monthly subcollection
  const sourceFeesRef = collection(db, 'fees', sourceUid, 'monthly');
  const feesSnap = await getDocs(sourceFeesRef);
  const feesBatch = writeBatch(db);
  feesSnap.forEach(document => {
    const targetDocRef = doc(db, 'fees', targetUid, 'monthly', document.id);
    feesBatch.set(targetDocRef, document.data());
    feesBatch.delete(document.ref);
  });
  await feesBatch.commit();

  // 4. Merge studentFacultyMap
  const sourceMapRef = doc(db, 'studentFacultyMap', sourceUid);
  const sourceMapSnap = await getDoc(sourceMapRef);
  if (sourceMapSnap.exists()) {
    const targetMapRef = doc(db, 'studentFacultyMap', targetUid);
    await setDoc(targetMapRef, sourceMapSnap.data(), { merge: true });
    await deleteDoc(sourceMapRef);
  }

  // 5. Merge facultyStudentRoster (studentIds array)
  const rostersRef = collection(db, 'facultyStudentRoster');
  const rostersSnap = await getDocs(rostersRef);
  const rosterBatch = writeBatch(db);
  let rosterModified = false;
  rostersSnap.forEach(document => {
    const data = document.data();
    if (data.studentIds && data.studentIds.includes(sourceUid)) {
      let newStudentIds = data.studentIds.filter(id => id !== sourceUid);
      if (!newStudentIds.includes(targetUid)) {
        newStudentIds.push(targetUid);
      }
      rosterBatch.update(document.ref, { studentIds: newStudentIds });
      rosterModified = true;
    }
  });
  if (rosterModified) await rosterBatch.commit();

  // 6. Merge testAttempts
  const testAttemptsRef = collection(db, 'testAttempts');
  const qTest = query(testAttemptsRef, where('studentId', '==', sourceUid));
  const testSnap = await getDocs(qTest);
  const testBatch = writeBatch(db);
  testSnap.forEach(document => {
    testBatch.update(document.ref, { studentId: targetUid });
  });
  if (!testSnap.empty) await testBatch.commit();

  // 7. Merge gameAttempts
  const gameAttemptsRef = collection(db, 'gameAttempts');
  const qGame = query(gameAttemptsRef, where('userId', '==', sourceUid));
  const gameSnap = await getDocs(qGame);
  const gameBatch = writeBatch(db);
  gameSnap.forEach(document => {
    gameBatch.update(document.ref, { userId: targetUid });
  });
  if (!gameSnap.empty) await gameBatch.commit();

  // 8. Merge notifications
  const notificationsRef = collection(db, 'notifications');
  const qNotif = query(notificationsRef, where('recipientId', '==', sourceUid));
  const notifSnap = await getDocs(qNotif);
  const notifBatch = writeBatch(db);
  notifSnap.forEach(document => {
    notifBatch.update(document.ref, { recipientId: targetUid });
  });
  if (!notifSnap.empty) await notifBatch.commit();

  // 9. Merge classTrackerEntries (studentIds array)
  const trackerRef = collection(db, 'classTrackerEntries');
  const qTracker = query(trackerRef, where('studentIds', 'array-contains', sourceUid));
  const trackerSnap = await getDocs(qTracker);
  const trackerBatch = writeBatch(db);
  trackerSnap.forEach(document => {
    const data = document.data();
    let newStudentIds = data.studentIds.filter(id => id !== sourceUid);
    if (!newStudentIds.includes(targetUid)) {
      newStudentIds.push(targetUid);
    }
    trackerBatch.update(document.ref, { studentIds: newStudentIds });
  });
  if (!trackerSnap.empty) await trackerBatch.commit();

  // 10. Merge xpLogs
  const sourceXpRef = collection(db, 'xpLogs', sourceUid, 'logs');
  const xpSnap = await getDocs(sourceXpRef);
  const xpBatch = writeBatch(db);
  xpSnap.forEach(document => {
    const targetDocRef = doc(db, 'xpLogs', targetUid, 'logs', document.id);
    xpBatch.set(targetDocRef, document.data());
    xpBatch.delete(document.ref);
  });
  await xpBatch.commit();

  // 11. Merge seedCoinLogs
  const sourceSeedRef = collection(db, 'seedCoinLogs', sourceUid, 'logs');
  const seedSnap = await getDocs(sourceSeedRef);
  const seedBatch = writeBatch(db);
  seedSnap.forEach(document => {
    const targetDocRef = doc(db, 'seedCoinLogs', targetUid, 'logs', document.id);
    seedBatch.set(targetDocRef, document.data());
    seedBatch.delete(document.ref);
  });
  await seedBatch.commit();

  // 12. Merge worldcup_groups (memberUids array and members objects)
  const groupsRef = collection(db, 'worldcup_groups');
  const qGroups = query(groupsRef, where('memberUids', 'array-contains', sourceUid));
  const groupsSnap = await getDocs(qGroups);
  const groupsBatch = writeBatch(db);
  groupsSnap.forEach(document => {
    const data = document.data();
    let newMemberUids = data.memberUids.filter(id => id !== sourceUid);
    if (!newMemberUids.includes(targetUid)) {
      newMemberUids.push(targetUid);
    }
    
    let newMembers = (data.members || []).map(m => {
      if (m.uid === sourceUid) {
        return { ...m, uid: targetUid };
      }
      return m;
    });

    let updates = {
      memberUids: newMemberUids,
      members: newMembers
    };

    if (data.captain === sourceUid) {
      updates.captain = targetUid;
    }

    groupsBatch.update(document.ref, updates);
  });
  if (!groupsSnap.empty) await groupsBatch.commit();

  // 13. Merge worldcup_chat
  const chatRef = collection(db, 'worldcup_chat');
  const qChat = query(chatRef, where('senderId', '==', sourceUid));
  const chatSnap = await getDocs(qChat);
  const chatBatch = writeBatch(db);
  chatSnap.forEach(document => {
    chatBatch.update(document.ref, { senderId: targetUid });
  });
  if (!chatSnap.empty) await chatBatch.commit();

  // 14. Merge worldcup_scores
  const scoresRef = collection(db, 'worldcup_scores');
  const qScores = query(scoresRef, where('userId', '==', sourceUid));
  const scoresSnap = await getDocs(qScores);
  const scoresBatch = writeBatch(db);
  scoresSnap.forEach(document => {
    scoresBatch.update(document.ref, { userId: targetUid });
  });
  if (!scoresSnap.empty) await scoresBatch.commit();

  // 15. Finally, delete the source profile document
  await deleteDoc(sourceUserRef);

  console.log(`[Merge Service] Firestore data merge from ${sourceUid} to ${targetUid} COMPLETED successfully.`);
};

export const userMergeService = {
  /**
   * Merges a temporary mobile account into an existing email account.
   *
   * @param {User} currentTempUser - The currently logged-in mobile user (UID A)
   * @param {string} targetEmail - The email of the existing account (UID B)
   * @param {string} targetPassword - The password of the existing account (UID B)
   * @returns {Promise<{targetUid: string}>}
   */
  async mergeMobileIntoEmail(currentTempUser, targetEmail, targetPassword) {
    const sourceUid = currentTempUser.uid;
    console.log(`[Merge Service] Merging mobile account ${sourceUid} into email account ${targetEmail}...`);

    // 1. Verify credentials of UID B using a temporary Firebase App instance
    const tempApp = initializeApp(firebaseConfig, 'temp-verify');
    const tempAuth = getAuth(tempApp);
    
    let targetUserCredential;
    try {
      targetUserCredential = await signInWithEmailAndPassword(tempAuth, targetEmail, targetPassword);
    } catch (err) {
      await tempApp.delete();
      throw err;
    }

    const targetUid = targetUserCredential.user.uid;
    console.log(`[Merge Service] Verified target account. Target UID: ${targetUid}`);

    // 2. Perform Firestore merge first (to preserve all user data)
    await mergeFirestoreUserData(sourceUid, targetUid);

    // 3. Delete UID A's Firebase Auth user to release the phone number
    try {
      await currentTempUser.delete();
      console.log(`[Merge Service] Released phone number from temp account ${sourceUid}.`);
    } catch (err) {
      console.error(`[Merge Service] Failed to delete temp user auth account ${sourceUid}:`, err);
    } finally {
      await tempApp.delete();
    }

    return { targetUid };
  },

  /**
   * Merges a temporary mobile account into an existing Google account.
   *
   * @param {User} currentTempUser - The currently logged-in mobile user (UID A)
   * @returns {Promise<{targetUid: string, googleCredential: AuthCredential}>}
   */
  async mergeMobileIntoGoogle(currentTempUser) {
    const sourceUid = currentTempUser.uid;
    console.log(`[Merge Service] Merging mobile account ${sourceUid} into Google account...`);

    // 1. Verify credentials of Google account using a temporary Firebase App instance
    const tempApp = initializeApp(firebaseConfig, 'temp-verify-google');
    const tempAuth = getAuth(tempApp);
    const provider = new GoogleAuthProvider();

    let result;
    try {
      result = await signInWithPopup(tempAuth, provider);
    } catch (err) {
      await tempApp.delete();
      throw err;
    }

    const googleCredential = GoogleAuthProvider.credentialFromResult(result);
    const targetUid = result.user.uid;
    console.log(`[Merge Service] Verified Google account. Target UID: ${targetUid}`);

    // 2. Perform Firestore merge first
    await mergeFirestoreUserData(sourceUid, targetUid);

    // 3. Delete UID A's Firebase Auth user to release the phone number
    try {
      await currentTempUser.delete();
      console.log(`[Merge Service] Released phone number from temp account ${sourceUid}.`);
    } catch (err) {
      console.error(`[Merge Service] Failed to delete temp user auth account ${sourceUid}:`, err);
    } finally {
      await tempApp.delete();
    }

    return { targetUid, googleCredential };
  }
};
