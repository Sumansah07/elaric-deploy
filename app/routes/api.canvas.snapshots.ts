/**
 * Canvas Snapshots List API Endpoint
 * Gets all snapshots for a project
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

    // Verify user owns the project
    const project = await db.getProjectById(projectId);
    if (!project || (project as any).user_id !== user.supabaseUserId) {
      return json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Get snapshots for this project
    const snapshots = await db.executeWithRetry(async () => {
      return db.client
        .from('canvas_snapshots')
        .select('id, name, created_at, updated_at')
        .eq('project_id', projectId)
        .eq('user_id', user.supabaseUserId)
        .order('created_at', { ascending: false })
        .limit(50);
    });

    return json({ snapshots });
  } catch (error) {
    console.error('Error getting canvas snapshots:', error);
    return json({ error: 'Failed to get snapshots' }, { status: 500 });
  }
}