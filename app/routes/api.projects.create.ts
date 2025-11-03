/**
 * Project Creation API Endpoint
 * Creates a new project for the authenticated user
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { db } from '~/lib/database/supabase.server';

export async function action(args: ActionFunctionArgs) {
  if (args.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(args);

    if (!user.supabaseUserId) {
      return json({ error: 'User not found in database' }, { status: 404 });
    }

    // Check if user can create more projects
    const canCreate = await db.canUserCreateProject(user.supabaseUserId);
    if (!canCreate) {
      return json({ error: 'Project limit reached' }, { status: 403 });
    }

    // Parse request body
    const body = await args.request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string') {
      return json({ error: 'Project name is required' }, { status: 400 });
    }

    // Create project
    const project = await db.createProject(
      user.supabaseUserId,
      name.trim(),
      description?.trim()
    );

    // Increment project count
    await db.incrementUsage(
      user.supabaseUserId,
      'project_created',
      0,
      0
    );

    console.log(`✅ Project created for user ${user.clerkUserId}: ${name}`);

    // Log project creation event
    await db.logUsageEvent(user.supabaseUserId, 'project_created', {
      projectId: (project as any).id,
    });

    return json({ 
      success: true, 
      project: {
        id: (project as any).id,
        name: (project as any).name,
        description: (project as any).description,
        status: (project as any).status,
        created_at: (project as any).created_at,
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return json({ error: 'Failed to create project' }, { status: 500 });
  }
}