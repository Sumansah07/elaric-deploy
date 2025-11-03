/**
 * User Sync API Endpoint
 * Syncs user data between Clerk and Supabase
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get authenticated user (this will sync with Supabase automatically)
    const user = await getAuthenticatedUser({ request } as any);

    return json({ 
      success: true, 
      user: {
        id: user.supabaseUserId,
        clerk_user_id: user.clerkUserId,
        email: user.email,
        full_name: user.fullName,
        avatar_url: user.avatarUrl,
        subscription_tier: user.subscriptionTier,
        subscription_status: user.subscriptionStatus,
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return json({ error: 'Failed to sync user' }, { status: 500 });
  }
}