/**
 * Project Sync Service
 * Ensures chat history and project data are properly synced to Supabase
 */

import type { Message } from 'ai';
import { supabasePersistence } from './supabase-persistence';

export interface ProjectSyncOptions {
  projectId: string;
  projectName: string;
  messages: Message[];
  files?: Record<string, { type: 'file'; content: string }>;
}

class ProjectSyncService {
  private syncQueue: Map<string, ProjectSyncOptions> = new Map();
  private isSyncing = false;

  /**
   * Queue project for sync
   */
  queueSync(options: ProjectSyncOptions) {
    this.syncQueue.set(options.projectId, options);
    this.processSyncQueue();
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.size === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      for (const [projectId, options] of this.syncQueue.entries()) {
        await this.syncProject(options);
        this.syncQueue.delete(projectId);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync project to Supabase
   */
  private async syncProject(options: ProjectSyncOptions) {
    const { projectId, projectName, messages, files } = options;

    try {
      console.log(`🔄 Syncing project ${projectId}...`);

      // 1. Ensure project exists
      const projects = await supabasePersistence.getProjects();
      const projectExists = projects.some((p) => p.id === projectId);

      if (!projectExists) {
        // Create project if it doesn't exist
        await supabasePersistence.createProject(projectName, 'Chat conversation');
        console.log(`✅ Created project ${projectId}`);
      } else {
        // Update project timestamp and name to show in history (newest first)
        await supabasePersistence.updateProject(projectId, {
          name: projectName || 'Untitled Project',
          updated_at: new Date().toISOString(),
        });
      }

      // 2. Sync chat messages
      if (messages && messages.length > 0) {
        for (const message of messages) {
          if (message.content && message.content.length > 0) {
            await supabasePersistence.saveChatMessage({
              id: message.id,
              projectId,
              role: message.role as 'user' | 'assistant' | 'system',
              content: message.content,
            });
          }
        }
        console.log(`✅ Synced ${messages.length} messages`);
      }

      // 3. Sync project files AND screens table
      if (files) {
        const fileEntries = Object.entries(files);
        const { screenPersistence } = await import('./screen-persistence');
        
        for (const [filePath, fileData] of fileEntries) {
          if (fileData.type === 'file') {
            // Save to project_files table
            await supabasePersistence.saveProjectFile({
              projectId,
              filePath,
              content: fileData.content,
            });
            
            // ALSO save HTML files to screens table
            if (filePath.endsWith('.html')) {
              const screenName = filePath.replace('.html', '').split('/').pop() || 'Untitled';
              const htmlContent = fileData.content;
              
              await screenPersistence.saveScreen({
                projectId,
                name: screenName,
                htmlContent,
                cssContent: '',
                jsContent: '',
                canvasPosition: { x: 0, y: 0 },
                screenOrder: 0,
              });
            }
          }
        }
        console.log(`✅ Synced ${fileEntries.length} files`);
      }

      console.log(`✅ Project ${projectId} synced successfully`);
    } catch (error) {
      console.error(`❌ Failed to sync project ${projectId}:`, error);
      // Re-queue for retry
      setTimeout(() => {
        this.queueSync(options);
      }, 5000);
    }
  }

  /**
   * Force sync a project immediately
   */
  async forceSyncProject(options: ProjectSyncOptions) {
    await this.syncProject(options);
  }
}

export const projectSync = new ProjectSyncService();
