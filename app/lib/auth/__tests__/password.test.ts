/**
 * Unit tests for password utilities
 */

import { describe, it, expect } from 'vitest';
import { validatePassword, validatePasswordsMatch, getPasswordStrengthColor, getPasswordStrengthText } from '../password-validation';

describe('Password Validation', () => {
  describe('validatePassword', () => {
    it('should reject passwords that are too short', () => {
      const result = validatePassword('short');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.strength).toBe('very-weak');
    });

    it('should reject passwords that are too long', () => {
      const longPassword = 'a'.repeat(129);
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters long');
    });

    it('should require lowercase letters', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require uppercase letters', () => {
      const result = validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require numbers', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special characters', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common weak patterns', () => {
      const weakPasswords = ['Password123', 'qwerty123!', '123456aA!'];
      
      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        if (password.includes('qwerty') || password.includes('123456')) {
          expect(result.errors).toContain('Password contains common weak patterns');
        }
      });
    });

    it('should accept strong passwords', () => {
      const strongPassword = 'MyStr0ng!P@ssw0rd';
      const result = validatePassword(strongPassword);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
      expect(result.score).toBe(5);
    });

    it('should correctly calculate password strength scores', () => {
      const testCases = [
        { password: 'weak', expectedStrength: 'very-weak' },
        { password: 'weakpass', expectedStrength: 'weak' },
        { password: 'Weakpass', expectedStrength: 'fair' },
        { password: 'Weakpass1', expectedStrength: 'good' },
        { password: 'Weakpass1!', expectedStrength: 'strong' },
      ];

      testCases.forEach(({ password, expectedStrength }) => {
        const result = validatePassword(password);
        expect(result.strength).toBe(expectedStrength);
      });
    });
  });

  describe('validatePasswordsMatch', () => {
    it('should return true for matching passwords', () => {
      const password = 'MyStr0ng!P@ssw0rd';
      const confirmPassword = 'MyStr0ng!P@ssw0rd';
      expect(validatePasswordsMatch(password, confirmPassword)).toBe(true);
    });

    it('should return false for non-matching passwords', () => {
      const password = 'MyStr0ng!P@ssw0rd';
      const confirmPassword = 'DifferentP@ssw0rd';
      expect(validatePasswordsMatch(password, confirmPassword)).toBe(false);
    });

    it('should return false for empty passwords', () => {
      expect(validatePasswordsMatch('', 'password')).toBe(false);
      expect(validatePasswordsMatch('password', '')).toBe(false);
    });
  });

  describe('getPasswordStrengthColor', () => {
    it('should return correct colors for each strength level', () => {
      expect(getPasswordStrengthColor('very-weak')).toBe('#ef4444');
      expect(getPasswordStrengthColor('weak')).toBe('#f97316');
      expect(getPasswordStrengthColor('fair')).toBe('#eab308');
      expect(getPasswordStrengthColor('good')).toBe('#22c55e');
      expect(getPasswordStrengthColor('strong')).toBe('#16a34a');
    });
  });

  describe('getPasswordStrengthText', () => {
    it('should return correct text for each strength level', () => {
      expect(getPasswordStrengthText('very-weak')).toBe('Very Weak');
      expect(getPasswordStrengthText('weak')).toBe('Weak');
      expect(getPasswordStrengthText('fair')).toBe('Fair');
      expect(getPasswordStrengthText('good')).toBe('Good');
      expect(getPasswordStrengthText('strong')).toBe('Strong');
    });
  });
});