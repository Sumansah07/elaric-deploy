/**
 * Core authentication service
 * Handles user registration, login, and logout operations
 */

import { userRepository } from './user-repository.server';
import { sessionManager } from './session.server';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password.server';
import { validatePassword, validatePasswordsMatch } from './password-validation';
import type { PublicUser } from './types';

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
  rememberMe?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: PublicUser;
  error?: string;
  sessionHeaders?: Headers;
}

export class AuthService {
  /**
   * Register a new user
   * @param request - Request object
   * @param data - Registration data
   * @returns Promise<AuthResult> - Registration result
   */
  async register(request: Request, data: RegisterData): Promise<AuthResult> {
    try {
      // Validate input data
      const validation = this.validateRegistrationData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Check if email already exists
      const existingUser = await userRepository.findUserByEmail(data.email);
      if (existingUser) {
        return {
          success: false,
          error: 'An account with this email already exists',
        };
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create user
      const user = await userRepository.createUser({
        email: data.email.toLowerCase().trim(),
        hashedPassword,
        fullName: data.fullName?.trim() || null,
      });

      // Create session
      const { headers } = await sessionManager.createSession(
        request,
        user,
        data.rememberMe || false
      );

      return {
        success: true,
        user,
        sessionHeaders: headers,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Login a user
   * @param request - Request object
   * @param data - Login data
   * @returns Promise<AuthResult> - Login result
   */
  async login(request: Request, data: LoginData): Promise<AuthResult> {
    try {
      // Validate input data
      const validation = this.validateLoginData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Get user password hash
      const passwordHash = await userRepository.getUserPasswordHash(data.email);
      if (!passwordHash) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Verify password
      const isPasswordValid = await verifyPassword(data.password, passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Get user data
      const user = await userRepository.findUserByEmail(data.email);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Update last login
      await userRepository.updateLastLogin(user.id);

      // Create session
      const { headers } = await sessionManager.createSession(
        request,
        user,
        data.rememberMe || false
      );

      return {
        success: true,
        user,
        sessionHeaders: headers,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.',
      };
    }
  }

  /**
   * Logout a user
   * @param request - Request object
   * @returns Promise<Headers> - Headers to clear session
   */
  async logout(request: Request): Promise<Headers> {
    try {
      return await sessionManager.destroySession(request);
    } catch (error) {
      console.error('Logout error:', error);
      // Return empty headers if logout fails
      return new Headers();
    }
  }

  /**
   * Change user password
   * @param request - Request object
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @param confirmPassword - Confirm new password
   * @returns Promise<AuthResult> - Change password result
   */
  async changePassword(
    request: Request,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<AuthResult> {
    try {
      // Get current user
      const sessionData = await sessionManager.getSessionData(request);
      if (!sessionData) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      const user = await userRepository.findUserById(sessionData.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', '),
        };
      }

      // Check if passwords match
      if (!validatePasswordsMatch(newPassword, confirmPassword)) {
        return {
          success: false,
          error: 'New passwords do not match',
        };
      }

      // Verify current password
      const currentPasswordHash = await userRepository.getUserPasswordHash(user.email);
      if (!currentPasswordHash) {
        return {
          success: false,
          error: 'Current password verification failed',
        };
      }

      const isCurrentPasswordValid = await verifyPassword(currentPassword, currentPasswordHash);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update user password
      const updatedUser = await userRepository.updateUser(user.id, {
        hashedPassword: newPasswordHash,
      });

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Failed to change password. Please try again.',
      };
    }
  }

  /**
   * Validate registration data
   * @param data - Registration data
   * @returns Validation result
   */
  private validateRegistrationData(data: RegisterData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate email
    if (!data.email || !data.email.trim()) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Please enter a valid email address');
    }

    // Validate password
    if (!data.password) {
      errors.push('Password is required');
    } else {
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    // Validate confirm password
    if (!data.confirmPassword) {
      errors.push('Please confirm your password');
    } else if (!validatePasswordsMatch(data.password, data.confirmPassword)) {
      errors.push('Passwords do not match');
    }

    // Validate full name (optional but if provided, should be valid)
    if (data.fullName && data.fullName.trim().length > 100) {
      errors.push('Full name must be less than 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate login data
   * @param data - Login data
   * @returns Validation result
   */
  private validateLoginData(data: LoginData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate email
    if (!data.email || !data.email.trim()) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Please enter a valid email address');
    }

    // Validate password
    if (!data.password) {
      errors.push('Password is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   * @param email - Email to validate
   * @returns boolean - True if valid email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
}

// Export singleton instance
export const authService = new AuthService();