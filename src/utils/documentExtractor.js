/**
 * Utility to validate, extract, and parse text/metadata from uploaded assignment documents
 * Supports .docx, .pdf, .xlsx, .doc, .txt, .md
 */

const FORBIDDEN_EXTENSIONS = ['.exe', '.apk', '.zip', '.rar', '.js', '.html', '.sh', '.bat', '.cmd', '.vbs', '.pyc'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const SUBJECT_KEYWORDS = [
  'Python Mastery', 'Python Programming', 'Python',
  'Data Structures & Algorithms', 'Data Structures', 'DSA',
  'Web Development', 'HTML/CSS/JS', 'Frontend', 'React',
  'Java Development', 'Java', 'OOP',
  'C & C++ Fundamentals', 'C++', 'C Language',
  'Tally Prime', 'Tally', 'Accounting',
  'Database Management', 'SQL', 'DBMS',
  'Cloud Computing', 'AI', 'Machine Learning'
];

const LEVEL_KEYWORDS = [
  'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7',
  'Class 8', 'Class 9', 'Class 10', 'Class 11 CS', 'Class 11 App',
  'Class 12 CS', 'Class 12 App', 'BCA', 'B.Tech'
];

/**
 * Validates file size and forbidden file types.
 */
export const validateAssignmentFile = (file) => {
  if (!file) {
    throw new Error('No file selected.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Maximum upload size is 25 MB. Please compress your document.');
  }

  const fileNameLower = file.name.toLowerCase();
  const isForbidden = FORBIDDEN_EXTENSIONS.some(ext => fileNameLower.endsWith(ext));
  if (isForbidden) {
    throw new Error('Unsupported file type. Executable, script, and archive files are forbidden.');
  }

  const isSupported = ['.docx', '.doc', '.pdf', '.xlsx', '.xls', '.txt', '.md'].some(ext => fileNameLower.endsWith(ext));
  if (!isSupported) {
    throw new Error('Unsupported file type. Please upload a .docx, .pdf, or .xlsx document.');
  }

  return true;
};

/**
 * Reads text content from uploaded File object using browser FileReader & TextDecoder.
 */
export const extractTextFromFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        let text = '';

        if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          text = new TextDecoder('utf-8').decode(buffer);
        } else {
          // For binary formats (.docx, .xlsx, .pdf), extract readable UTF-8 string chunks
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const rawStr = decoder.decode(buffer);
          
          // Clean up control characters and non-printable XML/binary noise
          text = rawStr
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        resolve(text);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read document file.'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Analyzes extracted text to parse title, subject, level, due date, objectives, difficulty, and marks.
 */
export const parseAssignmentMetadata = async (file) => {
  validateAssignmentFile(file);

  const rawText = await extractTextFromFile(file);
  const fileNameNoExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  // 1. Extract Title
  let title = fileNameNoExt;
  const titleMatch = rawText.match(/(?:title|assignment|project|lab)\s*[:\-]?\s*([^\n\r.]+)/i);
  if (titleMatch && titleMatch[1].trim().length > 3) {
    title = titleMatch[1].trim();
  } else if (rawText.length > 10) {
    const firstLine = rawText.split('\n')[0].trim();
    if (firstLine.length > 5 && firstLine.length < 80) {
      title = firstLine;
    }
  }

  // 2. Extract Subject
  let subject = 'Computer Science & Programming';
  for (const sKw of SUBJECT_KEYWORDS) {
    if (new RegExp(`\\b${sKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(rawText) || new RegExp(`\\b${sKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(fileNameNoExt)) {
      subject = sKw;
      break;
    }
  }

  // 3. Extract Academic Level
  let level = 'Class 10';
  for (const lKw of LEVEL_KEYWORDS) {
    if (new RegExp(`\\b${lKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(rawText) || new RegExp(`\\b${lKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(fileNameNoExt)) {
      level = lKw;
      break;
    }
  }

  // 4. Extract Difficulty
  let difficulty = 'Intermediate';
  if (/beginner|basic|introductory/i.test(rawText)) {
    difficulty = 'Beginner';
  } else if (/advanced|complex|mastery/i.test(rawText)) {
    difficulty = 'Advanced';
  }

  // 5. Extract Due Date
  let dueDate = '';
  const dateMatch = rawText.match(/(?:due|deadline|submit by|date)\s*[:\-]?\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  if (dateMatch) {
    dueDate = dateMatch[1].trim();
  } else {
    // Default to 7 days from today in YYYY-MM-DD format
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    dueDate = defaultDate.toISOString().split('T')[0];
  }

  // 6. Extract Marks
  let marks = 100;
  const marksMatch = rawText.match(/(?:total marks|marks|points|max score)\s*[:\-]?\s*(\d+)/i);
  if (marksMatch) {
    marks = parseInt(marksMatch[1], 10) || 100;
  }

  // 7. Extract Objectives / Checklist
  const objectives = [];
  const bulletLines = rawText.split(/[\r\n]+/).filter(line => /^\s*[\-\*\•\d\.]+\s+/.test(line.trim()));
  
  bulletLines.slice(0, 5).forEach(line => {
    const cleaned = line.replace(/^\s*[\-\*\•\d\.]+\s+/, '').trim();
    if (cleaned.length > 5 && cleaned.length < 120) {
      objectives.push(cleaned);
    }
  });

  if (objectives.length === 0) {
    objectives.push('Complete project research & requirements analysis');
    objectives.push('Design system architecture and UI mockups');
    objectives.push('Implement core modules & verify logic');
    objectives.push('Finalize documentation and team review');
  }

  // 8. Build Instructions Summary
  const instructions = rawText.length > 50 
    ? rawText.slice(0, 1000) 
    : `Please complete the assigned project titled "${title}" collaboratively. Follow all guidelines outlined in the uploaded document.`;

  return {
    title,
    subject,
    level,
    difficulty,
    dueDate,
    marks,
    objectives,
    instructions,
    rawTextSnippet: rawText.slice(0, 500)
  };
};
