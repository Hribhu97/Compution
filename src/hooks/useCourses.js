import { useState, useEffect } from 'react';
import { courseRepository } from '../repositories/courseRepository';

export const useCourses = (user) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCourses([]);
      setLoading(false);
      return;
    }

    const isStaff = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'faculty';
    let unsubscribe;

    if (isStaff) {
      unsubscribe = courseRepository.subscribeToCourses((data) => {
        setCourses(data);
        setLoading(false);
      });
    } else {
      // Optimized query: student only gets assignedCourses
      const assigned = user.assignedCourses || [];
      if (assigned.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }
      unsubscribe = courseRepository.subscribeToAssignedCourses(assigned, (data) => {
        setCourses(data);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, JSON.stringify(user?.assignedCourses)]);

  return { courses, loading };
};
