/**
 * Stripe Billing Service
 * Handles subscription creation, management, and billing portal
 */

import Stripe from 'stripe';
import { db } from '~/lib/database/supabase.server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
});

export class BillingService {
  /**
   * Create a new Stripe customer
   */
  async createCustomer(email: string, clerkUserId: string, name?: string): Promise<Stripe.Customer> {
    return stripe.customers.create({
      email,
      name,
      metadata: {
        clerk_user_id: clerkUserId,
      },
    });
  }

  /**
   * Get or create Stripe customer for user
   */
  async getOrCreateCustomer(clerkUserId: string): Promise<string> {
    // Check if user already has a Stripe customer ID
    const user = await db.getUserByClerkId(clerkUserId);

    if (user.stripe_customer_id) {
      return user.stripe_customer_id;
    }

    // Create new customer
    const customer = await this.createCustomer(user.email, clerkUserId, user.full_name || undefined);

    // Update user with Stripe customer ID
    await db.updateUserSubscription(clerkUserId, {
      tier: user.subscription_tier,
      status: user.subscription_status,
      stripeCustomerId: customer.id,
    });

    return customer.id;
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(clerkUserId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const customerId = await this.getOrCreateCustomer(clerkUserId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          clerk_user_id: clerkUserId,
        },
      },
      metadata: {
        clerk_user_id: clerkUserId,
      },
    });

    return session;
  }

  /**
   * Create billing portal session
   */
  async createPortalSession(clerkUserId: string, returnUrl: string) {
    try {
      const user = await db.getUserByClerkId(clerkUserId);
      
      // Get customer ID from database or find by email
      let customerId = user.stripe_customer_id;
      
      if (!customerId) {
        // Try to find customer by email
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });
        
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          // Update database with customer ID
          await db.updateUserSubscription(clerkUserId, {
            tier: user.subscription_tier,
            status: user.subscription_status,
            stripeCustomerId: customerId,
          });
        } else {
          throw new Error('No Stripe customer found. Please complete a purchase first.');
        }
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, atPeriodEnd = true) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    });
  }

  /**
   * Resume subscription
   */
  async resumeSubscription(subscriptionId: string) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Get customer subscriptions
   */
  async getCustomerSubscriptions(customerId: string) {
    return stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(customerId: string) {
    try {
      return await stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });
    } catch (error) {
      // No upcoming invoice
      return null;
    }
  }

  /**
   * Get payment methods for customer
   */
  async getPaymentMethods(customerId: string) {
    return stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
  }

  /**
   * Update subscription to new price
   */
  async updateSubscriptionPrice(subscriptionId: string, newPriceId: string) {
    const subscription = await this.getSubscription(subscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;

    return stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  /**
   * Create usage record for metered billing (future feature)
   */
  async recordUsage(subscriptionItemId: string, quantity: number, timestamp?: number) {
    return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      action: 'increment',
    });
  }

  /**
   * Get subscription tier pricing
   */
  static getPricing() {
    return {
      free: {
        price: 0,
        priceId: process.env.STRIPE_PRICE_ID_FREE,
        features: [
          '5 projects',
          '100 AI generations',
          '1 GB storage',
          'Basic support',
        ],
      },
      pro: {
        price: 29,
        priceId: process.env.STRIPE_PRICE_ID_PRO,
        features: [
          '50 projects',
          '10,000 AI generations',
          '50 GB storage',
          'Figma export',
          'Priority support',
          'Advanced analytics',
        ],
      },
    };
  }

  /**
   * Check if user has reached usage limit
   */
  async checkUsageLimit(clerkUserId: string, limitType: 'projects' | 'ai_generations' | 'storage') {
    const user = await db.getUserByClerkId(clerkUserId);
    const limits = await db.getUserLimits(user.id);
    const limit = limits[0];

    if (!limit) {
      return { exceeded: true, current: 0, max: 0 };
    }

    switch (limitType) {
      case 'projects':
        return {
          exceeded: user.projects_created >= limit.max_projects,
          current: user.projects_created,
          max: limit.max_projects,
        };
      case 'ai_generations':
        return {
          exceeded: user.ai_generations_count >= limit.max_ai_generations,
          current: user.ai_generations_count,
          max: limit.max_ai_generations,
        };
      case 'storage':
        const storageGB = user.storage_used_bytes / (1024 * 1024 * 1024);
        return {
          exceeded: storageGB >= limit.max_storage_gb,
          current: parseFloat(storageGB.toFixed(2)),
          max: limit.max_storage_gb,
        };
      default:
        return { exceeded: false, current: 0, max: 0 };
    }
  }
}

// Export singleton instance
export const billing = new BillingService();
