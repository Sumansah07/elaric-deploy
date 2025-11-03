/**
 * Supabase Server-Side Client
 * For use in API routes and server-side operations
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Server-side Supabase client with service role access
 * WARNING: This bypasses RLS policies - use carefully!
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Create a Supabase client for a specific user (respects RLS)
 */
export function createUserSupabaseClient(clerkUserId: string) {
  const client = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Set the user context for RLS
  return client.rpc('set_user_context', { user_id: clerkUserId });
}

/**
 * Database operations wrapper with error handling
 */
export class DatabaseService {
  private client = supabaseAdmin;

  /**
   * Execute query with automatic error handling and retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    retries = 3,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await operation();

        if (error) {
          throw error;
        }

        if (data === null) {
          throw new Error('No data returned from database');
        }

        return data;
      } catch (error) {
        lastError = error;
        console.error(`Database operation failed (attempt ${attempt}/${retries}):`, error);

        if (attempt < retries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get or create user by Clerk ID
   */
  async getOrCreateUser(clerkUserId: string, email: string, fullName?: string, avatarUrl?: string) {
    return this.executeWithRetry(async () => {
      // Try to get existing user
      const { data: existingUser } = await this.client
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (existingUser) {
        // Update last login
        return this.client
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', existingUser.id)
          .select()
          .single();
      }

      // Create new user
      return this.client
        .from('users')
        .insert({
          clerk_user_id: clerkUserId,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
        })
        .select()
        .single();
    });
  }

  /**
   * Update user subscription
   */
  async updateUserSubscription(
    clerkUserId: string,
    subscriptionData: {
      tier: 'free' | 'pro' | 'enterprise';
      status: 'active' | 'cancelled' | 'past_due' | 'paused';
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    return this.executeWithRetry(() =>
      this.client
        .from('users')
        .update({
          subscription_tier: subscriptionData.tier,
          subscription_status: subscriptionData.status,
          stripe_customer_id: subscriptionData.stripeCustomerId,
          stripe_subscription_id: subscriptionData.stripeSubscriptionId,
          subscription_starts_at: subscriptionData.startsAt,
          subscription_ends_at: subscriptionData.endsAt,
        })
        .eq('clerk_user_id', clerkUserId)
        .select()
        .single(),
    );
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkUserId: string) {
    return this.executeWithRetry(() =>
      this.client.from('users').select('*').eq('clerk_user_id', clerkUserId).single(),
    );
  }

  /**
   * Update user by ID
   */
  async updateUser(userId: string, updates: Partial<{
    email: string;
    full_name: string;
    avatar_url: string;
    status: string;
    deleted_at: string;
    subscription_tier: string;
    subscription_status: string;
  }>) {
    return this.executeWithRetry(() =>
      this.client.from('users').update(updates).eq('id', userId).select().single(),
    );
  }

  /**
   * Create a new project
   */
  async createProject(userId: string, name: string, description?: string) {
    return this.executeWithRetry(() =>
      this.client
        .from('projects')
        .insert({
          user_id: userId,
          name,
          description,
        })
        .select()
        .single(),
    );
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: string, limit = 50, offset = 0) {
    return this.executeWithRetry(() =>
      this.client
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1),
    );
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId: string) {
    return this.executeWithRetry(() => this.client.from('projects').select('*').eq('id', projectId).single());
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, updates: Partial<{
    name: string;
    description: string;
    status: string;
    thumbnail_url: string;
    canvas_state: any;
    last_opened_at: string;
  }>) {
    return this.executeWithRetry(() =>
      this.client.from('projects').update(updates).eq('id', projectId).select().single(),
    );
  }

  /**
   * Save screen to database
   */
  async saveScreen(projectId: string, screenData: {
    name: string;
    description?: string;
    html_content?: string;
    css_content?: string;
    js_content?: string;
    thumbnail_url?: string;
    screen_order?: number;
    canvas_position?: any;
  }) {
    return this.executeWithRetry(() =>
      this.client.from('screens').insert({ project_id: projectId, ...screenData }).select().single(),
    );
  }

  /**
   * Create screen (alias for saveScreen with better naming)
   */
  async createScreen(screenData: {
    projectId: string;
    name: string;
    description?: string;
    htmlContent?: string;
    cssContent?: string;
    jsContent?: string;
    thumbnailUrl?: string;
    screenOrder?: number;
    canvasPosition?: any;
  }) {
    return this.saveScreen(screenData.projectId, {
      name: screenData.name,
      description: screenData.description,
      html_content: screenData.htmlContent,
      css_content: screenData.cssContent,
      js_content: screenData.jsContent,
      thumbnail_url: screenData.thumbnailUrl,
      screen_order: screenData.screenOrder,
      canvas_position: screenData.canvasPosition,
    });
  }

  /**
   * Get screens for a project
   */
  async getProjectScreens(projectId: string) {
    return this.executeWithRetry(() =>
      this.client.from('screens').select('*').eq('project_id', projectId).order('screen_order', { ascending: true }),
    );
  }

  /**
   * Update screen
   */
  async updateScreen(screenId: string, updates: Partial<{
    name: string;
    description: string;
    html_content: string;
    css_content: string;
    js_content: string;
    thumbnail_url: string;
    screen_order: number;
    canvas_position: any;
  }>) {
    return this.executeWithRetry(() =>
      this.client.from('screens').update(updates).eq('id', screenId).select().single(),
    );
  }

  /**
   * Save chat message
   */
  async saveChatMessage(
    projectId: string,
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: {
      model_used?: string;
      tokens_used?: number;
      response_time_ms?: number;
      generated_screens?: string[];
    },
  ) {
    return this.executeWithRetry(() =>
      this.client
        .from('chat_history')
        .insert({
          project_id: projectId,
          user_id: userId,
          role,
          content,
          model_used: metadata?.model_used,
          tokens_used: metadata?.tokens_used,
          response_time_ms: metadata?.response_time_ms,
          generated_screens: metadata?.generated_screens,
        })
        .select()
        .single(),
    );
  }

  /**
   * Get chat history for a project
   */
  async getProjectChatHistory(projectId: string, limit = 100) {
    return this.executeWithRetry(() =>
      this.client
        .from('chat_history')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(limit),
    );
  }

  /**
   * Log usage event
   */
  async logUsageEvent(
    userId: string,
    eventType: string,
    metadata?: {
      projectId?: string;
      screenId?: string;
      tokensConsumed?: number;
      storageDelta?: number;
      additionalData?: any;
    },
  ) {
    return this.executeWithRetry(() =>
      this.client
        .from('usage_analytics')
        .insert({
          user_id: userId,
          event_type: eventType,
          project_id: metadata?.projectId,
          screen_id: metadata?.screenId,
          tokens_consumed: metadata?.tokensConsumed || 0,
          storage_delta_bytes: metadata?.storageDelta || 0,
          metadata: metadata?.additionalData,
        })
        .select()
        .single(),
    );
  }

  /**
   * Check if user can create project
   */
  async canUserCreateProject(userId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('can_create_project', { p_user_id: userId });

    if (error) {
      console.error('Error checking project limit:', error);
      return false;
    }

    return data === true;
  }

  /**
   * Get user limits based on subscription tier
   */
  async getUserLimits(userId: string) {
    const { data, error } = await this.client.rpc('get_user_limits', { p_user_id: userId });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Create canvas snapshot
   */
  async createCanvasSnapshot(
    projectId: string,
    userId: string,
    name: string,
    canvasState: any,
  ) {
    return this.executeWithRetry(() =>
      this.client
        .from('canvas_snapshots')
        .insert({
          project_id: projectId,
          user_id: userId,
          name,
          canvas_state: canvasState,
        })
        .select()
        .single(),
    );
  }

  /**
   * Get canvas snapshots for a project
   */
  async getCanvasSnapshots(projectId: string, userId: string) {
    return this.executeWithRetry(() =>
      this.client
        .from('canvas_snapshots')
        .select('id, name, created_at, updated_at')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    );
  }

  /**
   * Get canvas snapshot by ID
   */
  async getCanvasSnapshot(snapshotId: string, userId: string) {
    return this.executeWithRetry(() =>
      this.client
        .from('canvas_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .eq('user_id', userId)
        .single(),
    );
  }

  /**
   * Delete canvas snapshot
   */
  async deleteCanvasSnapshot(snapshotId: string, userId: string) {
    return this.executeWithRetry(() =>
      this.client
        .from('canvas_snapshots')
        .delete()
        .eq('id', snapshotId)
        .eq('user_id', userId),
    );
  }

  /**
   * Create storage item
   */
  async createStorageItem(
    userId: string,
    name: string,
    type: 'image' | 'file' | 'thumbnail' | 'canvas_state',
    sizeBytes: number,
    url?: string,
    projectId?: string,
  ) {
    return this.executeWithRetry(() =>
      this.client
        .from('storage_items')
        .insert({
          user_id: userId,
          project_id: projectId,
          name,
          type,
          size_bytes: sizeBytes,
          url,
        })
        .select()
        .single(),
    );
  }

  /**
   * Get storage items for user
   */
  async getStorageItems(userId: string, projectId?: string) {
    let query = this.client
      .from('storage_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    return this.executeWithRetry(() => query);
  }

  /**
   * Delete storage items
   */
  async deleteStorageItems(itemIds: string[], userId: string) {
    return this.executeWithRetry(() =>
      this.client
        .from('storage_items')
        .delete()
        .in('id', itemIds)
        .eq('user_id', userId),
    );
  }

  /**
   * Update user storage usage
   */
  async updateUserStorageUsage(userId: string, deltaBytes: number) {
    return this.executeWithRetry(async () => {
      const { data: user } = await this.client
        .from('users')
        .select('storage_used_bytes')
        .eq('id', userId)
        .single();

      if (user) {
        const newUsage = Math.max(0, (user.storage_used_bytes || 0) + deltaBytes);
        return this.client
          .from('users')
          .update({ storage_used_bytes: newUsage })
          .eq('id', userId);
      }
      
      return { data: null, error: null };
    });
  }

  /**
   * Create chat session
   */
  async createChatSession(projectId: string, userId: string, title: string) {
    return this.executeWithRetry(() =>
      this.client
        .from('chat_sessions')
        .insert({
          project_id: projectId,
          user_id: userId,
          title,
        })
        .select()
        .single(),
    );
  }

  /**
   * Get chat session for project
   */
  async getChatSession(projectId: string, userId: string) {
    return this.executeWithRetry(() =>
      this.client
        .from('chat_sessions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    );
  }

  /**
   * Save chat messages
   */
  async saveChatMessages(sessionId: string, userId: string, messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
  }>) {
    const messagesToInsert = messages.map(msg => ({
      session_id: sessionId,
      user_id: userId,
      role: msg.role,
      content: msg.content,
      metadata: msg.metadata || null,
    }));

    return this.executeWithRetry(() =>
      this.client
        .from('chat_messages')
        .insert(messagesToInsert)
        .select(),
    );
  }

  /**
   * Get chat messages for session
   */
  async getChatMessages(sessionId: string, userId: string, limit = 100, offset = 0) {
    return this.executeWithRetry(() =>
      this.client
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1),
    );
  }

  /**
   * Search chat messages
   */
  async searchChatMessages(sessionId: string, userId: string, query: string, limit = 50) {
    // Try full-text search first
    let result = await this.executeWithRetry(() =>
      this.client
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .textSearch('content', query, {
          type: 'websearch',
          config: 'english',
        })
        .order('created_at', { ascending: false })
        .limit(limit),
    );

    // Fallback to ILIKE search if no results
    if (!result || (result as any[]).length === 0) {
      result = await this.executeWithRetry(() =>
        this.client
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(limit),
      );
    }

    return result;
  }

  /**
   * Update chat session statistics
   */
  async updateChatSessionStats(sessionId: string, deltaTokens: number, deltaCost: number) {
    return this.executeWithRetry(async () => {
      const { data: session } = await this.client
        .from('chat_sessions')
        .select('total_tokens, total_cost')
        .eq('id', sessionId)
        .single();

      if (session) {
        return this.client
          .from('chat_sessions')
          .update({
            total_tokens: (session.total_tokens || 0) + deltaTokens,
            total_cost: (session.total_cost || 0) + deltaCost,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      }

      return { data: null, error: null };
    });
  }

  /**
   * Get total screen count for user across all projects
   */
  async getUserScreenCount(userId: string): Promise<number> {
    console.log('🔢 Counting screens for user:', userId);
    
    // Use RPC function for efficient counting
    const { data, error } = await this.client.rpc('count_user_screens', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error counting screens via RPC:', error);
      // Fallback: count directly with a simpler query
      const { count, error: countError } = await this.client
        .from('screens')
        .select('id', { count: 'exact', head: true })
        .in('project_id', 
          this.client
            .from('projects')
            .select('id')
            .eq('user_id', userId)
        );
      
      if (countError) {
        console.error('❌ Fallback count also failed:', countError);
        return 0;
      }
      
      console.log(`✅ Total screens counted (fallback): ${count}`);
      return count || 0;
    }

    console.log(`✅ Total screens counted: ${data}`);
    return data || 0;
  }

  /**
   * Increment usage counters
   */
  async incrementUsage(
    userId: string,
    eventType: 'ai_generation' | 'project_created' | 'screen_created',
    tokensConsumed: number = 0,
    storageDelta: number = 0,
  ) {
    const { data, error} = await this.client.rpc('increment_usage', {
      p_user_id: userId,
      p_event_type: eventType,
      p_tokens: tokensConsumed,
      p_storage_bytes: storageDelta,
    });

    if (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }

    return data;
  }

  /**
   * Log error
   */
  async logError(errorData: {
    userId?: string;
    errorType: string;
    errorMessage: string;
    errorStack?: string;
    route?: string;
    userAgent?: string;
    ipAddress?: string;
    metadata?: any;
  }) {
    try {
      await this.client.from('error_logs').insert({
        user_id: errorData.userId,
        error_type: errorData.errorType,
        error_message: errorData.errorMessage,
        error_stack: errorData.errorStack,
        route: errorData.route,
        user_agent: errorData.userAgent,
        ip_address: errorData.ipAddress,
        metadata: errorData.metadata,
      });
    } catch (error) {
      console.error('Failed to log error to database:', error);
    }
  }
}

// Export singleton instance
export const db = new DatabaseService();
