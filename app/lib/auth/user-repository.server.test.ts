/**
 * Unit tests for user repository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository, type CreateUserData, type UpdateUserData } from './user-repository.server';

// Mock the database connection
vi.mock('../database/connection.server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        ilike: vi.fn(() => ({
          limit: vi.fn(() => ({
            order: vi.fn(),
          })),
        })),
        not: vi.fn(),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
  executeWithRetry: vi.fn((fn) => fn()),
}));

// Mock password hashing
vi.mock('./password.server', () => ({
  hashPassword: vi.fn((password) => Promise.resolve(`hashed_${password}`)),
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository = new UserRepository();
    
    // Get the mocked supabase instance
    const { supabaseAdmin } = require('../database/connection.server');
    mockSupabase = supabaseAdmin;
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        full_name: 'Test User',
      };

      const expectedUser = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
      };

      // Mock findUserByEmail to return null (user doesn't exist)
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: expectedUser, error: null }),
          }),
        }),
      });

      const result = await userRepository.createUser(userData);

      expect(result).toEqual(expectedUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should throw error if user already exists', async () => {
      const userData: CreateUserData = {
        email: 'existing@example.com',
        password: 'TestPassword123!',
      };

      const existingUser = {
        id: '123',
        email: 'existing@example.com',
        password_hash: 'hashed_password',
      };

      // Mock findUserByEmail to return existing user
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingUser, error: null }),
          }),
        }),
      });

      await expect(userRepository.createUser(userData)).rejects.toThrow('User with this email already exists');
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const email = 'test@example.com';
      const expectedUser = {
        id: '123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: expectedUser, error: null }),
          }),
        }),
      });

      const result = await userRepository.findUserByEmail(email);

      expect(result).toEqual(expectedUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should return null if user not found', async () => {
      const email = 'nonexistent@example.com';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });

      const result = await userRepository.findUserByEmail(email);

      expect(result).toBeNull();
    });

    it('should return null for empty email', async () => {
      const result = await userRepository.findUserByEmail('');
      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should find user by ID', async () => {
      const userId = '123';
      const expectedUser = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: expectedUser, error: null }),
          }),
        }),
      });

      const result = await userRepository.findUserById(userId);

      expect(result).toEqual(expectedUser);
    });

    it('should return null if user not found', async () => {
      const userId = 'nonexistent';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });

      const result = await userRepository.findUserById(userId);

      expect(result).toBeNull();
    });

    it('should return null for empty ID', async () => {
      const result = await userRepository.findUserById('');
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = '123';
      const updates: UpdateUserData = {
        full_name: 'Updated Name',
        is_email_verified: true,
      };

      const expectedUser = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Updated Name',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z',
        last_login_at: null,
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: expectedUser, error: null }),
            }),
          }),
        }),
      });

      const result = await userRepository.updateUser(userId, updates);

      expect(result).toEqual(expectedUser);
    });

    it('should throw error for empty user ID', async () => {
      const updates: UpdateUserData = { full_name: 'Test' };

      await expect(userRepository.updateUser('', updates)).rejects.toThrow('User ID is required');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const userId = '123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(userRepository.updateLastLogin(userId)).resolves.not.toThrow();
    });

    it('should handle empty user ID gracefully', async () => {
      await expect(userRepository.updateLastLogin('')).resolves.not.toThrow();
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email', async () => {
      const userId = '123';
      const expectedUser = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z',
        last_login_at: null,
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: expectedUser, error: null }),
            }),
          }),
        }),
      });

      const result = await userRepository.verifyEmail(userId);

      expect(result).toEqual(expectedUser);
      expect(result.is_email_verified).toBe(true);
    });

    it('should throw error for empty user ID', async () => {
      await expect(userRepository.verifyEmail('')).rejects.toThrow('User ID is required');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = '123';

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(userRepository.deleteUser(userId)).resolves.not.toThrow();
    });

    it('should throw error for empty user ID', async () => {
      await expect(userRepository.deleteUser('')).rejects.toThrow('User ID is required');
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics', async () => {
      const userId = '123';
      const expectedStats = {
        projects_created: 5,
        ai_generations_count: 100,
        storage_used_bytes: 1024000,
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: expectedStats, error: null }),
          }),
        }),
      });

      const result = await userRepository.getUserStats(userId);

      expect(result).toEqual(expectedStats);
    });

    it('should return null for empty user ID', async () => {
      const result = await userRepository.getUserStats('');
      expect(result).toBeNull();
    });
  });

  describe('searchUsersByEmail', () => {
    it('should search users by email pattern', async () => {
      const emailPattern = 'test';
      const expectedUsers = [
        {
          id: '123',
          email: 'test1@example.com',
          full_name: 'Test User 1',
        },
        {
          id: '124',
          email: 'test2@example.com',
          full_name: 'Test User 2',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: expectedUsers, error: null }),
            }),
          }),
        }),
      });

      const result = await userRepository.searchUsersByEmail(emailPattern);

      expect(result).toEqual(expectedUsers);
    });

    it('should return empty array for empty pattern', async () => {
      const result = await userRepository.searchUsersByEmail('');
      expect(result).toEqual([]);
    });
  });
});