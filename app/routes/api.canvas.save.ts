/**
 * Canvas Save API Endpoint
 * Saves canvas state to Supabase
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
        const { projectId, canvasState } = await request.json();

        if (!projectId || !canvasState) {
            return json({ error: 'Missing projectId or canvasState' }, { status: 400 });
        }

        // Verify user owns the project
        const project = await db.getProjectById(projectId);
        if (!project || (project as any).user_id !== user.supabaseUserId) {
            return json({ error: 'Project not found or access denied' }, { status: 403 });
        }

        // Update project with canvas state
        await db.updateProject(projectId, {
            canvas_state: canvasState,
            last_opened_at: new Date().toISOString(),
        });

        // Log usage event
        await db.logUsageEvent(user.supabaseUserId, 'canvas_saved', {
            projectId,
            additionalData: {
                pageCount: canvasState.pages?.length || 0,
            },
        });

        return json({ success: true });
    } catch (error) {
        console.error('Error saving canvas state:', error);
        return json({ error: 'Failed to save canvas state' }, { status: 500 });
    }
}