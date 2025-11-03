/**
 * Storage Delete API Endpoint
 * Deletes storage items and frees up space
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
    const { itemIds } = await request.json();

    if (!itemIds || !Array.isArray(itemIds)) {
      return json({ error: 'Invalid itemIds provided' }, { status: 400 });
    }

    // Get items to delete (verify ownership)
    const { data: items, error: fetchError } = await db.client
      .from('storage_items')
      .select('*')
      .in('id', itemIds)
      .eq('user_id', user.supabaseUserId);

    if (fetchError) {
      throw fetchError;
    }

    if (!items || items.length === 0) {
      return json({ error: 'No items found or access denied' }, { status: 404 });
    }

    // Calculate total size being deleted
    const totalSize = items.reduce((sum: number, item: any) => sum + (item.size_bytes || 0), 0);

    // Delete from storage (if using cloud storage)
    // TODO: Implement actual file deletion from cloud storage
    for (const item of items) {
      if (item.url && item.url.startsWith('blob:')) {
        // Revoke blob URLs
        try {
          URL.revokeObjectURL(item.url);
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error);
        }
      }
    }

    // Delete from database
    const { error: deleteError } = await db.client
      .from('storage_items')
      .delete()
      .in('id', itemIds)
      .eq('user_id', user.supabaseUserId);

    if (deleteError) {
      throw deleteError;
    }

    // Update user storage usage
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

    // Log usage event
    await db.logUsageEvent(user.supabaseUserId, 'storage_deleted', {
      additionalData: {
        itemCount: items.length,
        bytesFreed: totalSize,
      },
    });

    return json({ 
      success: true, 
      deleted: items.length,
      bytesFreed: totalSize,
    });
  } catch (error) {
    console.error('Error deleting storage items:', error);
    return json({ error: 'Failed to delete storage items' }, { status: 500 });
  }
}