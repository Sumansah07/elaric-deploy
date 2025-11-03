/**
 * Unit tests for session management system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionManager, type CreateSessionOptions } from './session.server';

// Mock the database connection
vi.mock('../database/connection.server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        gt: vi.fn(() => ({
          order: vi.fn(),
        })),
        lt: vi.fn(() => ({
          select: vi.fn(),
        })),
        gte: vi.fn(() => ({
          select: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
        lt: vi.fn(() => ({
          select: vi.fn(),
        })),
      })),
    })),
  },
  executeWithRetry: vi.fn((fn) => fn()),
}));

// Mock crypto
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: vi.fn(() => 'mock_session_id_12345'),
  })),
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionManager = new SessionManager();
    
    // Get the mocked supabase instance
    const { supabaseAdmin } = require('../database/connection.server');
    mockSupabase = supabaseAdmin;
  });

  afterEach(() => {
    sessionManager.stopCleanupTimer();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const userId = 'user123';
      const options: CreateSessionOptions = {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        rememberMe: false,
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      const sessionId = await sessionManager.createSession(userId, options);

      expect(sessionId).toBe('mock_session_id_12345');
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions');
    });

    it('should create session with remember me option', async () => {
      const userId = 'user123';
      const options: CreateSessionOptions = {
        rememberMe: true,
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      const sessionId = await sessionManager.createSession(userId, options);

      expect(sessionId).toBe('mock_session_id_12345');
    });

    it('should throw error for empty user ID', async () => {
      await expect(sessionManager.createSession('')).rejects.toThrow('User ID is required to create session');
    });

    it('should handle database errors', async () => {
      const userId = 'user123';

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      });

      await expect(sessionManager.createSession(userId)).rejects.toThrow('Failed to create session: Database error');
    });
  });

  describe('getSession', () => {
    it('should get valid session', async () => {
      const sessionId = 'session123';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
      
      const mockSessionData = {
        id: sessionId,
        user_id: 'user123',
        expires_at: futureDate.toISOString(),
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        user_agent: 'Mozilla/5.0',
        ip_address: '192.168.1.1',
        metadata: {},
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
          }),
        }),
      });

      const session = await sessionManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
      expect(session?.userId).toBe('user123');
    });

    it('should return null for expired session', async () => {
      const sessionId = 'session123';
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      
      const mockSessionData = {
        id: sessionId,
        user_id: 'user123',
        expires_at: pastDate.toISOString(),
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        user_agent: 'Mozilla/5.0',
        ip_address: '192.168.1.1',
        metadata: {},
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const session = await sessionManager.getSession(sessionId);

      expect(session).toBeNull();
    });

    it('should return null for non-existent session', async () => {
      const sessionId = 'nonexistent';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });

      const session = await sessionManager.getSession(sessionId);

      expect(session).toBeNull();
    });

    it('should return null for empty session ID', async () => {
      const session = await sessionManager.getSession('');
      expect(session).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('should validate and update session access time', async () => {
      const sessionId = 'session123';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const mockSessionData = {
        id: sessionId,
        user_id: 'user123',
        expires_at: futureDate.toISOString(),
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        user_agent: 'Mozilla/5.0',
        ip_address: '192.168.1.1',
        metadata: {},
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const session = await sessionManager.validateSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
    });

    it('should return null for invalid session', async () => {
      const sessionId = 'invalid';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });

      const session = await sessionManager.validateSession(sessionId);

      expect(session).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('should refresh session expiration', async () => {
      const sessionId = 'session123';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const mockSessionData = {
        id: sessionId,
        user_id: 'user123',
        expires_at: futureDate.toISOString(),
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        user_agent: 'Mozilla/5.0',
        ip_address: '192.168.1.1',
        metadata: {},
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockSessionData, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const refreshedSessionId = await sessionManager.refreshSession(sessionId, true);

      expect(refreshedSessionId).toBe(sessionId);
    });

    it('should throw error for empty session ID', async () => {
      await expect(sessionManager.refreshSession('')).rejects.toThrow('Session ID is required');
    });

    it('should throw error for non-existent session', async () => {
      const sessionId = 'nonexistent';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      });

      await expect(sessionManager.refreshSession(sessionId)).rejects.toThrow('Session not found or expired');
    });
  });

  describe('destroySession', () => {
    it('should destroy session successfully', async () => {
      const sessionId = 'session123';

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(sessionManager.destroySession(sessionId)).resolves.not.toThrow();
    });

    it('should handle empty session ID gracefully', async () => {
      await expect(sessionManager.destroySession('')).resolves.not.toThrow();
    });
  });

  describe('destroyAllUserSessions', () => {
    it('should destroy all user sessions', async () => {
      const userId = 'user123';

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(sessionManager.destroyAllUserSessions(userId)).resolves.not.toThrow();
    });

    it('should handle empty user ID gracefully', async () => {
      await expect(sessionManager.destroyAllUserSessions('')).resolves.not.toThrow();
    });
  });

  describe('getUserSessions', () => {
    it('should get all active user sessions', async () => {
      const userId = 'user123';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const mockSessions = [
        {
          id: 'session1',
          user_id: userId,
          expires_at: futureDate.toISOString(),
          created_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          user_agent: 'Mozilla/5.0',
          ip_address: '192.168.1.1',
          metadata: {},
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
            }),
          }),
        }),
      });

      const sessions = await sessionManager.getUserSessions(userId);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('session1');
    });

    it('should return empty array for empty user ID', async () => {
      const sessions = await sessionManager.getUserSessions('');
      expect(sessions).toEqual([]);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      const mockDeletedSessions = [{ id: 'session1' }, { id: 'session2' }];

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: mockDeletedSessions, error: null }),
          }),
        }),
      });

      const deletedCount = await sessionManager.cleanupExpiredSessions();

      expect(deletedCount).toBe(2);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
          }),
        }),
      });

      const deletedCount = await sessionManager.cleanupExpiredSessions();

      expect(deletedCount).toBe(0);
    });
  });
});