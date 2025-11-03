/**
 * Billing Management API
 * Opens Stripe billing portal for subscription management
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { billing } from '~/lib/billing/stripe.server';

export async function action(args: ActionFunctionArgs) {
  console.log('🔵 Billing portal endpoint called');
  
  if (args.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const user = await getAuthenticatedUser(args);
    console.log('👤 User:', user.email);
    
    const returnUrl = `${new URL(args.request.url).origin}/dashboard`;
    console.log('🔗 Return URL:', returnUrl);
    
    const session = await billing.createPortalSession(user.clerkUserId, returnUrl);
    console.log('✅ Portal session created:', session.id);

    return json({ portalUrl: session.url });
  } catch (error: any) {
    console.error('❌ Error creating billing portal session:', error);
    return json({ 
      error: 'Failed to open billing portal',
      details: error.message 
    }, { status: 500 });
  }
}
