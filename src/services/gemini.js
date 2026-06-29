/**
 * Google Gemini offline/restricted service helper.
 * Provides answers to institute FAQ chips and falls back gracefully.
 */
export const askGemini = async (queryText) => {
  const queryLower = queryText.toLowerCase();

  // Academic Course Information & Duration constraints
  if (queryLower.includes('duration of the basic course') || queryLower.includes('basic course duration') || queryLower.includes('basic course')) {
    return "The Basic Course duration is 8 months. The school syllabus is taught as per the student's class requirements.";
  }

  if (queryLower.includes('basic coding')) {
    return "The Basic Coding course duration is 6 months, covering fundamentals, logical building, and initial programming concepts.";
  }

  if (queryLower.includes('advance coding') || queryLower.includes('languages in advance')) {
    return "The Advance Coding course duration is 6 Months – 1 Year. Students can choose their preference and learn any 1 language in-depth during this course.";
  }

  if (queryLower.includes('dsa') || queryLower.includes('data structures')) {
    return "The Data Structures & Algorithms (DSA) course duration is 6 months, focusing on advanced coding optimization and interview preparation.";
  }

  return `Regarding your question: "${queryText}". For custom queries, your assigned faculty mentor has been notified. You can post a manual query to start a direct thread.`;
};
