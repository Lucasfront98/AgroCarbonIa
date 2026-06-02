import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync auth state from localStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('agro_user');
    const savedToken = localStorage.getItem('agro_token');
    const savedRole = localStorage.getItem('agro_role');

    if (savedUser && savedToken && savedRole) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        setRole(savedRole);
      } catch (e) {
        // Clear corrupted storage
        localStorage.clear();
      }
    }
    setLoading(false);

    // Listen to unauthorized logout event from Axios interceptor
    const handleAxiosLogout = () => {
      setUser(null);
      setToken(null);
      setRole(null);
    };
    window.addEventListener('agro_auth_logout', handleAxiosLogout);
    return () => window.removeEventListener('agro_auth_logout', handleAxiosLogout);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      setToken(data.token);
      setRole(data.role);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    try {
      const data = await authService.register(name, email, password, role);
      setUser(data.user);
      setToken(data.token);
      setRole(data.role);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
    setRole(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        login,
        register,
        logout,
        isAuthenticated,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
