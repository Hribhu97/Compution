import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

export const clientMigrationService = {
  /**
   * Performs a dry-run audit of the Firestore users collection.
   * Scans and checks for linked accounts, duplicate emails, duplicate phone numbers, and orphans.
   */
  async runDryRunAudit() {
    console.log('[Migration Service] Starting dry-run audit...');
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    
    const firestoreUsers = [];
    snap.forEach(docSnap => {
      firestoreUsers.push({ id: docSnap.id, ...docSnap.data() });
    });

    const linkedAccounts = [];
    const duplicateEmailsMap = new Map();
    const duplicatePhonesMap = new Map();
    const orphanAccounts = [];
    
    for (const docUser of firestoreUsers) {
      const uid = docUser.id;
      const email = docUser.email?.toLowerCase()?.trim();
      const phone = (docUser.phone || docUser.phoneNumber || '').trim();
      
      if (email) {
        if (!duplicateEmailsMap.has(email)) duplicateEmailsMap.set(email, []);
        duplicateEmailsMap.get(email).push(uid);
      }
      if (phone) {
        if (!duplicatePhonesMap.has(phone)) duplicatePhonesMap.set(phone, []);
        duplicatePhonesMap.get(phone).push(uid);
      }
      
      // If profile is missing critical details
      if (!email && !phone) {
        orphanAccounts.push({
          uid,
          name: docUser.name || docUser.displayName || 'N/A',
          reason: 'Missing both email and phone number'
        });
      }
      
      // We consider it a linked profile if it has both email and phone/phoneNumber populated in Firestore
      if (email && phone) {
        linkedAccounts.push({
          uid,
          email,
          phone
        });
      }
    }

    const duplicateEmails = Array.from(duplicateEmailsMap.entries())
      .filter(([_, uids]) => uids.length > 1)
      .map(([email, uids]) => ({ email, uids }));
      
    const duplicatePhones = Array.from(duplicatePhonesMap.entries())
      .filter(([_, uids]) => uids.length > 1)
      .map(([phone, uids]) => ({ phone, uids }));

    return {
      totalFirestoreProfiles: firestoreUsers.length,
      linkedAccounts,
      duplicateEmails,
      duplicatePhones,
      orphanAccounts,
      rawUsers: firestoreUsers
    };
  },

  /**
   * Generates a backup of the current users collection in Firestore.
   * Saves it as a document inside the /settings collection, and returns the JSON string.
   */
  async createBackup(rawUsers) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `migrationBackup_${timestamp}`;
    
    console.log(`[Migration Service] Creating backup: ${backupId}`);
    
    // Save to Firestore settings collection for server-side recovery
    const backupRef = doc(db, 'settings', backupId);
    await setDoc(backupRef, {
      createdAt: new Date().toISOString(),
      userCount: rawUsers.length,
      users: rawUsers
    });
    
    console.log(`[Migration Service] Backup document successfully created in Firestore settings.`);
    
    // Return backup JSON string for client-side download
    return {
      backupId,
      jsonString: JSON.stringify(rawUsers, null, 2)
    };
  },

  /**
   * Performs the actual migration by updating all user records with the extended schema.
   * Backs up data first, then applies updates in batches.
   */
  async runMigration(rawUsers) {
    console.log('[Migration Service] Starting live migration...');
    
    // 1. Double check / trigger backup first
    const backupResult = await this.createBackup(rawUsers);
    
    const batchLimit = 500;
    let batch = writeBatch(db);
    let operationCount = 0;
    
    const successfulUpdates = [];
    const failedUpdates = [];
    
    for (const docUser of rawUsers) {
      const uid = docUser.id;
      
      const email = docUser.email?.toLowerCase()?.trim() || '';
      const phoneNumber = (docUser.phone || docUser.phoneNumber || '').trim();
      const emailVerified = docUser.emailVerified || (email ? true : false);
      const phoneVerified = docUser.phoneVerified || (phoneNumber ? true : false);
      
      // Determine authProviders array based on profile credentials
      const authProviders = docUser.authProviders || [];
      if (email && !authProviders.includes('password')) {
        authProviders.push('password');
      }
      if (phoneNumber && !authProviders.includes('phone')) {
        authProviders.push('phone');
      }
      
      const updatedSchema = {
        uid,
        email,
        phoneNumber,
        emailVerified,
        phoneVerified,
        authProviders,
        updatedAt: serverTimestamp()
      };
      
      const docRef = doc(db, 'users', uid);
      
      try {
        batch.set(docRef, updatedSchema, { merge: true });
        operationCount++;
        successfulUpdates.push(uid);
        
        if (operationCount >= batchLimit) {
          console.log(`[Migration Service] Committing batch of ${operationCount} updates...`);
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      } catch (err) {
        console.error(`[Migration Service] Failed to update user ${uid}:`, err);
        failedUpdates.push({ uid, error: err.message });
      }
    }
    
    if (operationCount > 0) {
      console.log(`[Migration Service] Committing final batch of ${operationCount} updates...`);
      await batch.commit();
    }
    
    console.log(`[Migration Service] Migration completed. Successful: ${successfulUpdates.length}, Failed: ${failedUpdates.length}`);
    
    // Save report to Firestore settings
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportId = `migrationReport_${timestamp}`;
    const reportRef = doc(db, 'settings', reportId);
    
    const auditData = await this.runDryRunAudit();
    
    const reportMarkdown = `# Compution Platform - Migration Report (EXECUTED CLIENT-SIDE)
- **Date**: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)
- **Backup Document**: \`/settings/${backupResult.backupId}\`
- **Total Firestore Profiles**: ${rawUsers.length}
- **Successfully Merged**: ${successfulUpdates.length}
- **Failed Merges**: ${failedUpdates.length}

---

## 1. Linked Accounts Detected (${auditData.linkedAccounts.length})
Profiles with both Email and Phone:
${auditData.linkedAccounts.length === 0 ? '*None*' : '| UID | Email | Phone |\n| --- | --- | --- |\n' + 
  auditData.linkedAccounts.map(a => `| \`${a.uid}\` | ${a.email} | ${a.phone} |`).join('\n')}

---

## 2. Duplicate Users Detected (${auditData.duplicateEmails.length + auditData.duplicatePhones.length})
Credentials shared across multiple profiles:

### Duplicate Emails (${auditData.duplicateEmails.length}):
${auditData.duplicateEmails.length === 0 ? '*None*' : auditData.duplicateEmails.map(d => `- **Email**: \`${d.email}\`\n` + 
  d.uids.map(uid => `  - UID: \`${uid}\``).join('\n')).join('\n')}

### Duplicate Phones (${auditData.duplicatePhones.length}):
${auditData.duplicatePhones.length === 0 ? '*None*' : auditData.duplicatePhones.map(d => `- **Phone**: \`${d.phone}\`\n` + 
  d.uids.map(uid => `  - UID: \`${uid}\``).join('\n')).join('\n')}

---

## 3. Orphan Profiles (${auditData.orphanAccounts.length})
Profiles missing both phone and email credentials:
${auditData.orphanAccounts.length === 0 ? '*None*' : '| UID | Name | Reason |\n| --- | --- | --- |\n' + 
  auditData.orphanAccounts.map(o => `| \`${o.uid}\` | ${o.name} | ${o.reason} |`).join('\n')}
`;

    await setDoc(reportRef, {
      createdAt: new Date().toISOString(),
      reportId,
      backupId: backupResult.backupId,
      successfulCount: successfulUpdates.length,
      failedCount: failedUpdates.length,
      failedUpdates,
      reportMarkdown
    });
    
    return {
      reportId,
      backupId: backupResult.backupId,
      successfulUpdates,
      failedUpdates,
      reportMarkdown
    };
  },

  /**
   * Rollback system: Restores users from a list of backup user documents.
   */
  async runRollback(backupUsers) {
    if (!backupUsers || !Array.isArray(backupUsers)) {
      throw new Error('Invalid backup data provided for rollback.');
    }
    
    console.log(`[Migration Service] Starting rollback of ${backupUsers.length} users...`);
    
    const batchLimit = 500;
    let batch = writeBatch(db);
    let operationCount = 0;
    
    for (const user of backupUsers) {
      const { id, ...userData } = user;
      const docRef = doc(db, 'users', id);
      
      // Perform set operation to restore exact state
      batch.set(docRef, userData);
      operationCount++;
      
      if (operationCount >= batchLimit) {
        console.log(`[Migration Service] Rollback: Committing batch of ${operationCount} restores...`);
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }
    
    if (operationCount > 0) {
      console.log(`[Migration Service] Rollback: Committing final batch of ${operationCount} restores...`);
      await batch.commit();
    }
    
    console.log(`[Migration Service] Rollback completed successfully.`);
  }
};
