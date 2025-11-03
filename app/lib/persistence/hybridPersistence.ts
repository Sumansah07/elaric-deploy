/**
 * Hybrid Persistence Layer
 * Writes to both IndexedDB (local) and Supabase (remote)
 * Provides offline support with automatic sync when online
 */

import { db as indexedDb } from './db';
import type { Message } from 'ai';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client (client-side)
let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Offline queue for failed operations
interface QueuedOperation {
  id: string;
  type: 'save_chat' | 'save_project' | 'save_screen' | 'update_canvas';
  data: any;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_KEY = 'elaric_offline_queue';
const MAX_RETRIES = 3;

class HybridPersistenceService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private currentUserId: string | null = null;
  private currentProjectId: string | null = null;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Set current user context
   */
  setUser(userId: string) {
    this.currentUserId = userId;
  }

  /**
   * Set current project context
   */
  setProject(projectId: string) {
    this.currentProjectId = projectId;
  }

  /**
   * Save chat message (dual write)
   */
  async saveChatMessage(
    chatId: string,
    messages: Message[],
    metadata?: {
      model?: string;
      tokensUsed?: number;
      responseTimeMs?: number;
    },
  ) {
    // Always save to IndexedDB first (local, fast, offline-capable)
    await this.saveToIndexedDB('chat', chatId, { messages, metadata });

    // Try to save to Supabase if online
    if (this.isOnline && supabase && this.currentUserId && this.currentProjectId) {
      try {
        await this.saveChatToSupabase(chatId, messages, metadata);
      } catch (error) {
        console.error('Failed to save chat to Supabase, queuing for retry:', error);
        await this.queueOperation('save_chat', { chatId, messages, metadata });
      }
    } else {
      // Queue for later sync
      await this.queueOperation('save_chat', { chatId, messages, metadata });
    }
  }

  /**
   * Save project (dual write)
   */
  async saveProject(projectId: string, projectData: any) {
    // Save to IndexedDB
    await this.saveToIndexedDB('project', projectId, projectData);

    // Try to save to Supabase
    if (this.isOnline && supabase && this.currentUserId) {
      try {
        await this.saveProjectToSupabase(projectId, projectData);
      } catch (error) {
        console.error('Failed to save project to Supabase, queuing for retry:', error);
        await this.queueOperation('save_project', { projectId, projectData });
      }
    } else {
      await this.queueOperation('save_project', { projectId, projectData });
    }
  }

  /**
   * Save screen (dual write)
   */
  async saveScreen(screenId: string, screenData: any) {
    // Save to IndexedDB
    await this.saveToIndexedDB('screen', screenId, screenData);

    // Try to save to Supabase
    if (this.isOnline && supabase && this.currentProjectId) {
      try {
        await this.saveScreenToSupabase(screenId, screenData);
      } catch (error) {
        console.error('Failed to save screen to Supabase, queuing for retry:', error);
        await this.queueOperation('save_screen', { screenId, screenData });
      }
    } else {
      await this.queueOperation('save_screen', { screenId, screenData });
    }
  }

  /**
   * Update canvas state (dual write)
   */
  async updateCanvasState(projectId: string, canvasState: any) {
    // Save to IndexedDB
    await this.saveToIndexedDB('canvas', projectId, canvasState);

    // Try to save to Supabase
    if (this.isOnline && supabase) {
      try {
        await this.updateCanvasInSupabase(projectId, canvasState);
      } catch (error) {
        console.error('Failed to update canvas in Supabase, queuing for retry:', error);
        await this.queueOperation('update_canvas', { projectId, canvasState });
      }
    } else {
      await this.queueOperation('update_canvas', { projectId, canvasState });
    }
  }

  /**
   * Load chat from best available source
   */
  async loadChat(chatId: string) {
    // Try IndexedDB first (fast, always available)
    const localChat = await this.loadFromIndexedDB('chat', chatId);

    if (!this.isOnline || !supabase) {
      return localChat;
    }

    // Try to get from Supabase for latest version
    try {
      const remoteChat = await this.loadChatFromSupabase(chatId);
      // Return remote if available, otherwise fall back to local
      return remoteChat || localChat;
    } catch (error) {
      console.warn('Failed to load chat from Supabase, using local:', error);
      return localChat;
    }
  }

  /**
   * Private: Save to IndexedDB
   */
  private async saveToIndexedDB(type: string, id: string, data: any) {
    const key = `${type}_${id}`;
    const store = await indexedDb;
    
    try {
      await store.setItem(key, {
        ...data,
        _lastModified: Date.now(),
        _type: type,
      });
    } catch (error) {
      console.error(`Failed to save ${type} to IndexedDB:`, error);
      throw error;
    }
  }

  /**
   * Private: Load from IndexedDB
   */
  private async loadFromIndexedDB(type: string, id: string) {
    const key = `${type}_${id}`;
    const store = await indexedDb;
    
    try {
      return await store.getItem(key);
    } catch (error) {
      console.error(`Failed to load ${type} from IndexedDB:`, error);
      return null;
    }
  }

  /**
   * Private: Save chat to Supabase
   */
  private async saveChatToSupabase(chatId: string, messages: Message[], metadata?: any) {
    if (!supabase || !this.currentUserId || !this.currentProjectId) {
      throw new Error('Missing Supabase client or user/project context');
    }

    // Save each message
    for (const message of messages) {
      const { error } = await supabase.from('chat_history').upsert({
        id: `${chatId}_${message.id}`,
        project_id: this.currentProjectId,
        user_id: this.currentUserId,
        role: message.role as 'user' | 'assistant' | 'system',
        content: message.content,
        model_used: metadata?.model,
        tokens_used: metadata?.tokensUsed,
        response_time_ms: metadata?.responseTimeMs,
      });

      if (error) {
        throw error;
      }
    }
  }

  /**
   * Private: Save project to Supabase
   */
  private async saveProjectToSupabase(projectId: string, projectData: any) {
    if (!supabase || !this.currentUserId) {
      throw new Error('Missing Supabase client or user context');
    }

    const { error } = await supabase.from('projects').upsert({
      id: projectId,
      user_id: this.currentUserId,
      name: projectData.name,
      description: projectData.description,
      thumbnail_url: projectData.thumbnailUrl,
      canvas_state: projectData.canvasState,
      last_opened_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Private: Save screen to Supabase
   */
  private async saveScreenToSupabase(screenId: string, screenData: any) {
    if (!supabase || !this.currentProjectId) {
      throw new Error('Missing Supabase client or project context');
    }

    const { error } = await supabase.from('screens').upsert({
      id: screenId,
      project_id: this.currentProjectId,
      name: screenData.name,
      description: screenData.description,
      html_content: screenData.html,
      css_content: screenData.css,
      js_content: screenData.js,
      thumbnail_url: screenData.thumbnailUrl,
      screen_order: screenData.order,
      canvas_position: screenData.canvasPosition,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Private: Update canvas state in Supabase
   */
  private async updateCanvasInSupabase(projectId: string, canvasState: any) {
    if (!supabase) {
      throw new Error('Missing Supabase client');
    }

    const { error } = await supabase
      .from('projects')
      .update({ canvas_state: canvasState })
      .eq('id', projectId);

    if (error) {
      throw error;
    }
  }

  /**
   * Private: Load chat from Supabase
   */
  private async loadChatFromSupabase(chatId: string) {
    if (!supabase || !this.currentProjectId) {
      return null;
    }

    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('project_id', this.currentProjectId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      return null;
    }

    return {
      messages: data.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      })),
      metadata: {
        model: data[0]?.model_used,
        tokensUsed: data[0]?.tokens_used,
      },
    };
  }

  /**
   * Queue operation for retry
   */
  private async queueOperation(type: QueuedOperation['type'], data: any) {
    const queue = this.getQueue();
    const operation: QueuedOperation = {
      id: `${type}_${Date.now()}_${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };
    
    queue.push(operation);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }

  /**
   * Get offline queue
   */
  private getQueue(): QueuedOperation[] {
    try {
      const queueData = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch {
      return [];
    }
  }

  /**
   * Process offline queue
   */
  private async processQueue() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    const queue = this.getQueue();
    const remaining: QueuedOperation[] = [];

    for (const operation of queue) {
      if (operation.retries >= MAX_RETRIES) {
        console.error(`Max retries reached for operation:`, operation);
        continue;
      }

      try {
        await this.executeQueuedOperation(operation);
      } catch (error) {
        console.error(`Failed to execute queued operation:`, error);
        operation.retries++;
        remaining.push(operation);
      }
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    this.syncInProgress = false;
  }

  /**
   * Execute queued operation
   */
  private async executeQueuedOperation(operation: QueuedOperation) {
    switch (operation.type) {
      case 'save_chat':
        await this.saveChatToSupabase(
          operation.data.chatId,
          operation.data.messages,
          operation.data.metadata,
        );
        break;
      case 'save_project':
        await this.saveProjectToSupabase(operation.data.projectId, operation.data.projectData);
        break;
      case 'save_screen':
        await this.saveScreenToSupabase(operation.data.screenId, operation.data.screenData);
        break;
      case 'update_canvas':
        await this.updateCanvasInSupabase(operation.data.projectId, operation.data.canvasState);
        break;
    }
  }

  /**
   * Handle coming online
   */
  private handleOnline() {
    console.log('Connection restored, syncing queued operations...');
    this.isOnline = true;
    this.processQueue();
  }

  /**
   * Handle going offline
   */
  private handleOffline() {
    console.log('Connection lost, operations will be queued');
    this.isOnline = false;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    const queue = this.getQueue();
    return {
      online: this.isOnline,
      syncing: this.syncInProgress,
      queuedOperations: queue.length,
    };
  }
}

// Export singleton instance
export const hybridPersistence = new HybridPersistenceService();
