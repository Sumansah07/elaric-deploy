/**
 * Custom authentication hooks
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './auth-context';
import type { PublicUser } from './types';

/**
 * Hook for login form state management
 */
export function useLoginForm() {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const handleChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError();
  }, [clearError]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    return await login(formData.email, formData.password, formData.rememberMe);
  }, [login, formData]);

  const reset = useCallback(() => {
    setFormData({
      email: '',
      password: '',
      rememberMe: false,
    });
    clearError();
  }, [clearError]);

  return {
    formData,
    handleChange,
    handleSubmit,
    reset,
    isLoading,
    error,
  };
}

/**
 * Hook for registration form state management
 */
export function useRegisterForm() {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    rememberMe: false,
  });

  const handleChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError();
  }, [clearError]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    return await register(
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.fullName || undefined,
      formData.rememberMe
    );
  }, [register, formData]);

  const reset = useCallback(() => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      rememberMe: false,
    });
    clearError();
  }, [clearError]);

  return {
    formData,
    handleChange,
    handleSubmit,
    reset,
    isLoading,
    error,
  };
}

/**
 * Hook for password change form state management
 */
export function useChangePasswordForm() {
  const { changePassword, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError();
  }, [clearError]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    return await changePassword(
      formData.currentPassword,
      formData.newPassword,
      formData.confirmPassword
    );
  }, [changePassword, formData]);

  const reset = useCallback(() => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    clearError();
  }, [clearError]);

  return {
    formData,
    handleChange,
    handleSubmit,
    reset,
    isLoading,
    error,
  };
}

/**
 * Hook to check if user has specific permissions
 */
export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;

    // Add your permission logic here
    // For now, just check subscription tier
    switch (permission) {
      case 'create_project':
        return true; // All users can create projects
      case 'export_figma':
        return user.subscription_tier !== 'free';
      case 'unlimited_ai':
        return user.subscription_tier === 'enterprise';
      default:
        return false;
    }
  }, [user]);

  const canCreateProject = hasPermission('create_project');
  const canExportFigma = hasPermission('export_figma');
  const hasUnlimitedAI = hasPermission('unlimited_ai');

  return {
    hasPermission,
    canCreateProject,
    canExportFigma,
    hasUnlimitedAI,
  };
}

/**
 * Hook for user profile management
 */
export function useUserProfile() {
  const { user, refreshUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateProfile = useCallback(async (updates: Partial<PublicUser>) => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const formData = new FormData();
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        await refreshUser();
        return { success: true };
      } else {
        setUpdateError(result.error || 'Update failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      setUpdateError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
    }
  }, [refreshUser]);

  return {
    user,
    updateProfile,
    isUpdating,
    updateError,
    clearUpdateError: () => setUpdateError(null),
  };
}

/**
 * Hook for session management
 */
export function useSession() {
  const { user, isAuthenticated, refreshUser, logout } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoadingSessions(true);
    try {
      const response = await fetch('/api/auth/sessions');
      const result = await response.json();

      if (result.success) {
        setSessions(result.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [isAuthenticated]);

  const destroySession = useCallback(async (sessionId: string) => {
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/auth/destroy-session', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        await loadSessions();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, [loadSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    isLoadingSessions,
    loadSessions,
    destroySession,
    logout,
  };
}