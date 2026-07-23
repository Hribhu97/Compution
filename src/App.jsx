import React from 'react';
import { ReactLenis } from '@studio-freight/react-lenis';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

import Home from './pages/public/Home';
import Staff from './pages/public/Staff';
import Login from './pages/auth/Login';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import Courses from './pages/dashboard/Courses';
import Assignments from './pages/dashboard/Assignments';
import Tests from './pages/dashboard/tests/Tests';
import MiniGames from './pages/dashboard/mini-games/MiniGames';
import Attendance from './pages/dashboard/Attendance';
import Schedule from './pages/dashboard/Schedule';
import Community from './pages/dashboard/Community';
import Profile from './pages/dashboard/Profile';
import FeesAndPayments from './pages/dashboard/FeesAndPayments';
import ClassTracker from './pages/dashboard/ClassTracker';
import WorldCupPage from './pages/dashboard/WorldCupPage';
import AchievementsPage from './pages/dashboard/AchievementsPage';
import AcademicPassPage from './pages/dashboard/AcademicPassPage';
import HallOfChampions from './pages/dashboard/HallOfChampions';
import LearningContainer from './pages/dashboard/LearningContainer';
import AssessmentsContainer from './pages/dashboard/AssessmentsContainer';
import { 
  NotFoundPage, StudentNotFoundPage, PaymentFailedPage, 
  UnauthorizedPage, MaintenancePage, NetworkOfflinePage, ServerErrorPage 
} from './pages/errors/ErrorPages';

import { ThemeProvider } from './theme/ThemeProvider';

const PublicLayout = () => (
  <ReactLenis root options={{ lerp: 0.08, smoothWheel: true }}>
    <Outlet />
  </ReactLenis>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', background: 'var(--bg)' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid rgba(94,107,255,0.2)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children ? children : <Outlet />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/staff" element={<Staff />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Overview />} />
              <Route path="learning" element={<LearningContainer />} />
              <Route path="assessments" element={<AssessmentsContainer />} />
              <Route path="achievements" element={<AchievementsPage />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="community" element={<Community />} />
              <Route path="profile" element={<Profile />} />
              <Route path="fees" element={<FeesAndPayments />} />
              <Route path="worldcup" element={<WorldCupPage />} />
              <Route path="hall-of-champions" element={<HallOfChampions />} />
              
              {/* Backward Compatible Redirects */}
              <Route path="attendance" element={<Navigate to="/dashboard/profile?tab=attendance" replace />} />
              <Route path="courses" element={<Navigate to="/dashboard/learning?tab=courses" replace />} />
              <Route path="tracker" element={<Navigate to="/dashboard/learning?tab=progress" replace />} />
              <Route path="assignments" element={<Navigate to="/dashboard/assessments?tab=assignments" replace />} />
              <Route path="tests" element={<Navigate to="/dashboard/assessments?tab=tests" replace />} />
              <Route path="academic-pass" element={<Navigate to="/dashboard/achievements?tab=academic-pass" replace />} />
            </Route>
            <Route path="/error/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/error/student-not-found" element={<StudentNotFoundPage />} />
            <Route path="/error/payment-failed" element={<PaymentFailedPage />} />
            <Route path="/error/maintenance" element={<MaintenancePage />} />
            <Route path="/error/offline" element={<NetworkOfflinePage />} />
            <Route path="/error/server-error" element={<ServerErrorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <div id="recaptcha-container"></div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
