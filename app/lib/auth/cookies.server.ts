/**
 * Cookie management utilities for authentication
 */
import { createCookie } from '@remix-run/cloudflare';
import type { SessionData } from './types';

// Session cookie configuration
export const sessionCookie = createCookie('session', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  secrets: [process.env.SESSION_SECRET || 'default-secret-change-in-production'],
});

// Remember me cookie configuration (longer duration)
export const rememberMeCookie = createCookie('remember-me', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  secrets: [process.env.SESSION_SECRET || 'default-secret-change-in-production'],
});

// CSRF token cookie
export const csrfCookie = createCookie('csrf-token', {
  httpOnly: false, // Needs to be accessible by client for CSRF protection
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24, // 24 hours
});

/**
 * Get session data from request
 */
export async function getSessionData(request: Request): Promise<SessionData | null> {
  try {
    const cookieHeader = request.headers.get('Cookie');
    const sessionData = await sessionCookie.parse(cookieHeader);
    
    if (!sessionData || typeof sessionData !== 'object') {
      return null;
    }

    // Validate session data structure
    if (!sessionData.userId || !sessionData.email || !sessionData.sessionId || !sessionData.expiresAt) {
      return null;
    }

    // Check if session is expired
    const expiresAt = new Date(sessionData.expiresAt);
    if (expiresAt <= new Date()) {
      return null;
    }

    return sessionData as SessionData;
  } catch (error) {
    console.error('Error parsing session cookie:', error);
    return null;
  }
}

/**
 * Create session cookie headers
 */
export async function createSessionHeaders(sessionData: SessionData): Promise<Headers> {
  const headers = new Headers();
  
  // Set main session cookie
  const sessionCookieValue = await sessionCookie.serialize(sessionData);
  headers.append('Set-Cookie', sessionCookieValue);
  
  // Set remember me cookie if enabled
  if (sessionData.rememberMe) {
    const rememberMeData = {
      userId: sessionData.userId,
      sessionId: sessionData.sessionId,
    };
    const rememberMeCookieValue = await rememberMeCookie.serialize(rememberMeData);
    headers.append('Set-Cookie', rememberMeCookieValue);
  }
  
  return headers;
}

/**
 * Clear session cookies
 */
export async function clearSessionHeaders(): Promise<Headers> {
  const headers = new Headers();
  
  // Clear session cookie
  const clearedSessionCookie = await sessionCookie.serialize('', { maxAge: 0 });
  headers.append('Set-Cookie', clearedSessionCookie);
  
  // Clear remember me cookie
  const clearedRememberMeCookie = await rememberMeCookie.serialize('', { maxAge: 0 });
  headers.append('Set-Cookie', clearedRememberMeCookie);
  
  return headers;
}

/**
 * Get remember me data from request
 */
export async function getRememberMeData(request: Request): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const cookieHeader = request.headers.get('Cookie');
    const rememberMeData = await rememberMeCookie.parse(cookieHeader);
    
    if (!rememberMeData || typeof rememberMeData !== 'object') {
      return null;
    }

    if (!rememberMeData.userId || !rememberMeData.sessionId) {
      return null;
    }

    return rememberMeData as { userId: string; sessionId: string };
  } catch (error) {
    console.error('Error parsing remember me cookie:', error);
    return null;
  }
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

/**
 * Set CSRF token cookie
 */
export async function setCSRFTokenHeader(token: string): Promise<string> {
  return await csrfCookie.serialize(token);
}

/**
 * Get CSRF token from request
 */
export async function getCSRFToken(request: Request): Promise<string | null> {
  try {
    const cookieHeader = request.headers.get('Cookie');
    return await csrfCookie.parse(cookieHeader);
  } catch (error) {
    console.error('Error parsing CSRF cookie:', error);
    return null;
  }
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
  try {
    const cookieToken = await getCSRFToken(request);
    const headerToken = request.headers.get('X-CSRF-Token');
    const formToken = (await request.clone().formData()).get('_csrf') as string;
    
    const submittedToken = headerToken || formToken;
    
    return cookieToken && submittedToken && cookieToken === submittedToken;
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}