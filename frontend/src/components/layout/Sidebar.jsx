import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const navItems = [
  { path: '/', icon: '⊞', label: 'Dashboard', exact: true },
  { path: '/purchases', icon: '↓', label: 'Purchases' },
  { path: '/sales', icon: '↑', label: 'Sales' },
  { path: '/parties', icon: '◎', label: 'Parties' },
  { path: '/reports', icon: '⊟', label: 'Reports' },
  { path: '/lots', icon: '⇄', label: 'Lot Mapping' },
];

export default function Sidebar() {
  const { sidebarOpen } = useApp();

  return (
    <aside className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 
      ${sidebarOpen ? 'w-64' : 'w-16'}
      bg-gray-900 dark:bg-gray-950 border-r border-gray-800 flex flex-col`}>
      
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            ST
          </div>
          {sidebarOpen && (
            <div>
              <div className="text-white font-display font-bold text-sm">ScrapTrade</div>
              <div className="text-gray-500 text-xs">Pro</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all text-sm mb-1
              ${isActive
                ? 'bg-orange-500/10 text-orange-400 font-medium border border-orange-500/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">{item.icon}</span>
            {sidebarOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      {sidebarOpen && (
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-600 text-center">v1.0.0</div>
        </div>
      )}
    </aside>
  );
}
