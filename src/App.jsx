import React from 'react';
import { ReactLenis } from '@studio-freight/react-lenis';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ChatAssistant from './components/ChatAssistant';
import { Analytics } from '@vercel/analytics/react';

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
              <Route path="courses" element={<Courses />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="assignments" element={<Assignments />} />
              <Route path="tests" element={<Tests />} />
              <Route path="mini-games" element={<MiniGames />} />
              <Route path="community" element={<Community />} />
              <Route path="profile" element={<Profile />} />
              <Route path="fees" element={<FeesAndPayments />} />
            </Route>
            <Route path="/error/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/error/student-not-found" element={<StudentNotFoundPage />} />
            <Route path="/error/payment-failed" element={<PaymentFailedPage />} />
            <Route path="/error/maintenance" element={<MaintenancePage />} />
            <Route path="/error/offline" element={<NetworkOfflinePage />} />
            <Route path="/error/server-error" element={<ServerErrorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <ChatAssistant />
          <Analytics />
        </Router>
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
