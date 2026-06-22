import fs from 'fs';
import path from 'path';

const SRC_DIR = 'src';

// Regex patterns to find hardcoded colors
const HEX_WHITE = /#(?:ffffff|fff)\b/gi;
const HEX_BLACK = /#(?:000000|000)\b/gi;
const COLOR_WHITE_LITERAL = /:\s*['"`]white['"`]/gi;
const COLOR_BLACK_LITERAL = /:\s*['"`]black['"`]/gi;
const CLASS_BG_WHITE = /\bbg-white\b/gi;
const CLASS_TEXT_WHITE = /\btext-white\b/gi;
const CLASS_BG_BLACK = /\bbg-black\b/gi;
const CLASS_TEXT_BLACK = /\btext-black\b/gi;

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

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  // Don't audit index.css design tokens definition, but audit rest of it
  const isIndexCss = filePath.endsWith('index.css');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    
    // Ignore lines defining the main tokens in index.css
    if (isIndexCss && lineNum <= 54) return; // skip light theme tokens
    if (isIndexCss && lineNum >= 612 && lineNum <= 654) return; // skip dark theme tokens

    let matches = [];
    if (line.match(HEX_WHITE)) matches.push(`HEX_WHITE`);
    if (line.match(HEX_BLACK)) matches.push(`HEX_BLACK`);
    if (line.match(COLOR_WHITE_LITERAL)) matches.push(`COLOR_WHITE_LITERAL`);
    if (line.match(COLOR_BLACK_LITERAL)) matches.push(`COLOR_BLACK_LITERAL`);
    if (line.match(CLASS_BG_WHITE)) matches.push(`CLASS_BG_WHITE`);
    if (line.match(CLASS_TEXT_WHITE)) matches.push(`CLASS_TEXT_WHITE`);
    if (line.match(CLASS_BG_BLACK)) matches.push(`CLASS_BG_BLACK`);
    if (line.match(CLASS_TEXT_BLACK)) matches.push(`CLASS_TEXT_BLACK`);

    if (matches.length > 0) {
      violations.push({ lineNum, line: line.trim(), matches });
    }
  });

  return violations;
}

console.log('=== THEME SYSTEM AUDIT ===');
let totalViolations = 0;
const allViolations = {};

walkDir(SRC_DIR, (filePath) => {
  const violations = auditFile(filePath);
  if (violations.length > 0) {
    allViolations[filePath] = violations;
    totalViolations += violations.length;
    console.log(`\nFile: ${filePath} (${violations.length} violations)`);
    violations.forEach(v => {
      console.log(`  Line ${v.lineNum}: [${v.matches.join(', ')}] -> ${v.line}`);
    });
  }
});

console.log(`\nTotal violations found: ${totalViolations}`);
