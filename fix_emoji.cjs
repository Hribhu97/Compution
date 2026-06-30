const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/dashboard/WorldCupPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// All broken emoji sequences -> clean replacements
const fixes = [
  // Lobby header - shield emoji broken
  [/\u00f0\u0178\u203a\u00ef\u00b8\uFFFD?\s*Squad Dressing Room/g, 'Squad Dressing Room'],
  // Lobby header - target emoji broken  
  [/\u00f0\u0178\u017d\u00af\s*Top 5 Campus Objective/g, '★ Top 5 Campus Objective'],
  // Captain crown broken
  [/\u00f0\u0178\u2018\u2019/g, '★'],
  // Ghost person emoji broken (in empty seats)
  [/\u00f0\u0178\u2018\u00a4/g, ''],
  // Chat bubbles emoji broken  
  [/\u00f0\u0178\u2019\u00ac\s*Dressing Chat/g, 'Dressing Chat'],
  // Bar chart emoji broken
  [/\u00f0\u0178\u201c\u0160\s*Campus Standings/g, 'Campus Standings'],
  // Waving hand emoji broken
  [/\u00f0\u0178\u2019\u00b7\s*Chat room is empty/g, 'Chat room is empty'],
  // Soccer ball emoji broken (Play button)
  [/\u00c3\u00a2\u00c5\u00bd\u00bd\s*Play Today/g, '⚽ Play Today'],
  // Any remaining multi-byte garbled sequences starting with ðŸ pattern
  [/\u00f0\u0178[^\s<{'"]*\s*/g, ''],
  // Clean up double spaces left behind
  [/  +/g, ' '],
];

let count = 0;
fixes.forEach(([pattern, replacement]) => {
  const before = content;
  content = content.replace(pattern, replacement);
  if (content !== before) count++;
});

// Also fix the specific known broken strings by their raw byte patterns
// Read as buffer for byte-level replacement
let buf = Buffer.from(content, 'utf8');
const raw = buf.toString('binary');

// Pattern: broken emoji bytes - replace specific known sequences
const brokenShield = '\xf0\x9f\x9b\xa1\xef\xb8\x8f'; // 🛡️
const brokenTarget = '\xf0\x9f\x8e\xaf'; // 🎯
const brokenCrown = '\xf0\x9f\x91\x91'; // 👑
const brokenGhost = '\xf0\x9f\x91\xa4'; // 👤
const brokenChat = '\xf0\x9f\x92\xac'; // 💬
const brokenBar = '\xf0\x9f\x93\x8a'; // 📊
const brokenWave = '\xf0\x9f\x91\x8b'; // 👋

// Actually just write back with our string replacements + build
fs.writeFileSync(filePath, content, 'utf8');
console.log(`Fixed ${count} patterns. File written.`);

// Now do a second pass for any remaining visible broken chars
let content2 = fs.readFileSync(filePath, 'utf8');
// Replace any remaining sequences that look like ðŸ (broken utf8 displayed as latin1)
content2 = content2.replace(/\u00f0\u0178[^\s<{"'\r\n]*/g, '');
content2 = content2.replace(/\u00c3\u00a2\u00c5\u00bd\u00bd/g, '⚽');
fs.writeFileSync(filePath, content2, 'utf8');
console.log('Second pass done.');
