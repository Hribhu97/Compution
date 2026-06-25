import { gameRepository } from '../repositories/gameRepository';
import { userRepository } from '../repositories/userRepository';
import { serverTimestamp } from 'firebase/firestore';

export const gameService = {
  async canPlayGameToday(userId, gameId) {
    const playedToday = await gameRepository.getGameAttemptsForUserToday(userId, gameId);
    return !playedToday;
  },

  async updateDailyStreak(userId) {
    const userProfile = await userRepository.getUserProfile(userId);
    if (!userProfile) return null;

    const getISTDateString = (date) => {
      if (!date) return '';
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      const istDate = new Date(utc + (3600000 * 5.5));
      const yyyy = istDate.getFullYear();
      const mm = String(istDate.getMonth() + 1).padStart(2, '0');
      const dd = String(istDate.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const getDaysDifference = (dateStr1, dateStr2) => {
      const d1 = new Date(dateStr1 + 'T00:00:00Z');
      const d2 = new Date(dateStr2 + 'T00:00:00Z');
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    let newStreak = Number(userProfile.streak) || 0;
    let newHighestStreak = Number(userProfile.highestStreak) || 0;
    const lastPlayedTimestamp = userProfile.lastPlayedDate;

    if (!lastPlayedTimestamp) {
      newStreak = 1;
      newHighestStreak = Math.max(newHighestStreak, 1);
    } else {
      const lastPlayedDate = lastPlayedTimestamp.toDate();
      const todayIST = getISTDateString(new Date());
      const lastPlayedIST = getISTDateString(lastPlayedDate);

      if (todayIST !== lastPlayedIST) {
        const daysDiff = getDaysDifference(todayIST, lastPlayedIST);
        if (daysDiff === 1) {
          newStreak += 1;
          newHighestStreak = Math.max(newHighestStreak, newStreak);
        } else if (daysDiff > 1) {
          newStreak = 1;
        }
      }
    }

    await userRepository.updateUserProfile(userId, {
      streak: newStreak,
      highestStreak: newHighestStreak,
      lastPlayedDate: serverTimestamp()
    });

    return { streak: newStreak, highestStreak: newHighestStreak };
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

    // 3. Update streak
    const streakResult = await this.updateDailyStreak(userId);

    // 4. Update student profile points & XP
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
        rankPoints: newPoints,
        xp: newXp,
        level: newLevel
      });

      return {
        pointsEarned,
        addedXp,
        newPoints,
        newXp,
        newLevel,
        streak: streakResult?.streak || userProfile.streak,
        highestStreak: streakResult?.highestStreak || userProfile.highestStreak
      };
    }

    return { pointsEarned, addedXp: 0 };
  }
};
