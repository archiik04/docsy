import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LandingPage } from '../pages/landing/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { WorkspacePage } from '../pages/workspace/WorkspacePage';
import { API_BASE_URL } from '../constants/api';

function ProtectedRoute({ children }) {
  const { isAuthenticated, token, checkAuth, loading } = useAuthStore();

  useEffect(() => {
    if (token && !isAuthenticated && !loading) {
      checkAuth();
    }
  }, [token, isAuthenticated, checkAuth, loading]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: '#040814',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '2px solid rgba(45, 143, 160, 0.1)',
          borderTopColor: '#2d8fa0',
          marginBottom: '16px',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>Authenticating</h2>
        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', margin: 0 }}>Securing your document workspace...</p>
      </div>
    );
  }

  return children;
}

export function AppRouter() {
  // Fire-and-forget warm-up so a sleeping backend starts booting while the user
  // is still on the landing / login page, instead of on their first real request.
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route 
          path="/workspace" 
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          } 
        />
        <Route path="/demo" element={<WorkspacePage isDemo={true} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
