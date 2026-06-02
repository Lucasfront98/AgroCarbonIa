import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Page imports
import LandingPage from './pages/LandingPage';
import Marketplace from './pages/Marketplace';
import Evaluation from './pages/Evaluation';
import Login from './pages/Login';
import Register from './pages/Register';
import ProducerDashboard from './pages/ProducerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
          {/* Global Sticky Navbar */}
          <Navbar />

          {/* Page Routing */}
          <div style={{ flex: 1 }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/avaliar" element={<Evaluation />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Register />} />

              {/* Protected Producer Routes */}
              <Route
                path="/dashboard/produtor"
                element={
                  <ProtectedRoute allowedRole="produtor">
                    <ProducerDashboard defaultTab="geral" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/produtor/propriedades"
                element={
                  <ProtectedRoute allowedRole="produtor">
                    <ProducerDashboard defaultTab="propriedades" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/produtor/creditos"
                element={
                  <ProtectedRoute allowedRole="produtor">
                    <ProducerDashboard defaultTab="creditos" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/produtor/novo-laudo"
                element={
                  <ProtectedRoute allowedRole="produtor">
                    <ProducerDashboard defaultTab="novo-laudo" />
                  </ProtectedRoute>
                }
              />

              {/* Protected Buyer Routes */}
              <Route
                path="/dashboard/comprador"
                element={
                  <ProtectedRoute allowedRole="comprador">
                    <BuyerDashboard defaultTab="geral" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/comprador/compras"
                element={
                  <ProtectedRoute allowedRole="comprador">
                    <BuyerDashboard defaultTab="compras" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/comprador/certificados"
                element={
                  <ProtectedRoute allowedRole="comprador">
                    <BuyerDashboard defaultTab="certificados" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/comprador/metas"
                element={
                  <ProtectedRoute allowedRole="comprador">
                    <BuyerDashboard defaultTab="metas" />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
