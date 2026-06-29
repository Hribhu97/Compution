import React from 'react';

// Reusable Shimmer Box
export const ShimmerBox = ({ className = '', style = {}, dark = false }) => (
  <div 
    className={`skeleton ${dark ? 'skeleton-dark' : ''} ${className}`} 
    style={{ minHeight: '10px', ...style }} 
  />
);

// 1. Dashboard Skeleton
export const DashboardSkeleton = ({ dark = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', padding: '12px' }}>
    {/* Welcome Hero Banner */}
    <div style={{ height: '140px', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
      <ShimmerBox style={{ width: '40%', height: '28px' }} dark={dark} />
      <ShimmerBox style={{ width: '60%', height: '16px' }} dark={dark} />
    </div>

    {/* Stat Cards Grid */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
      {[1, 2, 3].map((_, i) => (
        <div key={i} className="skeleton-card">
          <ShimmerBox style={{ width: '30%', height: '14px' }} dark={dark} />
          <ShimmerBox style={{ width: '70%', height: '36px', marginTop: '8px' }} dark={dark} />
        </div>
      ))}
    </div>

    {/* Content Row: Schedules and Recent Activities */}
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ShimmerBox style={{ width: '25%', height: '22px' }} dark={dark} />
        <div className="skeleton-card" style={{ height: '300px' }}>
          <ShimmerBox style={{ width: '100%', height: '100%' }} dark={dark} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ShimmerBox style={{ width: '40%', height: '22px' }} dark={dark} />
        <div className="skeleton-card" style={{ height: '300px' }}>
          <ShimmerBox style={{ width: '100%', height: '100%' }} dark={dark} />
        </div>
      </div>
    </div>
  </div>
);

// 2. Tests Skeleton
export const TestsSkeleton = ({ dark = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '12px', width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <ShimmerBox style={{ width: '20%', height: '28px' }} dark={dark} />
      <ShimmerBox style={{ width: '15%', height: '36px', borderRadius: '10px' }} dark={dark} />
    </div>
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
      {[1, 2, 3, 4].map((_, i) => (
        <div key={i} className="skeleton-card" style={{ height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <ShimmerBox style={{ width: '80%', height: '22px', marginBottom: '12px' }} dark={dark} />
            <ShimmerBox style={{ width: '50%', height: '14px' }} dark={dark} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <ShimmerBox style={{ width: '30%', height: '16px' }} dark={dark} />
            <ShimmerBox style={{ width: '25%', height: '32px', borderRadius: '8px' }} dark={dark} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 3. Mini Games Skeleton
export const MiniGamesSkeleton = ({ dark = false }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 0.9fr', gap: '28px', padding: '12px', width: '100%' }}>
    {/* Left Panel: Games Grid */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <ShimmerBox style={{ width: '35%', height: '28px', marginBottom: '8px' }} dark={dark} />
        <ShimmerBox style={{ width: '70%', height: '16px' }} dark={dark} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
        {[1, 2, 3, 4, 5, 6].map((_, i) => (
          <div key={i} className="skeleton-card" style={{ padding: 0, overflow: 'hidden', height: '210px' }}>
            <div style={{ height: '100px', background: '#e2e8f0', padding: '20px' }} />
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <ShimmerBox style={{ width: '40%', height: '14px' }} dark={dark} />
              <ShimmerBox style={{ width: '100%', height: '36px', borderRadius: '10px' }} dark={dark} />
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Right Panel: Leaderboard */}
    <div className="skeleton-card" style={{ height: '500px', padding: '24px' }}>
      <ShimmerBox style={{ width: '50%', height: '22px', marginBottom: '20px' }} dark={dark} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2, 3, 4, 5].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
            <ShimmerBox style={{ width: '24px', height: '24px', borderRadius: '50%' }} dark={dark} />
            <ShimmerBox style={{ flex: 1, height: '16px' }} dark={dark} />
            <ShimmerBox style={{ width: '50px', height: '16px' }} dark={dark} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 4. Attendance Skeleton
export const AttendanceSkeleton = ({ dark = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '12px', width: '100%' }}>
    <ShimmerBox style={{ width: '25%', height: '28px' }} dark={dark} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
      {[1, 2, 3].map((_, i) => (
        <div key={i} className="skeleton-card">
          <ShimmerBox style={{ width: '40%', height: '14px' }} dark={dark} />
          <ShimmerBox style={{ width: '80%', height: '32px', marginTop: '8px' }} dark={dark} />
        </div>
      ))}
    </div>
    <div className="skeleton-card" style={{ height: '350px' }}>
      <ShimmerBox style={{ width: '100%', height: '100%' }} dark={dark} />
    </div>
  </div>
);

// 5. Assignments Skeleton
export const AssignmentsSkeleton = ({ dark = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px', width: '100%' }}>
    <ShimmerBox style={{ width: '30%', height: '28px' }} dark={dark} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3, 4].map((_, i) => (
        <div key={i} className="skeleton-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <ShimmerBox style={{ width: '50%', height: '20px', marginBottom: '8px' }} dark={dark} />
            <ShimmerBox style={{ width: '30%', height: '14px' }} dark={dark} />
          </div>
          <ShimmerBox style={{ width: '80px', height: '32px', borderRadius: '8px' }} dark={dark} />
        </div>
      ))}
    </div>
  </div>
);

// 6. Fees Skeleton
export const FeesSkeleton = ({ dark = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '12px', width: '100%' }}>
    <ShimmerBox style={{ width: '20%', height: '28px' }} dark={dark} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <div className="skeleton-card" style={{ height: '240px' }}>
        <ShimmerBox style={{ width: '100%', height: '100%' }} dark={dark} />
      </div>
      <div className="skeleton-card" style={{ height: '240px' }}>
        <ShimmerBox style={{ width: '100%', height: '100%' }} dark={dark} />
      </div>
    </div>
    <div className="skeleton-card" style={{ height: '200px' }}>
      <ShimmerBox style={{ width: '100%', height: '100%' }} dark={dark} />
    </div>
  </div>
);

// 7. Profile Skeleton
export const ProfileSkeleton = ({ dark = false }) => (
  <div className="skeleton-card" style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
    <ShimmerBox style={{ width: '100px', height: '100px', borderRadius: '50%' }} dark={dark} />
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {[1, 2, 3].map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <ShimmerBox style={{ width: '20%', height: '14px' }} dark={dark} />
          <ShimmerBox style={{ width: '100%', height: '40px', borderRadius: '8px' }} dark={dark} />
        </div>
      ))}
      <ShimmerBox style={{ width: '120px', height: '44px', borderRadius: '10px', alignSelf: 'flex-start' }} dark={dark} />
    </div>
  </div>
);

// 8. Leaderboard Skeleton
export const LeaderboardSkeleton = ({ dark = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
    {[1, 2, 3, 4, 5].map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px' }}>
        <ShimmerBox style={{ width: '30px', height: '20px' }} dark={dark} />
        <ShimmerBox style={{ width: '36px', height: '36px', borderRadius: '50%' }} dark={dark} />
        <ShimmerBox style={{ flex: 1, height: '18px' }} dark={dark} />
        <ShimmerBox style={{ width: '60px', height: '18px' }} dark={dark} />
      </div>
    ))}
  </div>
);
