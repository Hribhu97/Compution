import { auth, RecaptchaVerifier } from '../firebase';

export const firebaseRecaptcha = {
  /**
   * Gets the existing RecaptchaVerifier instance or creates a new one.
   * Ensures the recaptcha-container always exists.
   * @param {string} containerId - The HTML element ID of the recaptcha container
   * @returns {RecaptchaVerifier}
   */
  getOrCreate(containerId = 'recaptcha-container') {
    let containerEl = document.getElementById(containerId);
    if (!containerEl) {
      console.log(`[Phone Auth Debug] recaptcha-container element #${containerId} not found in DOM. Recreating...`);
      containerEl = document.createElement('div');
      containerEl.id = containerId;
      document.body.appendChild(containerEl);
    }

    if (window.recaptchaVerifier) {
      console.log('[RECAPTCHA REUSED]');
      return window.recaptchaVerifier;
    }

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response) => {
          console.log('[Phone Auth Debug] reCAPTCHA solved successfully.');
        },
        'expired-callback': () => {
          console.warn('[Phone Auth Debug] reCAPTCHA token expired.');
        }
      });
      console.log('[RECAPTCHA CREATED]');
      return window.recaptchaVerifier;
    } catch (error) {
      console.error('[Phone Auth Error] RecaptchaVerifier creation failed:', error);
      window.recaptchaVerifier = null;
      throw error;
    }
  },

  /**
   * Safely clears and destroys the global RecaptchaVerifier.
   */
  destroy() {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        console.log('[Phone Auth Debug] verifier destroyed');
      } catch (err) {
        console.error('[Phone Auth Error] Error clearing RecaptchaVerifier:', err);
      }
      window.recaptchaVerifier = null;
    }

    // Clean up container DOM contents
    const containerEl = document.getElementById('recaptcha-container');
    if (containerEl) {
      containerEl.innerHTML = '';
    }
  }
};
