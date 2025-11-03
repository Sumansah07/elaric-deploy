/**
 * Permission-based guard component
 */

import React from 'react';
import { useAuth } from '~/lib/auth/auth-context';
import { usePermissions } from '~/lib/auth/auth-hooks';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  fallback?: React.ReactNode;
  requireEmailVerification?: boolean;
}

export function PermissionGuard({ 
  children, 
  permission,
  subscriptionTier,
  fallback,
  requireEmailVerification = false
}: PermissionGuardProps) {
  const { user, isAuthenticated } = useAuth();
  const { hasPermission } = usePermissions();

  // Must be authenticated
  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Authentication required</p>
      </div>
    );
  }

  // Check email verification if required
  if (requireEmailVerification && !user.is_email_verified) {
    return fallback || (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          Please verify your email address to access this feature
        </p>
      </div>
    );
  }

  // Check subscription tier
  if (subscriptionTier) {
    const tierLevels = { free: 0, pro: 1, enterprise: 2 };
    const userLevel = tierLevels[user.subscription_tier];
    const requiredLevel = tierLevels[subscriptionTier];

    if (userLevel < requiredLevel) {
      return fallback || (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            This feature requires a {subscriptionTier} subscription
          </p>
        </div>
      );
    }
  }

  // Check specific permission
  if (permission && !hasPermission(permission)) {
    return fallback || (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          You don't have permission to access this feature
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Subscription tier guard
 */
export function RequireSubscription({ 
  tier, 
  children, 
  fallback 
}: { 
  tier: 'pro' | 'enterprise';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard subscriptionTier={tier} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Email verification guard
 */
export function RequireEmailVerification({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard requireEmailVerification={true} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}