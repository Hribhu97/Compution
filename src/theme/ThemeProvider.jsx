import React, { useState, useEffect, useMemo } from 'react';
import { ThemeContext } from './ThemeContext';
import { themeTokens } from './themeTokens';

export const ThemeProvider = ({ children }) => {
  const theme = 'light';
  const resolvedTheme = 'light';

  const setTheme = () => {
    // Locked to light mode, do nothing
  };

  // Apply theme to document element and body
  useEffect(() => {
    document.documentElement.classList.remove('dark-theme');
    document.body.classList.remove('dark-theme');
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    tokens: themeTokens['light'],
    setTheme,
  }), []);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
