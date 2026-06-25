import { 
  signInWithEmailAndPassword, 
  signOut, 
  signInWithPopup 
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  googleProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from '../firebase';

export const authService = {
  async loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  async loginWithGoogle() {
    return await signInWithPopup(auth, googleProvider);
  },

  async logout() {
    await signOut(auth);
  },

  /**
   * Initializes the Firebase invisible reCAPTCHA verifier.
   * @param {string} containerId - The HTML element ID of the recaptcha container.
   * @returns {RecaptchaVerifier}
   */
  setupRecaptcha(containerId) {
    if (!containerId) {
      throw new Error("Recaptcha container ID is required");
    }
    return new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        // reCAPTCHA solved - will proceed with submitPhoneNumber
      },
      'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again.
      }
    });
  },

  /**
   * Sends an OTP to the given phone number using Firebase Phone Auth.
   * @param {string} phoneNumber - E.164 formatted phone number (e.g. +91XXXXXXXXXX)
   * @param {RecaptchaVerifier} appVerifier - The RecaptchaVerifier instance
   * @returns {Promise<ConfirmationResult>}
   */
  async sendOTP(phoneNumber, appVerifier) {
    try {
      return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    } catch (error) {
      console.error("Error sending OTP in authService:", error);
      throw error;
    }
  },

  /**
   * Checks if a phone number is already associated with another user account in Firestore.
   * Returns true if a duplicate exists under a different UID, false otherwise.
   * @param {string} phoneNumber - E.164 formatted phone number
   * @param {string} [currentUid] - Optional current authenticated user UID
   * @returns {Promise<boolean>}
   */
  async checkDuplicatePhoneNumber(phoneNumber, currentUid = '') {
    if (!phoneNumber) return false;
    
    try {
      const usersRef = collection(db, 'users');
      
      // Query both phone and mobileNumber fields
      const qPhone = query(usersRef, where('phone', '==', phoneNumber));
      const qMobile = query(usersRef, where('mobileNumber', '==', phoneNumber));
      
      const [snapPhone, snapMobile] = await Promise.all([
        getDocs(qPhone),
        getDocs(qMobile)
      ]);
      
      const duplicateDocs = [];
      snapPhone.forEach(d => duplicateDocs.push({ id: d.id, ...d.data() }));
      snapMobile.forEach(d => {
        if (!duplicateDocs.some(existing => existing.id === d.id)) {
          duplicateDocs.push({ id: d.id, ...d.data() });
        }
      });
      
      // Filter out current user ID if checking during an active session
      const duplicates = duplicateDocs.filter(doc => doc.id !== currentUid);
      
      return duplicates.length > 0;
    } catch (error) {
      console.error("Error checking duplicate phone number in Firestore:", error);
      throw error;
    }
  }
};
