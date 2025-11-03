/**
 * Chat Usage Stats API Endpoint
 * Provides AI usage statistics and analytics
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
    const projectId = url.searchParams.get('projectId');
    const timeframe = url.searchParams.get('timeframe') || '30d'; // 7d, 30d, 90d, all

    // Calculate date range
    let dateFilter = '';
    if (timeframe !== 'all') {
      const days = parseInt(timeframe.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = startDate.toISOString();
    }

    // Base query for chat sessions
    let sessionQuery = db.client
      .from('chat_sessions')
      .select('id, total_tokens, total_cost, created_at')
      .eq('user_id', user.supabaseUserId);

    if (projectId) {
      sessionQuery = sessionQuery.eq('project_id', projectId);
    }

    if (dateFilter) {
      sessionQuery = sessionQuery.gte('created_at', dateFilter);
    }

    const sessions = await db.executeWithRetry(() => sessionQuery);

    // Get message statistics
    let messageQuery = db.client
      .from('chat_messages')
      .select('role, metadata, created_at')
      .eq('user_id', user.supabaseUserId);

    if (projectId) {
      // Join with sessions to filter by project
      messageQuery = db.client
        .from('chat_messages')
        .select(`
          role, 
          metadata, 
          created_at,
          chat_sessions!inner(project_id)
        `)
        .eq('user_id', user.supabaseUserId)
        .eq('chat_sessions.project_id', projectId);
    }

    if (dateFilter) {
      messageQuery = messageQuery.gte('created_at', dateFilter);
    }

    const messages = await db.executeWithRetry(() => messageQuery);

    // Calculate statistics
    const sessionList = (sessions as any[]) || [];
    const messageList = (messages as any[]) || [];

    const totalTokens = sessionList.reduce((sum, session) => sum + (session.total_tokens || 0), 0);
    const totalCost = sessionList.reduce((sum, session) => sum + (session.total_cost || 0), 0);
    
    const messageCount = messageList.length;
    const assistantMessages = messageList.filter(msg => msg.role === 'assistant');
    const userMessages = messageList.filter(msg => msg.role === 'user');

    // Model usage statistics
    const modelUsage: Record<string, number> = {};
    assistantMessages.forEach(msg => {
      const model = msg.metadata?.model || 'unknown';
      modelUsage[model] = (modelUsage[model] || 0) + 1;
    });

    // Daily usage breakdown
    const dailyUsage: Record<string, { tokens: number; cost: number; messages: number }> = {};
    messageList.forEach(msg => {
      const date = new Date(msg.created_at).toISOString().split('T')[0];
      if (!dailyUsage[date]) {
        dailyUsage[date] = { tokens: 0, cost: 0, messages: 0 };
      }
      dailyUsage[date].messages += 1;
      if (msg.metadata?.tokens) {
        dailyUsage[date].tokens += msg.metadata.tokens;
      }
      if (msg.metadata?.cost) {
        dailyUsage[date].cost += msg.metadata.cost;
      }
    });

    // Average response time
    const responseTimes = assistantMessages
      .map(msg => msg.metadata?.responseTime)
      .filter(time => typeof time === 'number');
    
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return json({
      totalTokens,
      totalCost,
      messageCount,
      assistantMessageCount: assistantMessages.length,
      userMessageCount: userMessages.length,
      sessionCount: sessionList.length,
      modelUsage,
      dailyUsage,
      avgResponseTime,
      timeframe,
      projectId,
    });
  } catch (error) {
    console.error('Error getting chat usage stats:', error);
    return json({ error: 'Failed to get usage statistics' }, { status: 500 });
  }
}