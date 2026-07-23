import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from '../../components/AdminDashboard';
import LearningContainer from './LearningContainer';
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

  return <LearningContainer />;
}
