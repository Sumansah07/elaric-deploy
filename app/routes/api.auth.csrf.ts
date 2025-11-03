/**
 * CSRF token API route
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { generateCSRFToken, setCSRFTokenHeader } from '~/lib/auth/cookies.server';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Generate new CSRF token
    const csrfToken = generateCSRFToken();
    const csrfHeader = await setCSRFTokenHeader(csrfToken);
    
    return json({
      success: true,
      csrfToken,
    }, {
      headers: {
        'Set-Cookie': csrfHeader,
      }
    });

  } catch (error) {
    console.error('CSRF token API error:', error);
    return json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}