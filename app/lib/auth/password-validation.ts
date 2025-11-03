/**
 * Client-safe password validation utilities
 * These functions can be used on both client and server for form validation
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number;
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
}

/**
 * Validate password strength (client-safe version)
 * @param password - Password to validate
 * @returns PasswordValidationResult
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Maximum length check
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }

  // Contains lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Contains uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Contains number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Contains special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Check for common weak patterns
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111, etc.)
    /123456|654321|qwerty|password|admin/i, // Common weak passwords
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common weak patterns');
      score = Math.max(0, score - 1);
      break;
    }
  }

  // Determine strength based on score
  let strength: PasswordValidationResult['strength'];
  if (score <= 1) {
    strength = 'very-weak';
  } else if (score <= 2) {
    strength = 'weak';
  } else if (score <= 3) {
    strength = 'fair';
  } else if (score <= 4) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(5, score),
    strength,
  };
}

/**
 * Validate that passwords match
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns boolean
 */
export function validatePasswordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

/**
 * Get password strength color for UI
 * @param strength - Password strength level
 * @returns string - CSS color class or hex color
 */
export function getPasswordStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-weak':
      return '#ef4444'; // red-500
    case 'weak':
      return '#f97316'; // orange-500
    case 'fair':
      return '#eab308'; // yellow-500
    case 'good':
      return '#22c55e'; // green-500
    case 'strong':
      return '#16a34a'; // green-600
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get password strength text for UI
 * @param strength - Password strength level
 * @returns string - Human readable strength text
 */
export function getPasswordStrengthText(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-weak':
      return 'Very Weak';
    case 'weak':
      return 'Weak';
    case 'fair':
      return 'Fair';
    case 'good':
      return 'Good';
    case 'strong':
      return 'Strong';
    default:
      return 'Unknown';
  }
}