/**
 * Track Usage API
 * Called from client after AI generation completes
 */

import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/auth/clerk.server';
import { db } from '~/lib/database/supabase.server';

export async function action({ context, request }: ActionFunctionArgs) {
  console.log('🔵 Track usage endpoint called');
  
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Require authentication
    const clerkUserId = await requireAuth({ context, request });
    console.log('🔑 Clerk user ID:', clerkUserId);

    const { tokens, eventType } = await request.json();
    console.log('📊 Received usage data:', { tokens, eventType });

    // Get user from Supabase
    const user = await db.getUserByClerkId(clerkUserId);
    console.log('👤 Supabase user:', user ? (user as any).id : 'NOT FOUND');
    
    if (!user) {
      console.error(`User not found in Supabase: ${clerkUserId}`);
      return json({ error: 'User not found' }, { status: 404 });
    }

    const userId = (user as any).id;

    // Increment usage
    await db.incrementUsage(
      userId,
      eventType || 'ai_generation',
      tokens || 0,
      0
    );

    console.log(`✅ Tracked ${eventType || 'ai_generation'} for user ${clerkUserId} - Tokens: ${tokens}`);

    return json({ success: true });
  } catch (error: any) {
    console.error('❌ Error tracking usage:', error);
    return json({
      error: 'Failed to track usage',
      details: error.message,
    }, { status: 500 });
  }
}
