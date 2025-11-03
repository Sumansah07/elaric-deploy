/**
 * API endpoint to get user's screen count
 */

import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getAuth } from '@clerk/remix/ssr.server';
import { db } from '~/lib/database/supabase.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const { userId: clerkUserId } = await getAuth(request, context);

    if (!clerkUserId) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await db.getUserByClerkId(clerkUserId);

    if (!user) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    // Return the screen count (stored in ai_generations_count)
    return json({
      screensCreated: user.aiGenerationsCount || 0,
      maxScreens: user.subscriptionTier === 'free' ? 100 : user.subscriptionTier === 'pro' ? 1000 : 999999,
    });
  } catch (error) {
    console.error('Error fetching screen count:', error);
    return json({ error: 'Failed to fetch screen count' }, { status: 500 });
  }
}
