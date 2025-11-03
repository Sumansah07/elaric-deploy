/**
 * Billing Usage API Endpoint
 * Returns current usage limits and statistics for the authenticated user
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { checkUsageLimits } from '~/lib/auth/clerk.server';

export async function loader(args: LoaderFunctionArgs) {
  try {
    const limits = await checkUsageLimits(args);
    return json(limits);
  } catch (error) {
    console.error('Error fetching usage limits:', error);

    if (error instanceof Response && error.status === 401) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    return json({ error: 'Failed to fetch usage limits' }, { status: 500 });
  }
}