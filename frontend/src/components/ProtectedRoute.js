import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', backgroundColor: 'var(--bg)', color: 'var(--green)', flexDirection: 'column' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '2px solid var(--border)',
          borderTop: '2px solid var(--green)',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <span className="font-mono" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}>Carregando Acesso...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    // Redirect role mismatch to their own dashboard
    if (role === 'produtor') {
      return <Navigate to="/dashboard/produtor" replace />;
    } else if (role === 'comprador') {
      return <Navigate to="/dashboard/comprador" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
