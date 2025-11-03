/**
 * Utility to clean up duplicate "My Designs" projects
 * Run this to merge duplicate projects and fix screen counts
 */

import { db } from '~/lib/database/supabase.server';

interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  screen_count: number;
}

interface Screen {
  id: string;
  project_id: string;
  name: string;
}

export async function cleanupDuplicateProjects(userId: string) {
  console.log('🧹 Starting cleanup for user:', userId);

  try {
    // Get all "My Designs" projects for this user
    const projects = await db.executeQuery<Project>(
      `SELECT id, user_id, name, created_at, screen_count
       FROM projects
       WHERE user_id = $1
       AND name = 'My Designs'
       AND status = 'active'
       ORDER BY created_at ASC`,
      [userId]
    );

    if (!projects || projects.length <= 1) {
      console.log('✅ No duplicate projects found');
      return {
        success: true,
        message: 'No duplicate projects to clean up',
        projectsProcessed: 0,
      };
    }

    console.log(`Found ${projects.length} duplicate "My Designs" projects`);

    // Keep the oldest project (first one created)
    const primaryProject = projects[0];
    const duplicateProjects = projects.slice(1);

    console.log(`Primary project: ${primaryProject.id} (keeping this one)`);
    console.log(`Duplicates to merge: ${duplicateProjects.map(p => p.id).join(', ')}`);

    let totalScreensMoved = 0;
    let totalProjectsArchived = 0;

    // Move all screens from duplicate projects to the primary project
    for (const duplicate of duplicateProjects) {
      console.log(`Processing duplicate project: ${duplicate.id}`);

      // Get all screens from this duplicate project
      const screens = await db.executeQuery<Screen>(
        `SELECT id, project_id, name
         FROM screens
         WHERE project_id = $1`,
        [duplicate.id]
      );

      if (screens && screens.length > 0) {
        console.log(`  Moving ${screens.length} screens to primary project`);

        // Move screens to primary project
        for (const screen of screens) {
          await db.executeQuery(
            `UPDATE screens
             SET project_id = $1
             WHERE id = $2`,
            [primaryProject.id, screen.id]
          );
        }

        totalScreensMoved += screens.length;
      }

      // Archive the duplicate project (don't delete, just mark as archived)
      await db.executeQuery(
        `UPDATE projects
         SET status = 'archived',
             name = CONCAT(name, ' (merged-', SUBSTRING(id::text, 1, 8), ')')
         WHERE id = $1`,
        [duplicate.id]
      );

      totalProjectsArchived++;
      console.log(`  ✅ Archived duplicate project ${duplicate.id}`);
    }

    // Update the screen count on the primary project
    const { count } = await db.executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM screens
       WHERE project_id = $1`,
      [primaryProject.id]
    ).then(results => results?.[0] || { count: 0 });

    await db.executeQuery(
      `UPDATE projects
       SET screen_count = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [count, primaryProject.id]
    );

    console.log(`✅ Cleanup complete!`);
    console.log(`  - Kept project: ${primaryProject.id}`);
    console.log(`  - Archived ${totalProjectsArchived} duplicate projects`);
    console.log(`  - Moved ${totalScreensMoved} screens`);
    console.log(`  - Final screen count: ${count}`);

    return {
      success: true,
      primaryProjectId: primaryProject.id,
      projectsArchived: totalProjectsArchived,
      screensMoved: totalScreensMoved,
      finalScreenCount: count,
    };
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

/**
 * Recalculate screen counts for all projects
 */
export async function recalculateScreenCounts(userId: string) {
  console.log('🔢 Recalculating screen counts for user:', userId);

  try {
    // Get all active projects for this user
    const projects = await db.executeQuery<Project>(
      `SELECT id, name
       FROM projects
       WHERE user_id = $1
       AND status = 'active'`,
      [userId]
    );

    if (!projects || projects.length === 0) {
      console.log('No projects found');
      return { success: true, projectsUpdated: 0 };
    }

    let updatedCount = 0;

    for (const project of projects) {
      // Count screens for this project
      const { count } = await db.executeQuery<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM screens
         WHERE project_id = $1`,
        [project.id]
      ).then(results => results?.[0] || { count: 0 });

      // Update project screen count
      await db.executeQuery(
        `UPDATE projects
         SET screen_count = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [count, project.id]
      );

      console.log(`  ${project.name}: ${count} screens`);
      updatedCount++;
    }

    console.log(`✅ Updated screen counts for ${updatedCount} projects`);

    return {
      success: true,
      projectsUpdated: updatedCount,
    };
  } catch (error) {
    console.error('❌ Screen count recalculation failed:', error);
    throw error;
  }
}

/**
 * Remove duplicate screens with same name in same project
 */
export async function deduplicateScreens(projectId: string) {
  console.log('🔍 Deduplicating screens for project:', projectId);

  try {
    // Find duplicate screen names
    const duplicates = await db.executeQuery<{ name: string; count: number }>(
      `SELECT name, COUNT(*) as count
       FROM screens
       WHERE project_id = $1
       GROUP BY name
       HAVING COUNT(*) > 1`,
      [projectId]
    );

    if (!duplicates || duplicates.length === 0) {
      console.log('✅ No duplicate screens found');
      return { success: true, screensRemoved: 0 };
    }

    console.log(`Found ${duplicates.length} duplicate screen names`);

    let totalRemoved = 0;

    for (const dup of duplicates) {
      // Get all screens with this name, ordered by creation date
      const screens = await db.executeQuery<Screen>(
        `SELECT id, name, created_at
         FROM screens
         WHERE project_id = $1 AND name = $2
         ORDER BY created_at ASC`,
        [projectId, dup.name]
      );

      if (screens && screens.length > 1) {
        // Keep the first (oldest) screen, delete the rest
        const toKeep = screens[0];
        const toDelete = screens.slice(1);

        console.log(`  Keeping screen: ${toKeep.id} (${dup.name})`);
        console.log(`  Deleting ${toDelete.length} duplicates`);

        for (const screen of toDelete) {
          await db.executeQuery(
            `DELETE FROM screens WHERE id = $1`,
            [screen.id]
          );
          totalRemoved++;
        }
      }
    }

    console.log(`✅ Removed ${totalRemoved} duplicate screens`);

    return {
      success: true,
      screensRemoved: totalRemoved,
    };
  } catch (error) {
    console.error('❌ Screen deduplication failed:', error);
    throw error;
  }
}

/**
 * Full cleanup: merge projects, deduplicate screens, recalculate counts
 */
export async function fullCleanup(userId: string) {
  console.log('🚀 Starting full cleanup for user:', userId);

  try {
    // Step 1: Clean up duplicate projects
    const projectResult = await cleanupDuplicateProjects(userId);
    console.log('Step 1 complete:', projectResult);

    // Step 2: Deduplicate screens in the primary project
    if (projectResult.primaryProjectId) {
      const screenResult = await deduplicateScreens(projectResult.primaryProjectId);
      console.log('Step 2 complete:', screenResult);
    }

    // Step 3: Recalculate all screen counts
    const countResult = await recalculateScreenCounts(userId);
    console.log('Step 3 complete:', countResult);

    console.log('✅ Full cleanup complete!');

    return {
      success: true,
      projects: projectResult,
      counts: countResult,
    };
  } catch (error) {
    console.error('❌ Full cleanup failed:', error);
    throw error;
  }
}
