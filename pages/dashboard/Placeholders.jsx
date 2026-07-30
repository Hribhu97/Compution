import React from 'react';

const PlaceholderComponent = ({ title }) => (
  <div style={{ padding: '24px' }}>
    <h1 style={{ fontSize: '2rem', marginBottom: '16px' }}>{title}</h1>
    <p style={{ color: 'var(--text-muted)' }}>This section is currently under construction for the Compution Educational Platform.</p>
  </div>
);

export const Courses = () => <PlaceholderComponent title="My Courses" />;
export const Assignments = () => <PlaceholderComponent title="Assignments & Uploads" />;
export const MockTests = () => <PlaceholderComponent title="Mock Tests & Analytics" />;
