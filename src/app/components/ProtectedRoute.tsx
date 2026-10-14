import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { getRoleHomeRoute } from '../utils/roleRoutes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // User is authenticated but doesn't have the required role.
      navigate(getRoleHomeRoute(user.role), { replace: true });
    }
  }, [isAuthenticated, user, allowedRoles, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
