/**
 * Clerk Authentication Server Utilities
 * Handles session management and user authentication
 */

import { createClerkClient } from '@clerk/remix/api.server';
import { getAuth } from '@clerk/remix/ssr.server';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { db } from '~/lib/database/supabase.server';

// Server-side environment variables (accessible in server context)
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

// Debug logging for environment variables
console.log('🔐 Clerk Server Environment Check:');
console.log('- CLERK_PUBLISHABLE_KEY:', clerkPublishableKey ? '✅ SET' : '❌ MISSING');
console.log('- CLERK_SECRET_KEY:', clerkSecretKey ? '✅ SET' : '❌ MISSING');

if (!clerkPublishableKey || !clerkSecretKey) {
  console.error('❌ Missing Clerk environment variables. Authentication will not work.');
  console.error('Make sure you have both CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in your .env file');
}

/**
 * Initialize Clerk client
 */
export const clerk = createClerkClient({
  secretKey: clerkSecretKey!,
  publishableKey: clerkPublishableKey!,
});

/**
 * Get current user session from request
 */
export async function requireAuth(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return userId;
}

/**
 * Get optional user session (doesn't throw if not authenticated)
 */
export async function getOptionalAuth(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const { userId } = await getAuth(args);
  return userId || null;
}

/**
 * Check usage limits for user (referenced by billing routes)
 */
export async function checkUsageLimits(args: LoaderFunctionArgs | ActionFunctionArgs) {
  try {
    const user = await getAuthenticatedUser(args);

    // Try to get limits from Supabase
    try {
      console.log('📊 Checking usage limits for user:', user.clerkUserId);
      const supabaseUser = await db.getUserByClerkId(user.clerkUserId);
      console.log('✅ Got Supabase user:', (supabaseUser as any).id);
      
      const limits = await db.getUserLimits(supabaseUser.id);
      console.log('✅ Got limits:', limits);

      const canCreateProject = await db.canUserCreateProject(supabaseUser.id);
      
      // Get actual screen count from database
      const actualScreenCount = await db.getUserScreenCount((supabaseUser as any).id);
      console.log('✅ Screen count result:', actualScreenCount);

      return {
        projectsCreated: (supabaseUser as any).projects_created || 0,
        maxProjects: limits[0]?.max_projects || 5,
        aiGenerationsCount: actualScreenCount,
        maxAiGenerations: limits[0]?.max_ai_generations || 100,
        storageUsedGB: (((supabaseUser as any).storage_used_bytes || 0) / (1024 * 1024 * 1024)).toFixed(2),
        maxStorageGB: limits[0]?.max_storage_gb || 1,
        canExportFigma: limits[0]?.can_export_figma || false,
        canCreateProject,
      };
    } catch (dbError) {
      console.warn('Supabase not available for usage limits, using defaults:', dbError);
      // Return default limits when Supabase is not available
      return {
        projectsCreated: 0,
        maxProjects: user.subscriptionTier === 'pro' ? 50 : 5,
        aiGenerationsCount: 0,
        maxAiGenerations: user.subscriptionTier === 'pro' ? 10000 : 100,
        storageUsedGB: '0.00',
        maxStorageGB: user.subscriptionTier === 'pro' ? 50 : 1,
        canExportFigma: user.subscriptionTier === 'pro',
        canCreateProject: true,
      };
    }
  } catch (error) {
    console.error('Error checking usage limits:', error);
    throw new Response('Failed to check usage limits', { status: 500 });
  }
}

/**
 * Get user data from Clerk and sync with Supabase
 */
export async function getAuthenticatedUser(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const clerkUserId = await requireAuth(args);

  try {
    // Get user from Clerk
    const clerkUser = await clerk.users.getUser(clerkUserId);

    // Try to get user from Supabase, create if doesn't exist
    let supabaseUser;
    try {
      supabaseUser = await db.getOrCreateUser(
        clerkUserId,
        clerkUser.emailAddresses[0]?.emailAddress || '',
        `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || undefined,
        clerkUser.imageUrl,
      );
    } catch (dbError) {
      console.warn('Supabase not available, using Clerk data only:', dbError);
      // Fallback to Clerk data only
      return {
        clerkUserId,
        supabaseUserId: null,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || undefined,
        avatarUrl: clerkUser.imageUrl,
        subscriptionTier: 'free' as const,
        subscriptionStatus: 'active' as const,
      };
    }

    return {
      clerkUserId,
      supabaseUserId: (supabaseUser as any).id,
      email: (supabaseUser as any).email,
      fullName: (supabaseUser as any).full_name,
      avatarUrl: (supabaseUser as any).avatar_url,
      subscriptionTier: (supabaseUser as any).subscription_tier || 'free',
      subscriptionStatus: (supabaseUser as any).subscription_status || 'active',
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    throw new Response('Failed to authenticate user', { status: 500 });
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const user = await getAuthenticatedUser(args);
  return user.subscriptionStatus === 'active' && user.subscriptionTier !== 'free';
}

/**
 * Check if user has Pro subscription
 */
export async function hasProSubscription(args: LoaderFunctionArgs | ActionFunctionArgs) {
  const user = await getAuthenticatedUser(args);
  return user.subscriptionTier === 'pro' && user.subscriptionStatus === 'active';
}

/**
 * Require specific subscription tier
 */
export async function requireSubscription(
  args: LoaderFunctionArgs | ActionFunctionArgs,
  minimumTier: 'pro' | 'enterprise' = 'pro',
) {
  const user = await getAuthenticatedUser(args);

  const tierHierarchy: Record<string, number> = { free: 0, pro: 1, enterprise: 2 };
  const userTierLevel = tierHierarchy[user.subscriptionTier] || 0;
  const requiredTierLevel = tierHierarchy[minimumTier];

  if (userTierLevel < requiredTierLevel || user.subscriptionStatus !== 'active') {
    throw new Response('Subscription required', { status: 403 });
  }

  return user;
}

/**
 * Sync user data from Clerk to Supabase
 */
export async function syncUserFromClerk(clerkUserId: string) {
  try {
    const clerkUser = await clerk.users.getUser(clerkUserId);

    await db.getOrCreateUser(
      clerkUserId,
      clerkUser.emailAddresses[0]?.emailAddress || '',
      `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || undefined,
      clerkUser.imageUrl,
    );

    return { success: true };
  } catch (error) {
    console.error('Error syncing user from Clerk:', error);
    return { success: false, error };
  }
}

/**
 * Delete user from Supabase when deleted from Clerk
 */
export async function deleteUserFromSupabase(clerkUserId: string) {
  try {
    const user = await db.getUserByClerkId(clerkUserId);

    if (user) {
      // Soft delete by updating status instead of hard delete to preserve data integrity
      await db.updateUser((user as any).id, {
        status: 'deleted',
        deleted_at: new Date().toISOString()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting user from Supabase:', error);
    return { success: false, error };
  }
}

/**
 * Feature gate helper - check if user can access a feature
 */
export async function canAccessFeature(
  args: LoaderFunctionArgs | ActionFunctionArgs,
  feature: 'figma_export' | 'unlimited_projects' | 'priority_support',
) {
  const user = await getAuthenticatedUser(args);

  const featureMap = {
    figma_export: ['pro', 'enterprise'],
    unlimited_projects: ['enterprise'],
    priority_support: ['pro', 'enterprise'],
  };

  const allowedTiers = featureMap[feature] || [];
  return allowedTiers.includes(user.subscriptionTier) && user.subscriptionStatus === 'active';
}


