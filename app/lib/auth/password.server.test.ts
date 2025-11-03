/**
 * Unit tests for password security utilities
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  generateSecurePassword,
  checkPasswordCompromised,
  getPasswordRequirements,
} from './password.server';

describe('Password Security Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password is required');
    });

    it('should throw error for password that is too long', async () => {
      const longPassword = 'a'.repeat(129);
      await expect(hashPassword(longPassword)).rejects.toThrow('Password must be no more than 128 characters');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword('TestPassword123!');
      const isValid = await verifyPassword('', hash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await verifyPassword('TestPassword123!', '');
      expect(isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = validatePassword('StrongSecret123!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
    });

    it('should reject password that is too short', () => {
      const result = validatePassword('Short1!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('lowercase123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('UPPERCASE123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without numbers', () => {
      const result = validatePassword('NoNumbers!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password containing "password"', () => {
      const result = validatePassword('MyPassword123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain the word "password"');
    });

    it('should reject password with all same characters', () => {
      const result = validatePassword('aaaaaaaa');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot be all the same character');
    });

    it('should reject sequential characters', () => {
      const result = validatePassword('123456789');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain sequential characters');
    });

    it('should return empty password error', () => {
      const result = validatePassword('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should calculate strong password strength', () => {
      const result = validatePassword('VeryStrongSecret123!@#$');
      
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = generateSecurePassword(12);
      expect(password.length).toBe(12);
    });

    it('should generate password with default length', () => {
      const password = generateSecurePassword();
      expect(password.length).toBe(16);
    });

    it('should generate password with required character types', () => {
      const password = generateSecurePassword(16);
      
      expect(/[A-Z]/.test(password)).toBe(true); // uppercase
      expect(/[a-z]/.test(password)).toBe(true); // lowercase
      expect(/\d/.test(password)).toBe(true); // numbers
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true); // symbols
    });

    it('should generate different passwords each time', () => {
      const password1 = generateSecurePassword(16);
      const password2 = generateSecurePassword(16);
      
      expect(password1).not.toBe(password2);
    });

    it('should generate valid password according to validation rules', () => {
      const password = generateSecurePassword(16);
      const validation = validatePassword(password);
      
      expect(validation.isValid).toBe(true);
    });
  });

  describe('checkPasswordCompromised', () => {
    it('should detect common compromised passwords', async () => {
      const isCompromised = await checkPasswordCompromised('password');
      expect(isCompromised).toBe(true);
    });

    it('should detect common compromised passwords case-insensitive', async () => {
      const isCompromised = await checkPasswordCompromised('PASSWORD');
      expect(isCompromised).toBe(true);
    });

    it('should not flag secure passwords as compromised', async () => {
      const isCompromised = await checkPasswordCompromised('SecurePassword123!');
      expect(isCompromised).toBe(false);
    });
  });

  describe('getPasswordRequirements', () => {
    it('should return password requirements object', () => {
      const requirements = getPasswordRequirements();
      
      expect(requirements).toHaveProperty('minLength');
      expect(requirements).toHaveProperty('maxLength');
      expect(requirements).toHaveProperty('requireUppercase');
      expect(requirements).toHaveProperty('requireLowercase');
      expect(requirements).toHaveProperty('requireNumbers');
      expect(requirements).toHaveProperty('requireSpecialChars');
      
      expect(requirements.minLength).toBe(8);
      expect(requirements.maxLength).toBe(128);
    });
  });
});