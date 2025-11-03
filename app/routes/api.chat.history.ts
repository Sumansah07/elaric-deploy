/**
 * Chat History API Endpoint
 * Retrieves chat message history for a session
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { db } from '~/lib/database/supabase.server';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser({ request } as any);

    if (!user.supabaseUserId) {
      return json({ error: 'User not found in database' }, { status: 404 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!sessionId) {
      return json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    // Verify user owns the chat session
    const session = await db.executeWithRetry(async () => {
      return db.client
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.supabaseUserId)
        .single();
    });

    if (!session) {
      return json({ error: 'Chat session not found or access denied' }, { status: 403 });
    }

    // Get chat messages
    const messages = await db.executeWithRetry(async () => {
      return db.client
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.supabaseUserId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);
    });

    // Log usage event
    await db.logUsageEvent(user.supabaseUserId, 'chat_history_loaded', {
      projectId: (session as any).project_id,
      additionalData: {
        sessionId,
        messageCount: (messages as any[])?.length || 0,
      },
    });

    return json({ 
      messages: messages || [],
      session: {
        id: (session as any).id,
        title: (session as any).title,
        totalTokens: (session as any).total_tokens || 0,
        totalCost: (session as any).total_cost || 0,
      }
    });
  } catch (error) {
    console.error('Error loading chat history:', error);
    return json({ error: 'Failed to load chat history' }, { status: 500 });
  }
}