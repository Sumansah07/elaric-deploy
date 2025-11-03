/**
 * API Route: Create Stripe billing portal session
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { billing } from '~/lib/billing/stripe.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser({ request } as any);

    // Parse request body
    const body = await request.json();
    const { returnUrl } = body;

    if (!returnUrl) {
      return json({ error: 'Missing returnUrl parameter' }, { status: 400 });
    }

    // Create billing portal session
    const session = await billing.createPortalSession(user.clerkUserId, returnUrl);

    return json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return json({ error: 'Failed to create billing portal session', details: error.message }, { status: 500 });
  }
}
