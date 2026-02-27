import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { useApp } from '../context/AppContext';

export default function MainLayout() {
  const { sidebarOpen } = useApp();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-body overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
