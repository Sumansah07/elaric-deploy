/**
 * Authentication guard component for client-side route protection
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from '@remix-run/react';
import { useUser } from '@clerk/remix';
import { useAuthContext } from '~/lib/auth/auth-provider';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AuthGuardProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    redirectTo?: string;
    fallback?: React.ReactNode;
    requireSubscription?: 'free' | 'pro' | 'enterprise';
    requireFeature?: 'figma_export' | 'unlimited_projects' | 'priority_support';
}

export function AuthGuard({
    children,
    requireAuth = true,
    redirectTo,
    fallback,
    requireSubscription,
    requireFeature
}: AuthGuardProps) {
    const { isSignedIn, isLoaded } = useUser();
    const { user: authUser } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isLoaded) {
            if (requireAuth && !isSignedIn) {
                // Redirect to home page where Clerk modal will handle sign-in
                const returnTo = encodeURIComponent(location.pathname + location.search);
                const homeUrl = redirectTo || `/?returnTo=${returnTo}`;
                navigate(homeUrl, { replace: true });
            } else if (!requireAuth && isSignedIn) {
                // Redirect authenticated users away from guest-only pages
                const dashboardUrl = redirectTo || '/dashboard';
                navigate(dashboardUrl, { replace: true });
            }
        }
    }, [isLoaded, isSignedIn, requireAuth, navigate, location, redirectTo]);

    // Show loading spinner while checking authentication
    if (!isLoaded) {
        return fallback || (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner size="lg" className="mx-auto mb-4" />
                    <p className="text-bolt-elements-textSecondary">Loading...</p>
                </div>
            </div>
        );
    }

    // For protected routes, only render if authenticated
    if (requireAuth && !isSignedIn) {
        return null; // Will redirect in useEffect
    }

    // For guest-only routes, only render if not authenticated
    if (!requireAuth && isSignedIn) {
        return null; // Will redirect in useEffect
    }

    // Check subscription tier requirement
    if (requireAuth && requireSubscription && authUser) {
        const tierHierarchy = { free: 0, pro: 1, enterprise: 2 };
        const userTierLevel = tierHierarchy[authUser.subscriptionTier] ?? -1;
        const requiredTierLevel = tierHierarchy[requireSubscription] ?? 999;

        if (userTierLevel < requiredTierLevel || authUser.subscriptionStatus !== 'active') {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-bolt-elements-textPrimary mb-4">
                            Subscription Required
                        </h2>
                        <p className="text-bolt-elements-textSecondary mb-6">
                            This feature requires a {requireSubscription} subscription.
                        </p>
                        <a
                            href="/pricing"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Upgrade Now
                        </a>
                    </div>
                </div>
            );
        }
    }

    // Check feature requirement
    if (requireAuth && requireFeature && authUser) {
        const featureMap = {
            figma_export: ['pro', 'enterprise'],
            unlimited_projects: ['enterprise'],
            priority_support: ['pro', 'enterprise'],
        };

        const allowedTiers = featureMap[requireFeature] || [];
        const hasFeature = allowedTiers.includes(authUser.subscriptionTier) && 
                         authUser.subscriptionStatus === 'active';

        if (!hasFeature) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-bolt-elements-textPrimary mb-4">
                            Feature Not Available
                        </h2>
                        <p className="text-bolt-elements-textSecondary mb-6">
                            This feature is not available with your current subscription.
                        </p>
                        <a
                            href="/pricing"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Upgrade Now
                        </a>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}

/**
 * Require authentication wrapper
 */
export function RequireAuth({ children, redirectTo, fallback }: Omit<AuthGuardProps, 'requireAuth'>) {
    return (
        <AuthGuard requireAuth={true} redirectTo={redirectTo} fallback={fallback}>
            {children}
        </AuthGuard>
    );
}

/**
 * Guest only wrapper (redirect if authenticated)
 */
export function GuestOnly({ children, redirectTo, fallback }: Omit<AuthGuardProps, 'requireAuth'>) {
    return (
        <AuthGuard requireAuth={false} redirectTo={redirectTo} fallback={fallback}>
            {children}
        </AuthGuard>
    );
}