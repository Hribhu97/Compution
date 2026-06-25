/**
 * @typedef {Object} Transaction
 * @property {number} amount - The amount paid in this transaction.
 * @property {string} date - The ISO date string of the transaction.
 * @property {string} transactionId - Unique UTR or reference number.
 * @property {string} mode - The payment mode (e.g. 'UPI', 'Cash').
 * @property {string} remarks - Admin approval remarks or verification notes.
 * @property {string} feeName - Name of the fee component paid.
 */

/**
 * @typedef {Object} FeeDocument
 * @property {string} studentId - Firestore user document UID.
 * @property {number} monthlyFee - Current monthly tuition rate.
 * @property {number} totalFeeDue - Calculated total expected amount (Base + Mandatory + Late + Admin).
 * @property {number} totalPaid - Sum of all approved successful transactions.
 * @property {number} remainingBalance - Outstanding amount (totalFeeDue - totalPaid).
 * @property {('Paid'|'Pending')} status - Strict payment status.
 * @property {Transaction[]} paymentHistory - Approved transactions list.
 * @property {string} dueDate - Overdue threshold day of every month (e.g., '10').
 * @property {string|null} lastPaymentDate - Timestamp of the most recent approved payment.
 * @property {string} createdAt - Document creation timestamp.
 * @property {string} updatedAt - Document update timestamp.
 */
