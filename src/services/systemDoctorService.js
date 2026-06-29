import { collection, doc, getDoc, getDocs, query, where, collectionGroup } from 'firebase/firestore';
import { updateDoc, deleteDoc, setDoc } from '../firebase';;
import { db } from '../firebase';

export const systemDoctorService = {
  async runFullAudit() {
    const logs = ["🚀 Starting Diagnostic Scan..."];
    let issuesFound = 0;
    let repairedCount = 0;
    const repairsQueue = [];

    try {
      // 1. Load all core collections to verify offline/online data
      const usersSnap = await getDocs(collection(db, 'users'));
      const coursesSnap = await getDocs(collection(db, 'courses'));
      const testsSnap = await getDocs(collection(db, 'tests'));
      const attemptsSnap = await getDocs(collection(db, 'testAttempts'));
      const leaderboardsSnap = await getDocs(collection(db, 'leaderboards'));
      const studentFacultyMapSnap = await getDocs(collection(db, 'studentFacultyMap'));
      const facultyRosterSnap = await getDocs(collection(db, 'facultyStudentRoster'));

      const users = [];
      usersSnap.forEach(d => users.push({ id: d.id, ...d.data() }));

      const courses = [];
      coursesSnap.forEach(d => courses.push({ id: d.id, ...d.data() }));

      const tests = [];
      testsSnap.forEach(d => tests.push({ id: d.id, ...d.data() }));

      const attempts = [];
      attemptsSnap.forEach(d => attempts.push({ id: d.id, ...d.data() }));

      const leaderboards = [];
      leaderboardsSnap.forEach(d => leaderboards.push({ id: d.id, ...d.data() }));

      const studentIds = new Set(users.filter(u => u.role?.toLowerCase() === 'student').map(u => u.id));
      const facultyIds = new Set(users.filter(u => u.role?.toLowerCase() === 'faculty').map(u => u.id));
      const courseIds = new Set(courses.map(c => c.id));
      const testIds = new Set(tests.map(t => t.id));

      logs.push(`ℹ️ Load counts: Students=${studentIds.size}, Faculty=${facultyIds.size}, Courses=${courseIds.size}, Tests=${testIds.size}, Attempts=${attempts.length}`);

      // --- CHECK 1: Missing Students ---
      logs.push("🔍 Check 1: Scanning for maps/rosters referencing missing students...");
      studentFacultyMapSnap.forEach(d => {
        if (!studentIds.has(d.id)) {
          issuesFound++;
          logs.push(`❌ [Issue] studentFacultyMap '${d.id}' references a student who does not exist.`);
          repairsQueue.push({
            type: 'delete_doc',
            ref: doc(db, 'studentFacultyMap', d.id),
            log: `🔧 [Repair] Removed orphaned studentFacultyMap for student ID ${d.id}`
          });
        }
      });
      facultyRosterSnap.forEach(d => {
        const data = d.data();
        const rosterStudents = data.studentIds || [];
        const validRosterStudents = rosterStudents.filter(sid => studentIds.has(sid));
        if (rosterStudents.length !== validRosterStudents.length) {
          issuesFound++;
          logs.push(`❌ [Issue] facultyStudentRoster for Faculty '${d.id}' contains missing student IDs.`);
          repairsQueue.push({
            type: 'update_doc',
            ref: doc(db, 'facultyStudentRoster', d.id),
            data: { studentIds: validRosterStudents },
            log: `🔧 [Repair] Cleaned up missing student IDs in roster for Faculty ${d.id}`
          });
        }
      });

      // --- CHECK 2: Broken Faculty Links ---
      logs.push("🔍 Check 2: Scanning for broken faculty references in mappings...");
      studentFacultyMapSnap.forEach(d => {
        if (studentIds.has(d.id)) {
          const data = d.data();
          const assignedFaculty = data.assignedFaculty || [];
          const validFaculty = assignedFaculty.filter(f => facultyIds.has(f.facultyId));
          if (assignedFaculty.length !== validFaculty.length) {
            issuesFound++;
            logs.push(`❌ [Issue] Student '${d.id}' mapping references missing faculty IDs.`);
            repairsQueue.push({
              type: 'update_doc',
              ref: doc(db, 'studentFacultyMap', d.id),
              data: { assignedFaculty: validFaculty },
              log: `🔧 [Repair] Removed missing faculty references in studentFacultyMap for student ${d.id}`
            });
          }
        }
      });

      // --- CHECK 3: Invalid Course Assignments ---
      logs.push("🔍 Check 3: Scanning student course enrollments...");
      users.forEach(u => {
        if (u.role?.toLowerCase() === 'student' && u.assignedCourses) {
          const invalidCourses = u.assignedCourses.filter(cid => !courseIds.has(cid));
          if (invalidCourses.length > 0) {
            issuesFound++;
            logs.push(`❌ [Issue] Student '${u.name}' is assigned courses that do not exist: ${invalidCourses.join(', ')}`);
            const cleanedCourses = u.assignedCourses.filter(cid => courseIds.has(cid));
            repairsQueue.push({
              type: 'update_doc',
              ref: doc(db, 'users', u.id),
              data: { assignedCourses: cleanedCourses },
              log: `🔧 [Repair] Cleaned up invalid course assignments for student ${u.name}`
            });
          }
        }
      });

      // --- CHECK 4: Leaderboard Corruption ---
      logs.push("🔍 Check 4: Scanning test leaderboards for corruption...");
      leaderboards.forEach(lb => {
        const testId = lb.id;
        const testAttempts = attempts.filter(a => a.testId === testId);
        
        const totalParticipants = testAttempts.length;
        const highestScore = testAttempts.length > 0 ? Math.max(...testAttempts.map(a => a.score)) : 0;
        const totalScoreSum = testAttempts.reduce((acc, a) => acc + a.score, 0);
        const averageScore = totalParticipants > 0 ? Math.round((totalScoreSum / totalParticipants) * 10) / 10 : 0;

        const corrupted = lb.totalParticipants !== totalParticipants ||
                          lb.highestScore !== highestScore ||
                          Math.abs(lb.averageScore - averageScore) > 0.1;

        if (corrupted) {
          issuesFound++;
          logs.push(`❌ [Issue] Leaderboard for test '${lb.testTitle || testId}' is corrupted: DbPart=${lb.totalParticipants}, RealPart=${totalParticipants}; DbMax=${lb.highestScore}, RealMax=${highestScore}; DbAvg=${lb.averageScore}, RealAvg=${averageScore}.`);
          
          // Re-generate topStudents list
          testAttempts.sort((x, y) => y.score - x.score || x.timeTaken - y.timeTaken);
          const topStudents = testAttempts.slice(0, 10).map((a, index) => ({
            studentId: a.studentId,
            name: a.studentName,
            score: a.score,
            percentage: a.percentage,
            timeTaken: a.timeTaken,
            rank: index + 1
          }));

          repairsQueue.push({
            type: 'set_doc',
            ref: doc(db, 'leaderboards', testId),
            data: {
              testId,
              testTitle: lb.testTitle || 'Test',
              topStudents,
              averageScore,
              highestScore,
              totalParticipants,
              updatedAt: new Date().toISOString()
            },
            log: `🔧 [Repair] Rebuilt leaderboard for test: ${lb.testTitle || testId}`
          });
        }
      });

      // --- CHECK 5: Missing Test Records ---
      logs.push("🔍 Check 5: Scanning test attempts for missing tests...");
      attempts.forEach(att => {
        if (!testIds.has(att.testId)) {
          issuesFound++;
          logs.push(`❌ [Issue] Attempt ID '${att.id}' references a test '${att.testId}' that does not exist.`);
          repairsQueue.push({
            type: 'delete_doc',
            ref: doc(db, 'testAttempts', att.id),
            log: `🔧 [Repair] Cleaned up orphaned test attempt '${att.id}'`
          });
        }
      });

      // --- CHECK 6: Duplicate Users ---
      logs.push("🔍 Check 6: Scanning for duplicate user accounts...");
      const emailMap = new Map();
      users.forEach(u => {
        if (u.email) {
          const emailLower = u.email.toLowerCase();
          if (emailMap.has(emailLower)) {
            emailMap.get(emailLower).push(u);
          } else {
            emailMap.set(emailLower, [u]);
          }
        }
      });
      emailMap.forEach((userList, email) => {
        if (userList.length > 1) {
          issuesFound++;
          logs.push(`❌ [Issue] Duplicate accounts found for email '${email}': ${userList.map(u => `${u.name} (${u.id})`).join(', ')}`);
          // We don't delete automatically because of risk of deleting correct user. We just report it.
          logs.push("⚠️ [Attention] Repair skipped for duplicate users. Manual resolution recommended.");
        }
      });

      // --- CHECK 7: Attendance Errors ---
      logs.push("🔍 Check 7: Scanning attendance records...");
      for (const student of users.filter(u => u.role?.toLowerCase() === 'student')) {
        const attRef = collection(db, 'users', student.id, 'attendance');
        const attSnap = await getDocs(attRef);
        attSnap.forEach(d => {
          const log = d.data();
          if (log.subject && !courseIds.has(log.subject) && !courses.some(c => c.title === log.subject)) {
            issuesFound++;
            logs.push(`❌ [Issue] Student '${student.name}' attendance log '${d.id}' references course '${log.subject}' which is not in active courses list.`);
            // Skipping delete, as attendance records are critical education records.
            logs.push(`⚠️ [Attention] Skipped attendance log delete to protect records.`);
          }
        });
      }

      // --- CHECK 8: Payment Mismatch ---
      logs.push("🔍 Check 8: Scanning student billing subcollections...");
      for (const student of users.filter(u => u.role?.toLowerCase() === 'student')) {
        const feesRef = collection(db, 'fees', student.id, 'monthly');
        const feesSnap = await getDocs(feesRef);
        let totalAmount = 0;
        let totalPaid = 0;
        feesSnap.forEach(d => {
          const f = d.data();
          totalAmount += Number(f.amountDue) || 0;
          totalPaid += Number(f.amountPaid) || 0;
        });

        const pending = Math.max(0, totalAmount - totalPaid);
        let status = 'Pending';
        if (pending <= 0 && totalAmount > 0) {
          status = 'Paid';
        } else if (totalPaid > 0) {
          status = 'Partial';
        }

        const mismatch = student.feesAmount !== totalAmount ||
                          student.paidAmount !== totalPaid ||
                          student.pendingAmount !== pending ||
                          (student.statusSource !== 'manual' && student.feeStatus !== status);

        if (mismatch && feesSnap.size > 0) {
          issuesFound++;
          logs.push(`❌ [Issue] Fee mismatch for student '${student.name}': Profile Billed=${student.feesAmount || 0}, Paid=${student.paidAmount || 0}, Status=${student.feeStatus || 'Pending'}. Subcollection total: Billed=${totalAmount}, Paid=${totalPaid}, Status=${status}.`);
          repairsQueue.push({
            type: 'update_doc',
            ref: doc(db, 'users', student.id),
            data: {
              feesAmount: totalAmount,
              paidAmount: totalPaid,
              pendingAmount: pending,
              feeStatus: student.statusSource === 'manual' ? student.feeStatus : status
            },
            log: `🔧 [Repair] Synced student billing totals for ${student.name} to Billed=${totalAmount}, Paid=${totalPaid}, Status=${student.statusSource === 'manual' ? student.feeStatus : status}`
          });
        }
      }

      // --- CHECK 9: Firestore Permission Errors ---
      logs.push("🔍 Check 9: Testing firestore connection and permissions...");
      try {
        const permissionRef = doc(db, 'systemDoctorRun', 'permissionTest');
        await setDoc(permissionRef, { testedAt: new Date().toISOString() });
        await deleteDoc(permissionRef);
        logs.push("✅ Firestore permissions verified successfully (Read/Write OK).");
      } catch (err) {
        issuesFound++;
        logs.push(`❌ [Issue] Firestore write permission failed: ${err.message}`);
      }

      // Execute repairs queue
      if (repairsQueue.length > 0) {
        logs.push(`🚀 Commencing ${repairsQueue.length} automated repairs...`);
        for (const repair of repairsQueue) {
          try {
            if (repair.type === 'delete_doc') {
              await deleteDoc(repair.ref);
            } else if (repair.type === 'update_doc') {
              await updateDoc(repair.ref, repair.data);
            } else if (repair.type === 'set_doc') {
              await setDoc(repair.ref, repair.data);
            }
            repairedCount++;
            logs.push(repair.log);
          } catch (repairErr) {
            logs.push(`🚨 Repair failed for action: ${repair.log}. Error: ${repairErr.message}`);
          }
        }
      }

      logs.push("🎉 Integrity sweep complete.");
      logs.push(`📊 Summary: Found ${issuesFound} issues. Successfully repaired ${repairedCount} issues.`);

      return {
        logs,
        issuesFound,
        repairedCount
      };
    } catch (e) {
      console.error(e);
      logs.push(`🚨 Audit failed with critical exception: ${e.message}`);
      return {
        logs,
        issuesFound,
        repairedCount
      };
    }
  }
};
