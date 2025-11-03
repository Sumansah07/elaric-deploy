/**
 * Session management utilities for server-side authentication
 */

import { createClient } from '@supabase/supabase-js';
import { createCookieSessionStorage, redirect } from '@remix-run/cloudflare';
import type { PublicUser } from './types';

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Session configuration
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === 'production',
  },
});

export interface SessionData {
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

export class SessionManager {
  private supabase = getSupabaseClient();

  /**
   * Create a new session for a user
   * @param request - Request object
   * @param user - User data
   * @param rememberMe - Whether to extend session duration
   * @returns Promise<Response> - Response with session cookie
   */
  async createSession(
    request: Request,
    user: PublicUser,
    rememberMe: boolean = false
  ): Promise<{ sessionId: string; headers: Headers }> {
    const session = await getSession(request.headers.get('Cookie'));
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)); // 30 days or 1 day
    
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Store session in database
    const { data: sessionRecord, error } = await this.supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_data: sessionData,
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    // Set session data in cookie
    session.set('sessionId', sessionRecord.id);
    session.set('userId', user.id);
    session.set('email', user.email);

    const headers = new Headers();
    headers.append('Set-Cookie', await commitSession(session));

    return { sessionId: sessionRecord.id, headers };
  }

  /**
   * Get session data from request
   * @param request - Request object
   * @returns Promise<SessionData | null> - Session data or null if invalid
   */
  async getSessionData(request: Request): Promise<SessionData | null> {
    try {
      const session = await getSession(request.headers.get('Cookie'));
      const sessionId = session.get('sessionId');
      const userId = session.get('userId');

      if (!sessionId || !userId) {
        return null;
      }

      // Verify session in database
      const { data: sessionRecord, error } = await this.supabase
        .from('user_sessions')
        .select('session_data, expires_at')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error || !sessionRecord) {
        return null;
      }

      // Check if session is expired
      const expiresAt = new Date(sessionRecord.expires_at);
      if (expiresAt < new Date()) {
        // Clean up expired session
        await this.destroySessionById(sessionId);
        return null;
      }

      return sessionRecord.session_data as SessionData;
    } catch (error) {
      console.error('Failed to get session data:', error);
      return null;
    }
  }

  /**
   * Destroy a session
   * @param request - Request object
   * @returns Promise<Headers> - Headers with destroyed session cookie
   */
  async destroySession(request: Request): Promise<Headers> {
    const session = await getSession(request.headers.get('Cookie'));
    const sessionId = session.get('sessionId');

    if (sessionId) {
      await this.destroySessionById(sessionId);
    }

    const headers = new Headers();
    headers.append('Set-Cookie', await destroySession(session));
    return headers;
  }

  /**
   * Destroy session by ID
   * @param sessionId - Session ID to destroy
   */
  private async destroySessionById(sessionId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);
    } catch (error) {
      console.error('Failed to destroy session:', error);
    }
  }

  /**
   * Refresh session expiration
   * @param request - Request object
   * @param rememberMe - Whether to extend session duration
   * @returns Promise<Headers | null> - Updated session headers or null if session invalid
   */
  async refreshSession(request: Request, rememberMe: boolean = false): Promise<Headers | null> {
    const session = await getSession(request.headers.get('Cookie'));
    const sessionId = session.get('sessionId');

    if (!sessionId) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000));

    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        return null;
      }

      const headers = new Headers();
      headers.append('Set-Cookie', await commitSession(session));
      return headers;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return null;
    }
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Get all active sessions for a user
   * @param userId - User ID
   * @returns Promise<SessionData[]> - Array of active sessions
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const { data: sessions, error } = await this.supabase
        .from('user_sessions')
        .select('session_data')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        throw new Error(`Failed to get user sessions: ${error.message}`);
      }

      return sessions.map(s => s.session_data as SessionData);
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Destroy all sessions for a user (logout from all devices)
   * @param userId - User ID
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);
    } catch (error) {
      console.error('Failed to destroy all user sessions:', error);
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

/**
 * Require authentication for a route
 * @param request - Request object
 * @returns Promise<PublicUser> - User data if authenticated
 * @throws Redirect to login if not authenticated
 */
export async function requireAuth(request: Request): Promise<PublicUser> {
  const sessionData = await sessionManager.getSessionData(request);
  
  if (!sessionData) {
    const url = new URL(request.url);
    const returnTo = url.pathname + url.search;
    throw redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  // Get user data from repository
  const { userRepository } = await import('./user-repository.server');
  const user = await userRepository.findUserById(sessionData.userId);
  
  if (!user) {
    // User was deleted, destroy session
    await sessionManager.destroySession(request);
    throw redirect('/login');
  }

  return user;
}

/**
 * Get current user if authenticated
 * @param request - Request object
 * @returns Promise<PublicUser | null> - User data or null if not authenticated
 */
export async function getCurrentUser(request: Request): Promise<PublicUser | null> {
  try {
    const sessionData = await sessionManager.getSessionData(request);
    
    if (!sessionData) {
      return null;
    }

    // Get user data from repository
    const { userRepository } = await import('./user-repository.server');
    const user = await userRepository.findUserById(sessionData.userId);
    
    if (!user) {
      // User was deleted, destroy session
      await sessionManager.destroySession(request);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}