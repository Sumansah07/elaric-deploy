/**
 * Stripe Webhook Handler
 * Handles payment and subscription events
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import Stripe from 'stripe';
import { db } from '~/lib/database/supabase.server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Verify Stripe webhook signature
 */
function constructEvent(request: Request, body: string): Stripe.Event {
  if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    throw new Error('Missing stripe-signature header');
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

/**
 * Handle Stripe webhook events
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get raw body
    const body = await request.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = constructEvent(request, body);
    } catch (error) {
      console.error('Stripe webhook verification failed:', error);
      return json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancellation(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSuccess(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailure(invoice);
        break;
      }

      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer;
        console.log(`New Stripe customer created: ${customer.id}`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Stripe webhook handler error:', error);
    return json({ error: 'Webhook handler failed', details: error.message }, { status: 500 });
  }
}

/**
 * Handle subscription creation/update
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    const clerkUserId = subscription.metadata?.clerk_user_id;

    if (!clerkUserId) {
      console.error('Missing clerk_user_id in subscription metadata');
      return;
    }

    // Determine tier from price ID
    const priceId = subscription.items.data[0]?.price.id;
    const tier = getPriceTier(priceId);

    // Determine status
    const status = mapStripeStatus(subscription.status);

    // Update user subscription in Supabase
    await db.updateUserSubscription(clerkUserId, {
      tier,
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      startsAt: new Date(subscription.current_period_start * 1000).toISOString(),
      endsAt: new Date(subscription.current_period_end * 1000).toISOString(),
    });

    // Log subscription change event
    const user = await db.getUserByClerkId(clerkUserId);
    if (user) {
      await db.logUsageEvent(user.id, 'subscription_change', {
        additionalData: {
          tier,
          status,
          subscription_id: subscription.id,
        },
      });
    }

    console.log(`Subscription updated for user ${clerkUserId}: ${tier} - ${status}`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  try {
    const clerkUserId = subscription.metadata?.clerk_user_id;

    if (!clerkUserId) {
      console.error('Missing clerk_user_id in subscription metadata');
      return;
    }

    // Downgrade to free tier
    await db.updateUserSubscription(clerkUserId, {
      tier: 'free',
      status: 'cancelled',
      endsAt: new Date(subscription.current_period_end * 1000).toISOString(),
    });

    // Log subscription cancellation
    const user = await db.getUserByClerkId(clerkUserId);
    if (user) {
      await db.logUsageEvent(user.id, 'subscription_change', {
        additionalData: {
          tier: 'free',
          status: 'cancelled',
          subscription_id: subscription.id,
        },
      });
    }

    console.log(`Subscription cancelled for user ${clerkUserId}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
    throw error;
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  try {
    const clerkUserId = invoice.subscription_details?.metadata?.clerk_user_id;

    if (!clerkUserId) {
      return;
    }

    console.log(`Payment succeeded for user ${clerkUserId}: ${invoice.amount_paid / 100} ${invoice.currency}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(invoice: Stripe.Invoice) {
  try {
    const clerkUserId = invoice.subscription_details?.metadata?.clerk_user_id;

    if (!clerkUserId) {
      return;
    }

    // Update subscription status to past_due
    await db.updateUserSubscription(clerkUserId, {
      tier: 'free', // Will be restored from existing data
      status: 'past_due',
    });

    // Log payment failure
    const user = await db.getUserByClerkId(clerkUserId);
    if (user) {
      await db.logError({
        userId: user.id,
        errorType: 'payment_failure',
        errorMessage: `Payment failed for invoice ${invoice.id}`,
        metadata: {
          invoice_id: invoice.id,
          amount: invoice.amount_due,
        },
      });
    }

    console.log(`Payment failed for user ${clerkUserId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Map Stripe price ID to subscription tier
 */
function getPriceTier(priceId: string): 'free' | 'pro' | 'enterprise' {
  const proPrice = process.env.STRIPE_PRICE_ID_PRO;
  const enterprisePrice = process.env.STRIPE_PRICE_ID_ENTERPRISE;

  if (priceId === proPrice) {
    return 'pro';
  }
  
  if (priceId === enterprisePrice) {
    return 'enterprise';
  }

  return 'free';
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status,
): 'active' | 'cancelled' | 'past_due' | 'paused' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
    case 'unpaid':
      return 'cancelled';
    case 'past_due':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'incomplete':
    case 'incomplete_expired':
    default:
      return 'cancelled';
  }
}
