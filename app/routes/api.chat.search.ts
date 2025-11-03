/**
 * Chat Search API Endpoint
 * Searches through chat message history
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { db } from '~/lib/database/supabase.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get authenticated user
    const user = await getAuthenticatedUser({ request } as any);

    if (!user.supabaseUserId) {
      return json({ error: 'User not found in database' }, { status: 404 });
    }

    // Parse request body
    const { sessionId, query, limit = 50 } = await request.json();

    if (!sessionId || !query) {
      return json({ error: 'Missing sessionId or query' }, { status: 400 });
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

    // Search messages using full-text search
    const messages = await db.executeWithRetry(async () => {
      return db.client
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.supabaseUserId)
        .textSearch('content', query, {
          type: 'websearch',
          config: 'english',
        })
        .order('created_at', { ascending: false })
        .limit(limit);
    });

    // If no results with full-text search, try ILIKE search
    let searchResults = messages;
    if (!messages || (messages as any[]).length === 0) {
      searchResults = await db.executeWithRetry(async () => {
        return db.client
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', user.supabaseUserId)
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(limit);
      });
    }

    // Log search event
    await db.logUsageEvent(user.supabaseUserId, 'chat_search', {
      projectId: (session as any).project_id,
      additionalData: {
        sessionId,
        query,
        resultCount: (searchResults as any[])?.length || 0,
      },
    });

    return json({ 
      messages: searchResults || [],
      query,
      resultCount: (searchResults as any[])?.length || 0,
    });
  } catch (error) {
    console.error('Error searching chat messages:', error);
    return json({ error: 'Failed to search chat messages' }, { status: 500 });
  }
}