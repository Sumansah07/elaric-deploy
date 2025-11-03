/**
 * Data Migration Tool
 * Migrates existing IndexedDB data to Supabase
 */

import { db as indexedDb } from '../persistence/db';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface MigrationProgress {
  total: number;
  completed: number;
  failed: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentStep: string;
  errors: string[];
}

export class DataMigrationService {
  private supabase: ReturnType<typeof createClient<Database>> | null = null;
  private userId: string | null = null;
  private progress: MigrationProgress = {
    total: 0,
    completed: 0,
    failed: 0,
    status: 'idle',
    currentStep: '',
    errors: [],
  };

  constructor() {
    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
    }
  }

  /**
   * Initialize migration for a user
   */
  async initialize(userId: string) {
    this.userId = userId;
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      status: 'idle',
      currentStep: 'Analyzing data...',
      errors: [],
    };
  }

  /**
   * Get migration progress
   */
  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Run full migration
   */
  async migrate(onProgress?: (progress: MigrationProgress) => void): Promise<boolean> {
    if (!this.supabase || !this.userId) {
      throw new Error('Migration not initialized. Call initialize() first.');
    }

    try {
      this.progress.status = 'running';
      this.updateProgress(onProgress);

      // Step 1: Analyze existing data
      this.progress.currentStep = 'Analyzing IndexedDB data...';
      this.updateProgress(onProgress);

      const store = await indexedDb;
      const keys = await store.keys();
      const chats = keys.filter((key) => key.startsWith('chat_'));
      const projects = keys.filter((key) => key.startsWith('project_'));

      this.progress.total = chats.length + projects.length;
      this.updateProgress(onProgress);

      // Step 2: Migrate chats
      this.progress.currentStep = 'Migrating chat history...';
      this.updateProgress(onProgress);

      for (const chatKey of chats) {
        try {
          await this.migrateChat(chatKey, store);
          this.progress.completed++;
        } catch (error) {
          this.progress.failed++;
          this.progress.errors.push(`Failed to migrate ${chatKey}: ${error.message}`);
        }
        this.updateProgress(onProgress);
      }

      // Step 3: Migrate projects
      this.progress.currentStep = 'Migrating projects...';
      this.updateProgress(onProgress);

      for (const projectKey of projects) {
        try {
          await this.migrateProject(projectKey, store);
          this.progress.completed++;
        } catch (error) {
          this.progress.failed++;
          this.progress.errors.push(`Failed to migrate ${projectKey}: ${error.message}`);
        }
        this.updateProgress(onProgress);
      }

      // Step 4: Complete
      this.progress.status = 'completed';
      this.progress.currentStep = 'Migration completed!';
      this.updateProgress(onProgress);

      return this.progress.failed === 0;
    } catch (error) {
      this.progress.status = 'failed';
      this.progress.currentStep = 'Migration failed';
      this.progress.errors.push(error.message);
      this.updateProgress(onProgress);
      return false;
    }
  }

  /**
   * Migrate a single chat
   */
  private async migrateChat(chatKey: string, store: any) {
    const chatData = await store.getItem(chatKey);

    if (!chatData || !chatData.messages) {
      return;
    }

    const chatId = chatKey.replace('chat_', '');

    // Create project for this chat if it doesn't exist
    const { data: existingProject } = await this.supabase!
      .from('projects')
      .select('id')
      .eq('id', chatId)
      .single();

    if (!existingProject) {
      // Create project
      await this.supabase!.from('projects').insert({
        id: chatId,
        user_id: this.userId!,
        name: chatData.description || `Migrated Project ${chatId.slice(0, 8)}`,
        description: 'Migrated from local storage',
      });
    }

    // Migrate chat messages
    for (const message of chatData.messages) {
      await this.supabase!.from('chat_history').insert({
        id: `${chatId}_${message.id}`,
        project_id: chatId,
        user_id: this.userId!,
        role: message.role,
        content: message.content,
      });
    }
  }

  /**
   * Migrate a single project
   */
  private async migrateProject(projectKey: string, store: any) {
    const projectData = await store.getItem(projectKey);

    if (!projectData) {
      return;
    }

    const projectId = projectKey.replace('project_', '');

    // Check if project already exists
    const { data: existingProject } = await this.supabase!
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (!existingProject) {
      await this.supabase!.from('projects').insert({
        id: projectId,
        user_id: this.userId!,
        name: projectData.name || `Migrated Project ${projectId.slice(0, 8)}`,
        description: projectData.description || 'Migrated from local storage',
        canvas_state: projectData.canvasState || {},
      });
    }

    // Migrate screens if any
    if (projectData.screens && Array.isArray(projectData.screens)) {
      for (const screen of projectData.screens) {
        await this.supabase!.from('screens').insert({
          id: screen.id || `screen_${Date.now()}_${Math.random()}`,
          project_id: projectId,
          name: screen.name || 'Untitled Screen',
          html_content: screen.html,
          css_content: screen.css,
          js_content: screen.js,
          screen_order: screen.order || 0,
        });
      }
    }
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(onProgress?: (progress: MigrationProgress) => void) {
    if (onProgress) {
      onProgress(this.getProgress());
    }
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    try {
      const store = await indexedDb;
      const keys = await store.keys();
      const hasLocalData = keys.some((key) => key.startsWith('chat_') || key.startsWith('project_'));

      if (!hasLocalData) {
        return false;
      }

      // Check if data already exists in Supabase
      if (!this.supabase || !this.userId) {
        return false;
      }

      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id')
        .eq('user_id', this.userId)
        .limit(1);

      if (error) {
        console.error('Error checking for existing data:', error);
        return true;
      }

      // If no projects in Supabase but local data exists, migration is needed
      return (!projects || projects.length === 0) && hasLocalData;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Backup local data before migration
   */
  async backupLocalData(): Promise<Blob> {
    const store = await indexedDb;
    const keys = await store.keys();
    const backup: Record<string, any> = {};

    for (const key of keys) {
      backup[key] = await store.getItem(key);
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    return blob;
  }

  /**
   * Download backup file
   */
  async downloadBackup() {
    const backup = await this.backupLocalData();
    const url = URL.createObjectURL(backup);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elaric-backup-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Clear local data after successful migration
   */
  async clearLocalData() {
    const store = await indexedDb;
    const keys = await store.keys();

    for (const key of keys) {
      if (key.startsWith('chat_') || key.startsWith('project_')) {
        await store.removeItem(key);
      }
    }
  }
}

// Export singleton instance
export const migrationService = new DataMigrationService();
