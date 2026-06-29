import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

const escapeXml = (unsafe) => {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const reportService = {
  async exportMonthlyReport(studentId, monthStr, showToast) {
    try {
      // 1. Fetch Student Profile
      const studentRef = doc(db, 'users', studentId);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        throw new Error('Student profile not found in database.');
      }
      const student = { id: studentSnap.id, ...studentSnap.data() };

      // 2. Fetch Monthly Fee Record
      const monthlyFeeRef = doc(db, 'fees', studentId, 'monthly', monthStr);
      const monthlyFeeSnap = await getDoc(monthlyFeeRef);
      const monthlyFeeData = monthlyFeeSnap.exists() ? monthlyFeeSnap.data() : null;

      // 3. Fetch Assigned Faculty
      const facultyMapRef = doc(db, 'studentFacultyMap', studentId);
      const facultyMapSnap = await getDoc(facultyMapRef);
      const facultyList = facultyMapSnap.exists() ? (facultyMapSnap.data().assignedFaculty || []) : [];
      const facultyName = facultyList.map(f => f.facultyName || f.name).join(', ') || 'Not Assigned';

      // 4. Fetch Attendance Logs
      const attendanceRef = collection(db, 'users', studentId, 'attendance');
      const attendanceSnap = await getDocs(attendanceRef);
      const attendanceLogs = [];
      attendanceSnap.forEach(d => attendanceLogs.push(d.data()));

      // 5. Fetch Personal Assignments
      const assignmentsRef = collection(db, 'users', studentId, 'assignments');
      const assignmentsSnap = await getDocs(assignmentsRef);
      const personalAssignments = [];
      assignmentsSnap.forEach(d => personalAssignments.push(d.data()));

      // 6. Fetch Test Attempts
      const testAttemptsRef = collection(db, 'testAttempts');
      const testQuery = query(testAttemptsRef, where('studentId', '==', studentId));
      const testSnap = await getDocs(testQuery);
      const testAttempts = [];
      testSnap.forEach(d => testAttempts.push(d.data()));

      // --- AGGREGATIONS ---
      
      // Attendance
      const totalClasses = attendanceLogs.length;
      const attendedClasses = attendanceLogs.filter(l => l.status === 'present' || l.status === 'late').length;
      const attendancePercent = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 100;
      
      // Streak calculation (consecutive present/late sorted by date)
      let streak = 0;
      const sortedLogs = [...attendanceLogs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      for (let i = sortedLogs.length - 1; i >= 0; i--) {
        if (sortedLogs[i].status === 'present' || sortedLogs[i].status === 'late') {
          streak++;
        } else {
          break;
        }
      }

      // Learning
      const assignmentsCompleted = personalAssignments.filter(a => a.status === 'completed' || a.completed).length;
      const assignmentsPending = personalAssignments.length - assignmentsCompleted;
      const quizzesCompleted = student.quizzesCompleted || 0;
      const xpEarned = student.xp || 0;
      const currentLevel = student.level || 1;
      const badges = student.badges || [];

      // Fees
      const monthlyFeeVal = monthlyFeeData ? (monthlyFeeData.amountDue || 0) : (student.monthlyFee || student.feeTarget || 700);
      const amountPaidVal = monthlyFeeData ? (monthlyFeeData.amountPaid || 0) : (student.paidAmount || 0);
      const outstandingBalance = Math.max(0, monthlyFeeVal - amountPaidVal);
      const paymentStatus = monthlyFeeData ? (monthlyFeeData.status || 'Pending') : (student.feeStatus || 'Pending');
      const lastPaymentDate = monthlyFeeData?.paymentDate ? 
        (monthlyFeeData.paymentDate.toDate ? monthlyFeeData.paymentDate.toDate().toLocaleDateString('en-IN') : new Date(monthlyFeeData.paymentDate).toLocaleDateString('en-IN')) : 
        'N/A';
      const paymentMethod = monthlyFeeData?.paymentMethod || 'N/A';

      // Activity
      const loginCount = student.loginCount || 1;
      const lastLoginDate = student.lastLogin ? 
        (student.lastLogin.toDate ? student.lastLogin.toDate().toLocaleString('en-IN') : new Date(student.lastLogin).toLocaleString('en-IN')) : 
        'N/A';

      // Performance Summary & Action Items
      let attendanceRating = 'Needs Improvement';
      if (attendancePercent >= 90) attendanceRating = 'Excellent';
      else if (attendancePercent >= 80) attendanceRating = 'Good';
      else if (attendancePercent >= 75) attendanceRating = 'Satisfactory';

      let learningConsistency = 'Needs Attention';
      const totalTasks = personalAssignments.length;
      if (totalTasks === 0 || (assignmentsCompleted / totalTasks) >= 0.8) learningConsistency = 'Consistent';
      else if ((assignmentsCompleted / totalTasks) >= 0.5) learningConsistency = 'Moderate';

      const avgTestScore = testAttempts.length > 0 ? Math.round(testAttempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / testAttempts.length) : 85;
      const overallProgress = Math.round((attendancePercent * 0.3) + (avgTestScore * 0.4) + ((totalTasks > 0 ? (assignmentsCompleted / totalTasks) * 100 : 85) * 0.3));

      let suggestedImprovement = 'Outstanding performance! Continue active participation and explore advanced topics.';
      if (attendancePercent < 80) {
        suggestedImprovement = 'Improve attendance by joining regularly scheduled classes on time.';
      } else if (assignmentsPending > 0) {
        suggestedImprovement = 'Prioritize completing pending assignments to reinforce active learning.';
      } else if (avgTestScore < 70) {
        suggestedImprovement = 'Attempt more mock tests and review course materials to boost performance scores.';
      }

      // Month name mapping
      const [year, month] = monthStr.split('-');
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = months[parseInt(month) - 1];

      // --- GENERATE SPREADSHEETML XML ---
      const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Compution Academy</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:CharSet="1" x:Family="Swiss" ss:Size="11" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Segoe UI" ss:Size="16" ss:Bold="1" ss:Color="#4F46E5"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#64748B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SectionHeader">
   <Font ss:FontName="Segoe UI" ss:Size="12" ss:Bold="1" ss:Color="#4F46E5"/>
   <Interior ss:Color="#EEF2F6" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
   </Borders>
  </Style>
  <Style ss:ID="BoldLabel">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#334155"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="ValueText">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="ValueNumber">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
  </Style>
  <Style ss:ID="ValueCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="&quot;₹&quot;#,##0"/>
  </Style>
  <Style ss:ID="ValuePercentage">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="0%"/>
  </Style>
  <Style ss:ID="ValueDate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="AlertSuccess">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#15803D"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="AlertDanger">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#B91C1C"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="RatingHigh">
   <Font ss:FontName="Segoe UI" ss:Bold="1" ss:Color="#0369A1"/>
   <Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Monthly Performance">
  <Table ss:ExpandedColumnCount="6" ss:ExpandedRowCount="35" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="20">
   <Column ss:Index="1" ss:Width="160"/>
   <Column ss:Index="2" ss:Width="140"/>
   <Column ss:Index="3" ss:Width="140"/>
   <Column ss:Index="4" ss:Width="140"/>
   <Column ss:Index="5" ss:Width="140"/>
   <Column ss:Index="6" ss:Width="220"/>
   
   <!-- Title Block -->
   <Row ss:Height="30">
    <Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">COMPUTION ACADEMY — STUDENT PERFORMANCE REPORT</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:MergeAcross="5" ss:StyleID="Subtitle"><Data ss:Type="String">Performance and Financial Statement for the Month of ${monthName} ${year}</Data></Cell>
   </Row>
   <Row ss:Height="10"/>

   <!-- Student Info Section -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="5" ss:StyleID="SectionHeader"><Data ss:Type="String">1. Student Profile</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Student Name:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${escapeXml(student.displayName)}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Student ID:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${escapeXml(student.studentId || 'N/A')}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Batch / Grade:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${escapeXml(student.grade || 'N/A')}</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Course Enrolled:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${escapeXml(student.course || 'N/A')}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Faculty Mentor:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${escapeXml(facultyName)}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Contact Number:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${escapeXml(student.phone || 'N/A')}</Data></Cell>
   </Row>
   <Row ss:Height="12"/>

   <!-- Attendance Section -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="5" ss:StyleID="SectionHeader"><Data ss:Type="String">2. Attendance Log Summary</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Total Scheduled Classes:</Data></Cell>
    <Cell ss:StyleID="ValueNumber"><Data ss:Type="Number">${totalClasses}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Classes Attended:</Data></Cell>
    <Cell ss:StyleID="ValueNumber"><Data ss:Type="Number">${attendedClasses}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Attendance Rate:</Data></Cell>
    <Cell ss:StyleID="ValuePercentage"><Data ss:Type="Number">${attendancePercent / 100}</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Active Attendance Streak:</Data></Cell>
    <Cell ss:StyleID="ValueNumber"><Data ss:Type="Number">${streak}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Status Rating:</Data></Cell>
    <Cell ss:StyleID="${attendancePercent >= 80 ? 'AlertSuccess' : 'AlertDanger'}"><Data ss:Type="String">${attendanceRating}</Data></Cell>
    <Cell ss:MergeAcross="1"/>
   </Row>
   <Row ss:Height="12"/>

   <!-- Learning Metrics Section -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="5" ss:StyleID="SectionHeader"><Data ss:Type="String">3. Learning &amp; Academic Milestones</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Assignments Completed:</Data></Cell>
    <Cell ss:StyleID="ValueNumber"><Data ss:Type="Number">${assignmentsCompleted}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Assignments Pending:</Data></Cell>
    <Cell ss:StyleID="ValueNumber"><Data ss:Type="Number">${assignmentsPending}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">XP Points Earned:</Data></Cell>
    <Cell ss:StyleID="ValueNumber"><Data ss:Type="Number">${xpEarned}</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Level Achieved:</Data></Cell>
    <Cell ss:StyleID="ValueNumber"><Data ss:Type="Number">${currentLevel}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Daily Quizzes Solved:</Data></Cell>
    <Cell ss:StyleID="ValueNumber"><Data ss:Type="Number">${quizzesCompleted}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Badges Earned:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${escapeXml(badges.join(', ') || 'None')}</Data></Cell>
   </Row>
   <Row ss:Height="12"/>

   <!-- Financial Section -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="5" ss:StyleID="SectionHeader"><Data ss:Type="String">4. Invoice &amp; Financial Ledger</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Monthly Tuition Fee:</Data></Cell>
    <Cell ss:StyleID="ValueCurrency"><Data ss:Type="Number">${monthlyFeeVal}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Amount Paid:</Data></Cell>
    <Cell ss:StyleID="ValueCurrency"><Data ss:Type="Number">${amountPaidVal}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Outstanding Balance:</Data></Cell>
    <Cell ss:StyleID="ValueCurrency"><Data ss:Type="Number">${outstandingBalance}</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Payment Status:</Data></Cell>
    <Cell ss:StyleID="${paymentStatus.toLowerCase() === 'paid' ? 'AlertSuccess' : 'AlertDanger'}"><Data ss:Type="String">${paymentStatus.toUpperCase()}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Last Payment Date:</Data></Cell>
    <Cell ss:StyleID="ValueDate"><Data ss:Type="String">${lastPaymentDate}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Payment Method:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${escapeXml(paymentMethod)}</Data></Cell>
   </Row>
   <Row ss:Height="12"/>

   <!-- Activity Section -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="5" ss:StyleID="SectionHeader"><Data ss:Type="String">5. Platform Engagement Stats</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Total Login Sessions:</Data></Cell>
    <Cell ss:StyleID="ValueNumber"><Data ss:Type="Number">${loginCount}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Last Login Date/Time:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${lastLoginDate}</Data></Cell>
    <Cell ss:MergeAcross="1"/>
   </Row>
   <Row ss:Height="12"/>

   <!-- Performance Section -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="5" ss:StyleID="SectionHeader"><Data ss:Type="String">6. Performance Evaluation &amp; Action Plan</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Attendance Consistency:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${attendanceRating}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Learning Consistency:</Data></Cell>
    <Cell ss:StyleID="ValueText"><Data ss:Type="String">${learningConsistency}</Data></Cell>
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Overall Progress Rating:</Data></Cell>
    <Cell ss:StyleID="RatingHigh"><Data ss:Type="String">${overallProgress}%</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="BoldLabel"><Data ss:Type="String">Suggested Action Plan:</Data></Cell>
    <Cell ss:MergeAcross="4" ss:StyleID="ValueText"><Data ss:Type="String">${escapeXml(suggestedImprovement)}</Data></Cell>
   </Row>
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Header x:Margin="0.3"/>
    <Footer x:Margin="0.3"/>
    <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
   </PageSetup>
   <Print>
    <ValidPrinterInfo/>
    <PaperSizeIndex>9</PaperSizeIndex>
    <HorizontalResolution>600</HorizontalResolution>
    <VerticalResolution>600</VerticalResolution>
   </Print>
   <Selected/>
   <Panes>
    <Pane>
     <Number>3</Number>
     <ActiveRow>0</ActiveRow>
     <ActiveCol>0</ActiveCol>
    </Pane>
   </Panes>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

      // Download trigger
      const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Monthly_Report_${student.displayName.replace(/\s+/g, '_')}_${monthName}_${year}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (showToast) {
        showToast('Monthly report exported successfully! 📊', 'success');
      }
    } catch (err) {
      console.error('[Export Report Error]', err);
      if (showToast) {
        showToast(`Failed to export monthly report: ${err.message}`, 'danger');
      }
      throw err;
    }
  }
};
