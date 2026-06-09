const admin = require('firebase-admin');
const serviceAccount = require('../studio-7096192330-872dc-firebase-adminsdk-fbsvc-9e4ff00cda.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspect() {
  console.log("=== Listing Users ===");
  const usersSnap = await db.collection('users').get();
  usersSnap.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Name: ${data.name || data.displayName} | Email: ${data.email} | Role: ${data.role}`);
  });

  console.log("\n=== Checking Attendance Collection ===");
  const attSnap = await db.collection('attendance').limit(5).get();
  console.log(`Total attendance docs found (limited to 5): ${attSnap.size}`);
  attSnap.forEach(doc => {
    console.log(`ID: ${doc.id} =>`, doc.data());
  });
}

inspect().catch(err => {
  console.error("Inspection failed:", err);
});
