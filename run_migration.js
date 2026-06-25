import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Service Account Credentials
const serviceAccountPath = path.join(__dirname, 'studio-7096192330-872dc-firebase-adminsdk-fbsvc-9e4ff00cda.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`[Error] Service account key not found at ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

/**
 * Fetch all Auth users from Firebase Authentication.
 */
async function fetchAllAuthUsers() {
  const users = [];
  let nextPageToken;
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    users.push(...listUsersResult.users);
    nextPageToken = listUsersResult.nextPageToken;
  } while (nextPageToken);
  return users;
}

/**
 * Fetch all user documents from Firestore.
 */
async function fetchAllFirestoreUsers() {
  const snap = await db.collection('users').get();
  const users = [];
  snap.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });
  return users;
}

/**
 * Create a backup of the current Firestore users collection.
 */
async function backupUsersCollection() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const backupFile = path.join(backupDir, `users_backup_${timestamp}.json`);
  console.log(`[Backup] Fetching current Firestore users...`);
  const users = await fetchAllFirestoreUsers();
  
  fs.writeFileSync(backupFile, JSON.stringify(users, null, 2), 'utf8');
  console.log(`[Backup SUCCESS] Saved ${users.length} profiles to ${backupFile}`);
  return backupFile;
}

/**
 * Perform a rollback by restoring user documents from a backup JSON file.
 */
async function rollbackUsersCollection(backupFilePath) {
  if (!backupFilePath) {
    console.error('[Error] Please specify a backup file path for rollback.');
    process.exit(1);
  }
  
  const resolvedPath = path.resolve(backupFilePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`[Error] Backup file not found at: ${resolvedPath}`);
    process.exit(1);
  }
  
  console.log(`[Rollback] Reading backup file: ${resolvedPath}`);
  const users = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  console.log(`[Rollback] Found ${users.length} profiles to restore. Proceeding...`);
  
  const batchLimit = 500;
  let batch = db.batch();
  let operationCount = 0;
  
  for (const user of users) {
    const { id, ...userData } = user;
    const docRef = db.collection('users').doc(id);
    
    // We overwrite entirely to restore the state exactly as it was
    batch.set(docRef, userData);
    operationCount++;
    
    if (operationCount >= batchLimit) {
      console.log(`[Rollback] Committing batch of ${operationCount} restores...`);
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }
  
  if (operationCount > 0) {
    console.log(`[Rollback] Committing final batch of ${operationCount} restores...`);
    await batch.commit();
  }
  
  console.log(`[Rollback SUCCESS] Restored ${users.length} profiles in Firestore.`);
}

/**
 * Audit and Migration implementation.
 * @param {boolean} isDryRun - If true, scans and checks without writing to database.
 */
async function runAuditAndMigration(isDryRun = false) {
  console.log(`[Start] Running in ${isDryRun ? 'DRY-RUN' : 'MIGRATION'} mode...`);
  
  let backupFile = null;
  if (!isDryRun) {
    backupFile = await backupUsersCollection();
  }
  
  console.log(`[Data Fetch] Retrieving Auth users...`);
  const authUsers = await fetchAllAuthUsers();
  const authUserMap = new Map(authUsers.map(u => [u.uid, u]));
  
  console.log(`[Data Fetch] Retrieving Firestore user documents...`);
  const firestoreUsers = await fetchAllFirestoreUsers();
  
  // Analytics and Audit buckets
  const linkedAccounts = [];
  const duplicateEmailsMap = new Map(); // email -> array of {uid, source}
  const duplicatePhonesMap = new Map(); // phone -> array of {uid, source}
  const orphanFirestore = [];
  const orphanAuth = [];
  const successfulUpdates = [];
  const failedUpdates = [];
  
  // 1. Audit Firestore documents
  console.log(`[Audit] Auditing Firestore user documents...`);
  for (const docUser of firestoreUsers) {
    const uid = docUser.id;
    const authUser = authUserMap.get(uid);
    
    // Check duplicates in Firestore
    const email = docUser.email?.toLowerCase()?.trim();
    const phone = (docUser.phone || docUser.phoneNumber || '').trim();
    
    if (email) {
      if (!duplicateEmailsMap.has(email)) duplicateEmailsMap.set(email, []);
      duplicateEmailsMap.get(email).push({ uid, source: 'Firestore' });
    }
    if (phone) {
      if (!duplicatePhonesMap.has(phone)) duplicatePhonesMap.set(phone, []);
      duplicatePhonesMap.get(phone).push({ uid, source: 'Firestore' });
    }
    
    if (!authUser) {
      orphanFirestore.push({
        uid,
        email: docUser.email || 'N/A',
        phone: docUser.phone || docUser.phoneNumber || 'N/A',
        role: docUser.role || 'N/A'
      });
      continue;
    }
  }
  
  // 2. Audit Auth Users
  console.log(`[Audit] Auditing Firebase Auth users...`);
  const firestoreUserMap = new Map(firestoreUsers.map(u => [u.id, u]));
  for (const authUser of authUsers) {
    const uid = authUser.uid;
    const docUser = firestoreUserMap.get(uid);
    
    // Check duplicates in Auth
    const email = authUser.email?.toLowerCase()?.trim();
    const phone = authUser.phoneNumber?.trim();
    
    if (email) {
      const existing = duplicateEmailsMap.get(email) || [];
      if (!existing.some(item => item.uid === uid)) {
        existing.push({ uid, source: 'Auth' });
        duplicateEmailsMap.set(email, existing);
      }
    }
    if (phone) {
      const existing = duplicatePhonesMap.get(phone) || [];
      if (!existing.some(item => item.uid === uid)) {
        existing.push({ uid, source: 'Auth' });
        duplicatePhonesMap.set(phone, existing);
      }
    }
    
    if (!docUser) {
      orphanAuth.push({
        uid,
        email: authUser.email || 'N/A',
        phone: authUser.phoneNumber || 'N/A',
        providers: authUser.providerData.map(p => p.providerId)
      });
    } else {
      // If linked account (both email and phone provider linked in Auth)
      const providers = authUser.providerData.map(p => p.providerId);
      if (providers.includes('password') && providers.includes('phone')) {
        linkedAccounts.push({
          uid,
          email: authUser.email,
          phone: authUser.phoneNumber
        });
      }
    }
  }
  
  // Filter duplicates lists to only keep actual duplicates (more than 1 UID)
  const duplicateEmails = Array.from(duplicateEmailsMap.entries())
    .filter(([_, uids]) => uids.length > 1)
    .map(([email, uids]) => ({ email, uids }));
    
  const duplicatePhones = Array.from(duplicatePhonesMap.entries())
    .filter(([_, uids]) => uids.length > 1)
    .map(([phone, uids]) => ({ phone, uids }));
  
  // 3. Perform Migration Writes (if not Dry Run)
  if (!isDryRun) {
    console.log(`[Migration] Applying updates in batches to Firestore...`);
    const batchLimit = 500;
    let batch = db.batch();
    let operationCount = 0;
    
    for (const docUser of firestoreUsers) {
      const uid = docUser.id;
      const authUser = authUserMap.get(uid);
      
      const email = authUser?.email?.toLowerCase() || docUser.email?.toLowerCase() || '';
      const phoneNumber = authUser?.phoneNumber || docUser.phoneNumber || docUser.phone || '';
      const emailVerified = authUser?.emailVerified || docUser.emailVerified || false;
      const phoneVerified = authUser?.phoneNumber ? true : (docUser.phoneVerified || false);
      const authProviders = authUser?.providerData.map(p => p.providerId) || (email ? ['password'] : []);
      
      const updatedSchema = {
        uid,
        email,
        phoneNumber,
        emailVerified,
        phoneVerified,
        authProviders,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = db.collection('users').doc(uid);
      
      try {
        batch.set(docRef, updatedSchema, { merge: true });
        operationCount++;
        successfulUpdates.push(uid);
        
        if (operationCount >= batchLimit) {
          console.log(`[Migration] Committing batch of ${operationCount} updates...`);
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
      } catch (err) {
        console.error(`[Migration Error] Failed to update user ${uid}:`, err);
        failedUpdates.push({ uid, error: err.message });
      }
    }
    
    if (operationCount > 0) {
      console.log(`[Migration] Committing final batch of ${operationCount} updates...`);
      await batch.commit();
    }
    
    console.log(`[Migration Done] Successfully processed ${successfulUpdates.length} profiles.`);
  } else {
    console.log(`[Dry-Run] Skipped database write operations.`);
  }
  
  // 4. Generate Report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(__dirname, `migration_report_${timestamp}.md`);
  
  let reportMarkdown = `# Compution Platform - Migration Report (${isDryRun ? 'DRY RUN' : 'EXECUTED'})
- **Date**: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)
- **Execution Mode**: ${isDryRun ? 'Dry-Run Audit Only' : 'Database Migration Applied'}
- **Backup File Location**: ${backupFile || 'N/A'}
- **Total Auth Users**: ${authUsers.length}
- **Total Firestore Profiles**: ${firestoreUsers.length}

---

## 1. Linked Accounts Detected (${linkedAccounts.length})
Accounts with both Email and Phone providers natively merged:
${linkedAccounts.length === 0 ? '*None*' : '| UID | Email | Phone |\n| --- | --- | --- |\n' + 
  linkedAccounts.map(a => `| \`${a.uid}\` | ${a.email} | ${a.phone} |`).join('\n')}

---

## 2. Duplicate Users Detected (${duplicateEmails.length + duplicatePhones.length})
Identify accounts sharing the same credentials:

### Duplicate Emails (${duplicateEmails.length}):
${duplicateEmails.length === 0 ? '*None*' : duplicateEmails.map(d => `- **Email**: \`${d.email}\`\n` + 
  d.uids.map(item => `  - UID: \`${item.uid}\` (Source: ${item.source})`).join('\n')).join('\n')}

### Duplicate Phones (${duplicatePhones.length}):
${duplicatePhones.length === 0 ? '*None*' : duplicatePhones.map(d => `- **Phone**: \`${d.phone}\`\n` + 
  d.uids.map(item => `  - UID: \`${item.uid}\` (Source: ${item.source})`).join('\n')).join('\n')}

---

## 3. Orphan Accounts (${orphanFirestore.length + orphanAuth.length})

### Firestore Profiles without Auth Account (${orphanFirestore.length}):
These profiles exist in Firestore but have no corresponding Firebase Authentication record:
${orphanFirestore.length === 0 ? '*None*' : '| UID | Email | Phone | Role |\n| --- | --- | --- | --- |\n' + 
  orphanFirestore.map(o => `| \`${o.uid}\` | ${o.email} | ${o.phone} | ${o.role} |`).join('\n')}

### Auth Accounts without Firestore Profile (${orphanAuth.length}):
These credentials exist in Firebase Auth but have no user document:
${orphanAuth.length === 0 ? '*None*' : '| UID | Email | Phone | Providers |\n| --- | --- | --- | --- |\n' + 
  orphanAuth.map(o => `| \`${o.uid}\` | ${o.email} | ${o.phone} | ${o.providers.join(', ')} |`).join('\n')}

---

## 4. Updates Status (${isDryRun ? 'DRY RUN ONLY' : 'MIGRATION RESULTS'})
- **Successful Document Updates**: ${isDryRun ? 'N/A' : successfulUpdates.length}
- **Failed Updates**: ${isDryRun ? 'N/A' : failedUpdates.length}

${failedUpdates.length === 0 ? '' : '### Failed Updates List:\n' + 
  failedUpdates.map(f => `- **UID**: \`${f.uid}\` - Error: ${f.error}`).join('\n')}
`;

  fs.writeFileSync(reportFile, reportMarkdown, 'utf8');
  console.log(`[Report Generated] Saved report markdown to ${reportFile}`);
  console.log(`\n=============================================`);
  console.log(`Migration Summary:`);
  console.log(`- Linked Accounts: ${linkedAccounts.length}`);
  console.log(`- Duplicate Emails: ${duplicateEmails.length}`);
  console.log(`- Duplicate Phones: ${duplicatePhones.length}`);
  console.log(`- Orphan Firestore Profiles: ${orphanFirestore.length}`);
  console.log(`- Orphan Auth Accounts: ${orphanAuth.length}`);
  if (!isDryRun) {
    console.log(`- Successful merged profiles: ${successfulUpdates.length}`);
    console.log(`- Failed Merges: ${failedUpdates.length}`);
  }
  console.log(`=============================================\n`);
}

// Command dispatcher
const args = process.argv.slice(2);
const command = args[0] || 'dry-run';

if (command === 'dry-run') {
  await runAuditAndMigration(true);
} else if (command === 'migrate') {
  await runAuditAndMigration(false);
} else if (command === 'backup') {
  await backupUsersCollection();
} else if (command === 'rollback') {
  const filePath = args[1];
  await rollbackUsersCollection(filePath);
} else {
  console.error(`Unknown command: ${command}`);
  console.log('Available commands: dry-run, backup, migrate, rollback <file-path>');
  process.exit(1);
}
