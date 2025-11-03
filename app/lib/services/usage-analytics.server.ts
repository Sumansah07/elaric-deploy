/**
 * Usage Analytics Service
 * Tracks and calculates user usage statistics
 */

import { db } from '~/lib/database/supabase.server';

// Re-export types from separate file (safe for client imports)
export type { UserUsage, UsageLimitCheck, UserCost } from './usage-analytics.types';

/**
 * Get user's current usage statistics
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  try {
    const user = await db.getUserByClerkId(userId);
    
    if (!user) {
      throw new Error(`User not found with Clerk ID: ${userId}`);
    }
    
    // Calculate current billing period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      projects: (user as any).projects_created || 0,
      aiGenerations: (user as any).ai_generations_count || 0,
      storageGB: (((user as any).storage_used_bytes || 0) / (1024 * 1024 * 1024)).toFixed(2),
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
    };
  } catch (error: any) {
    console.error('Error getting user usage:', error);
    throw new Error(error.message || 'Failed to fetch usage data');
  }
}

/**
 * Check if user has exceeded usage limits
 */
export async function checkUsageLimit(
  userId: string,
  limitType: 'projects' | 'ai_generations' | 'storage',
): Promise<UsageLimitCheck> {
  try {
    const user = await db.getUserByClerkId(userId);
    const limits = await db.getUserLimits((user as any).id);
    const limit = limits[0];

    if (!limit) {
      return {
        exceeded: true,
        current: 0,
        max: 0,
        percentage: 100,
      };
    }

    let current: number;
    let max: number;

    switch (limitType) {
      case 'projects':
        current = (user as any).projects_created || 0;
        max = limit.max_projects;
        break;
      case 'ai_generations':
        current = (user as any).ai_generations_count || 0;
        max = limit.max_ai_generations;
        break;
      case 'storage':
        current = ((user as any).storage_used_bytes || 0) / (1024 * 1024 * 1024);
        max = limit.max_storage_gb;
        break;
      default:
        return { exceeded: false, current: 0, max: 0, percentage: 0 };
    }

    const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const exceeded = current >= max;

    return {
      exceeded,
      current: limitType === 'storage' ? parseFloat(current.toFixed(2)) : current,
      max,
      percentage: parseFloat(percentage.toFixed(1)),
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    throw new Error('Failed to check usage limits');
  }
}

/**
 * Calculate user's monthly cost
 */
export async function calculateUserCost(userId: string, tier?: string): Promise<UserCost> {
  try {
    const user = await db.getUserByClerkId(userId);
    const userTier = tier || (user as any).subscription_tier || 'free';

    const pricing: Record<string, number> = {
      free: 0,
      pro: 19,
      enterprise: 99,
    };

    const cost = pricing[userTier] || 0;

    // Calculate next billing date (first of next month)
    const now = new Date();
    const nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      monthly: cost,
      currency: 'USD',
      tier: userTier,
      nextBillingDate: cost > 0 ? nextBillingDate.toISOString() : undefined,
    };
  } catch (error) {
    console.error('Error calculating user cost:', error);
    throw new Error('Failed to calculate cost');
  }
}

/**
 * Get all usage limits for a user
 */
export async function getAllUsageLimits(userId: string) {
  try {
    const [projects, aiGenerations, storage] = await Promise.all([
      checkUsageLimit(userId, 'projects'),
      checkUsageLimit(userId, 'ai_generations'),
      checkUsageLimit(userId, 'storage'),
    ]);

    return {
      projects,
      aiGenerations,
      storage,
    };
  } catch (error) {
    console.error('Error getting all usage limits:', error);
    throw new Error('Failed to fetch usage limits');
  }
}

/**
 * Check if user can perform an action based on limits
 */
export async function canPerformAction(
  userId: string,
  action: 'create_project' | 'ai_generation' | 'upload_file',
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const user = await db.getUserByClerkId(userId);

    switch (action) {
      case 'create_project': {
        const canCreate = await db.canUserCreateProject((user as any).id);
        return {
          allowed: canCreate,
          reason: canCreate ? undefined : 'Project limit reached. Upgrade to create more projects.',
        };
      }

      case 'ai_generation': {
        // Get actual screen count from database
        const actualScreenCount = await db.getUserScreenCount((user as any).id);
        const limits = await db.getUserLimits((user as any).id);
        const maxGenerations = limits[0]?.max_ai_generations || 100;
        const exceeded = actualScreenCount >= maxGenerations;
        
        return {
          allowed: !exceeded,
          reason: exceeded ? `You've reached your limit of ${maxGenerations} screens. Upgrade to continue creating.` : undefined,
        };
      }

      case 'upload_file': {
        const limit = await checkUsageLimit(userId, 'storage');
        return {
          allowed: !limit.exceeded,
          reason: limit.exceeded ? 'Storage limit reached. Upgrade for more storage.' : undefined,
        };
      }

      default:
        return { allowed: true };
    }
  } catch (error) {
    console.error('Error checking if user can perform action:', error);
    return { allowed: false, reason: 'Failed to check permissions' };
  }
}

/**
 * Reset monthly usage counters (called by cron job)
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
  try {
    const user = await db.getUserByClerkId(userId);
    
    // Reset AI generations count
    await db.updateUser((user as any).id, {
      ai_generations_count: 0,
      usage_reset_at: new Date().toISOString(),
    });

    console.log(`Reset monthly usage for user ${userId}`);
  } catch (error) {
    console.error('Error resetting monthly usage:', error);
    throw new Error('Failed to reset usage');
  }
}
