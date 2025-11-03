/**
 * Unit tests for UserRepository
 * Note: These are integration tests that require a test database
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from '../user-repository.server';
import type { CreateUserData, UpdateUserData } from '../user-repository.server';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(),
};

// Mock the Supabase client creation
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository = new UserRepository();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        hashedPassword: 'hashedpassword123',
        fullName: 'Test User',
      };

      const mockUserData = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login_at: null,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await userRepository.createUser(userData);

      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login_at: null,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        email: 'test@example.com',
        password_hash: 'hashedpassword123',
        full_name: 'Test User',
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: false,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should throw error for duplicate email', async () => {
      const userData: CreateUserData = {
        email: 'existing@example.com',
        hashedPassword: 'hashedpassword123',
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      await expect(userRepository.createUser(userData)).rejects.toThrow('Email already exists');
    });

    it('should throw error for database failure', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        hashedPassword: 'hashedpassword123',
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(userRepository.createUser(userData)).rejects.toThrow('Failed to create user: Database connection failed');
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const mockUserData = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login_at: null,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await userRepository.findUserByEmail('test@example.com');

      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        last_login_at: null,
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('should return null for non-existent user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const result = await userRepository.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      await userRepository.findUserByEmail('TEST@EXAMPLE.COM');

      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'test@example.com');
    });
  });

  describe('getUserPasswordHash', () => {
    it('should return password hash for existing user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { password_hash: 'hashedpassword123' },
        error: null,
      });

      const result = await userRepository.getUserPasswordHash('test@example.com');

      expect(result).toBe('hashedpassword123');
      expect(mockSupabase.select).toHaveBeenCalledWith('password_hash');
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('should return null for non-existent user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const result = await userRepository.getUserPasswordHash('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData: UpdateUserData = {
        fullName: 'Updated Name',
        isEmailVerified: true,
      };

      const mockUpdatedUser = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Updated Name',
        avatar_url: null,
        subscription_tier: 'free',
        subscription_status: 'active',
        is_email_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
        last_login_at: null,
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedUser,
        error: null,
      });

      const result = await userRepository.updateUser('123', updateData);

      expect(result.full_name).toBe('Updated Name');
      expect(result.is_email_verified).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        updated_at: expect.any(String),
        full_name: 'Updated Name',
        is_email_verified: true,
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123');
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: '123' },
        error: null,
      });

      const result = await userRepository.emailExists('test@example.com');

      expect(result).toBe(true);
      expect(mockSupabase.select).toHaveBeenCalledWith('id');
      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('should return false for non-existent email', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const result = await userRepository.emailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockSupabase.update.mockResolvedValue({
        error: null,
      });

      await userRepository.updateLastLogin('123');

      expect(mockSupabase.update).toHaveBeenCalledWith({
        last_login_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123');
    });

    it('should not throw error if update fails', async () => {
      mockSupabase.update.mockResolvedValue({
        error: { message: 'Update failed' },
      });

      // Should not throw
      await expect(userRepository.updateLastLogin('123')).resolves.toBeUndefined();
    });
  });
});