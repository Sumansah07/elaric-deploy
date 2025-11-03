/**
 * Canvas Snapshot API Endpoint
 * Creates and manages canvas snapshots
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
    const { projectId, canvasState, name } = await request.json();

    if (!projectId || !canvasState) {
      return json({ error: 'Missing projectId or canvasState' }, { status: 400 });
    }

    // Verify user owns the project
    const project = await db.getProjectById(projectId);
    if (!project || (project as any).user_id !== user.supabaseUserId) {
      return json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Create snapshot record
    const snapshot = await db.executeWithRetry(async () => {
      return db.client
        .from('canvas_snapshots')
        .insert({
          project_id: projectId,
          user_id: user.supabaseUserId,
          name: name || `Snapshot ${new Date().toLocaleString()}`,
          canvas_state: canvasState,
        })
        .select()
        .single();
    });

    // Log usage event
    await db.logUsageEvent(user.supabaseUserId, 'canvas_snapshot_created', {
      projectId,
      additionalData: {
        snapshotId: (snapshot as any).id,
        pageCount: canvasState.pages?.length || 0,
      },
    });

    return json({ 
      success: true, 
      snapshot: {
        id: (snapshot as any).id,
        name: (snapshot as any).name,
        created_at: (snapshot as any).created_at,
      }
    });
  } catch (error) {
    console.error('Error creating canvas snapshot:', error);
    return json({ error: 'Failed to create snapshot' }, { status: 500 });
  }
}