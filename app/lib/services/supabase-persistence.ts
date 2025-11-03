/**
 * Supabase Persistence Service
 * Centralized user-aware data operations with offline support
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';
import type { Message } from 'ai';

// Support both client-side (import.meta.env) and server-side (process.env) access
const supabaseUrl = typeof window !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  typeof window !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY;

// Add debugging information only in development or when not building
if (process.env.NODE_ENV !== 'production') {
  console.log('🔍 Supabase Environment Check:');
  console.log('- typeof window:', typeof window);
  console.log('- import.meta.env.VITE_SUPABASE_URL:', typeof window !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : 'N/A (server)');
  console.log('- process.env.VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
  console.log('- Using supabaseUrl:', supabaseUrl);
  console.log('- Using supabaseAnonKey:', supabaseAnonKey ? '✅ SET' : '❌ MISSING');
}

// Validate environment variables
if (process.env.NODE_ENV !== 'production') {
  if (!supabaseUrl) {
    console.warn('⚠️ VITE_SUPABASE_URL is not set. Supabase features will be disabled.');
  }

  if (!supabaseAnonKey) {
    console.warn('⚠️ VITE_SUPABASE_ANON_KEY is not set. Supabase features will be disabled.');
  }
}

export interface UserContext {
  userId: string; // Supabase user UUID
  clerkUserId: string; // Clerk user ID
}

export interface DesignFile {
  id?: string;
  projectId: string;
  filePath: string;
  fileType: 'html' | 'css' | 'js' | 'json' | 'md' | 'txt';
  content: string;
  fileSize?: number;
  lastModified?: string;
}

export interface ProjectFile {
  id?: string;
  projectId: string;
  filePath: string;
  content: string;
  isBinary?: boolean;
  mimeType?: string;
  fileSize?: number;
  isDeleted?: boolean;
}

export interface ChatMessage {
  id?: string; // Message ID to prevent duplicates
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelUsed?: string;
  tokensUsed?: number;
  responseTimeMs?: number;
  generatedScreens?: string[];
}

export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  providerSettings?: Record<string, any>;
  autoEnabledProviders?: string[];
  mcpSettings?: Record<string, any>;
  githubConnection?: Record<string, any>;
  gitlabConnection?: Record<string, any>;
  vercelConnection?: Record<string, any>;
  netlifyConnection?: Record<string, any>;
  supabaseConnection?: Record<string, any>;
  viewedFeatures?: string[];
}

class SupabasePersistenceService {
  private supabase: ReturnType<typeof createClient<Database>> | null = null;
  private userContext: UserContext | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private offlineQueue: any[] = [];

  constructor() {
    // Initialize Supabase client for both server and client
    try {
      // Check if we have the required environment variables
      if (supabaseUrl && supabaseAnonKey) {
        console.log('🔄 Initializing Supabase client...');
        this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
        console.log('✅ Supabase client initialized', typeof window === 'undefined' ? '(server)' : '(client)');
      } else {
        console.warn('⚠️ Supabase credentials missing - some features will be unavailable');
        console.log('Supabase URL present:', !!supabaseUrl);
        console.log('Supabase Anon Key present:', !!supabaseAnonKey);
      }
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
      console.error('Error details:', {
        supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : null,
        supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : null,
      });
    }

    // Listen for online/offline events (browser only)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  /**
   * Set user context for all operations
   */
  setUserContext(context: UserContext) {
    this.userContext = context;

    // Note: We can't easily set session variables in browser client
    // RLS policies will use user_id matching instead
  }

  /**
   * Get or create user in database
   */
  async ensureUser(clerkUserId: string, email: string, fullName?: string): Promise<string> {
    if (!this.supabase) throw new Error('Supabase not initialized - please check your environment variables');

    console.log(`👤 Ensuring user exists for Clerk ID: ${clerkUserId}`);

    try {
      // First, try to get existing user
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (existingUser) {
        console.log(`✅ Found existing user with Supabase UUID: ${existingUser.id}`);

        // Update last login
        await this.supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('clerk_user_id', clerkUserId);

        return existingUser.id;
      }

      console.log(`➕ Creating new user for Clerk ID: ${clerkUserId}`);

      // Create new user (RLS allows INSERT for all)
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          clerk_user_id: clerkUserId,
          email,
          full_name: fullName,
          last_login_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Failed to create user:', error);
        throw error;
      }

      console.log(`✅ Created new user with Supabase UUID: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ Error in ensureUser:', error);
      throw error;
    }
  }

  // ============================================
  // CHAT OPERATIONS
  // ============================================

  async saveChatMessage(message: ChatMessage): Promise<void> {
    if (!this.supabase || !this.userContext) {
      return this.queueOperation('saveChatMessage', message);
    }

    try {
      // Use message.id as unique identifier to prevent duplicates
      const messageId = message.id || `${message.projectId}_${Date.now()}`;

      const { error } = await this.supabase.from('chat_history').upsert(
        {
          id: messageId,
          project_id: message.projectId,
          user_id: this.userContext.userId,
          role: message.role,
          content: message.content,
          model_used: message.modelUsed,
          tokens_used: message.tokensUsed,
          response_time_ms: message.responseTimeMs,
          generated_screens: message.generatedScreens || [],
        },
        {
          onConflict: 'id', // Don't create duplicates
        },
      );

      if (error) {
        console.error('Failed to save chat message:', error);
        this.queueOperation('saveChatMessage', message);
      }
    } catch (error) {
      console.error('Error in saveChatMessage:', error);
      this.queueOperation('saveChatMessage', message);
    }
  }

  async getChatHistory(projectId: string): Promise<Message[]> {
    if (!this.supabase || !this.userContext) return [];

    try {
      const { data, error } = await this.supabase
        .from('chat_history')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', this.userContext.userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to get chat history:', error);
        return [];
      }

      return data.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));
    } catch (error) {
      console.error('Error in getChatHistory:', error);
      return [];
    }
  }

  async deleteChatHistory(projectId: string): Promise<void> {
    if (!this.supabase || !this.userContext) return;

    try {
      const { error } = await this.supabase
        .from('chat_history')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', this.userContext.userId);

      if (error) console.error('Failed to delete chat history:', error);
    } catch (error) {
      console.error('Error in deleteChatHistory:', error);
    }
  }

  // ============================================
  // PROJECT OPERATIONS
  // ============================================

  async createProject(name: string, description?: string): Promise<string> {
    if (!this.supabase || !this.userContext) throw new Error('Not authenticated');

    try {
      const { data, error } = await this.supabase
        .from('projects')
        .insert({
          user_id: this.userContext.userId,
          name,
          description,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error in createProject:', error);
      throw error;
    }
  }

  async getProjects(): Promise<any[]> {
    if (!this.supabase || !this.userContext) {
      console.warn('⚠️ Cannot get projects: Supabase or user context missing');
      return [];
    }

    try {
      console.log(`🔍 Querying projects for user_id: ${this.userContext.userId}`);

      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', this.userContext.userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Failed to get projects:', error);
        return [];
      }

      console.log(`✅ Found ${data?.length || 0} project(s) for user`);
      return data || [];
    } catch (error) {
      console.error('Error in getProjects:', error);
      return [];
    }
  }

  async updateProject(projectId: string, updates: any): Promise<void> {
    if (!this.supabase || !this.userContext) return;

    try {
      const { error } = await this.supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .eq('user_id', this.userContext.userId);

      if (error) console.error('Failed to update project:', error);
    } catch (error) {
      console.error('Error in updateProject:', error);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!this.supabase || !this.userContext) return;

    try {
      const { error } = await this.supabase
        .from('projects')
        .update({ status: 'deleted' })
        .eq('id', projectId)
        .eq('user_id', this.userContext.userId);

      if (error) console.error('Failed to delete project:', error);
    } catch (error) {
      console.error('Error in deleteProject:', error);
    }
  }

  // ============================================
  // DESIGN FILES OPERATIONS
  // ============================================

  async saveDesignFile(file: DesignFile): Promise<void> {
    if (!this.supabase || !this.userContext) {
      return this.queueOperation('saveDesignFile', file);
    }

    try {
      const { error } = await this.supabase.from('design_files').upsert(
        {
          project_id: file.projectId,
          user_id: this.userContext.userId,
          file_path: file.filePath,
          file_type: file.fileType,
          content: file.content,
          file_size: file.content.length,
        },
        {
          onConflict: 'project_id,file_path',
        },
      );

      if (error) {
        console.error('Failed to save design file:', error);
        this.queueOperation('saveDesignFile', file);
      }
    } catch (error) {
      console.error('Error in saveDesignFile:', error);
      this.queueOperation('saveDesignFile', file);
    }
  }

  async getDesignFiles(projectId: string): Promise<DesignFile[]> {
    if (!this.supabase || !this.userContext) return [];

    try {
      const { data, error } = await this.supabase
        .from('design_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', this.userContext.userId);

      if (error) {
        console.error('Failed to get design files:', error);
        return [];
      }

      return data.map((f) => ({
        id: f.id,
        projectId: f.project_id,
        filePath: f.file_path,
        fileType: f.file_type as any,
        content: f.content || '',
        fileSize: f.file_size || 0,
        lastModified: f.last_modified,
      }));
    } catch (error) {
      console.error('Error in getDesignFiles:', error);
      return [];
    }
  }

  async deleteDesignFile(projectId: string, filePath: string): Promise<void> {
    if (!this.supabase || !this.userContext) return;

    try {
      const { error } = await this.supabase
        .from('design_files')
        .delete()
        .eq('project_id', projectId)
        .eq('file_path', filePath)
        .eq('user_id', this.userContext.userId);

      if (error) console.error('Failed to delete design file:', error);
    } catch (error) {
      console.error('Error in deleteDesignFile:', error);
    }
  }

  // ============================================
  // PROJECT FILES OPERATIONS
  // ============================================

  async saveProjectFile(file: ProjectFile): Promise<void> {
    if (!this.supabase || !this.userContext) {
      return this.queueOperation('saveProjectFile', file);
    }

    try {
      const { error } = await this.supabase.from('project_files').upsert(
        {
          project_id: file.projectId,
          user_id: this.userContext.userId,
          file_path: file.filePath,
          content: file.content,
          is_binary: file.isBinary || false,
          mime_type: file.mimeType,
          file_size: file.fileSize || (file.content ? String(file.content).length : 0),
          is_deleted: file.isDeleted || false,
        },
        {
          onConflict: 'project_id,file_path',
        },
      );

      if (error) {
        console.error('Failed to save project file:', error);
        this.queueOperation('saveProjectFile', file);
      }
    } catch (error) {
      console.error('Error in saveProjectFile:', error);
      this.queueOperation('saveProjectFile', file);
    }
  }

  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    if (!this.supabase || !this.userContext) return [];

    try {
      const { data, error } = await this.supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', this.userContext.userId)
        .eq('is_deleted', false);

      if (error) {
        console.error('Failed to get project files:', error);
        return [];
      }

      return data.map((f) => ({
        id: f.id,
        projectId: f.project_id,
        filePath: f.file_path,
        content: f.content || '',
        isBinary: f.is_binary || false,
        mimeType: f.mime_type || undefined,
        fileSize: Number(f.file_size) || 0,
        isDeleted: f.is_deleted || false,
      }));
    } catch (error) {
      console.error('Error in getProjectFiles:', error);
      return [];
    }
  }

  async deleteProjectFile(projectId: string, filePath: string): Promise<void> {
    if (!this.supabase || !this.userContext) return;

    try {
      const { error } = await this.supabase
        .from('project_files')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('file_path', filePath)
        .eq('user_id', this.userContext.userId);

      if (error) console.error('Failed to delete project file:', error);
    } catch (error) {
      console.error('Error in deleteProjectFile:', error);
    }
  }

  // ============================================
  // USER SETTINGS OPERATIONS
  // ============================================

  async saveUserSettings(settings: UserSettings): Promise<void> {
    if (!this.supabase || !this.userContext) return;

    try {
      const { error } = await this.supabase.from('user_settings').upsert(
        {
          user_id: this.userContext.userId,
          theme: settings.theme,
          provider_settings: settings.providerSettings || {},
          auto_enabled_providers: settings.autoEnabledProviders || [],
          mcp_settings: settings.mcpSettings || {},
          github_connection: settings.githubConnection,
          gitlab_connection: settings.gitlabConnection,
          vercel_connection: settings.vercelConnection,
          netlify_connection: settings.netlifyConnection,
          supabase_connection: settings.supabaseConnection,
          viewed_features: settings.viewedFeatures || [],
        },
        {
          onConflict: 'user_id',
        },
      );

      if (error) console.error('Failed to save user settings:', error);
    } catch (error) {
      console.error('Error in saveUserSettings:', error);
    }
  }

  async getUserSettings(): Promise<UserSettings | null> {
    if (!this.supabase || !this.userContext) return null;

    try {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', this.userContext.userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Failed to get user settings:', error);
        return null;
      }

      return {
        theme: data.theme as any,
        providerSettings: data.provider_settings || {},
        autoEnabledProviders: data.auto_enabled_providers || [],
        mcpSettings: data.mcp_settings || {},
        githubConnection: data.github_connection || undefined,
        gitlabConnection: data.gitlab_connection || undefined,
        vercelConnection: data.vercel_connection || undefined,
        netlifyConnection: data.netlify_connection || undefined,
        supabaseConnection: data.supabase_connection || undefined,
        viewedFeatures: data.viewed_features || [],
      };
    } catch (error) {
      console.error('Error in getUserSettings:', error);
      return null;
    }
  }

  // ============================================
  // CANVAS STATE OPERATIONS
  // ============================================

  async saveCanvasState(projectId: string, canvasState: any): Promise<void> {
    if (!this.supabase || !this.userContext) return;

    try {
      const { error } = await this.supabase
        .from('projects')
        .update({ canvas_state: canvasState })
        .eq('id', projectId)
        .eq('user_id', this.userContext.userId);

      if (error) console.error('Failed to save canvas state:', error);
    } catch (error) {
      console.error('Error in saveCanvasState:', error);
    }
  }

  async getCanvasState(projectId: string): Promise<any | null> {
    if (!this.supabase || !this.userContext) return null;

    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('canvas_state')
        .eq('id', projectId)
        .eq('user_id', this.userContext.userId)
        .single();

      if (error) {
        console.error('Failed to get canvas state:', error);
        return null;
      }

      return data.canvas_state;
    } catch (error) {
      console.error('Error in getCanvasState:', error);
      return null;
    }
  }

  async createCanvasSnapshot(projectId: string, canvasState: any, name?: string): Promise<void> {
    if (!this.supabase || !this.userContext) return;

    try {
      const { error } = await this.supabase.from('canvas_snapshots').insert({
        project_id: projectId,
        user_id: this.userContext.userId,
        canvas_state: canvasState,
        name: name || `Snapshot ${new Date().toLocaleString()}`,
      });

      if (error) console.error('Failed to create canvas snapshot:', error);
    } catch (error) {
      console.error('Error in createCanvasSnapshot:', error);
    }
  }

  // ============================================
  // OFFLINE SUPPORT
  // ============================================

  private queueOperation(type: string, data: any) {
    this.offlineQueue.push({ type, data, timestamp: Date.now() });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('supabase_offline_queue', JSON.stringify(this.offlineQueue));
    }
  }

  private async processOfflineQueue() {
    if (!this.isOnline || !this.supabase || !this.userContext) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const operation of queue) {
      try {
        switch (operation.type) {
          case 'saveChatMessage':
            await this.saveChatMessage(operation.data);
            break;
          case 'saveDesignFile':
            await this.saveDesignFile(operation.data);
            break;
          case 'saveProjectFile':
            await this.saveProjectFile(operation.data);
            break;
        }
      } catch (error) {
        console.error('Failed to process queued operation:', error);
        this.offlineQueue.push(operation); // Re-queue
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('supabase_offline_queue', JSON.stringify(this.offlineQueue));
    }
  }

  private handleOnline() {
    this.isOnline = true;
    console.log('Online - processing queued operations...');
    this.processOfflineQueue();
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('Offline - operations will be queued');
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      online: this.isOnline,
      queuedOperations: this.offlineQueue.length,
      authenticated: !!this.userContext,
    };
  }
}

// Export singleton instance
export const supabasePersistence = new SupabasePersistenceService();








