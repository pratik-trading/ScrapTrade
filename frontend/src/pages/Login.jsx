import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      // Use replace:true so back button doesn't return to login
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 mb-4 shadow-lg">
            <span className="text-2xl">⚙️</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">ScrapTrade Pro</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}