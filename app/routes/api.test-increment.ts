/**
 * Test Usage Increment - For testing only
 * Manually increment usage counters
 */

import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { db } from '~/lib/database/supabase.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { clerkUserId, eventType, tokens } = await request.json();

    if (!clerkUserId) {
      return json({ error: 'clerkUserId required' }, { status: 400 });
    }

    // Get user from Supabase
    const user = await db.getUserByClerkId(clerkUserId);
    
    if (!user) {
      return json({ error: `User not found: ${clerkUserId}` }, { status: 404 });
    }

    const userId = (user as any).id;

    // Increment usage
    await db.incrementUsage(
      userId,
      eventType || 'ai_generation',
      tokens || 100,
      0
    );

    // Get updated usage
    const updatedUser = await db.getUserByClerkId(clerkUserId);

    return json({
      success: true,
      message: 'Usage incremented',
      usage: {
        projects: (updatedUser as any).projects_created,
        aiGenerations: (updatedUser as any).ai_generations_count,
        storageGB: (((updatedUser as any).storage_used_bytes || 0) / (1024**3)).toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('Error incrementing usage:', error);
    return json({
      error: 'Failed to increment usage',
      details: error.message,
    }, { status: 500 });
  }
}
