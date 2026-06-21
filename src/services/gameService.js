import { gameRepository } from '../repositories/gameRepository';
import { userRepository } from '../repositories/userRepository';

export const gameService = {
  async canPlayGameToday(userId, gameId) {
    const playedToday = await gameRepository.getGameAttemptsForUserToday(userId, gameId);
    return !playedToday;
  },

  async submitGameScore(userId, userName, gameId, gameTitle, score, timeSpent, pointsEarned) {
    // 1. Double check daily limit on server/db side
    const canPlay = await this.canPlayGameToday(userId, gameId);
    if (!canPlay) {
      throw new Error("You have already played this daily game today!");
    }

    // 2. Save the game attempt
    const today = new Date().toISOString().split('T')[0];
    const attemptData = {
      userId,
      userName,
      gameId,
      gameTitle,
      score,
      timeSpent, // in seconds
      pointsEarned,
      dateStr: today
    };

    await gameRepository.saveGameAttempt(attemptData);

    // 3. Update student profile points & XP
    const userProfile = await userRepository.getUserProfile(userId);
    if (userProfile) {
      const currentPoints = Number(userProfile.gamePoints) || 0;
      const currentXp = Number(userProfile.xp) || 0;
      
      const newPoints = currentPoints + pointsEarned;
      const addedXp = pointsEarned * 10; // 10 XP per point earned
      const newXp = currentXp + addedXp;
      const newLevel = Math.max(1, Math.floor(newXp / 400) + 1);

      await userRepository.updateUserProfile(userId, {
        gamePoints: newPoints,
        xp: newXp,
        level: newLevel
      });

      return {
        pointsEarned,
        addedXp,
        newPoints,
        newXp,
        newLevel
      };
    }

    return { pointsEarned, addedXp: 0 };
  }
};
