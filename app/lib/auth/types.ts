/**
 * Shared authentication types
 * Can be imported by both client and server code
 */

// Client-safe user type (excludes sensitive fields)
export interface PublicUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'cancelled' | 'past_due' | 'paused';
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// Authentication state
export interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Authentication actions
export interface AuthActions {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, confirmPassword: string, fullName?: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
}

// Combined context type
export interface AuthContextType extends AuthState, AuthActions {}

// Session data interface
export interface SessionData {
  userId: string;
  email: string;
  sessionId: string;
  expiresAt: string;
  rememberMe?: boolean;
}

// Authentication result types
export interface AuthResult {
  success: boolean;
  user?: PublicUser;
  sessionId?: string;
  error?: string;
  errorCode?: string;
}