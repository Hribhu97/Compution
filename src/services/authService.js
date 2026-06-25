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
  signInWithPhoneNumber 
} from '../firebase';
import { firebaseRecaptcha } from './firebaseRecaptcha';

export const authService = {
  async loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  async loginWithGoogle() {
    return await signInWithPopup(auth, googleProvider);
  },

  async logout() {
    firebaseRecaptcha.destroy();
    await signOut(auth);
  },

  /**
   * Gets the existing RecaptchaVerifier instance or creates a new one.
   * Delegates to singleton firebaseRecaptcha service.
   * @param {string} containerId - The HTML element ID of the recaptcha container.
   */
  getOrCreateRecaptchaVerifier(containerId = 'recaptcha-container') {
    return firebaseRecaptcha.getOrCreate(containerId);
  },

  /**
   * Safely clears the global RecaptchaVerifier.
   */
  clearRecaptchaVerifier() {
    firebaseRecaptcha.destroy();
  },

  /**
   * Sends an OTP to the given phone number using Firebase Phone Auth.
   * @param {string} phoneNumber - E.164 formatted phone number (e.g. +91XXXXXXXXXX)
   * @param {string} containerId - The HTML element ID of the recaptcha container
   * @returns {Promise<ConfirmationResult>}
   */
  async sendOTP(phoneNumber, containerId = 'recaptcha-container') {
    // Add logs: [OTP REQUESTED]
    console.log('[OTP REQUESTED]');
    console.log('[Phone Auth Debug] Phone number:', phoneNumber);
    console.log('[Phone Auth Debug] E.164 format valid:', /^\+[1-9]\d{6,14}$/.test(phoneNumber));

    const appVerifier = firebaseRecaptcha.getOrCreate(containerId);

    try {
      console.log('[Phone Auth Debug] Calling signInWithPhoneNumber()...');
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      
      // Add logs: [OTP SENT]
      console.log('[OTP SENT]');
      return confirmationResult;
    } catch (error) {
      console.error('[Phone Auth Error] signInWithPhoneNumber() FAILED', error);
      
      const errorMessage = error.message || '';
      const errorCode = error.code || '';
      const isRecaptchaError = 
        errorCode === 'auth/captcha-check-failed' ||
        errorCode === 'auth/invalid-app-credential' ||
        errorMessage.includes('reCAPTCHA') ||
        errorMessage.includes('client element has been removed') ||
        errorMessage.includes('widget');

      if (isRecaptchaError) {
        console.warn('[Phone Auth Debug] reCAPTCHA client/element invalid. Triggering recovery...');
        console.log('[RECAPTCHA INVALIDATED]');
        
        firebaseRecaptcha.destroy();
        
        console.log('[RECAPTCHA RECOVERED]');
        const recoveredVerifier = firebaseRecaptcha.getOrCreate(containerId);

        console.log('[Phone Auth Debug] Retrying OTP send after recovery...');
        try {
          const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recoveredVerifier);
          console.log('[OTP SENT]');
          return confirmationResult;
        } catch (retryError) {
          console.error('[Phone Auth Error] Retry after recovery failed:', retryError);
          throw retryError;
        }
      }

      // Diagnostic hints based on known error codes
      if (error.code === 'auth/operation-not-allowed') {
        console.error('[Phone Auth Diagnosis] >>> Phone Sign-In is NOT ENABLED in Firebase Console.');
      } else if (error.code === 'auth/captcha-check-failed') {
        console.error('[Phone Auth Diagnosis] >>> reCAPTCHA verification failed. Check authorized domains.');
      } else if (error.code === 'auth/billing-not-enabled') {
        console.error('[Phone Auth Diagnosis] >>> Firebase project billing is not enabled.');
      } else if (error.code === 'auth/invalid-phone-number') {
        console.error('[Phone Auth Diagnosis] >>> Phone number format is invalid.');
      } else if (error.code === 'auth/too-many-requests' || error.code === 'auth/quota-exceeded') {
        console.error('[Phone Auth Diagnosis] >>> SMS quota exceeded or too many attempts.');
      } else if (error.code === 'auth/network-request-failed') {
        console.error('[Phone Auth Diagnosis] >>> Network request failed.');
      }

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
