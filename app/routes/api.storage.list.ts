/**
 * Storage List API Endpoint
 * Lists storage items for a user or project
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

    // Get query parameters
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    // Get storage items
    let query = db.client
      .from('storage_items')
      .select('*')
      .eq('user_id', user.supabaseUserId)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: items, error } = await query;

    if (error) {
      throw error;
    }

    // Transform items to match interface
    const storageItems = (items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      size: item.size_bytes,
      url: item.url,
      createdAt: item.created_at,
      projectId: item.project_id,
    }));

    return json({ items: storageItems });
  } catch (error) {
    console.error('Error listing storage items:', error);
    return json({ error: 'Failed to list storage items' }, { status: 500 });
  }
}