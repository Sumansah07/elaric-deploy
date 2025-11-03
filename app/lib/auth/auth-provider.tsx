/**
 * Authentication Provider
 * Provides authentication context throughout the application
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/remix';

export interface AuthUser {
  clerkUserId: string;
  supabaseUserId?: string | null;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'paused';
}

export interface UsageLimits {
  projectsCreated: number;
  maxProjects: number;
  aiGenerationsCount: number;
  maxAiGenerations: number;
  storageUsedGB: string;
  maxStorageGB: number;
  canExportFigma: boolean;
  canCreateProject: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  usageLimits: UsageLimits | null;
  refreshUsageLimits: () => Promise<void>;
  hasReachedLimit: (limitType: 'projects' | 'ai_generations' | 'storage') => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);

  // Sync user data when Clerk user changes
  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      const authUser: AuthUser = {
        clerkUserId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        fullName: clerkUser.fullName,
        avatarUrl: clerkUser.imageUrl,
        subscriptionTier: 'free', // Will be updated from server
        subscriptionStatus: 'active', // Will be updated from server
      };
      setUser(authUser);

      // Fetch usage limits
      refreshUsageLimits();
    } else if (isLoaded && !isSignedIn) {
      setUser(null);
      setUsageLimits(null);
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  const refreshUsageLimits = async () => {
    if (!isSignedIn) return;

    try {
      const token = await getToken();
      const response = await fetch('/api/billing/usage', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const limits = await response.json();
        setUsageLimits(limits);
      } else {
        // Set default limits if API call fails
        setUsageLimits({
          projectsCreated: 0,
          maxProjects: 5,
          aiGenerationsCount: 0,
          maxAiGenerations: 100,
          storageUsedGB: '0.00',
          maxStorageGB: 1,
          canExportFigma: false,
          canCreateProject: true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch usage limits:', error);
      // Set default limits on error
      setUsageLimits({
        projectsCreated: 0,
        maxProjects: 5,
        aiGenerationsCount: 0,
        maxAiGenerations: 100,
        storageUsedGB: '0.00',
        maxStorageGB: 1,
        canExportFigma: false,
        canCreateProject: true,
      });
    }
  };

  const hasReachedLimit = (limitType: 'projects' | 'ai_generations' | 'storage'): boolean => {
    if (!usageLimits) return false;

    switch (limitType) {
      case 'projects':
        return usageLimits.projectsCreated >= usageLimits.maxProjects;
      case 'ai_generations':
        return usageLimits.aiGenerationsCount >= usageLimits.maxAiGenerations;
      case 'storage':
        return parseFloat(usageLimits.storageUsedGB) >= usageLimits.maxStorageGB;
      default:
        return false;
    }
  };

  const contextValue: AuthContextType = {
    user,
    isLoaded,
    isSignedIn: isSignedIn || false,
    usageLimits,
    refreshUsageLimits,
    hasReachedLimit,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Convenience hooks
export function useAuthUser() {
  const { user } = useAuthContext();
  return user;
}

export function useUsageLimits() {
  const { usageLimits, refreshUsageLimits, hasReachedLimit } = useAuthContext();
  return { usageLimits, refreshUsageLimits, hasReachedLimit };
}
