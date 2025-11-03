/**
 * Usage Display Component
 * Shows user's token usage, costs, and limits for billing
 */

import { useEffect, useState } from 'react';
import type { UserUsage } from '~/lib/services/usage-analytics.types';

interface UsageDisplayProps {
  userId: string;
  userTier: 'free' | 'pro' | 'enterprise';
}

export function UsageDisplay({ userId, userTier }: UsageDisplayProps) {
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsage() {
      try {
        const response = await fetch(`/api/usage?userId=${userId}&tier=${userTier}`);
        const data = await response.json();
        
        if (response.ok) {
          setUsage(data.usage);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to load usage data');
      } finally {
        setLoading(false);
      }
    }

    loadUsage();
  }, [userId, userTier]);

  if (loading) {
    return <div className="animate-pulse">Loading usage...</div>;
  }

  if (error || !usage) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  const tierLimits = {
    free: 100000,
    pro: 1000000,
    enterprise: 10000000,
  };

  const limit = tierLimits[userTier];
  const percentage = (usage.tokensThisMonth / limit) * 100;

  return (
    <div className="space-y-4 p-4 bg-bolt-elements-background-depth-2 rounded-lg">
      <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">
        Usage Statistics
      </h3>

      {/* Token Usage Progress */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-bolt-elements-textSecondary">Tokens This Month</span>
          <span className="text-bolt-elements-textPrimary font-medium">
            {usage.tokensThisMonth.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-bolt-elements-background-depth-3 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              percentage >= 90
                ? 'bg-red-500'
                : percentage >= 70
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-bolt-elements-textSecondary mt-1">
          {percentage.toFixed(1)}% used
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bolt-elements-background-depth-3 p-3 rounded">
          <div className="text-xs text-bolt-elements-textSecondary">Total Messages</div>
          <div className="text-2xl font-bold text-bolt-elements-textPrimary">
            {usage.messagesThisMonth}
          </div>
        </div>

        <div className="bg-bolt-elements-background-depth-3 p-3 rounded">
          <div className="text-xs text-bolt-elements-textSecondary">Projects</div>
          <div className="text-2xl font-bold text-bolt-elements-textPrimary">
            {usage.totalProjects}
          </div>
        </div>
      </div>

      {/* Model Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-bolt-elements-textPrimary mb-2">
          Model Usage
        </h4>
        <div className="space-y-2">
          {usage.modelBreakdown.map((model) => (
            <div
              key={model.model}
              className="flex justify-between items-center text-sm"
            >
              <span className="text-bolt-elements-textSecondary">{model.model}</span>
              <div className="text-right">
                <div className="text-bolt-elements-textPrimary font-medium">
                  {model.tokens.toLocaleString()} tokens
                </div>
                <div className="text-xs text-bolt-elements-textTertiary">
                  ${model.cost.toFixed(4)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warning if approaching limit */}
      {percentage >= 80 && (
        <div className={`p-3 rounded ${percentage >= 90 ? 'bg-red-900/20 border border-red-500' : 'bg-yellow-900/20 border border-yellow-500'}`}>
          <p className={`text-sm ${percentage >= 90 ? 'text-red-400' : 'text-yellow-400'}`}>
            ⚠️ You've used {percentage.toFixed(1)}% of your monthly tokens.
            {userTier === 'free' && ' Consider upgrading to Pro for higher limits.'}
          </p>
        </div>
      )}
    </div>
  );
}
