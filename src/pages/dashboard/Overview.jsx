import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from '../../components/AdminDashboard';
import StudentOverview from '../../features/dashboard/StudentOverview';
import { DashboardSkeleton } from '../../components/SkeletonLoader';
import { useTheme } from '../../theme/useTheme';

export default function Overview() {
  const { user, loading } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const isDarkMode = false;

  if (loading) {
    return <DashboardSkeleton />;
  }
  
  const userRoleLower = user?.role?.toLowerCase();
  if (userRoleLower === 'admin' || userRoleLower === 'faculty' || userRoleLower === 'member') return <AdminDashboard />;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px', 
      background: 'transparent',
      minHeight: '100vh',
      padding: '12px',
      borderRadius: '24px',
      transition: 'background-color 0.3s ease'
    }}>
      <StudentOverview isDarkMode={isDarkMode} />
    </div>
  );
}
