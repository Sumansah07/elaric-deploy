/**
 * Migration: Sync Local IndexedDB Chats to Supabase
 * Helps users migrate their existing local chats to cloud storage
 */

import { openDatabase, getAll } from '~/lib/persistence/db';
import { supabasePersistence } from '~/lib/services/supabase-persistence';
import { projectSync } from '~/lib/services/project-sync';

export interface MigrationProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export async function syncLocalChatsToSupabase(
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ success: number; failed: number }> {
  const db = await openDatabase();
  const localChats = await getAll(db);

  const progress: MigrationProgress = {
    total: localChats.length,
    completed: 0,
    failed: 0,
  };

  console.log(`🔄 Starting migration of ${localChats.length} local chats to Supabase...`);

  for (const chat of localChats) {
    try {
      progress.current = chat.description || 'Unnamed chat';
      onProgress?.(progress);

      // Create or get project in Supabase
      let projectId: string;

      // Check if this chat already has a Supabase project ID
      const mappingKey = `supabase_project_${chat.id}`;
      const existingMapping = localStorage.getItem(mappingKey);

      if (existingMapping) {
        projectId = existingMapping;
      } else {
        // Create new project
        projectId = await supabasePersistence.createProject(
          chat.description || 'Migrated Chat',
          'Migrated from local storage'
        );
        localStorage.setItem(mappingKey, projectId);
      }

      // Sync all chat data
      await projectSync.forceSyncProject({
        projectId,
        projectName: chat.description || 'Migrated Chat',
        messages: chat.messages,
      });

      progress.completed++;
      console.log(`✅ Migrated chat: ${chat.description}`);
    } catch (error) {
      progress.failed++;
      console.error(`❌ Failed to migrate chat ${chat.id}:`, error);
    }

    onProgress?.(progress);
  }

  console.log(`✅ Migration complete: ${progress.completed} succeeded, ${progress.failed} failed`);

  return {
    success: progress.completed,
    failed: progress.failed,
  };
}

/**
 * Check if user has local chats that need migration
 */
export async function hasLocalChatsToMigrate(): Promise<boolean> {
  try {
    const db = await openDatabase();
    const localChats = await getAll(db);
    
    // Check if any chats don't have Supabase mapping
    for (const chat of localChats) {
      const mappingKey = `supabase_project_${chat.id}`;
      if (!localStorage.getItem(mappingKey)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}
