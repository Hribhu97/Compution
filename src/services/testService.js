import { testRepository } from '../repositories/testRepository';

export const testService = {
  async submitTest(studentId, studentName, test, answers, timeTaken) {
    if (!test.questions || test.questions.length === 0) {
      throw new Error("Test has no questions");
    }

    // 1. Grade the test
    let correctCount = 0;
    test.questions.forEach((q, idx) => {
      if (answers[idx] !== undefined && Number(answers[idx]) === Number(q.correctAnswerIndex)) {
        correctCount++;
      }
    });

    const totalQuestions = test.questions.length;
    const score = Math.round((correctCount / totalQuestions) * test.totalMarks);
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    // 2. Save the attempt
    const attemptData = {
      studentId,
      studentName,
      testId: test.id,
      testTitle: test.title,
      score,
      percentage,
      timeTaken, // duration in seconds
      rank: null
    };

    const attemptId = await testRepository.saveTestAttempt(attemptData);

    // 3. Recalculate ranks and update leaderboard
    await this.recalculateRanksAndLeaderboard(test.id, test.title, test.totalMarks);

    return {
      attemptId,
      score,
      percentage,
      correctCount,
      totalQuestions
    };
  },

  async recalculateRanksAndLeaderboard(testId, testTitle, totalMarks) {
    // Fetch all attempts for this test
    const attempts = await testRepository.getTestAttemptsForTest(testId);
    if (attempts.length === 0) return;

    // Ranks are already sorted by repository query: score desc, timeTaken asc
    const topStudents = [];
    let highestScore = 0;
    let totalScoreSum = 0;

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const rank = i + 1;
      
      // Update rank in database if it changed
      if (attempt.rank !== rank) {
        await testRepository.updateTestAttemptRank(attempt.id, rank);
      }

      totalScoreSum += attempt.score;
      if (attempt.score > highestScore) {
        highestScore = attempt.score;
      }

      // Collect top 10 for leaderboard
      if (i < 10) {
        topStudents.push({
          studentId: attempt.studentId,
          name: attempt.studentName,
          score: attempt.score,
          percentage: attempt.percentage,
          timeTaken: attempt.timeTaken,
          rank
        });
      }
    }

    const totalParticipants = attempts.length;
    const averageScore = Math.round((totalScoreSum / totalParticipants) * 10) / 10;

    // Save leaderboard
    await testRepository.saveLeaderboard(testId, {
      testId,
      testTitle,
      totalMarks,
      topStudents,
      averageScore,
      highestScore,
      totalParticipants,
      updatedAt: new Date().toISOString()
    });
  }
};
