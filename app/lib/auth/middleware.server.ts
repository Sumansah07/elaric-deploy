/**
 * Authentication middleware for server-side route protection
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { redirect } from '@remix-run/cloudflare';
import { authService } from './auth.server';
import type { PublicUser } from './types';

export interface AuthenticatedRequest {
  user: PublicUser;
  sessionId: string;
}

/**
 * Require authentication for a route
 * Redirects to login if not authenticated
 */
export async function requireAuth(
  request: Request,
  redirectTo: string = '/login'
): Promise<AuthenticatedRequest> {
  const auth = await getCurrentUser(request);
  
  if (!auth) {
    const url = new URL(request.url);
    const returnTo = url.pathname !== '/' ? `?returnTo=${encodeURIComponent(url.pathname)}` : '';
    throw redirect(`${redirectTo}${returnTo}`);
  }
  
  return auth;
}

/**
 * Get current user if authenticated, null otherwise
 * Does not redirect, includes session refresh
 */
export async function getCurrentUser(request: Request): Promise<AuthenticatedRequest | null> {
  try {
    // Get session with automatic refresh
    const { getSessionWithRefresh } = await import('./session-refresh.server');
    const { sessionData, headers } = await getSessionWithRefresh(request);
    
    if (!sessionData) {
      return null;
    }

    // Validate session using auth service
    const result = await authService.validateSession(sessionData.sessionId);

    if (!result.success || !result.user) {
      return null;
    }

    return {
      user: result.user,
      sessionId: sessionData.sessionId,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require guest (not authenticated) for a route
 * Redirects to dashboard if authenticated
 */
export async function requireGuest(
  request: Request,
  redirectTo: string = '/'
): Promise<void> {
  const user = await getCurrentUser(request);
  
  if (user) {
    throw redirect(redirectTo);
  }
}

/**
 * Higher-order function to protect loaders
 */
export function protectedLoader<T>(
  loader: (args: LoaderFunctionArgs & { auth: AuthenticatedRequest }) => Promise<T>
) {
  return async (args: LoaderFunctionArgs): Promise<T> => {
    const auth = await requireAuth(args.request);
    return loader({ ...args, auth });
  };
}

/**
 * Higher-order function to protect actions
 */
export function protectedAction<T>(
  action: (args: ActionFunctionArgs & { auth: AuthenticatedRequest }) => Promise<T>
) {
  return async (args: ActionFunctionArgs): Promise<T> => {
    const auth = await requireAuth(args.request);
    return action({ ...args, auth });
  };
}

/**
 * Higher-order function for guest-only loaders
 */
export function guestOnlyLoader<T>(
  loader: (args: LoaderFunctionArgs) => Promise<T>
) {
  return async (args: LoaderFunctionArgs): Promise<T> => {
    await requireGuest(args.request);
    return loader(args);
  };
}

/**
 * Higher-order function for guest-only actions
 */
export function guestOnlyAction<T>(
  action: (args: ActionFunctionArgs) => Promise<T>
) {
  return async (args: ActionFunctionArgs): Promise<T> => {
    await requireGuest(args.request);
    return action(args);
  };
}