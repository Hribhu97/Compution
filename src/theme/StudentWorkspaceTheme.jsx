import React from 'react';

export const StudentWorkspaceTheme = ({ children, isDark }) => {
  return (
    <div 
      className={`student-workspace-theme-scoped ${isDark ? 'dark-theme' : ''}`}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
};

export default StudentWorkspaceTheme;
