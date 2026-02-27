import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentFinancialYear } from '../utils/financialYear';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [financialYear, setFinancialYear] = useState(
    () => localStorage.getItem('selectedFY') || getCurrentFinancialYear()
  );
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('darkMode') === 'true'
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Apply dark mode class on mount and change
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const setFinancialYearAndSave = (fy) => {
    localStorage.setItem('selectedFY', fy);
    setFinancialYear(fy);
  };

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <AppContext.Provider value={{
      financialYear,
      setFinancialYear: setFinancialYearAndSave,
      darkMode,
      toggleDarkMode,
      sidebarOpen,
      toggleSidebar
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);