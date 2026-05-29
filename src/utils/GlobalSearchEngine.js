import { useState, useEffect } from 'react';

/**
 * A custom React hook to perform debounced local client-side search across collections.
 * 
 * @param {Array} data - The array of objects to search.
 * @param {Array<string>} keys - The properties on each object to filter by.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {object} { searchQuery, setSearchQuery, filteredData }
 */
export function useGlobalSearch(data, keys, delay = 300) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState(data);

  useEffect(() => {
    const handler = setTimeout(() => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) {
        setFilteredData(data);
        return;
      }

      const searchTerms = query.split(/\s+/).filter(Boolean);
      const filtered = data.filter(item => {
        return searchTerms.every(term => {
          return keys.some(key => {
            const val = item[key];
            if (val === undefined || val === null) return false;
            return String(val).toLowerCase().includes(term);
          });
        });
      });
      setFilteredData(filtered);
    }, delay);

    return () => clearTimeout(handler);
  }, [data, searchQuery, keys, delay]);

  return { searchQuery, setSearchQuery, filteredData };
}
