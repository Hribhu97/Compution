import { useState, useEffect } from 'react';
import { testRepository } from '../repositories/testRepository';
import { testService } from '../services/testService';

export const useTests = (userId = null) => {
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAttempts = null;
    const unsubTests = testRepository.subscribeToTests((testsData) => {
      setTests(testsData);
      setLoading(false);
    });

    if (userId) {
      unsubAttempts = testRepository.subscribeToTestAttempts(userId, (attemptsData) => {
        setAttempts(attemptsData);
      });
    }

    return () => {
      unsubTests();
      if (unsubAttempts) unsubAttempts();
    };
  }, [userId]);

  const submitTest = async (studentName, test, answers, timeTaken) => {
    if (!userId) throw new Error("User must be logged in to submit a test");
    return await testService.submitTest(userId, studentName, test, answers, timeTaken);
  };

  return {
    tests,
    attempts,
    loading,
    submitTest
  };
};
