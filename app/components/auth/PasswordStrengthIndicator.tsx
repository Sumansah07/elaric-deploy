/**
 * Password strength indicator component
 */

import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const metRequirements = Object.values(requirements).filter(Boolean).length;
  let score = 0;
  let label = 'Very Weak';
  let color = 'bg-red-500';

  if (metRequirements >= 5 && password.length >= 12) {
    score = 4;
    label = 'Very Strong';
    color = 'bg-green-500';
  } else if (metRequirements >= 4 && password.length >= 10) {
    score = 3;
    label = 'Strong';
    color = 'bg-green-400';
  } else if (metRequirements >= 3 && password.length >= 8) {
    score = 2;
    label = 'Medium';
    color = 'bg-yellow-500';
  } else if (metRequirements >= 2) {
    score = 1;
    label = 'Weak';
    color = 'bg-orange-500';
  }

  return { score, label, color, requirements };
}

export function PasswordStrengthIndicator({ password, className = '' }: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength bar */}
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded-full ${
              level <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Strength label */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Password strength: <span className={`${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1 text-xs">
        <div className={`flex items-center ${strength.requirements.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className="mr-2">{strength.requirements.length ? '✓' : '○'}</span>
          At least 8 characters
        </div>
        <div className={`flex items-center ${strength.requirements.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className="mr-2">{strength.requirements.uppercase ? '✓' : '○'}</span>
          One uppercase letter
        </div>
        <div className={`flex items-center ${strength.requirements.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className="mr-2">{strength.requirements.lowercase ? '✓' : '○'}</span>
          One lowercase letter
        </div>
        <div className={`flex items-center ${strength.requirements.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className="mr-2">{strength.requirements.number ? '✓' : '○'}</span>
          One number
        </div>
        <div className={`flex items-center ${strength.requirements.special ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className="mr-2">{strength.requirements.special ? '✓' : '○'}</span>
          One special character
        </div>
      </div>
    </div>
  );
}