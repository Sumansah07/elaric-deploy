/**
 * Chat Manager Component
 * Provides chat history management and AI usage analytics
 */

import React, { useState, useEffect } from 'react';
import { chatPersistence, type ChatMessage } from '~/lib/stores/chat-persistence';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { UsageProgressBar } from '../billing/UsageLimitWarning';

interface ChatManagerProps {
  projectId: string;
  userId: string;
  className?: string;
}

interface AIUsageStats {
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  assistantMessageCount: number;
  userMessageCount: number;
  sessionCount: number;
  modelUsage: Record<string, number>;
  avgResponseTime: number;
}

export function ChatManager({ projectId, userId, className = '' }: ChatManagerProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [usageStats, setUsageStats] = useState<AIUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');

  // Initialize chat persistence
  useEffect(() => {
    const initializeChat = async () => {
      setLoading(true);
      try {
        await chatPersistence.initialize(projectId, userId);
        await loadChatHistory();
        await loadUsageStats();
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    // Cleanup on unmount
    return () => {
      chatPersistence.cleanup();
    };
  }, [projectId, userId]);

  // Load chat history
  const loadChatHistory = async () => {
    try {
      const history = await chatPersistence.getChatHistory();
      setChatHistory(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Load usage statistics
  const loadUsageStats = async () => {
    try {
      const stats = await chatPersistence.getAIUsageStats();
      setUsageStats(stats as AIUsageStats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  // Search chat messages
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await chatPersistence.searchMessages(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export chat history
  const handleExport = async (format: 'json' | 'markdown' | 'txt') => {
    try {
      const exportData = await chatPersistence.exportChatHistory(format);
      const blob = new Blob([exportData], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${projectId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting chat history:', error);
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

  return (
    <div className={`bg-bolt-elements-background-depth-2 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">
          Chat & AI Management
        </h3>
        {loading && <LoadingSpinner size="sm" />}
      </div>

      {/* Quick Stats */}
      {usageStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3">
            <div className="text-sm text-bolt-elements-textSecondary">Messages</div>
            <div className="text-xl font-bold text-bolt-elements-textPrimary">
              {formatNumber(usageStats.messageCount)}
            </div>
          </div>
          <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3">
            <div className="text-sm text-bolt-elements-textSecondary">AI Responses</div>
            <div className="text-xl font-bold text-bolt-elements-textPrimary">
              {formatNumber(usageStats.assistantMessageCount)}
            </div>
          </div>
          <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3">
            <div className="text-sm text-bolt-elements-textSecondary">Tokens Used</div>
            <div className="text-xl font-bold text-bolt-elements-textPrimary">
              {formatNumber(usageStats.totalTokens)}
            </div>
          </div>
          <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3">
            <div className="text-sm text-bolt-elements-textSecondary">Total Cost</div>
            <div className="text-xl font-bold text-bolt-elements-textPrimary">
              {formatCost(usageStats.totalCost)}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search chat messages..."
            className="flex-1 px-3 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg text-bolt-elements-textPrimary placeholder-bolt-elements-textSecondary focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <div className="i-ph:magnifying-glass text-sm" />
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
            <div className="text-sm text-bolt-elements-textSecondary mb-2">
              Found {searchResults.length} messages
            </div>
            {searchResults.map((message) => (
              <div
                key={message.id}
                className="bg-bolt-elements-background-depth-1 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    message.role === 'user' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {message.role}
                  </span>
                  <span className="text-xs text-bolt-elements-textSecondary">
                    {message.timestamp.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-bolt-elements-textPrimary line-clamp-3">
                  {message.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <div className="i-ph:chat-circle text-sm" />
          <span>Chat History</span>
        </button>

        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <div className="i-ph:chart-bar text-sm" />
          <span>AI Analytics</span>
        </button>
      </div>

      {/* Chat History Section */}
      {showHistory && (
        <div className="border-t border-bolt-elements-borderColor pt-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-bolt-elements-textPrimary">
              Chat History ({chatHistory.length} messages)
            </h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport('json')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport('markdown')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Markdown
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Text
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {chatHistory.length === 0 ? (
              <p className="text-center text-bolt-elements-textSecondary py-8">
                No chat history yet. Start a conversation to see messages here.
              </p>
            ) : (
              chatHistory.slice(-20).map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                      : 'bg-green-50 dark:bg-green-900/20 mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      message.role === 'user' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {message.role}
                    </span>
                    <span className="text-xs text-bolt-elements-textSecondary">
                      {message.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-bolt-elements-textPrimary">
                    {message.content}
                  </p>
                  {message.metadata && (
                    <div className="mt-2 text-xs text-bolt-elements-textSecondary">
                      {message.metadata.tokens && (
                        <span className="mr-3">Tokens: {message.metadata.tokens}</span>
                      )}
                      {message.metadata.cost && (
                        <span className="mr-3">Cost: {formatCost(message.metadata.cost)}</span>
                      )}
                      {message.metadata.model && (
                        <span>Model: {message.metadata.model}</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* AI Analytics Section */}
      {showStats && usageStats && (
        <div className="border-t border-bolt-elements-borderColor pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-bolt-elements-textPrimary">
              AI Usage Analytics
            </h4>
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

          <div className="space-y-4">
            {/* Token Usage */}
            <div>
              <UsageProgressBar
                label="Token Usage"
                used={usageStats.totalTokens}
                max={1000000} // 1M tokens as example limit
                unit=" tokens"
              />
            </div>

            {/* Model Usage */}
            {Object.keys(usageStats.modelUsage).length > 0 && (
              <div>
                <h5 className="font-medium text-bolt-elements-textPrimary mb-2">
                  Model Usage
                </h5>
                <div className="space-y-2">
                  {Object.entries(usageStats.modelUsage).map(([model, count]) => (
                    <div key={model} className="flex justify-between text-sm">
                      <span className="text-bolt-elements-textSecondary">{model}</span>
                      <span className="text-bolt-elements-textPrimary font-medium">
                        {formatNumber(count)} messages
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3">
                <div className="text-sm text-bolt-elements-textSecondary">Avg Response Time</div>
                <div className="text-lg font-bold text-bolt-elements-textPrimary">
                  {usageStats.avgResponseTime > 0 
                    ? `${(usageStats.avgResponseTime / 1000).toFixed(1)}s`
                    : 'N/A'
                  }
                </div>
              </div>
              <div className="bg-bolt-elements-background-depth-1 rounded-lg p-3">
                <div className="text-sm text-bolt-elements-textSecondary">Sessions</div>
                <div className="text-lg font-bold text-bolt-elements-textPrimary">
                  {formatNumber(usageStats.sessionCount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}