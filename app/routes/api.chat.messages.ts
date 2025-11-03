/**
 * Chat Messages API Endpoint
 * Handles saving and retrieving chat messages
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
    const { sessionId, messages } = await request.json();

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return json({ error: 'Missing sessionId or messages' }, { status: 400 });
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

    // Prepare messages for insertion
    const messagesToInsert = messages.map((msg: any) => ({
      session_id: sessionId,
      user_id: user.supabaseUserId,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata || null,
    }));

    // Insert messages
    const insertedMessages = await db.executeWithRetry(async () => {
      return db.client
        .from('chat_messages')
        .insert(messagesToInsert)
        .select();
    });

    // Calculate tokens and cost for AI usage tracking
    let totalTokens = 0;
    let totalCost = 0;

    messages.forEach((msg: any) => {
      if (msg.metadata?.tokens) {
        totalTokens += msg.metadata.tokens;
      }
      if (msg.metadata?.cost) {
        totalCost += msg.metadata.cost;
      }
    });

    // Update session statistics
    if (totalTokens > 0 || totalCost > 0) {
      await db.executeWithRetry(async () => {
        return db.client
          .from('chat_sessions')
          .update({
            total_tokens: ((session as any).total_tokens || 0) + totalTokens,
            total_cost: ((session as any).total_cost || 0) + totalCost,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      });
    }

    // Update user AI generation count
    const aiMessages = messages.filter((msg: any) => msg.role === 'assistant');
    if (aiMessages.length > 0) {
      await db.executeWithRetry(async () => {
        return db.client.rpc('increment_ai_generations', {
          p_user_id: user.supabaseUserId,
          p_count: aiMessages.length,
        });
      });

      // Log AI usage event
      await db.logUsageEvent(user.supabaseUserId, 'ai_generation', {
        projectId: (session as any).project_id,
        additionalData: {
          sessionId,
          messageCount: aiMessages.length,
          totalTokens,
          totalCost,
        },
      });
    }

    return json({ 
      success: true, 
      messages: insertedMessages,
      stats: {
        totalTokens,
        totalCost,
        messageCount: messages.length,
      }
    });
  } catch (error) {
    console.error('Error saving chat messages:', error);
    return json({ error: 'Failed to save chat messages' }, { status: 500 });
  }
}