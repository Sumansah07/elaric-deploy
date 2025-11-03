/**
 * Unit tests for core authentication service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService, AuthErrorCode } from './auth.server';

// Mock dependencies
vi.mock('./user-repository.server', () => ({
  userRepository: {
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    createUser: vi.fn(),
    updateLastLogin: vi.fn(),
    updatePassword: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

vi.mock('./session.server', () => ({
  sessionManager: {
    createSession: vi.fn(),
    validateSession: vi.fn(),
    destroySession: vi.fn(),
    refreshSession: vi.fn(),
    getUserSessions: vi.fn(),
    getSession: vi.fn(),
    destroyAllUserSessions: vi.fn(),
  },
}));

vi.mock('./password.server', () => ({
  validatePassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: any;
  let mockSessionMgr: any;
  let mockPasswordUtils: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
    
    // Get mocked dependencies
    mockUserRepo = require('./user-repository.server').userRepository;
    mockSessionMgr = require('./session.server').sessionManager;
    mockPasswordUtils = require('./password.server');
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'test@example.com';
      const password = 'TestPassword123!';
      const fullName = 'Test User';

      const mockUser = {
        id: 'user123',
        email,
        full_name: fullName,
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
      };

      mockPasswordUtils.validatePassword.mockReturnValue({
        isValid: true,
        errors: [],
        strength: 'strong',
      });
      mockUserRepo.findUserByEmail.mockResolvedValue(null);
      mockUserRepo.createUser.mockResolvedValue(mockUser);
      mockSessionMgr.createSession.mockResolvedValue('session123');
      mockUserRepo.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.register(email, password, fullName);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.sessionId).toBe('session123');
      expect(mockUserRepo.createUser).toHaveBeenCalledWith({
        email: email.toLowerCase(),
        password,
        full_name: fullName,
      });
    });

    it('should fail if user already exists', async () => {
      const email = 'existing@example.com';
      const password = 'TestPassword123!';

      const existingUser = { id: 'user123', email };

      mockPasswordUtils.validatePassword.mockReturnValue({
        isValid: true,
        errors: [],
        strength: 'strong',
      });
      mockUserRepo.findUserByEmail.mockResolvedValue(existingUser);

      const result = await authService.register(email, password);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.USER_EXISTS);
      expect(result.error).toContain('already exists');
    });

    it('should fail with weak password', async () => {
      const email = 'test@example.com';
      const password = 'weak';

      mockPasswordUtils.validatePassword.mockReturnValue({
        isValid: false,
        errors: ['Password too short', 'Missing uppercase letter'],
        strength: 'weak',
      });

      const result = await authService.register(email, password);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.WEAK_PASSWORD);
      expect(result.error).toContain('Password too short');
    });

    it('should fail with invalid email', async () => {
      const email = 'invalid-email';
      const password = 'TestPassword123!';

      const result = await authService.register(email, password);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.INVALID_EMAIL);
    });

    it('should fail with missing email or password', async () => {
      const result1 = await authService.register('', 'password');
      const result2 = await authService.register('email@test.com', '');

      expect(result1.success).toBe(false);
      expect(result1.errorCode).toBe(AuthErrorCode.INVALID_EMAIL);
      expect(result2.success).toBe(false);
      expect(result2.errorCode).toBe(AuthErrorCode.INVALID_EMAIL);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const email = 'test@example.com';
      const password = 'TestPassword123!';

      const mockUser = {
        id: 'user123',
        email,
        password_hash: 'hashed_password',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
      };

      mockUserRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.verifyPassword.mockResolvedValue(true);
      mockSessionMgr.createSession.mockResolvedValue('session123');
      mockUserRepo.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.login(email, password);

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe('user123');
      expect(result.sessionId).toBe('session123');
      expect(mockPasswordUtils.verifyPassword).toHaveBeenCalledWith(password, 'hashed_password');
    });

    it('should fail with invalid credentials', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      const mockUser = {
        id: 'user123',
        email,
        password_hash: 'hashed_password',
      };

      mockUserRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.verifyPassword.mockResolvedValue(false);

      const result = await authService.login(email, password);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });

    it('should fail with non-existent user', async () => {
      const email = 'nonexistent@example.com';
      const password = 'TestPassword123!';

      mockUserRepo.findUserByEmail.mockResolvedValue(null);

      const result = await authService.login(email, password);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });

    it('should fail with disabled account', async () => {
      const email = 'test@example.com';
      const password = 'TestPassword123!';

      const mockUser = {
        id: 'user123',
        email,
        password_hash: 'hashed_password',
        subscription_status: 'cancelled',
      };

      mockUserRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.verifyPassword.mockResolvedValue(true);

      const result = await authService.login(email, password);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.ACCOUNT_DISABLED);
    });

    it('should fail with missing email or password', async () => {
      const result1 = await authService.login('', 'password');
      const result2 = await authService.login('email@test.com', '');

      expect(result1.success).toBe(false);
      expect(result1.errorCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      expect(result2.success).toBe(false);
      expect(result2.errorCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const sessionId = 'session123';

      mockSessionMgr.destroySession.mockResolvedValue(undefined);

      const result = await authService.logout(sessionId);

      expect(result.success).toBe(true);
      expect(mockSessionMgr.destroySession).toHaveBeenCalledWith(sessionId);
    });

    it('should fail with missing session ID', async () => {
      const result = await authService.logout('');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.UNAUTHORIZED);
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully', async () => {
      const sessionId = 'session123';
      const mockSession = {
        id: sessionId,
        userId: 'user123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
      };

      mockSessionMgr.validateSession.mockResolvedValue(mockSession);
      mockUserRepo.findUserById.mockResolvedValue(mockUser);

      const result = await authService.validateSession(sessionId);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.sessionId).toBe(sessionId);
    });

    it('should fail with invalid session', async () => {
      const sessionId = 'invalid_session';

      mockSessionMgr.validateSession.mockResolvedValue(null);

      const result = await authService.validateSession(sessionId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.SESSION_EXPIRED);
    });

    it('should fail with missing session ID', async () => {
      const result = await authService.validateSession('');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.UNAUTHORIZED);
    });

    it('should clean up orphaned session', async () => {
      const sessionId = 'session123';
      const mockSession = {
        id: sessionId,
        userId: 'user123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };

      mockSessionMgr.validateSession.mockResolvedValue(mockSession);
      mockUserRepo.findUserById.mockResolvedValue(null);
      mockSessionMgr.destroySession.mockResolvedValue(undefined);

      const result = await authService.validateSession(sessionId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.USER_NOT_FOUND);
      expect(mockSessionMgr.destroySession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const sessionId = 'session123';
      const newSessionId = 'new_session123';

      mockSessionMgr.refreshSession.mockResolvedValue(newSessionId);

      const result = await authService.refreshSession(sessionId, true);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(newSessionId);
      expect(mockSessionMgr.refreshSession).toHaveBeenCalledWith(sessionId, true);
    });

    it('should fail with missing session ID', async () => {
      const result = await authService.refreshSession('');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.UNAUTHORIZED);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const sessionId = 'session123';
      const currentPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'old_hashed_password',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
      };

      const mockSession = {
        id: sessionId,
        userId: 'user123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };

      const publicUser = {
        id: 'user123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
      };

      mockSessionMgr.validateSession.mockResolvedValue(mockSession);
      mockUserRepo.findUserById.mockResolvedValue(publicUser);
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.verifyPassword.mockResolvedValue(true);
      mockPasswordUtils.validatePassword.mockReturnValue({
        isValid: true,
        errors: [],
        strength: 'strong',
      });
      mockUserRepo.updatePassword.mockResolvedValue(undefined);
      mockSessionMgr.destroyAllUserSessions.mockResolvedValue(undefined);
      mockSessionMgr.createSession.mockResolvedValue('new_session123');

      const result = await authService.changePassword(sessionId, currentPassword, newPassword);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('new_session123');
      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith('user123', newPassword);
      expect(mockSessionMgr.destroyAllUserSessions).toHaveBeenCalledWith('user123');
    });

    it('should fail with invalid current password', async () => {
      const sessionId = 'session123';
      const currentPassword = 'WrongPassword123!';
      const newPassword = 'NewPassword123!';

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
      };

      const mockSession = {
        id: sessionId,
        userId: 'user123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };

      const publicUser = {
        id: 'user123',
        email: 'test@example.com',
      };

      mockSessionMgr.validateSession.mockResolvedValue(mockSession);
      mockUserRepo.findUserById.mockResolvedValue(publicUser);
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.verifyPassword.mockResolvedValue(false);

      const result = await authService.changePassword(sessionId, currentPassword, newPassword);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });

    it('should fail with weak new password', async () => {
      const sessionId = 'session123';
      const currentPassword = 'OldPassword123!';
      const newPassword = 'weak';

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
      };

      const mockSession = {
        id: sessionId,
        userId: 'user123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };

      const publicUser = {
        id: 'user123',
        email: 'test@example.com',
      };

      mockSessionMgr.validateSession.mockResolvedValue(mockSession);
      mockUserRepo.findUserById.mockResolvedValue(publicUser);
      mockUserRepo.findUserByEmail.mockResolvedValue(mockUser);
      mockPasswordUtils.verifyPassword.mockResolvedValue(true);
      mockPasswordUtils.validatePassword.mockReturnValue({
        isValid: false,
        errors: ['Password too short'],
        strength: 'weak',
      });

      const result = await authService.changePassword(sessionId, currentPassword, newPassword);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.WEAK_PASSWORD);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const userId = 'user123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        is_email_verified: true,
      };

      mockUserRepo.verifyEmail.mockResolvedValue(mockUser);

      const result = await authService.verifyEmail(userId);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockUserRepo.verifyEmail).toHaveBeenCalledWith(userId);
    });
  });

  describe('rate limiting', () => {
    it('should implement rate limiting after multiple failed attempts', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      mockUserRepo.findUserByEmail.mockResolvedValue({
        id: 'user123',
        email,
        password_hash: 'hashed_password',
      });
      mockPasswordUtils.verifyPassword.mockResolvedValue(false);

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const result = await authService.login(email, password);
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      }

      // 6th attempt should be rate limited
      const result = await authService.login(email, password);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(AuthErrorCode.RATE_LIMITED);
    });
  });
});