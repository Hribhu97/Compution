import { signInWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export const authService = {
  async loginWithEmail(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  async loginWithGoogle() {
    return await signInWithPopup(auth, googleProvider);
  },

  async logout() {
    await signOut(auth);
  }
};
