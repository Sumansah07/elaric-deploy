/**
 * Session refresh and persistence utilities
 */
import { getSessionData, createSessionHeaders, getRememberMeData } from './cookies.server';
import type { SessionData } from './types';
import { getSupabaseClient } from '../database/connection.server';

/**
 * Session refresh result
 */
interface SessionRefreshResult {
  success: boolean;
  sessionData?: SessionData;
  headers?: Headers;
  error?: string;
}

/**
 * Check if session needs refresh (within 1 hour of expiry)
 */
export function shouldRefreshSession(sessionData: SessionData): boolean {
  const expiresAt = new Date(sessionData.expiresAt);
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  return expiresAt <= oneHourFromNow;
}

/**
 * Refresh an existing session
 */
export async function refreshSession(request: Request): Promise<SessionRefreshResult> {
  try {
    const sessionData = await getSessionData(request);
    
    if (!sessionData) {
      return { success: false, error: 'No valid session found' };
    }

    // Check if session exists in database
    const supabase = getSupabaseClient();
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', sessionData.sessionId)
      .eq('user_id', sessionData.userId)
      .single();

    if (sessionError || !session) {
      return { success: false, error: 'Session not found in database' };
    }

    // Check if session is still valid
    if (new Date(session.expires_at) <= new Date()) {
      return { success: false, error: 'Session expired' };
    }

    // Create new expiration time
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now

    // Update session in database
    const { error: updateError } = await supabase
      .from('user_sessions')
      .update({
        expires_at: newExpiresAt.toISOString(),
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', sessionData.sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return { success: false, error: 'Failed to refresh session' };
    }

    // Create new session data
    const newSessionData: SessionData = {
      ...sessionData,
      expiresAt: newExpiresAt.toISOString(),
    };

    // Create new cookie headers
    const headers = await createSessionHeaders(newSessionData);

    return {
      success: true,
      sessionData: newSessionData,
      headers,
    };
  } catch (error) {
    console.error('Error refreshing session:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Restore session from remember me cookie
 */
export async function restoreSessionFromRememberMe(request: Request): Promise<SessionRefreshResult> {
  try {
    const rememberMeData = await getRememberMeData(request);
    
    if (!rememberMeData) {
      return { success: false, error: 'No remember me data found' };
    }

    const supabase = getSupabaseClient();
    
    // Get session and user data
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        *,
        users (
          id,
          email,
          full_name,
          is_email_verified,
          subscription_tier
        )
      `)
      .eq('id', rememberMeData.sessionId)
      .eq('user_id', rememberMeData.userId)
      .single();

    if (sessionError || !session) {
      return { success: false, error: 'Session not found' };
    }

    // Check if session is still valid
    if (new Date(session.expires_at) <= new Date()) {
      return { success: false, error: 'Session expired' };
    }

    // Create new expiration time
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now

    // Update session in database
    const { error: updateError } = await supabase
      .from('user_sessions')
      .update({
        expires_at: newExpiresAt.toISOString(),
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('Error updating restored session:', updateError);
      return { success: false, error: 'Failed to restore session' };
    }

    // Create session data
    const sessionData: SessionData = {
      userId: session.user_id,
      email: session.users.email,
      sessionId: session.id,
      expiresAt: newExpiresAt.toISOString(),
      rememberMe: true,
    };

    // Create cookie headers
    const headers = await createSessionHeaders(sessionData);

    return {
      success: true,
      sessionData,
      headers,
    };
  } catch (error) {
    console.error('Error restoring session from remember me:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Clean up expired sessions from database
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  } catch (error) {
    console.error('Error in session cleanup:', error);
  }
}

/**
 * Get session with automatic refresh
 */
export async function getSessionWithRefresh(request: Request): Promise<{
  sessionData: SessionData | null;
  headers?: Headers;
}> {
  try {
    // Try to get current session
    let sessionData = await getSessionData(request);
    let headers: Headers | undefined;

    // If no session, try to restore from remember me
    if (!sessionData) {
      const restoreResult = await restoreSessionFromRememberMe(request);
      if (restoreResult.success) {
        sessionData = restoreResult.sessionData!;
        headers = restoreResult.headers;
      }
    }
    // If session exists but needs refresh
    else if (shouldRefreshSession(sessionData)) {
      const refreshResult = await refreshSession(request);
      if (refreshResult.success) {
        sessionData = refreshResult.sessionData!;
        headers = refreshResult.headers;
      }
    }

    return { sessionData, headers };
  } catch (error) {
    console.error('Error in getSessionWithRefresh:', error);
    return { sessionData: null };
  }
}