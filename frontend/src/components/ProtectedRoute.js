import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Debug logging
  const token = localStorage.getItem('token');
  const authenticated = isAuthenticated();

  console.log('🔒 ProtectedRoute check:', {
    path: location.pathname,
    loading,
    authenticated,
    hasToken: !!token,
    tokenLength: token?.length || 0
  });

  // Show loading state while checking authentication
  if (loading) {
    console.log('🔒 ProtectedRoute: Showing loading state');
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--text-secondary)'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!authenticated) {
    console.warn('🔒 ProtectedRoute: NOT AUTHENTICATED - Redirecting to login');
    console.warn('🔒 Token in localStorage:', token ? `${token.substring(0, 20)}...` : 'MISSING');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('🔒 ProtectedRoute: Authenticated - Rendering protected content');
  // Render protected content
  return children;
}

export default ProtectedRoute;
