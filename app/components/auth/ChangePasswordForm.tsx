/**
 * Change password form component
 */

import React from 'react';
import { useChangePasswordForm } from '~/lib/auth/auth-hooks';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function ChangePasswordForm({ onSuccess, onCancel, className = '' }: ChangePasswordFormProps) {
  const { formData, handleChange, handleSubmit, reset, isLoading, error } = useChangePasswordForm();

  const onSubmit = async (e: React.FormEvent) => {
    const result = await handleSubmit(e);
    if (result.success) {
      reset();
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const handleCancel = () => {
    reset();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={formData.currentPassword}
            onChange={(e) => handleChange('currentPassword', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter your current password"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            value={formData.newPassword}
            onChange={(e) => handleChange('newPassword', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter your new password"
            disabled={isLoading}
          />
          {formData.newPassword && (
            <PasswordStrengthIndicator password={formData.newPassword} className="mt-2" />
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Confirm your new password"
            disabled={isLoading}
          />
          {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Passwords do not match
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading || formData.newPassword !== formData.confirmPassword || !formData.currentPassword}
            className="flex-1 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Changing...
              </>
            ) : (
              'Change Password'
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}