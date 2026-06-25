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
    console.log('[Phone Auth Debug] setupRecaptcha() called with containerId:', containerId);

    if (!containerId) {
      const err = new Error("Recaptcha container ID is required");
      console.error('[Phone Auth Error] setupRecaptcha:', err);
      throw err;
    }

    // Verify the DOM element exists
    const containerEl = document.getElementById(containerId);
    console.log('[Phone Auth Debug] reCAPTCHA container DOM element:', containerEl ? 'FOUND' : 'NOT FOUND');
    if (!containerEl) {
      const err = new Error(`reCAPTCHA container element #${containerId} not found in DOM`);
      console.error('[Phone Auth Error]', err);
      throw err;
    }

    // Verify auth instance
    console.log('[Phone Auth Debug] Firebase Auth instance:', auth ? 'EXISTS' : 'NULL');
    console.log('[Phone Auth Debug] Auth config:', JSON.stringify({
      apiKey: auth?.app?.options?.apiKey ? '***' + auth.app.options.apiKey.slice(-4) : 'MISSING',
      authDomain: auth?.app?.options?.authDomain || 'MISSING',
      projectId: auth?.app?.options?.projectId || 'MISSING'
    }));

    try {
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response) => {
          console.log('[Phone Auth Debug] reCAPTCHA solved successfully. Token length:', response?.length || 0);
        },
        'expired-callback': () => {
          console.warn('[Phone Auth Debug] reCAPTCHA token expired. User must re-verify.');
        }
      });
      console.log('[Phone Auth Debug] RecaptchaVerifier created successfully');
      return verifier;
    } catch (error) {
      console.error('[Phone Auth Error] RecaptchaVerifier creation failed:', {
        code: error.code || 'NO_CODE',
        message: error.message || 'NO_MESSAGE',
        fullError: error
      });
      throw error;
    }
  },

  /**
   * Sends an OTP to the given phone number using Firebase Phone Auth.
   * @param {string} phoneNumber - E.164 formatted phone number (e.g. +91XXXXXXXXXX)
   * @param {RecaptchaVerifier} appVerifier - The RecaptchaVerifier instance
   * @returns {Promise<ConfirmationResult>}
   */
  async sendOTP(phoneNumber, appVerifier) {
    console.log('[Phone Auth Debug] sendOTP() called');
    console.log('[Phone Auth Debug] Phone number:', phoneNumber);
    console.log('[Phone Auth Debug] E.164 format valid:', /^\+[1-9]\d{6,14}$/.test(phoneNumber));
    console.log('[Phone Auth Debug] appVerifier exists:', !!appVerifier);
    console.log('[Phone Auth Debug] appVerifier type:', appVerifier?.constructor?.name || typeof appVerifier);

    try {
      console.log('[Phone Auth Debug] Calling signInWithPhoneNumber()...');
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      console.log('[Phone Auth Debug] signInWithPhoneNumber() SUCCESS. ConfirmationResult received.');
      return confirmationResult;
    } catch (error) {
      console.error('[Phone Auth Error] signInWithPhoneNumber() FAILED');
      console.error('[Phone Auth Error] Error code:', error.code || 'NO_CODE');
      console.error('[Phone Auth Error] Error message:', error.message || 'NO_MESSAGE');
      console.error('[Phone Auth Error] Error customData:', error.customData || 'NONE');
      console.error('[Phone Auth Error] Full error object:', error);
      console.error('[Phone Auth Error] Error name:', error.name || 'NO_NAME');
      console.error('[Phone Auth Error] Error stack:', error.stack || 'NO_STACK');

      // Diagnostic hints based on known error codes
      if (error.code === 'auth/operation-not-allowed') {
        console.error('[Phone Auth Diagnosis] >>> Phone Sign-In is NOT ENABLED in Firebase Console. Go to: Firebase Console > Authentication > Sign-in method > Phone > Enable');
      } else if (error.code === 'auth/captcha-check-failed') {
        console.error('[Phone Auth Diagnosis] >>> reCAPTCHA verification failed. Check: 1) Authorized domains in Firebase Console 2) reCAPTCHA site key 3) Current domain is whitelisted');
      } else if (error.code === 'auth/billing-not-enabled') {
        console.error('[Phone Auth Diagnosis] >>> Firebase project billing is not enabled. Phone Auth requires a Blaze (pay-as-you-go) plan.');
      } else if (error.code === 'auth/invalid-phone-number') {
        console.error('[Phone Auth Diagnosis] >>> Phone number format is invalid. Must be E.164: +[country code][number] e.g. +919876543210');
      } else if (error.code === 'auth/too-many-requests') {
        console.error('[Phone Auth Diagnosis] >>> SMS quota exceeded or too many attempts from this device/IP. Wait and retry later.');
      } else if (error.code === 'auth/network-request-failed') {
        console.error('[Phone Auth Diagnosis] >>> Network request failed. Check internet connectivity and firewall rules.');
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
