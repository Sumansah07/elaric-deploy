/**
 * Clerk Webhook Handler
 * Handles user events from Clerk (create, update, delete)
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Webhook } from 'svix';
import { db } from '~/lib/database/supabase.server';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

/**
 * Verify webhook signature
 */
function verifyWebhook(request: Request, body: string): any {
  if (!webhookSecret) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  const svix_id = request.headers.get('svix-id');
  const svix_timestamp = request.headers.get('svix-timestamp');
  const svix_signature = request.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    throw new Error('Missing svix headers');
  }

  const wh = new Webhook(webhookSecret);

  return wh.verify(body, {
    'svix-id': svix_id,
    'svix-timestamp': svix_timestamp,
    'svix-signature': svix_signature,
  });
}

/**
 * Handle Clerk webhook events
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get raw body
    const body = await request.text();

    // Verify webhook signature
    let event;
    try {
      event = verifyWebhook(request, body);
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return json({ error: 'Invalid signature' }, { status: 401 });
    }

    const eventType = event.type;
    console.log(`Received Clerk webhook: ${eventType}`);

    // Handle different event types
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url } = event.data;

        await db.getOrCreateUser(
          id,
          email_addresses[0]?.email_address || '',
          `${first_name || ''} ${last_name || ''}`.trim() || undefined,
          image_url,
        );

        console.log(`User created in Supabase: ${id}`);
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = event.data;

        // Update user in Supabase
        const user = await db.getUserByClerkId(id);

        if (user) {
          await db.client
            .from('users')
            .update({
              email: email_addresses[0]?.email_address || user.email,
              full_name: `${first_name || ''} ${last_name || ''}`.trim() || user.full_name,
              avatar_url: image_url || user.avatar_url,
            })
            .eq('clerk_user_id', id);

          console.log(`User updated in Supabase: ${id}`);
        }
        break;
      }

      case 'user.deleted': {
        const { id } = event.data;

        // Delete user from Supabase (cascade will handle related records)
        const user = await db.getUserByClerkId(id);

        if (user) {
          await db.client.from('users').delete().eq('clerk_user_id', id);
          console.log(`User deleted from Supabase: ${id}`);
        }
        break;
      }

      case 'session.created': {
        const { user_id } = event.data;

        // Update last login time
        await db.client
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('clerk_user_id', user_id);

        // Log login event
        const user = await db.getUserByClerkId(user_id);
        if (user) {
          await db.logUsageEvent(user.id, 'login');
        }

        console.log(`User logged in: ${user_id}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return json({ error: 'Webhook handler failed', details: error.message }, { status: 500 });
  }
}

// Disable CSRF for webhooks
export const config = {
  runtime: 'edge',
};
