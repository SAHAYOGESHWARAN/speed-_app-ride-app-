import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import { useEffect, useState } from 'react';
import { verifyToken } from '../../api/auth';
import { toast } from 'react-toastify';

const ProtectedRoute = ({ roles = [], permissions = [] }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (user?.token) {
          // Verify token validity with backend
          await verifyToken(user.token);
          
          // Check role-based access
          if (roles.length > 0 && !roles.includes(user.role)) {
            toast.error('Unauthorized access');
            logout();
          }

          // Check permissions
          if (permissions.length > 0 && 
              !permissions.every(perm => user.permissions?.includes(perm))) {
            toast.error('Insufficient permissions');
            logout();
          }
        }
      } catch (error) {
        toast.error('Session expired. Please login again.');
        logout();
      } finally {
        setIsVerifying(false);
      }
    };

    checkAuth();
  }, [user, roles, permissions, logout]);

  if (isVerifying) {
    return <LoadingSpinner fullPage />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (permissions.length > 0 && 
      !permissions.every(perm => user.permissions?.includes(perm))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;