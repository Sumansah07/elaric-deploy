/**
 * Sync Subscription API
 * Manually syncs subscription from Stripe after successful checkout
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { db } from '~/lib/database/supabase.server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
});

export async function action(args: ActionFunctionArgs) {
  if (args.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const user = await getAuthenticatedUser(args);
    console.log('🔄 Syncing subscription for user:', user.email);

    // Find customer by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log('❌ No Stripe customer found');
      return json({ error: 'No subscription found' }, { status: 404 });
    }

    const customer = customers.data[0];
    console.log('✅ Found customer:', customer.id);

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      console.log('❌ No active subscription found');
      return json({ error: 'No active subscription' }, { status: 404 });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;
    
    // Determine tier
    const tier = getPriceTier(priceId);
    console.log('📊 Subscription tier:', tier);

    // Update user in Supabase
    await db.updateUserSubscription(user.clerkUserId, {
      tier,
      status: 'active',
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      startsAt: new Date(subscription.current_period_start * 1000).toISOString(),
      endsAt: new Date(subscription.current_period_end * 1000).toISOString(),
    });

    console.log('✅ Subscription synced successfully');
    console.log('   Customer ID:', customer.id);
    console.log('   Subscription ID:', subscription.id);
    console.log('   Tier:', tier);

    return json({ 
      success: true, 
      tier,
      status: 'active'
    });
  } catch (error: any) {
    console.error('❌ Error syncing subscription:', error);
    return json({ 
      error: 'Failed to sync subscription',
      details: error.message 
    }, { status: 500 });
  }
}

function getPriceTier(priceId: string): 'free' | 'pro' | 'enterprise' {
  const proPrice = process.env.STRIPE_PRICE_ID_PRO;
  const enterprisePrice = process.env.STRIPE_PRICE_ID_ENTERPRISE;

  if (priceId === proPrice) return 'pro';
  if (priceId === enterprisePrice) return 'enterprise';
  return 'free';
}
