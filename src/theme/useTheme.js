import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState('light');
  return {
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: () => {}
  };
}

export default useTheme;
