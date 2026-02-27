import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getFinancialYearsList } from '../../utils/financialYear';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { financialYear, setFinancialYear, darkMode, toggleDarkMode, toggleSidebar } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fyList = getFinancialYearsList(2020);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-6 gap-4 z-30">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      {/* Financial Year Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">FY</span>
        <select
          value={financialYear}
          onChange={e => setFinancialYear(e.target.value)}
          className="text-sm font-medium bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 
            border border-orange-200 dark:border-orange-500/30 rounded-lg px-3 py-1.5 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          {fyList.map(fy => (
            <option key={fy} value={fy}>{fy}</option>
          ))}
        </select>
      </div>

      {/* Dark mode */}
      <button
        onClick={toggleDarkMode}
        className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {darkMode ? '☀' : '☾'}
      </button>

      {/* User */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="hidden md:block">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</div>
        </div>
        <button
          onClick={handleLogout}
          className="ml-2 text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
