/**
 * API Route: /api/usage
 * Returns user usage statistics for billing and analytics
 */

import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';

export async function loader({ request }: LoaderFunctionArgs) {
  const { getUserUsage, calculateUserCost } = await import('~/lib/services/usage-analytics.server');
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const userTier = url.searchParams.get('tier') || 'free';

  if (!userId) {
    return json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    const [usage, cost] = await Promise.all([
      getUserUsage(userId),
      calculateUserCost(userId, userTier),
    ]);

    return json({
      usage,
      cost,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching usage:', error);
    return json(
      { 
        error: 'Failed to fetch usage data',
        details: error.message || 'Unknown error',
        userId: userId,
      },
      { status: 500 }
    );
  }
}
