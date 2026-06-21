import { useState, useEffect } from 'react';
import { gameRepository } from '../repositories/gameRepository';
import { gameService } from '../services/gameService';

export const useGames = (userId = null) => {
  const [games, setGames] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAttempts = null;
    const unsubGames = gameRepository.subscribeToGames((gamesData) => {
      setGames(gamesData);
      setLoading(false);
    });

    const unsubGlobalLb = gameRepository.subscribeToGlobalGameLeaderboard((lbData) => {
      setGlobalLeaderboard(lbData);
    });

    if (userId) {
      unsubAttempts = gameRepository.subscribeToGameAttempts(userId, (attemptsData) => {
        setAttempts(attemptsData);
      });
    }

    return () => {
      unsubGames();
      unsubGlobalLb();
      if (unsubAttempts) unsubAttempts();
    };
  }, [userId]);

  const submitScore = async (userName, gameId, gameTitle, score, timeSpent, pointsEarned) => {
    if (!userId) throw new Error("User must be logged in to submit a game score");
    return await gameService.submitGameScore(userId, userName, gameId, gameTitle, score, timeSpent, pointsEarned);
  };

  const hasPlayedToday = (gameId) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return attempts.some(a => a.gameId === gameId && a.dateStr === todayStr);
  };

  return {
    games,
    attempts,
    globalLeaderboard,
    loading,
    submitScore,
    hasPlayedToday
  };
};
