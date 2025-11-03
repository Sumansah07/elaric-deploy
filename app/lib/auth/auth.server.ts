/**
 * Core authentication service
 * Server-only module for authentication operations
 */

import { userRepository, type CreateUserData } from './user-repository.server';
import type { PublicUser } from './types';
import { sessionManager, type CreateSessionOptions, type ServerSessionData } from './session.server';
import { validatePassword, verifyPassword } from './password.server';
import type { UserRow } from '~/types/database';

// Authentication result types
export interface AuthResult {
  success: boolean;
  user?: PublicUser;
  sessionId?: string;
  error?: string;
  errorCode?: AuthErrorCode;
}

export interface RegisterResult {
  success: boolean;
  user?: PublicUser;
  sessionId?: string;
  error?: string;
  errorCode?: AuthErrorCode;
}

export interface LoginResult {
  success: boolean;
  user?: PublicUser;
  sessionId?: string;
  error?: string;
  errorCode?: AuthErrorCode;
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: number }>();

/**
 * Core authentication service class
 */
export class AuthService {
  private userRepo = userRepository;
  private sessionMgr = sessionManager;

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    fullName?: string,
    options: CreateSessionOptions = {}
  ): Promise<RegisterResult> {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required',
          errorCode: AuthErrorCode.INVALID_EMAIL,
        };
      }

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Validate email format
      if (!this.isValidEmail(normalizedEmail)) {
        return {
          success: false,
          error: 'Invalid email format',
          errorCode: AuthErrorCode.INVALID_EMAIL,
        };
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', '),
          errorCode: AuthErrorCode.WEAK_PASSWORD,
        };
      }

      // Check if user already exists
      const existingUser = await this.userRepo.findUserByEmail(normalizedEmail);
      if (existingUser) {
        return {
          success: false,
          error: 'An account with this email already exists',
          errorCode: AuthErrorCode.USER_EXISTS,
        };
      }

      // Create user
      const userData: CreateUserData = {
        email: normalizedEmail,
        password,
        full_name: fullName?.trim() || null,
      };

      const user = await this.userRepo.createUser(userData);

      // Create session for the new user
      const sessionId = await this.sessionMgr.createSession(user.id, options);

      // Update last login
      await this.userRepo.updateLastLogin(user.id);

      return {
        success: true,
        user,
        sessionId,
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.',
        errorCode: AuthErrorCode.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Login user with email and password
   */
  async login(
    email: string,
    password: string,
    rememberMe: boolean = false,
    options: CreateSessionOptions = {}
  ): Promise<LoginResult> {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required',
          errorCode: AuthErrorCode.INVALID_CREDENTIALS,
        };
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check rate limiting
      if (this.isRateLimited(normalizedEmail)) {
        return {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          errorCode: AuthErrorCode.RATE_LIMITED,
        };
      }

      // Find user by email
      const user = await this.userRepo.findUserByEmail(normalizedEmail);
      if (!user || !user.password_hash) {
        this.recordFailedAttempt(normalizedEmail);
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: AuthErrorCode.INVALID_CREDENTIALS,
        };
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        this.recordFailedAttempt(normalizedEmail);
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: AuthErrorCode.INVALID_CREDENTIALS,
        };
      }

      // Clear failed attempts on successful login
      this.clearFailedAttempts(normalizedEmail);

      // Check if account is active (you can add more checks here)
      if (user.subscription_status === 'cancelled') {
        return {
          success: false,
          error: 'Account is disabled. Please contact support.',
          errorCode: AuthErrorCode.ACCOUNT_DISABLED,
        };
      }

      // Create session with remember me option
      const sessionOptions = {
        ...options,
        rememberMe,
        expiresInMs: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 30 days vs 7 days
      };
      const sessionId = await this.sessionMgr.createSession(user.id, sessionOptions);

      // Update last login
      await this.userRepo.updateLastLogin(user.id);

      // Convert to public user (exclude sensitive fields)
      const publicUser: PublicUser = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        is_email_verified: user.is_email_verified,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
      };

      return {
        success: true,
        user: publicUser,
        sessionId,
      };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.',
        errorCode: AuthErrorCode.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Logout user by destroying session
   */
  async logout(sessionId: string): Promise<AuthResult> {
    try {
      if (!sessionId) {
        return {
          success: false,
          error: 'Session ID is required',
          errorCode: AuthErrorCode.UNAUTHORIZED,
        };
      }

      await this.sessionMgr.destroySession(sessionId);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Logout failed:', error);
      return {
        success: false,
        error: 'Logout failed. Please try again.',
        errorCode: AuthErrorCode.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Validate session and return user data
   */
  async validateSession(sessionId: string): Promise<AuthResult> {
    try {
      if (!sessionId) {
        return {
          success: false,
          error: 'Session ID is required',
          errorCode: AuthErrorCode.UNAUTHORIZED,
        };
      }

      // Validate session
      const session = await this.sessionMgr.validateSession(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Invalid or expired session',
          errorCode: AuthErrorCode.SESSION_EXPIRED,
        };
      }

      // Get user data
      const user = await this.userRepo.findUserById(session.userId);
      if (!user) {
        // Clean up orphaned session
        await this.sessionMgr.destroySession(sessionId);
        return {
          success: false,
          error: 'User not found',
          errorCode: AuthErrorCode.USER_NOT_FOUND,
        };
      }

      return {
        success: true,
        user,
        sessionId,
      };
    } catch (error) {
      console.error('Session validation failed:', error);
      return {
        success: false,
        error: 'Session validation failed',
        errorCode: AuthErrorCode.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Refresh session expiration
   */
  async refreshSession(sessionId: string, rememberMe: boolean = false): Promise<AuthResult> {
    try {
      if (!sessionId) {
        return {
          success: false,
          error: 'Session ID is required',
          errorCode: AuthErrorCode.UNAUTHORIZED,
        };
      }

      const newSessionId = await this.sessionMgr.refreshSession(sessionId, rememberMe);

      return {
        success: true,
        sessionId: newSessionId,
      };
    } catch (error) {
      console.error('Session refresh failed:', error);
      return {
        success: false,
        error: 'Session refresh failed',
        errorCode: AuthErrorCode.SESSION_EXPIRED,
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    sessionId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      // Validate session
      const sessionResult = await this.validateSession(sessionId);
      if (!sessionResult.success || !sessionResult.user) {
        return sessionResult;
      }

      // Get user with password hash
      const user = await this.userRepo.findUserByEmail(sessionResult.user.email);
      if (!user || !user.password_hash) {
        return {
          success: false,
          error: 'User not found',
          errorCode: AuthErrorCode.USER_NOT_FOUND,
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect',
          errorCode: AuthErrorCode.INVALID_CREDENTIALS,
        };
      }

      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', '),
          errorCode: AuthErrorCode.WEAK_PASSWORD,
        };
      }

      // Update password
      await this.userRepo.updatePassword(user.id, newPassword);

      // Destroy all other sessions for security
      await this.sessionMgr.destroyAllUserSessions(user.id);

      // Create new session
      const newSessionId = await this.sessionMgr.createSession(user.id);

      return {
        success: true,
        user: sessionResult.user,
        sessionId: newSessionId,
      };
    } catch (error) {
      console.error('Password change failed:', error);
      return {
        success: false,
        error: 'Password change failed. Please try again.',
        errorCode: AuthErrorCode.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string): Promise<AuthResult> {
    try {
      const user = await this.userRepo.verifyEmail(userId);

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Email verification failed:', error);
      return {
        success: false,
        error: 'Email verification failed',
        errorCode: AuthErrorCode.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(sessionId: string): Promise<{ success: boolean; sessions?: ServerSessionData[]; error?: string }> {
    try {
      const sessionResult = await this.validateSession(sessionId);
      if (!sessionResult.success || !sessionResult.user) {
        return {
          success: false,
          error: 'Invalid session',
        };
      }

      const sessions = await this.sessionMgr.getUserSessions(sessionResult.user.id);

      return {
        success: true,
        sessions,
      };
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return {
        success: false,
        error: 'Failed to get sessions',
      };
    }
  }

  /**
   * Destroy specific user session
   */
  async destroyUserSession(currentSessionId: string, targetSessionId: string): Promise<AuthResult> {
    try {
      const sessionResult = await this.validateSession(currentSessionId);
      if (!sessionResult.success || !sessionResult.user) {
        return sessionResult;
      }

      // Get target session to verify it belongs to the user
      const targetSession = await this.sessionMgr.getSession(targetSessionId);
      if (!targetSession || targetSession.userId !== sessionResult.user.id) {
        return {
          success: false,
          error: 'Session not found or unauthorized',
          errorCode: AuthErrorCode.UNAUTHORIZED,
        };
      }

      await this.sessionMgr.destroySession(targetSessionId);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Failed to destroy user session:', error);
      return {
        success: false,
        error: 'Failed to destroy session',
        errorCode: AuthErrorCode.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if IP/email is rate limited
   */
  private isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    if (!record) {
      return false;
    }

    // Reset if more than 15 minutes have passed
    if (now - record.lastAttempt > 15 * 60 * 1000) {
      rateLimitStore.delete(identifier);
      return false;
    }

    // Rate limit after 5 failed attempts
    return record.attempts >= 5;
  }

  /**
   * Record failed login attempt
   */
  private recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    if (!record) {
      rateLimitStore.set(identifier, { attempts: 1, lastAttempt: now });
    } else {
      // Reset if more than 15 minutes have passed
      if (now - record.lastAttempt > 15 * 60 * 1000) {
        rateLimitStore.set(identifier, { attempts: 1, lastAttempt: now });
      } else {
        record.attempts++;
        record.lastAttempt = now;
      }
    }
  }

  /**
   * Clear failed attempts for identifier
   */
  private clearFailedAttempts(identifier: string): void {
    rateLimitStore.delete(identifier);
  }

  /**
   * Clean up rate limit store periodically
   */
  cleanupRateLimit(): void {
    const now = Date.now();
    const cutoff = 15 * 60 * 1000; // 15 minutes

    for (const [identifier, record] of rateLimitStore.entries()) {
      if (now - record.lastAttempt > cutoff) {
        rateLimitStore.delete(identifier);
      }
    }
  }
}

// Export singleton instance
export const authService = new AuthService();