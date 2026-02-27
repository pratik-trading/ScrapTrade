import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
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
import Reports from './pages/Reports';
import Lots from './pages/Lots';
import LotDetail from './pages/LotDetail';
import LotForm from './pages/LotForm';

// inside the protected routes:

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/purchases/new" element={<PurchaseForm />} />
              <Route path="/purchases/:id/edit" element={<PurchaseForm />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/sales/new" element={<SaleForm />} />
              <Route path="/sales/:id/edit" element={<SaleForm />} />
              <Route path="/parties" element={<Parties />} />
              <Route path="/parties/:id/ledger" element={<PartyLedger />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/lots" element={<Lots />} />
              <Route path="/lots/new" element={<LotForm />} />
              <Route path="/lots/:id" element={<LotDetail />} />
              <Route path="/lots/:id/edit" element={<LotForm />} />
            </Route>
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
