import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const notificationService = {
  /**
   * Sends a notification to a specific recipient.
   * @param {string} recipientId - The user UID of the recipient.
   * @param {string} title - The notification title.
   * @param {string} message - The notification message.
   * @param {string} type - The type of notification (e.g. 'class_reminder', 'fee_due').
   */
  send: async (recipientId, title, message, type = 'general') => {
    if (!db) {
      console.error("Firestore not initialized for notificationService");
      return;
    }
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp()
      });
      console.log(`Notification sent to ${recipientId}: "${title}"`);
    } catch (err) {
      console.error("Error writing notification:", err);
    }
  }
};
