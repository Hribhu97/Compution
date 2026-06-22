import fs from 'fs';
import path from 'path';

const SRC_DIR = 'src';

// Replacements map (regex patterns to replacement values)
const REPLACEMENTS = [
  // color: 'white' / color: "white" -> color: 'var(--text-on-primary)'
  { pattern: /(color\s*:\s*)['"`]white['"`]/gi, replacement: "$1'var(--text-on-primary)'" },
  // color: '#ffffff' -> color: 'var(--text-on-primary)'
  { pattern: /(color\s*:\s*)['"`]#(?:ffffff|fff)['"`]/gi, replacement: "$1'var(--text-on-primary)'" },
  // color: 'black' -> color: 'var(--text-primary)'
  { pattern: /(color\s*:\s*)['"`]black['"`]/gi, replacement: "$1'var(--text-primary)'" },
  // color: '#000000' -> color: 'var(--text-primary)'
  { pattern: /(color\s*:\s*)['"`]#(?:000000|000)['"`]/gi, replacement: "$1'var(--text-primary)'" },

  // background: 'white' -> background: 'var(--surface)'
  { pattern: /(background\s*:\s*)['"`]white['"`]/gi, replacement: "$1'var(--surface)'" },
  // background: '#ffffff' -> background: 'var(--surface)'
  { pattern: /(background\s*:\s*)['"`]#(?:ffffff|fff)['"`]/gi, replacement: "$1'var(--surface)'" },
  // backgroundColor: 'white' -> backgroundColor: 'var(--surface)'
  { pattern: /(backgroundColor\s*:\s*)['"`]white['"`]/gi, replacement: "$1'var(--surface)'" },
  // backgroundColor: '#ffffff' -> backgroundColor: 'var(--surface)'
  { pattern: /(backgroundColor\s*:\s*)['"`]#(?:ffffff|fff)['"`]/gi, replacement: "$1'var(--surface)'" },

  // border: '... solid white' -> border: '... solid var(--border)'
  { pattern: /(border\s*:\s*['"`][^'"`]+\s+solid\s+)white(['"`])/gi, replacement: "$1var(--border)$2" },
  // border: '... solid #ffffff' -> border: '... solid var(--border)'
  { pattern: /(border\s*:\s*['"`][^'"`]+\s+solid\s+)#(?:ffffff|fff)(['"`])/gi, replacement: "$1var(--border)$2" },
];

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (stat.isFile() && /\.(js|jsx|css)$/.test(file)) {
      callback(fullPath);
    }
  }
}

console.log('=== THEME SYSTEM AUTOMATED REPAIR ===');

walkDir(SRC_DIR, (filePath) => {
  // Skip index.css since it defines the variables and legacy mappings
  if (filePath.endsWith('index.css')) return;

  const originalContent = fs.readFileSync(filePath, 'utf8');
  let content = originalContent;
  const lines = content.split('\n');
  let fileModified = false;

  const newLines = lines.map((line, idx) => {
    let newLine = line;
    REPLACEMENTS.forEach(r => {
      if (r.pattern.test(newLine)) {
        const oldLineText = newLine.trim();
        newLine = newLine.replace(r.pattern, r.replacement);
        if (newLine !== line) {
          console.log(`[REPAIR] ${filePath}:${idx + 1}`);
          console.log(`  OLD: ${oldLineText}`);
          console.log(`  NEW: ${newLine.trim()}`);
          fileModified = true;
        }
      }
    });
    return newLine;
  });

  if (fileModified) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  }
});

console.log('\nRepair run completed.');
