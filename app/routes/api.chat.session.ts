/**
 * Chat Session API Endpoint
 * Manages chat sessions for projects
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
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

    // Get project ID from query params
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return json({ error: 'Missing projectId parameter' }, { status: 400 });
    }

    // Verify user owns the project
    const project = await db.getProjectById(projectId);
    if (!project || (project as any).user_id !== user.supabaseUserId) {
      return json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Get existing chat session for this project
    const session = await db.executeWithRetry(async () => {
      return db.client
        .from('chat_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.supabaseUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    });

    if (!session) {
      return json({ error: 'No chat session found' }, { status: 404 });
    }

    return json({ session });
  } catch (error) {
    console.error('Error getting chat session:', error);
    return json({ error: 'Failed to get chat session' }, { status: 500 });
  }
}

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
    const { projectId, title } = await request.json();

    if (!projectId) {
      return json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Verify user owns the project
    const project = await db.getProjectById(projectId);
    if (!project || (project as any).user_id !== user.supabaseUserId) {
      return json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Create new chat session
    const session = await db.executeWithRetry(async () => {
      return db.client
        .from('chat_sessions')
        .insert({
          project_id: projectId,
          user_id: user.supabaseUserId,
          title: title || `Chat Session ${new Date().toLocaleDateString()}`,
        })
        .select()
        .single();
    });

    // Log usage event
    await db.logUsageEvent(user.supabaseUserId, 'chat_session_created', {
      projectId,
      additionalData: {
        sessionId: (session as any).id,
      },
    });

    return json({ session });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return json({ error: 'Failed to create chat session' }, { status: 500 });
  }
}