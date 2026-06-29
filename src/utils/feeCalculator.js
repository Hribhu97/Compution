export const calculateMonthlyFee = (student) => {
  const category = String(student.classCategory || student.grade || '').trim().toLowerCase();
  if (category.includes('2') || category.includes('3') || category.includes('4') || category.includes('5') || category === 'class_2_5') return 500;
  if (category.includes('6') || category.includes('7') || category.includes('8') || category === 'class_6_8') return 600;
  if (category.includes('9') || category.includes('10') || category === 'class_9_10') return 700;
  if (category.includes('11') || category.includes('12') || category.includes('11th') || category.includes('12th') || category.includes('science') || category.includes('application')) return 1000;
  const numCat = parseInt(student.classCategory);
  if (numCat >= 2 && numCat <= 5) return 500;
  if (numCat >= 6 && numCat <= 8) return 600;
  if (numCat >= 9 && numCat <= 10) return 700;
  if (numCat >= 11 && numCat <= 12) return 1000;
  return 700;
};

export const getStudentMonthlyFee = (student) => {
  if (student.monthlyFee && Number(student.monthlyFee) > 0) return Number(student.monthlyFee);
  if (student.feeTarget && Number(student.feeTarget) > 0) return Number(student.feeTarget);
  return calculateMonthlyFee(student);
};

export const calculateFeeMetrics = (students, allFees) => {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthFeesList = allFees.filter(f => f.month === currentMonthStr);

  let totalMonthlyFees = 0;
  let pendingTuition = 0;
  let studentsPending = 0;
  let studentsPaid = 0;
  let collectedAmount = 0;

  students.forEach(s => {
    const feeRecord = currentMonthFeesList.find(f => f.studentId === s.id);
    const monthlyFee = feeRecord ? feeRecord.amountDue : getStudentMonthlyFee(s);
    const paid = feeRecord ? (feeRecord.amountPaid || 0) : 0;
    const status = (feeRecord ? feeRecord.status : 'Pending').toLowerCase();

    totalMonthlyFees += monthlyFee;
    collectedAmount += paid;

    if (status === 'paid') {
      studentsPaid += 1;
    } else {
      studentsPending += 1;
      pendingTuition += Math.max(0, monthlyFee - paid);
    }
  });

  return {
    totalMonthlyFees,
    pendingTuition,
    studentsPending,
    studentsPaid,
    collectedAmount
  };
};
