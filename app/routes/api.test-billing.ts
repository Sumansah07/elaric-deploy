/**
 * Test Billing API - For development testing only
 * Remove this file in production
 */

import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { db } from '~/lib/database/supabase.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
        return json({
          message: 'Billing system is running',
          timestamp: new Date().toISOString(),
          env: {
            stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
            supabaseConfigured: !!process.env.VITE_SUPABASE_URL,
            clerkConfigured: !!process.env.CLERK_SECRET_KEY,
          },
        });

      case 'test-user':
        // Test if we can query Supabase
        try {
          const testQuery = await db.client
            .from('users')
            .select('id, email, subscription_tier, projects_created, ai_generations_count')
            .limit(1);

          return json({
            message: 'Supabase connection successful',
            sampleUser: testQuery.data?.[0] || null,
            error: testQuery.error,
          });
        } catch (error: any) {
          return json({
            message: 'Supabase connection failed',
            error: error.message,
          }, { status: 500 });
        }

      case 'limits':
        // Show tier limits
        return json({
          tiers: {
            free: {
              projects: 5,
              aiGenerations: 100,
              storageGB: 1,
            },
            pro: {
              projects: 50,
              aiGenerations: 1000,
              storageGB: 10,
            },
            enterprise: {
              projects: 999999,
              aiGenerations: 999999,
              storageGB: 100,
            },
          },
        });

      default:
        return json({
          error: 'Unknown action',
          availableActions: ['status', 'test-user', 'limits'],
        }, { status: 400 });
    }
  } catch (error: any) {
    return json({
      error: 'Test endpoint error',
      details: error.message,
    }, { status: 500 });
  }
}
