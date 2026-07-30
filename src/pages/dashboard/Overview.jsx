import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from '../../components/AdminDashboard';
import LearningContainer from './LearningContainer';
import HouseDashboardWidget from '../../components/house/HouseDashboardWidget';
import { DashboardSkeleton } from '../../components/SkeletonLoader';

export default function Overview() {
  const { user, loading } = useAuth();

  if (loading) {
    return <DashboardSkeleton />;
  }
  
  const userRoleLower = user?.role?.toLowerCase();
  if (userRoleLower === 'admin' || userRoleLower === 'faculty' || userRoleLower === 'member') {
    return <AdminDashboard />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <HouseDashboardWidget user={user} />
      <LearningContainer />
    </div>
  );
}
