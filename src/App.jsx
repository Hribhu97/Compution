import React from 'react';
import { ReactLenis } from '@studio-freight/react-lenis';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import Home from './pages/public/Home';
import Login from './pages/auth/Login';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import Courses from './pages/dashboard/Courses';
import Assignments from './pages/dashboard/Assignments';
import MockTests from './pages/dashboard/MockTests';
import Attendance from './pages/dashboard/Attendance';
import Community from './pages/dashboard/Community';
import Profile from './pages/dashboard/Profile';

const PublicLayout = () => (
  <ReactLenis root options={{ lerp: 0.06, smoothWheel: true, syncTouch: true }}>
    <Outlet />
  </ReactLenis>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="courses" element={<Courses />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="tests" element={<MockTests />} />
            <Route path="community" element={<Community />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
