/**
 * Storage Cleanup API Endpoint
 * Removes unused files and optimizes storage
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
    const { projectId } = await request.json();

    let totalCleaned = 0;
    let totalSize = 0;

    // Find orphaned storage items (not referenced by any project or screen)
    let orphanedQuery = db.client
      .from('storage_items')
      .select('*')
      .eq('user_id', user.supabaseUserId)
      .is('project_id', null);

    if (projectId) {
      // For specific project, find items not referenced by screens
      const { data: projectScreens } = await db.client
        .from('screens')
        .select('html_content, css_content, js_content, thumbnail_url')
        .eq('project_id', projectId);

      // Extract all URLs referenced in project content
      const referencedUrls = new Set<string>();
      if (projectScreens) {
        projectScreens.forEach((screen: any) => {
          const content = [
            screen.html_content,
            screen.css_content,
            screen.js_content,
            screen.thumbnail_url,
          ].join(' ');

          // Extract blob URLs and other references
          const urlMatches = content.match(/blob:[^"'\s)]+/g) || [];
          urlMatches.forEach(url => referencedUrls.add(url));
        });
      }

      // Find storage items for this project that aren't referenced
      const { data: projectItems } = await db.client
        .from('storage_items')
        .select('*')
        .eq('user_id', user.supabaseUserId)
        .eq('project_id', projectId);

      const orphanedItems = (projectItems || []).filter((item: any) => 
        item.url && !referencedUrls.has(item.url)
      );

      if (orphanedItems.length > 0) {
        const orphanedIds = orphanedItems.map((item: any) => item.id);
        const orphanedSize = orphanedItems.reduce((sum: number, item: any) => sum + (item.size_bytes || 0), 0);

        // Delete orphaned items
        await db.client
          .from('storage_items')
          .delete()
          .in('id', orphanedIds);

        totalCleaned += orphanedItems.length;
        totalSize += orphanedSize;
      }
    } else {
      // Global cleanup - find truly orphaned items
      const { data: orphanedItems } = await orphanedQuery;

      if (orphanedItems && orphanedItems.length > 0) {
        const orphanedIds = orphanedItems.map((item: any) => item.id);
        const orphanedSize = orphanedItems.reduce((sum: number, item: any) => sum + (item.size_bytes || 0), 0);

        // Delete orphaned items
        await db.client
          .from('storage_items')
          .delete()
          .in('id', orphanedIds);

        totalCleaned += orphanedItems.length;
        totalSize += orphanedSize;
      }
    }

    // Clean up old thumbnails (older than 30 days and not referenced)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: oldThumbnails } = await db.client
      .from('storage_items')
      .select('*')
      .eq('user_id', user.supabaseUserId)
      .eq('type', 'thumbnail')
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (oldThumbnails && oldThumbnails.length > 0) {
      const thumbnailIds = oldThumbnails.map((item: any) => item.id);
      const thumbnailSize = oldThumbnails.reduce((sum: number, item: any) => sum + (item.size_bytes || 0), 0);

      await db.client
        .from('storage_items')
        .delete()
        .in('id', thumbnailIds);

      totalCleaned += oldThumbnails.length;
      totalSize += thumbnailSize;
    }

    // Update user storage usage
    if (totalSize > 0) {
      const { data: userData } = await db.client
        .from('users')
        .select('storage_used_bytes')
        .eq('id', user.supabaseUserId)
        .single();

      if (userData) {
        const newStorageUsed = Math.max(0, (userData.storage_used_bytes || 0) - totalSize);
        await db.client
          .from('users')
          .update({ storage_used_bytes: newStorageUsed })
          .eq('id', user.supabaseUserId);
      }
    }

    // Log cleanup event
    await db.logUsageEvent(user.supabaseUserId, 'storage_cleanup', {
      projectId,
      additionalData: {
        itemsCleaned: totalCleaned,
        bytesFreed: totalSize,
      },
    });

    return json({ 
      success: true, 
      cleaned: {
        count: totalCleaned,
        size: totalSize,
      }
    });
  } catch (error) {
    console.error('Error cleaning up storage:', error);
    return json({ error: 'Failed to cleanup storage' }, { status: 500 });
  }
}