/**
 * Usage Limit Warning Component
 * Shows warnings when users approach or exceed their limits
 */

import React from 'react';
import { useAuthContext } from '~/lib/auth/auth-provider';

interface UsageLimitWarningProps {
  limitType: 'projects' | 'ai_generations' | 'storage';
  onUpgrade?: () => void;
}

export function UsageLimitWarning({ limitType, onUpgrade }: UsageLimitWarningProps) {
  const { usageLimits, hasReachedLimit } = useAuthContext();

  if (!usageLimits) return null;

  const isAtLimit = hasReachedLimit(limitType);
  const isNearLimit = (() => {
    switch (limitType) {
      case 'projects':
        return usageLimits.projectsCreated / usageLimits.maxProjects >= 0.8;
      case 'ai_generations':
        return usageLimits.aiGenerationsCount / usageLimits.maxAiGenerations >= 0.8;
      case 'storage':
        return parseFloat(usageLimits.storageUsedGB) / usageLimits.maxStorageGB >= 0.8;
      default:
        return false;
    }
  })();

  if (!isAtLimit && !isNearLimit) return null;

  const getLimitInfo = () => {
    switch (limitType) {
      case 'projects':
        return {
          title: 'Project Limit',
          message: isAtLimit
            ? `You've reached your limit of ${usageLimits.maxProjects} projects`
            : `You're using ${usageLimits.projectsCreated} of ${usageLimits.maxProjects} projects`,
          icon: 'i-ph:folder',
          color: isAtLimit ? 'red' : 'yellow',
        };
      case 'ai_generations':
        return {
          title: 'AI Generation Limit',
          message: isAtLimit
            ? `You've reached your limit of ${usageLimits.maxAiGenerations} AI generations this month`
            : `You're using ${usageLimits.aiGenerationsCount} of ${usageLimits.maxAiGenerations} AI generations`,
          icon: 'i-ph:robot',
          color: isAtLimit ? 'red' : 'yellow',
        };
      case 'storage':
        return {
          title: 'Storage Limit',
          message: isAtLimit
            ? `You've reached your storage limit of ${usageLimits.maxStorageGB} GB`
            : `You're using ${usageLimits.storageUsedGB} of ${usageLimits.maxStorageGB} GB`,
          icon: 'i-ph:hard-drive',
          color: isAtLimit ? 'red' : 'yellow',
        };
      default:
        return null;
    }
  };

  const limitInfo = getLimitInfo();
  if (!limitInfo) return null;

  const colorClasses = {
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700',
    },
  };

  const colors = colorClasses[limitInfo.color];

  return (
    <div className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start">
        <div className={`${limitInfo.icon} text-xl ${colors.icon} mr-3 mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${colors.text}`}>
            {limitInfo.title} {isAtLimit ? 'Reached' : 'Warning'}
          </h3>
          <p className={`text-sm mt-1 ${colors.text}`}>
            {limitInfo.message}
            {isAtLimit && ' Upgrade to continue using this feature.'}
          </p>
          {onUpgrade && (
            <div className="mt-3">
              <button
                onClick={onUpgrade}
                className={`text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ${colors.button}`}
              >
                Upgrade Plan
              </button>
            </div>
          )}
        </div>
        <button
          className={`${colors.text} hover:opacity-75 transition-opacity ml-2`}
          onClick={() => {
            // Hide warning (could implement local storage to remember dismissal)
          }}
        >
          <div className="i-ph:x text-lg" />
        </button>
      </div>
    </div>
  );
}

/**
 * Usage Progress Bar Component
 * Shows visual progress towards limits
 */
interface UsageProgressBarProps {
  label: string;
  used: number;
  max: number;
  unit?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export function UsageProgressBar({ 
  label, 
  used, 
  max, 
  unit = '', 
  color = 'blue' 
}: UsageProgressBarProps) {
  const percentage = Math.min((used / max) * 100, 100);
  
  const getColor = () => {
    if (percentage >= 100) return 'red';
    if (percentage >= 80) return 'yellow';
    if (percentage >= 60) return 'green';
    return 'blue';
  };

  const actualColor = color === 'blue' ? getColor() : color;

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-bolt-elements-textPrimary">
          {label}
        </span>
        <span className="text-sm text-bolt-elements-textSecondary">
          {used}{unit} / {max}{unit}
        </span>
      </div>
      <div className="w-full bg-bolt-elements-background-depth-3 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClasses[actualColor]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {percentage >= 80 && (
        <p className="text-xs text-bolt-elements-textSecondary">
          {percentage >= 100 ? 'Limit reached' : 'Approaching limit'}
        </p>
      )}
    </div>
  );
}