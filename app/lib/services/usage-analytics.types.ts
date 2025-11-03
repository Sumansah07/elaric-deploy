/**
 * Usage Analytics Types
 * Shared types for usage analytics (can be imported by client)
 */

export interface UserUsage {
  projects: number;
  aiGenerations: number;
  storageGB: string;
  period: {
    start: string;
    end: string;
  };
  tokensThisMonth?: number;
  messagesThisMonth?: number;
  totalProjects?: number;
  modelBreakdown?: Array<{
    model: string;
    tokens: number;
    cost: number;
  }>;
}

export interface UsageLimitCheck {
  exceeded: boolean;
  current: number;
  max: number;
  percentage: number;
}

export interface UserCost {
  monthly: number;
  currency: string;
  tier: string;
  nextBillingDate?: string;
}
