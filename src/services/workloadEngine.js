import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Time parsing helper
const toMins = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Check if two time slots overlap on the same day
export const checkTimeOverlap = (startTimeA, endTimeA, startTimeB, endTimeB) => {
  return toMins(startTimeA) < toMins(endTimeB) && toMins(startTimeB) < toMins(endTimeA);
};

// Map day name to a YYYY-MM-DD date in the current week
export const getDayDateInCurrentWeek = (dayName) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetIdx = daysOfWeek.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
  if (targetIdx === -1) return '';
  const today = new Date();
  const currentDayIdx = today.getDay();
  const diff = targetIdx - currentDayIdx;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toISOString().split('T')[0];
};

// Check if faculty is on leave for a given day name
export const isFacultyOnLeave = (facultyId, dayName, leaveRequests = []) => {
  const targetDateStr = getDayDateInCurrentWeek(dayName);
  if (!targetDateStr) return false;

  return leaveRequests.some(req => {
    if (req.facultyId !== facultyId || req.status !== 'approved') return false;
    return targetDateStr >= req.startDate && targetDateStr <= req.endDate;
  });
};

// Calculates live workload profile metrics for a faculty member
export const calculateFacultyWorkload = (facultyId, schedules = [], leaveRequests = [], facultyConfig = {}) => {
  const facultyScheds = schedules.filter(s => s.facultyId === facultyId);
  const activeBatches = new Set(facultyScheds.map(s => s.batch)).size;
  const assignedStudentsCount = facultyScheds.reduce((sum, s) => sum + (s.studentIds?.length || 0), 0);
  
  // Weekly hours: 1.5 hours per schedule slot
  const weeklyTeachingHours = facultyScheds.length * 1.5;
  
  // Total subjects
  const totalSubjects = new Set(facultyScheds.map(s => s.subject)).size;
  
  // Average batch size
  const averageBatchSize = activeBatches > 0 ? Math.round(assignedStudentsCount / activeBatches) : 0;

  // Limits
  const maxWeeklyHours = facultyConfig.maxWeeklyHours || 30;
  const maxDailyBatches = facultyConfig.maxDailyBatches || 5;
  const maxConsecutiveClasses = facultyConfig.maxConsecutiveClasses || 3;

  // Classes today & consecutive classes calculation
  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const classesToday = facultyScheds.filter(s => s.day.toLowerCase() === todayName.toLowerCase()).length;

  // Max consecutive classes calculation
  let maxConsecutiveThisWeek = 0;
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  daysOfWeek.forEach(d => {
    const dayScheds = facultyScheds
      .filter(s => s.day.toLowerCase() === d.toLowerCase())
      .sort((a, b) => toMins(a.startTime) - toMins(b.startTime));
    
    let currentConsecutive = 0;
    let maxConsecutive = 0;

    for (let i = 0; i < dayScheds.length; i++) {
      if (i === 0) {
        currentConsecutive = 1;
      } else {
        const prevEnd = toMins(dayScheds[i - 1].endTime);
        const currStart = toMins(dayScheds[i].startTime);
        // If gap is less than or equal to 15 minutes, count as consecutive
        if (currStart - prevEnd <= 15) {
          currentConsecutive++;
        } else {
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          currentConsecutive = 1;
        }
      }
    }
    maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    maxConsecutiveThisWeek = Math.max(maxConsecutiveThisWeek, maxConsecutive);
  });

  const loadPercent = Math.min(100, Math.round((weeklyTeachingHours / maxWeeklyHours) * 100));

  let loadStatus = 'Light';
  let loadColor = 'var(--success, #22c55e)';
  if (loadPercent >= 80) {
    loadStatus = 'Heavy';
    loadColor = 'var(--danger, #ef4444)';
  } else if (loadPercent >= 50) {
    loadStatus = 'Moderate';
    loadColor = 'var(--warning, #f59e0b)';
  }

  return {
    activeBatches,
    assignedStudentsCount,
    weeklyTeachingHours,
    classesToday,
    classesThisWeek: facultyScheds.length,
    consecutiveClasses: maxConsecutiveThisWeek,
    totalSubjects,
    averageBatchSize,
    loadPercent,
    loadStatus,
    loadColor,
    maxWeeklyHours,
    maxDailyBatches,
    maxConsecutiveClasses
  };
};

// Conflict Detection before saving schedules
export const detectSchedulingConflicts = ({
  id,
  day,
  startTime,
  endTime,
  facultyId,
  room,
  batch
}, schedules = [], leaveRequests = [], holidays = []) => {
  const conflicts = [];
  const targetDateStr = getDayDateInCurrentWeek(day);

  // 1. Holiday check
  const isHoliday = holidays.some(h => h.date === targetDateStr);
  if (isHoliday) {
    const hol = holidays.find(h => h.date === targetDateStr);
    conflicts.push(`Selected day is a holiday: ${hol.name}`);
  }

  // Filter other schedules
  const otherSchedules = schedules.filter(s => s.id !== id);

  // 2. Faculty Overlap
  const facultyOverlap = otherSchedules.some(s => 
    s.facultyId === facultyId && 
    s.day.toLowerCase() === day.toLowerCase() && 
    checkTimeOverlap(startTime, endTime, s.startTime, s.endTime)
  );
  if (facultyOverlap) {
    conflicts.push('Faculty is already assigned to another class during this time slot.');
  }

  // 3. Faculty Leave Check
  if (isFacultyOnLeave(facultyId, day, leaveRequests)) {
    conflicts.push('Faculty is on approved leave during this date/day.');
  }

  // 4. Room Occupied
  const roomOccupied = otherSchedules.some(s => 
    s.room === room && 
    s.day.toLowerCase() === day.toLowerCase() && 
    checkTimeOverlap(startTime, endTime, s.startTime, s.endTime)
  );
  if (roomOccupied) {
    conflicts.push(`Room ${room} is already booked for another class during this time slot.`);
  }

  // 5. Batch Overlap
  const batchOverlap = otherSchedules.some(s => 
    s.batch === batch && 
    s.day.toLowerCase() === day.toLowerCase() && 
    checkTimeOverlap(startTime, endTime, s.startTime, s.endTime)
  );
  if (batchOverlap) {
    conflicts.push(`Batch ${batch} already has another class scheduled during this time slot.`);
  }

  return conflicts;
};

// Recommends Best Faculty based on chosen day, time, batch, subject
export const recommendBestFaculty = ({
  day,
  startTime,
  endTime,
  subject,
  batch
}, faculties = [], schedules = [], leaveRequests = []) => {
  return faculties.map(fac => {
    const config = {
      maxWeeklyHours: fac.maxWeeklyHours || 30,
      maxDailyBatches: fac.maxDailyBatches || 5,
      maxConsecutiveClasses: fac.maxConsecutiveClasses || 3
    };

    const workload = calculateFacultyWorkload(fac.id, schedules, leaveRequests, config);
    const conflicts = detectSchedulingConflicts({
      day,
      startTime,
      endTime,
      facultyId: fac.id,
      room: '',
      batch
    }, schedules, leaveRequests, []);

    // Check expertise
    const hasExpertise = fac.subjects && fac.subjects.some(sub => sub.toLowerCase().includes(subject.toLowerCase()));

    // Score suitability (higher score = more suitable)
    let score = 100;
    const reasons = [];

    if (conflicts.length > 0) {
      score -= 80; // heavy penalty for conflicts
      reasons.push('Schedule conflict or on leave');
    } else {
      reasons.push('Available');
    }

    if (hasExpertise) {
      score += 20;
      reasons.push('Qualified (expert in subject)');
    } else {
      score -= 10;
      reasons.push('No formal subject expertise listed');
    }

    // Workload penalty
    score -= workload.loadPercent * 0.5;
    reasons.push(`Workload: ${workload.loadPercent}% (${workload.loadStatus} Load)`);

    return {
      faculty: fac,
      workload,
      score,
      reasons,
      isAvailable: conflicts.length === 0,
      hasExpertise
    };
  }).sort((a, b) => b.score - a.score);
};

// Smart Batch Suggestions (finds workload imbalances and suggests transfers)
export const suggestBatchRedistribution = (faculties = [], schedules = [], leaveRequests = []) => {
  const recommendations = [];
  if (faculties.length < 2) return [];

  // Calculate workloads
  const workloadProfiles = faculties.map(fac => {
    const profile = calculateFacultyWorkload(fac.id, schedules, leaveRequests, fac);
    return { faculty: fac, profile };
  });

  // Find overloaded (>75%) and underloaded (<40%) faculty
  const overloaded = workloadProfiles.filter(p => p.profile.loadPercent > 75);
  const underloaded = workloadProfiles.filter(p => p.profile.loadPercent < 40);

  overloaded.forEach(ov => {
    const ovSchedules = schedules.filter(s => s.facultyId === ov.faculty.id);
    const uniqueBatches = [...new Set(ovSchedules.map(s => s.batch))];

    uniqueBatches.forEach(batch => {
      const batchSchedules = ovSchedules.filter(s => s.batch === batch);
      const batchHours = batchSchedules.length * 1.5;
      const batchStudents = batchSchedules.reduce((sum, s) => sum + (s.studentIds?.length || 0), 0);

      // Find best underloaded replacement who matches expertise
      underloaded.forEach(un => {
        const hasExpertise = un.faculty.subjects && un.faculty.subjects.some(sub => 
          batchSchedules.some(bs => bs.subject.toLowerCase().includes(sub.toLowerCase()))
        );

        if (hasExpertise) {
          const expectedLoadPercent = Math.round(
            ((un.profile.weeklyTeachingHours + batchHours) / (un.faculty.maxWeeklyHours || 30)) * 100
          );

          recommendations.push({
            batch,
            fromFaculty: ov.faculty,
            toFaculty: un.faculty,
            batchStudents,
            currentFromLoad: ov.profile.loadPercent,
            currentToLoad: un.profile.loadPercent,
            expectedToLoad: expectedLoadPercent,
            reason: `Redistribute load from ${ov.faculty.displayName || 'Faculty'} (${ov.profile.loadPercent}% load) to ${un.faculty.displayName || 'Faculty'} (${un.profile.loadPercent}% load)`
          });
        }
      });
    });
  });

  return recommendations;
};

// Incrementally updates workload summary in Firestore cache
export const syncFacultyWorkloadCache = async (facultyId, schedules = [], leaveRequests = []) => {
  try {
    const workload = calculateFacultyWorkload(facultyId, schedules, leaveRequests);
    const ref = doc(db, 'users', facultyId);
    await updateDoc(ref, {
      workloadSummary: {
        activeBatches: workload.activeBatches,
        assignedStudentsCount: workload.assignedStudentsCount,
        weeklyTeachingHours: workload.weeklyTeachingHours,
        averageBatchSize: workload.averageBatchSize,
        loadPercent: workload.loadPercent,
        loadStatus: workload.loadStatus
      }
    });
  } catch (err) {
    console.error('syncFacultyWorkloadCache error:', err);
  }
};
