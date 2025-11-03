/**
 * Clerk-based protected route component
 * Redirects to sign-in if user is not authenticated
 */

import { useUser } from '@clerk/remix';
import { Navigate } from '@remix-run/react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ClerkProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ClerkProtectedRoute({ 
  children, 
  fallback,
  redirectTo = '/sign-in' 
}: ClerkProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useUser();

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}