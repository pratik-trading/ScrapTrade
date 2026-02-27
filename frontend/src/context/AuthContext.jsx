import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Only run once on mount, never again
    if (hasFetched.current) return;
    hasFetched.current = true;

    authAPI.getMe()
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))  // silently set null, no redirect
      .finally(() => setLoading(false));
  }, []); // empty array - runs once only

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);