const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// 1. Load service account
const serviceAccountPath = path.join(__dirname, 'studio-7096192330-872dc-firebase-adminsdk-fbsvc-9e4ff00cda.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`🚨 Error: Firebase service account key not found at ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// 2. Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 3. Scan Test folder
const testDir = path.join(__dirname, 'Test');
if (!fs.existsSync(testDir)) {
  console.log(`Creating missing Test directory at ${testDir}...`);
  fs.mkdirSync(testDir);
}

async function syncTests() {
  console.log("🚀 Scanning Test/ directory for JSON files...");
  
  const files = fs.readdirSync(testDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log("⚠️ No JSON files found in Test/ folder. Dropping a sample test template...");
    
    const sampleTest = {
      title: "Google Workspace & CS Basics",
      subject: "Google Workspace",
      classGroup: "Class 10",
      totalMarks: 100,
      duration: 30,
      difficulty: "Easy",
      status: "Published",
      questions: [
        {
          questionText: "Which of the following is Google's cloud-based spreadsheet application?",
          options: ["Google Docs", "Google Sheets", "Google Slides", "Google Drive"],
          correctAnswerIndex: 1
        },
        {
          questionText: "What was Google's original search engine index algorithm named?",
          options: ["PageRank", "WebCrawlers", "AdSense", "SearchRank"],
          correctAnswerIndex: 0
        },
        {
          questionText: "Who are the original founders of Google?",
          options: ["Steve Jobs & Steve Wozniak", "Bill Gates & Paul Allen", "Larry Page & Sergey Brin", "Mark Zuckerberg & Eduardo Saverin"],
          correctAnswerIndex: 2
        }
      ]
    };

    fs.writeFileSync(path.join(testDir, 'google_basics.json'), JSON.stringify(sampleTest, null, 2));
    files.push('google_basics.json');
  }

  for (const file of files) {
    const filePath = path.join(testDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Validation checks
      if (!content.title || !content.subject || !content.questions) {
        console.warn(`⚠️ Skipped ${file}: Missing title, subject, or questions array.`);
        continue;
      }

      const testId = file.replace('.json', '').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const testDocRef = db.collection('tests').doc(testId);
      
      const payload = {
        title: content.title,
        subject: content.subject,
        classGroup: content.classGroup || "Class 10",
        totalMarks: Number(content.totalMarks) || 100,
        duration: Number(content.duration) || 30,
        difficulty: content.difficulty || "Medium",
        questionsCount: content.questions.length,
        createdBy: "admin_sync",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: content.status || "Published",
        questions: content.questions.map((q, idx) => ({
          id: idx + 1,
          questionText: q.questionText,
          options: q.options || [],
          correctAnswerIndex: Number(q.correctAnswerIndex) || 0
        }))
      };

      await testDocRef.set(payload, { merge: true });
      console.log(`✅ Synced test '${content.title}' (ID: ${testId}) from ${file}`);
    } catch (err) {
      console.error(`🚨 Error parsing or syncing ${file}:`, err.message);
    }
  }

  console.log("🎉 Sync run complete.");
  process.exit(0);
}

syncTests();
