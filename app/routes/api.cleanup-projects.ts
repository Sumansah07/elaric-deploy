/**
 * API endpoint to clean up duplicate "My Designs" projects
 * Merges duplicate projects and fixes screen counts
 */

import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { getAuth } from '@clerk/remix/ssr.server';
import { db } from '~/lib/database/supabase.server';

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const { userId: clerkUserId } = await getAuth(request, context);

    if (!clerkUserId) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await db.getUserByClerkId(clerkUserId);

    if (!user) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action: cleanupAction } = body;

    console.log(`🧹 Starting cleanup action: ${cleanupAction} for user: ${user.id}`);

    switch (cleanupAction) {
      case 'merge_duplicates': {
        // Find all "My Designs" projects
        const { data: projects, error } = await db.client
          .from('projects')
          .select('id, name, created_at, screen_count')
          .eq('user_id', user.id)
          .eq('name', 'My Designs')
          .eq('status', 'active')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (!projects || projects.length <= 1) {
          return json({
            success: true,
            message: 'No duplicate projects found',
            projectsProcessed: 0,
          });
        }

        // Keep the first (oldest) project
        const primaryProject = projects[0];
        const duplicates = projects.slice(1);

        let screensMoved = 0;
        let projectsArchived = 0;

        // Move screens from duplicates to primary project
        for (const duplicate of duplicates) {
          // Move screens
          const { error: moveError } = await db.client
            .from('screens')
            .update({ project_id: primaryProject.id })
            .eq('project_id', duplicate.id);

          if (moveError) {
            console.error(`Failed to move screens from ${duplicate.id}:`, moveError);
            continue;
          }

          // Count moved screens
          const { count } = await db.client
            .from('screens')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', duplicate.id);

          screensMoved += count || 0;

          // Archive duplicate project
          await db.client
            .from('projects')
            .update({
              status: 'archived',
              name: `My Designs (merged-${duplicate.id.slice(0, 8)})`,
            })
            .eq('id', duplicate.id);

          projectsArchived++;
        }

        // Recalculate screen count for primary project
        const { count: finalCount } = await db.client
          .from('screens')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', primaryProject.id);

        await db.client
          .from('projects')
          .update({ screen_count: finalCount || 0 })
          .eq('id', primaryProject.id);

        console.log(`✅ Merged ${projectsArchived} projects, moved ${screensMoved} screens`);

        return json({
          success: true,
          primaryProjectId: primaryProject.id,
          projectsArchived,
          screensMoved,
          finalScreenCount: finalCount || 0,
        });
      }

      case 'recalculate_counts': {
        // Get all active projects
        const { data: projects, error } = await db.client
          .from('projects')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (error) throw error;

        if (!projects) {
          return json({ success: true, projectsUpdated: 0 });
        }

        let updatedCount = 0;

        for (const project of projects) {
          const { count } = await db.client
            .from('screens')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id);

          await db.client
            .from('projects')
            .update({ screen_count: count || 0 })
            .eq('id', project.id);

          updatedCount++;
        }

        console.log(`✅ Recalculated screen counts for ${updatedCount} projects`);

        return json({
          success: true,
          projectsUpdated: updatedCount,
        });
      }

      case 'deduplicate_screens': {
        const { projectId } = body;

        if (!projectId) {
          return json({ error: 'projectId required' }, { status: 400 });
        }

        // Find duplicate screen names
        const { data: screens, error } = await db.client
          .from('screens')
          .select('id, name, created_at')
          .eq('project_id', projectId)
          .order('name')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (!screens || screens.length === 0) {
          return json({ success: true, screensRemoved: 0 });
        }

        // Group by name and keep only the oldest
        const nameMap = new Map<string, string[]>();
        for (const screen of screens) {
          if (!nameMap.has(screen.name)) {
            nameMap.set(screen.name, []);
          }
          nameMap.get(screen.name)!.push(screen.id);
        }

        let screensRemoved = 0;

        for (const [name, ids] of nameMap.entries()) {
          if (ids.length > 1) {
            // Keep first (oldest), delete rest
            const toDelete = ids.slice(1);

            const { error: deleteError } = await db.client
              .from('screens')
              .delete()
              .in('id', toDelete);

            if (!deleteError) {
              screensRemoved += toDelete.length;
            }
          }
        }

        console.log(`✅ Removed ${screensRemoved} duplicate screens`);

        return json({
          success: true,
          screensRemoved,
        });
      }

      case 'full_cleanup': {
        // Run all cleanup operations in sequence
        const results: any = {};

        // 1. Merge duplicate projects
        const mergeResponse = await action({
          request: new Request(request.url, {
            method: 'POST',
            body: JSON.stringify({ action: 'merge_duplicates' }),
          }),
          context,
        });
        results.merge = await mergeResponse.json();

        // 2. Recalculate counts
        const recalcResponse = await action({
          request: new Request(request.url, {
            method: 'POST',
            body: JSON.stringify({ action: 'recalculate_counts' }),
          }),
          context,
        });
        results.recalculate = await recalcResponse.json();

        console.log('✅ Full cleanup complete');

        return json({
          success: true,
          results,
        });
      }

      default:
        return json(
          { error: 'Invalid action. Use: merge_duplicates, recalculate_counts, deduplicate_screens, or full_cleanup' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function loader() {
  return json(
    {
      message: 'Use POST with action parameter',
      availableActions: ['merge_duplicates', 'recalculate_counts', 'deduplicate_screens', 'full_cleanup'],
    },
    { status: 405 }
  );
}
