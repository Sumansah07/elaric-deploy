/**
 * Upgrade Prompt Component
 * Shown when user hits generation limits
 */

import React from 'react';

interface UpgradePromptProps {
  message: string;
  onUpgrade: () => void;
}

export function UpgradePrompt({ message, onUpgrade }: UpgradePromptProps) {
  return (
    <div className="flex items-center justify-center p-6 my-4">
      <div className="bg-bolt-elements-background-depth-2 border-2 border-yellow-500 rounded-lg p-6 max-w-2xl w-full">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="i-ph:warning text-4xl text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-2">
              Generation Limit Reached
            </h3>
            <p className="text-bolt-elements-textSecondary mb-4">
              {message}
            </p>
            <button
              onClick={onUpgrade}
              className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <div className="i-ph:crown text-xl" />
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
