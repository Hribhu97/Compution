import { Bird } from "./types";

export interface QuizQuestion {
  id: string;
  question: string;
  options: { label: string; value: string; scores: Record<string, number> }[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "How much daily interaction can you provide?",
    options: [
      { label: "Several hours — I'm home most of the day", value: "high", scores: { parrots: 3, finches: 1, doves: 1, canaries: 1 } },
      { label: "1–2 hours in the morning and evening", value: "medium", scores: { parrots: 2, finches: 2, doves: 2, canaries: 2 } },
      { label: "Limited — mostly observe and listen", value: "low", scores: { parrots: 0, finches: 3, doves: 3, canaries: 3 } },
    ],
  },
  {
    id: "q2",
    question: "What's your experience level with birds?",
    options: [
      { label: "Complete beginner", value: "beginner", scores: { parrots: 0, finches: 3, doves: 3, canaries: 3 } },
      { label: "Some experience with pets", value: "intermediate", scores: { parrots: 2, finches: 2, doves: 2, canaries: 2 } },
      { label: "Experienced bird keeper", value: "advanced", scores: { parrots: 3, finches: 1, doves: 1, canaries: 1 } },
    ],
  },
  {
    id: "q3",
    question: "How much noise can your household tolerate?",
    options: [
      { label: "We enjoy vocal, chatty birds", value: "high", scores: { parrots: 3, finches: 1, doves: 0, canaries: 2 } },
      { label: "Moderate chirping is fine", value: "medium", scores: { parrots: 1, finches: 3, doves: 2, canaries: 3 } },
      { label: "Prefer quiet, gentle sounds", value: "low", scores: { parrots: 0, finches: 1, doves: 3, canaries: 1 } },
    ],
  },
  {
    id: "q4",
    question: "What size bird are you looking for?",
    options: [
      { label: "Small (under 6 inches)", value: "small", scores: { parrots: 1, finches: 3, doves: 1, canaries: 3 } },
      { label: "Medium (6–12 inches)", value: "medium", scores: { parrots: 3, finches: 1, doves: 3, canaries: 0 } },
      { label: "No preference", value: "any", scores: { parrots: 2, finches: 2, doves: 2, canaries: 2 } },
    ],
  },
  {
    id: "q5",
    question: "What's most important to you in a bird?",
    options: [
      { label: "Talking and interaction", value: "talking", scores: { parrots: 3, finches: 0, doves: 0, canaries: 1 } },
      { label: "Beautiful singing", value: "singing", scores: { parrots: 1, finches: 2, doves: 1, canaries: 3 } },
      { label: "Calm companionship", value: "calm", scores: { parrots: 1, finches: 1, doves: 3, canaries: 2 } },
      { label: "Colorful appearance", value: "color", scores: { parrots: 3, finches: 2, doves: 0, canaries: 2 } },
    ],
  },
  {
    id: "q6",
    question: "How much space do you have?",
    options: [
      { label: "Small apartment — compact setup", value: "small", scores: { parrots: 0, finches: 3, doves: 2, canaries: 3 } },
      { label: "Medium home with a dedicated spot", value: "medium", scores: { parrots: 2, finches: 2, doves: 2, canaries: 2 } },
      { label: "Large home or aviary space", value: "large", scores: { parrots: 3, finches: 2, doves: 2, canaries: 1 } },
    ],
  },
];

export function scoreQuiz(
  answers: Record<string, string>,
  birds: Bird[]
): Bird[] {
  const categoryScores: Record<string, number> = {
    parrots: 0,
    finches: 0,
    doves: 0,
    canaries: 0,
  };

  for (const question of QUIZ_QUESTIONS) {
    const answer = answers[question.id];
    if (!answer) continue;
    const option = question.options.find((o) => o.value === answer);
    if (!option) continue;
    for (const [cat, score] of Object.entries(option.scores)) {
      categoryScores[cat] = (categoryScores[cat] || 0) + score;
    }
  }

  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat);

  const topCategory = sortedCategories[0];
  const matched = birds.filter((b) => b.categorySlug === topCategory);

  const careOrder: Record<string, number> = {
    "Beginner-friendly": 0,
    Intermediate: 1,
    Advanced: 2,
  };

  return matched.sort(
    (a, b) => (careOrder[a.careLevel] ?? 1) - (careOrder[b.careLevel] ?? 1)
  );
}
