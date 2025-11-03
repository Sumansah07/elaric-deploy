/**
 * Canvas Load API Endpoint
 * Loads canvas state from Supabase
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

    // Get project ID from query params
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return json({ error: 'Missing projectId parameter' }, { status: 400 });
    }

    // Get project and verify ownership
    const project = await db.getProjectById(projectId);
    if (!project || (project as any).user_id !== user.supabaseUserId) {
      return json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Return canvas state
    const canvasState = (project as any).canvas_state;
    
    if (!canvasState) {
      return json({ error: 'No canvas state found' }, { status: 404 });
    }

    // Update last opened time
    await db.updateProject(projectId, {
      last_opened_at: new Date().toISOString(),
    });

    // Log usage event
    await db.logUsageEvent(user.supabaseUserId, 'canvas_loaded', {
      projectId,
    });

    return json({ canvasState });
  } catch (error) {
    console.error('Error loading canvas state:', error);
    return json({ error: 'Failed to load canvas state' }, { status: 500 });
  }
}