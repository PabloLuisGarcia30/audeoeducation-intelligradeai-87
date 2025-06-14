
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { shouldUseDevAuth } from '@/config/devConfig';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  redirectTo = '/auth'
}: ProtectedRouteProps) {
  const { user, profile, loading, isDevMode } = useAuth();
  const location = useLocation();

  console.log('🔒 ProtectedRoute check:', {
    path: location.pathname,
    shouldUseDevAuth: shouldUseDevAuth(),
    isDevMode,
    user: user?.id,
    profile: profile?.role,
    requiredRole,
    loading
  });

  // Bypass authentication in dev mode
  if (shouldUseDevAuth()) {
    console.log('🔧 ProtectedRoute: Dev mode active, allowing access');
    return <>{children}</>;
  }

  if (loading) {
    console.log('🔄 ProtectedRoute: Loading auth state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">Loading...</p>
          {isDevMode && (
            <p className="text-sm text-blue-600 mt-2">Dev Mode Active</p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔐 ProtectedRoute: No authenticated user, redirecting to auth');
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    console.log(`🔐 ProtectedRoute: Role mismatch. Required: ${requiredRole}, Current: ${profile?.role}`);
    const roleRedirect = profile?.role === 'student' ? '/student-dashboard' : '/';
    return <Navigate to={roleRedirect} replace />;
  }

  console.log('✅ ProtectedRoute: Access granted for user:', user.id);
  return <>{children}</>;
}

export default ProtectedRoute;
