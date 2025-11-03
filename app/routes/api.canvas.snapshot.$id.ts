/**
 * Canvas Snapshot Detail API Endpoint
 * Loads a specific snapshot
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { db } from '~/lib/database/supabase.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser({ request } as any);

    if (!user.supabaseUserId) {
      return json({ error: 'User not found in database' }, { status: 404 });
    }

    const snapshotId = params.id;
    if (!snapshotId) {
      return json({ error: 'Missing snapshot ID' }, { status: 400 });
    }

    // Get snapshot and verify ownership
    const snapshot = await db.executeWithRetry(async () => {
      return db.client
        .from('canvas_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .eq('user_id', user.supabaseUserId)
        .single();
    });

    if (!snapshot) {
      return json({ error: 'Snapshot not found or access denied' }, { status: 404 });
    }

    // Log usage event
    await db.logUsageEvent(user.supabaseUserId, 'canvas_snapshot_loaded', {
      projectId: (snapshot as any).project_id,
      additionalData: {
        snapshotId,
      },
    });

    return json({ 
      canvasState: (snapshot as any).canvas_state,
      snapshot: {
        id: (snapshot as any).id,
        name: (snapshot as any).name,
        created_at: (snapshot as any).created_at,
        project_id: (snapshot as any).project_id,
      }
    });
  } catch (error) {
    console.error('Error loading canvas snapshot:', error);
    return json({ error: 'Failed to load snapshot' }, { status: 500 });
  }
}