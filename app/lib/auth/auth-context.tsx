/**
 * Authentication context for client-side state management
 */

import * as React from 'react';
import type { PublicUser, AuthState, AuthActions, AuthContextType } from './types';

// Create context
const AuthContext = React.createContext<AuthContextType | null>(null);

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: PublicUser | null;
}

/**
 * Authentication provider component
 */
export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [state, setState] = React.useState<AuthState>({
    user: initialUser,
    isLoading: false,
    isAuthenticated: !!initialUser,
    error: null,
  });

  /**
   * Set loading state
   */
  const setLoading = React.useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  /**
   * Set error state
   */
  const setError = React.useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  /**
   * Set user state
   */
  const setUser = React.useCallback((user: PublicUser | null) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: !!user,
      error: null,
    }));
  }, []);

  /**
   * Clear error
   */
  const clearError = React.useCallback(() => {
    setError(null);
  }, [setError]);

  /**
   * Login user
   */
  const login = React.useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('rememberMe', rememberMe.toString());

      const response = await fetch('/auth/login', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        setError(result.error || 'Login failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setUser]);

  /**
   * Register user
   */
  const register = React.useCallback(async (
    email: string,
    password: string,
    confirmPassword: string,
    fullName?: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      if (fullName) formData.append('fullName', fullName);
      formData.append('rememberMe', rememberMe.toString());

      const response = await fetch('/auth/register', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        setError(result.error || 'Registration failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setUser]);

  /**
   * Logout user
   */
  const logout = React.useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      await fetch('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, [setLoading, setUser]);

  /**
   * Refresh user data
   */
  const refreshUser = React.useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const response = await fetch('/auth/me');
      const result = await response.json();

      if (result.success) {
        setUser(result.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUser]);

  /**
   * Change password
   */
  const changePassword = React.useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('currentPassword', currentPassword);
      formData.append('newPassword', newPassword);
      formData.append('confirmPassword', confirmPassword);

      const response = await fetch('/auth/change-password', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        setError(result.error || 'Password change failed');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setUser]);

  // Auto-refresh user on mount if not already set
  React.useEffect(() => {
    if (!initialUser && !state.user) {
      refreshUser();
    }
  }, [initialUser, state.user, refreshUser]);

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    clearError,
    changePassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to require authentication
 * Throws error if not authenticated
 */
export function useRequireAuth(): AuthContextType & { user: PublicUser } {
  const auth = useAuth();
  
  if (!auth.isAuthenticated || !auth.user) {
    throw new Error('Authentication required');
  }
  
  return auth as AuthContextType & { user: PublicUser };
}