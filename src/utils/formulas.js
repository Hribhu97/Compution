/**
 * Compution Dynamic Formula Engine
 * Avoids hardcoded values across the student, faculty, and admin dashboards.
 */

/**
 * Calculates attendance percentage: ((Present + Late) / Total) * 100
 * @param {number} present 
 * @param {number} late 
 * @param {number} absent 
 * @returns {number}
 */
export const calculateAttendancePercent = (present = 0, late = 0, absent = 0) => {
  const total = present + late + absent;
  if (total === 0) return 100; // default for new students
  return Math.round(((present + late) / total) * 100);
};

/**
 * Calculates assignment completion percentage: (Completed / Total) * 100
 * @param {number} completed 
 * @param {number} total 
 * @returns {number}
 */
export const calculateAssignmentCompletion = (completed = 0, total = 0) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

/**
 * Calculates weighted student performance score:
 * (attendance * 0.20) + (assignment * 0.25) + (test * 0.35) + (practical * 0.20)
 * @param {number} attendance score out of 100
 * @param {number} assignment score out of 100
 * @param {number} test score out of 100
 * @param {number} practical score out of 100
 * @returns {number}
 */
export const calculatePerformanceScore = (
  attendance = 100,
  assignment = 0,
  test = 0,
  practical = 0
) => {
  return Math.round(
    (attendance * 0.20) +
    (assignment * 0.25) +
    (test * 0.35) +
    (practical * 0.20)
  );
};

/**
 * Maps a performance score to a letter grade:
 * 90-100 = A+
 * 80-89 = A
 * 70-79 = B
 * 60-69 = C
 * Below 60 = D
 * @param {number} score 
 * @returns {string}
 */
export const calculateGrade = (score = 0) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

/**
 * Calculates faculty workload percentage: (Assigned Students / Capacity) * 100
 * @param {number} assignedStudents 
 * @param {number} capacity default 50
 * @returns {number}
 */
export const calculateFacultyWorkload = (assignedStudents = 0, capacity = 50) => {
  if (capacity === 0) return 0;
  return Math.round((assignedStudents / capacity) * 100);
};
