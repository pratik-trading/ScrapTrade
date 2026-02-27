import React from 'react';

// Status Badge
export const StatusBadge = ({ status }) => {
  const config = {
    Paid: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20',
    Partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20',
    Pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400 border border-gray-200 dark:border-gray-600',
    Overdue: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config[status] || config.Pending}`}>
      {status}
    </span>
  );
};

// Button
export const Button = ({ children, variant = 'primary', size = 'md', className = '', loading, ...props }) => {
  const variants = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm',
    secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
    outline: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
};

// Input
export const Input = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
    <input
      className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors
        bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white
        ${error
          ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20'
          : 'border-gray-300 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-500'
        }
        focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder-gray-400 dark:placeholder-gray-600
        ${className}`}
      {...props}
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

// Select
export const Select = ({ label, error, children, className = '', ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</label>}
    <select
      className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors
        bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white
        ${error
          ? 'border-red-400 dark:border-red-500'
          : 'border-gray-300 dark:border-gray-700 focus:border-orange-400 dark:focus:border-orange-500'
        }
        focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${className}`}
      {...props}
    >
      {children}
    </select>
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

// Card
export const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 ${className}`}>
    {children}
  </div>
);

// Stat Card
export const StatCard = ({ label, value, sub, color = 'blue', icon }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-amber-600',
    green: 'from-emerald-500 to-green-600',
    red: 'from-red-500 to-rose-600',
    purple: 'from-violet-500 to-purple-600',
  };
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${colors[color]} opacity-10 rounded-bl-full`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-display font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 bg-gradient-to-br ${colors[color]} rounded-lg flex items-center justify-center text-white text-lg`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

// Modal
export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// Confirm Dialog
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText = 'Delete', danger = true }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{message}</p>
    <div className="flex gap-3 justify-end">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</Button>
    </div>
  </Modal>
);

// Empty State
export const EmptyState = ({ title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-3xl mb-4">
      📋
    </div>
    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">{description}</p>
    {action}
  </div>
);

// Loading Spinner
export const Spinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Table
export const Table = ({ headers, children, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 dark:border-gray-800">
          {headers.map((h, i) => (
            <th key={i} className={`py-3 px-4 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 ${h.right ? 'text-right' : 'text-left'}`}>
              {h.label || h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
        {children}
      </tbody>
    </table>
  </div>
);
