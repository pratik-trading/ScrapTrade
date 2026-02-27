import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg shadow-orange-500/25">
            ST
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>ScrapTrade Pro</h1>
          <p className="text-gray-500 mt-2 text-sm">Scrap business management system</p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Sign In
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
