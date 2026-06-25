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

let globalRecaptchaVerifier = null;

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
   * Gets the existing RecaptchaVerifier instance or creates a new one.
   * Reinitializes safely if the verifier becomes invalid or container is empty.
   * @param {string} containerId - The HTML element ID of the recaptcha container.
   * @returns {RecaptchaVerifier}
   */
  getOrCreateRecaptchaVerifier(containerId = 'recaptcha-container') {
    const containerEl = document.getElementById(containerId);
    if (!containerEl) {
      const err = new Error(`reCAPTCHA container element #${containerId} not found in DOM`);
      console.error('[Phone Auth Error]', err);
      throw err;
    }

    if (globalRecaptchaVerifier) {
      // Reinitialize safely if the verifier's element was destroyed or cleared.
      // Since invisible reCAPTCHA modifies the DOM, verify if it still contains children.
      // If not (e.g. wiped by DOM updates), we clear and recreate it.
      const hasRecaptchaWidgets = containerEl.querySelector('iframe') || containerEl.querySelector('.grecaptcha-badge');
      if (!hasRecaptchaWidgets) {
        console.log('[Phone Auth Debug] reCAPTCHA container is empty or has no widgets. Reinitializing verifier...');
        this.clearRecaptchaVerifier();
      } else {
        console.log('[Phone Auth Debug] verifier reused');
        return globalRecaptchaVerifier;
      }
    }

    try {
      globalRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response) => {
          console.log('[Phone Auth Debug] reCAPTCHA solved successfully. Token length:', response?.length || 0);
        },
        'expired-callback': () => {
          console.warn('[Phone Auth Debug] reCAPTCHA token expired. User must re-verify.');
        }
      });
      console.log('[Phone Auth Debug] verifier created');
      return globalRecaptchaVerifier;
    } catch (error) {
      console.error('[Phone Auth Error] RecaptchaVerifier creation failed:', error);
      globalRecaptchaVerifier = null;
      throw error;
    }
  },

  /**
   * Safely clears the global RecaptchaVerifier.
   */
  clearRecaptchaVerifier() {
    if (globalRecaptchaVerifier) {
      try {
        globalRecaptchaVerifier.clear();
        console.log('[Phone Auth Debug] verifier destroyed');
      } catch (err) {
        console.error('[Phone Auth Error] Error clearing RecaptchaVerifier:', err);
      }
      globalRecaptchaVerifier = null;
    }
  },

  /**
   * Sends an OTP to the given phone number using Firebase Phone Auth.
   * @param {string} phoneNumber - E.164 formatted phone number (e.g. +91XXXXXXXXXX)
   * @param {string} containerId - The HTML element ID of the recaptcha container
   * @returns {Promise<ConfirmationResult>}
   */
  async sendOTP(phoneNumber, containerId = 'recaptcha-container') {
    // 9. Add detailed logging: OTP requested
    console.log('[Phone Auth Debug] OTP requested');
    console.log('[Phone Auth Debug] Phone number:', phoneNumber);
    console.log('[Phone Auth Debug] E.164 format valid:', /^\+[1-9]\d{6,14}$/.test(phoneNumber));

    // 5. Verify recaptcha-container always exists before signInWithPhoneNumber()
    const appVerifier = this.getOrCreateRecaptchaVerifier(containerId);

    try {
      console.log('[Phone Auth Debug] Calling signInWithPhoneNumber()...');
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      
      // 9. Add detailed logging: OTP sent
      console.log('[Phone Auth Debug] OTP sent');
      return confirmationResult;
    } catch (error) {
      console.error('[Phone Auth Error] signInWithPhoneNumber() FAILED');
      console.error('[Phone Auth Error] Error code:', error.code || 'NO_CODE');
      console.error('[Phone Auth Error] Error message:', error.message || 'NO_MESSAGE');
      
      // Force recreation on subsequent attempts by cleaning up
      this.clearRecaptchaVerifier();

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
      } else if (!error.code) {
        console.error('[Phone Auth Diagnosis] >>> Error has no Firebase code. This may be a reCAPTCHA initialization error, a DOM issue, or a network/CORS problem. Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
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
