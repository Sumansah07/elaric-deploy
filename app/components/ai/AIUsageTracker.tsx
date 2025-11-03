/**
 * AI Usage Tracker Component
 * Displays AI usage statistics and cost tracking
 */

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '~/lib/auth/auth-provider';
import { UsageProgressBar } from '../billing/UsageLimitWarning';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AIUsageData {
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  assistantMessageCount: number;
  userMessageCount: number;
  sessionCount: number;
  modelUsage: Record<string, number>;
  dailyUsage: Record<string, { tokens: number; cost: number; messages: number }>;
  avgResponseTime: number;
  timeframe: string;
}

interface AIUsageTrackerProps {
  projectId?: string;
  className?: string;
}

export function AIUsageTracker({ projectId, className = '' }: AIUsageTrackerProps) {
  const { usageLimits, hasReachedLimit } = useAuthContext();
  const [usageData, setUsageData] = useState<AIUsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');
  const [showDetails, setShowDetails] = useState(false);

  // Load usage data
  useEffect(() => {
    loadUsageData();
  }, [projectId, timeframe]);

  const loadUsageData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ timeframe });
      if (projectId) params.set('projectId', projectId);

      const response = await fetch(`/api/chat/usage-stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      }
    } catch (error) {
      console.error('Error loading AI usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format cost
  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`;
  };

  // Format number
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Get daily usage chart data
  const getDailyChartData = () => {
    if (!usageData?.dailyUsage) return [];

    const sortedDays = Object.keys(usageData.dailyUsage).sort();
    const last7Days = sortedDays.slice(-7);

    return last7Days.map(date => ({
      date,
      ...usageData.dailyUsage[date],
    }));
  };

  const chartData = getDailyChartData();
  const maxDailyTokens = Math.max(...chartData.map(d => d.tokens), 1);

  return (
    <div className={`bg-bolt-elements-background-depth-2 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">
          AI Usage Tracking
        </h3>
        <div className="flex items-center space-x-2">
          {loading && <LoadingSpinner size="sm" />}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="text-sm bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded px-2 py-1"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Usage Progress */}
      <div className="mb-6">
        <UsageProgressBar
          label="AI Generations"
          used={usageLimits?.aiGenerationsCount || 0}
          max={usageLimits?.maxAiGenerations || 100}
        />
        <div className="flex justify-between text-sm text-bolt-elements-textSecondary mt-2">
          <span>
            {hasReachedLimit('ai_generations') ? 'Limit reached' : 'Within limits'}
          </span>
          <span className={hasReachedLimit('ai_generations') ? 'text-red-600' : ''}>
            {usageLimits?.aiGenerationsCount || 0} / {usageLimits?.maxAiGenerations || 100}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      {usageData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-bolt-elements-textPrimary">
              {formatNumber(usageData.assistantMessageCount)}
            </div>
            <div className="text-xs text-bolt-elements-textSecondary">AI Responses</div>
          </div>
          <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-bolt-elements-textPrimary">
              {formatNumber(usageData.totalTokens)}
            </div>
            <div className="text-xs text-bolt-elements-textSecondary">Tokens Used</div>
          </div>
          <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-bolt-elements-textPrimary">
              {formatCost(usageData.totalCost)}
            </div>
            <div className="text-xs text-bolt-elements-textSecondary">Total Cost</div>
          </div>
          <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-bolt-elements-textPrimary">
              {usageData.avgResponseTime > 0 
                ? `${(usageData.avgResponseTime / 1000).toFixed(1)}s`
                : 'N/A'
              }
            </div>
            <div className="text-xs text-bolt-elements-textSecondary">Avg Response</div>
          </div>
        </div>
      )}

      {/* Daily Usage Chart */}
      {chartData.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-bolt-elements-textPrimary mb-3">
            Daily Token Usage (Last 7 Days)
          </h4>
          <div className="flex items-end space-x-1 h-24">
            {chartData.map((day, index) => (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-600 rounded-t transition-all duration-300 hover:bg-blue-700"
                  style={{
                    height: `${Math.max((day.tokens / maxDailyTokens) * 100, 2)}%`,
                  }}
                  title={`${day.date}: ${formatNumber(day.tokens)} tokens, ${formatCost(day.cost)}`}
                />
                <div className="text-xs text-bolt-elements-textSecondary mt-1 transform -rotate-45 origin-top-left">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center justify-between w-full text-left mb-4"
      >
        <h4 className="font-medium text-bolt-elements-textPrimary">
          Detailed Analytics
        </h4>
        <div className={`i-ph:caret-down text-sm transition-transform ${showDetails ? 'rotate-180' : ''}`} />
      </button>

      {/* Detailed Analytics */}
      {showDetails && usageData && (
        <div className="space-y-4">
          {/* Model Usage */}
          {Object.keys(usageData.modelUsage).length > 0 && (
            <div>
              <h5 className="font-medium text-bolt-elements-textPrimary mb-2">
                Model Usage Distribution
              </h5>
              <div className="space-y-2">
                {Object.entries(usageData.modelUsage)
                  .sort(([,a], [,b]) => b - a)
                  .map(([model, count]) => {
                    const percentage = (count / usageData.assistantMessageCount) * 100;
                    return (
                      <div key={model} className="flex items-center space-x-3">
                        <div className="w-20 text-sm text-bolt-elements-textSecondary">
                          {model}
                        </div>
                        <div className="flex-1 bg-bolt-elements-background-depth-1 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-16 text-sm text-bolt-elements-textPrimary text-right">
                          {formatNumber(count)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Usage Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3">
              <h6 className="font-medium text-bolt-elements-textPrimary mb-2">
                Message Breakdown
              </h6>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-bolt-elements-textSecondary">User Messages:</span>
                  <span className="text-bolt-elements-textPrimary">
                    {formatNumber(usageData.userMessageCount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bolt-elements-textSecondary">AI Responses:</span>
                  <span className="text-bolt-elements-textPrimary">
                    {formatNumber(usageData.assistantMessageCount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bolt-elements-textSecondary">Total Messages:</span>
                  <span className="text-bolt-elements-textPrimary font-medium">
                    {formatNumber(usageData.messageCount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3">
              <h6 className="font-medium text-bolt-elements-textPrimary mb-2">
                Cost Analysis
              </h6>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-bolt-elements-textSecondary">Total Cost:</span>
                  <span className="text-bolt-elements-textPrimary">
                    {formatCost(usageData.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bolt-elements-textSecondary">Cost per Message:</span>
                  <span className="text-bolt-elements-textPrimary">
                    {usageData.assistantMessageCount > 0 
                      ? formatCost(usageData.totalCost / usageData.assistantMessageCount)
                      : '$0.0000'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bolt-elements-textSecondary">Cost per Token:</span>
                  <span className="text-bolt-elements-textPrimary">
                    {usageData.totalTokens > 0 
                      ? `$${(usageData.totalCost / usageData.totalTokens).toFixed(6)}`
                      : '$0.000000'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}