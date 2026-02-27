import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', businessName: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
      toast.success('Account created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl items-center justify-center text-white font-bold text-2xl mb-4">
            ST
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>ScrapTrade Pro</h1>
          <p className="text-gray-500 mt-2 text-sm">Create your account</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Register</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name' },
              { name: 'businessName', label: 'Business Name', type: 'text', placeholder: 'Your scrap business' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' },
            ].map(field => (
              <div key={field.name}>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                  placeholder={field.placeholder}
                  required={field.name !== 'businessName'}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 mt-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Create Account
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
