import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'react-hot-toast';

import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Purchases from './pages/Purchases';
import PurchaseForm from './pages/PurchaseForm';
import Sales from './pages/Sales';
import SaleForm from './pages/SaleForm';
import Parties from './pages/Parties';
import PartyLedger from './pages/PartyLedger';
import Lots from './pages/Lots';
import LotDetail from './pages/LotDetail';
import LotForm from './pages/LotForm';
import Reports from './pages/Reports';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Public route - redirect to dashboard if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="purchases/new" element={<PurchaseForm />} />
        <Route path="purchases/:id/edit" element={<PurchaseForm />} />
        <Route path="sales" element={<Sales />} />
        <Route path="sales/new" element={<SaleForm />} />
        <Route path="sales/:id/edit" element={<SaleForm />} />
        <Route path="parties" element={<Parties />} />
        <Route path="parties/:id/ledger" element={<PartyLedger />} />
        <Route path="lots" element={<Lots />} />
        <Route path="lots/new" element={<LotForm />} />
        <Route path="lots/:id" element={<LotDetail />} />
        <Route path="lots/:id/edit" element={<LotForm />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                fontSize: '13px',
                fontFamily: 'DM Sans, sans-serif',
              },
            }}
          />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}