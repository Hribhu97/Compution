import React from 'react';

export const StudentWorkspaceTheme = ({ children }) => {
  return (
    <div 
      className="student-workspace-theme-scoped"
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
