import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../utils/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const location = useLocation();
  const authed = isAuthenticated();
  const role = localStorage.getItem('user_role');

  if (!authed) {
    // Redirect unauthenticated users to /login preserving target location for post-login return
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && role !== 'ADMIN') {
    // Non-admin users attempting to access admin routes get redirected safely to /dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
