/**
 * Registration form component
 */

import * as React from 'react';
import { useAuth } from '~/lib/auth/auth-context';
import { validatePassword, validatePasswordsMatch } from '~/lib/auth/password-validation';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { LoadingSpinner } from '~/components/ui/LoadingSpinner';

interface RegisterFormProps {
  onSuccess?: () => void;
  returnTo?: string;
}

export function RegisterForm({ onSuccess, returnTo }: RegisterFormProps) {
  const { register, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    rememberMe: false,
  });

  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [showPasswordStrength, setShowPasswordStrength] = React.useState(false);

  const passwordValidation = React.useMemo(() => {
    return validatePassword(formData.password);
  }, [formData.password]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Show password strength when user starts typing password
    if (name === 'password') {
      setShowPasswordStrength(value.length > 0);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (!validatePasswordsMatch(formData.password, formData.confirmPassword)) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Full name validation (optional but if provided, should be valid)
    if (formData.fullName.trim().length > 100) {
      errors.fullName = 'Full name must be less than 100 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    const result = await register(
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.fullName || undefined,
      formData.rememberMe
    );

    if (result.success) {
      onSuccess?.();
      if (returnTo) {
        window.location.href = returnTo;
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-bolt-elements-background-depth-2 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-2">
            Create Account
          </h1>
          <p className="text-bolt-elements-textSecondary">
            Sign up to get started with Bolt AI
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
              Full Name (Optional)
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.fullName
                  ? 'border-red-300 bg-red-50'
                  : 'border-bolt-elements-borderColor bg-bolt-elements-background-depth-1'
              } text-bolt-elements-textPrimary`}
              placeholder="Enter your full name"
              disabled={isLoading}
            />
            {formErrors.fullName && (
              <p className="mt-1 text-sm text-red-600">{formErrors.fullName}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.email
                  ? 'border-red-300 bg-red-50'
                  : 'border-bolt-elements-borderColor bg-bolt-elements-background-depth-1'
              } text-bolt-elements-textPrimary`}
              placeholder="Enter your email"
              disabled={isLoading}
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.password
                  ? 'border-red-300 bg-red-50'
                  : 'border-bolt-elements-borderColor bg-bolt-elements-background-depth-1'
              } text-bolt-elements-textPrimary`}
              placeholder="Create a strong password"
              disabled={isLoading}
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
            )}
            {showPasswordStrength && (
              <div className="mt-2">
                <PasswordStrengthIndicator 
                  password={formData.password}
                  validation={passwordValidation}
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.confirmPassword
                  ? 'border-red-300 bg-red-50'
                  : 'border-bolt-elements-borderColor bg-bolt-elements-background-depth-1'
              } text-bolt-elements-textPrimary`}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
            {formErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-bolt-elements-borderColor rounded"
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-bolt-elements-textSecondary">
              Keep me signed in
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-bolt-elements-textSecondary">
            Already have an account?{' '}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}