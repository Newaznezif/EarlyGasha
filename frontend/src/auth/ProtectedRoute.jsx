import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Globe } from 'lucide-react';

const ProtectedRoute = ({ requiredRole }) => {
  const { user, loading } = useAuth();

  // If session is still being restored, show a loader instead of null
  // to prevent any brief flash of protected content or wrong redirects
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center">
        <Globe className="text-[#3b82f6] w-12 h-12 animate-pulse mb-4" />
        <h2 className="font-bold tracking-widest uppercase text-[10px] text-[#64748b]">Verifying Access...</h2>
      </div>
    );
  }

  if (!user) {
    // Unauthorized access: bounce to login
    return <Navigate to="/login" replace />;
  }

  const isAuthorized = !requiredRole || 
    (Array.isArray(requiredRole) ? requiredRole.includes(user.role) : user.role === requiredRole);

  if (!isAuthorized) {
    // Access violation: role mismatch
    console.warn(`RBAC Violation: Redirecting ${user.role} away from ${requiredRole} space.`);
    const home = user.role === 'system_admin' ? '/admin' : 
                   user.role === 'field_officer' ? '/field' : '/dashboard';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
