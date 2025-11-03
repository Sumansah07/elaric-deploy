/**
 * Migration Script: IndexedDB/localStorage → Supabase
 * Runs once per user to migrate their local data to Supabase
 */

import { openDatabase, getAll } from '~/lib/persistence/db';
import { supabasePersistence } from '~/lib/services/supabase-persistence';

const MIGRATION_FLAG_KEY = 'elaric_migration_completed';

export interface MigrationResult {
  success: boolean;
  chatsMigrated: number;
  filesMigrated: number;
  settingsMigrated: boolean;
  errors: string[];
}

/**
 * Check if migration has already been completed
 */
export function isMigrationCompleted(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

/**
 * Mark migration as completed
 */
function markMigrationCompleted() {
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}

/**
 * Main migration function
 */
export async function migrateLocalDataToSupabase(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    chatsMigrated: 0,
    filesMigrated: 0,
    settingsMigrated: false,
    errors: [],
  };

  try {
    console.log('Starting migration from local storage to Supabase...');

    // Step 1: Migrate chats from IndexedDB
    await migrateChats(result);

    // Step 2: Migrate user settings from localStorage
    await migrateSettings(result);

    // Step 3: Migrate design files (if any in localStorage)
    await migrateDesignFiles(result);

    // Mark migration as complete
    markMigrationCompleted();
    result.success = true;

    console.log('Migration completed successfully:', result);
  } catch (error) {
    console.error('Migration failed:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    result.success = false;
  }

  return result;
}

/**
 * Migrate chats from IndexedDB to Supabase
 */
async function migrateChats(result: MigrationResult): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) {
      result.errors.push('Could not open IndexedDB');
      return;
    }

    const chats = await getAll(db);
    console.log(`Found ${chats.length} chats to migrate`);

    for (const chat of chats) {
      try {
        // Create a project for this chat
        const projectId = await supabasePersistence.createProject(
          chat.description || 'Imported Chat',
          `Migrated from local storage on ${new Date().toLocaleDateString()}`
        );

        // Migrate all messages
        for (const message of chat.messages) {
          await supabasePersistence.saveChatMessage({
            projectId,
            role: message.role as 'user' | 'assistant' | 'system',
            content: message.content,
          });
        }

        result.chatsMigrated++;
        console.log(`Migrated chat: ${chat.description || chat.id}`);
      } catch (error) {
        console.error(`Failed to migrate chat ${chat.id}:`, error);
        result.errors.push(`Chat ${chat.id}: ${error}`);
      }
    }
  } catch (error) {
    console.error('Error migrating chats:', error);
    result.errors.push(`Chats migration: ${error}`);
  }
}

/**
 * Migrate user settings from localStorage to Supabase
 */
async function migrateSettings(result: MigrationResult): Promise<void> {
  try {
    const settings: any = {};

    // Theme
    const theme = localStorage.getItem('bolt_theme');
    if (theme) {
      settings.theme = theme;
    }

    // Provider settings
    const providerSettings = localStorage.getItem('provider_settings');
    if (providerSettings) {
      settings.providerSettings = JSON.parse(providerSettings);
    }

    // Auto-enabled providers
    const autoEnabled = localStorage.getItem('auto_enabled_providers');
    if (autoEnabled) {
      settings.autoEnabledProviders = JSON.parse(autoEnabled);
    }

    // MCP settings
    const mcpSettings = localStorage.getItem('mcp_settings');
    if (mcpSettings) {
      settings.mcpSettings = JSON.parse(mcpSettings);
    }

    // GitHub connection
    const githubConnection = localStorage.getItem('github_connection');
    if (githubConnection) {
      settings.githubConnection = JSON.parse(githubConnection);
    }

    // GitLab connection
    const gitlabConnection = localStorage.getItem('gitlab_connection');
    if (gitlabConnection) {
      settings.gitlabConnection = JSON.parse(gitlabConnection);
    }

    // Vercel connection
    const vercelConnection = localStorage.getItem('vercel_connection');
    if (vercelConnection) {
      settings.vercelConnection = JSON.parse(vercelConnection);
    }

    // Netlify connection
    const netlifyConnection = localStorage.getItem('netlify_connection');
    if (netlifyConnection) {
      settings.netlifyConnection = JSON.parse(netlifyConnection);
    }

    // Viewed features
    const viewedFeatures = localStorage.getItem('viewed_features');
    if (viewedFeatures) {
      settings.viewedFeatures = JSON.parse(viewedFeatures);
    }

    // Save to Supabase
    if (Object.keys(settings).length > 0) {
      await supabasePersistence.saveUserSettings(settings);
      result.settingsMigrated = true;
      console.log('Migrated user settings:', settings);
    }
  } catch (error) {
    console.error('Error migrating settings:', error);
    result.errors.push(`Settings migration: ${error}`);
  }
}

/**
 * Migrate design files (placeholder - implement based on actual storage)
 */
async function migrateDesignFiles(result: MigrationResult): Promise<void> {
  try {
    // Design files were in-memory only, so nothing to migrate
    // But we can check for any stored design data in localStorage
    const designData = localStorage.getItem('design_project');
    if (designData) {
      // Parse and migrate if needed
      console.log('Found design data in localStorage');
      // Implementation depends on actual data structure
    }
  } catch (error) {
    console.error('Error migrating design files:', error);
    result.errors.push(`Design files migration: ${error}`);
  }
}

/**
 * Clear local data after successful migration
 * CAUTION: Only call this after confirming successful migration
 */
export async function clearLocalDataAfterMigration(): Promise<void> {
  console.warn('Clearing local data after migration...');
  
  try {
    // Clear IndexedDB
    const db = await openDatabase();
    if (db) {
      indexedDB.deleteDatabase('boltHistory');
    }

    // Clear localStorage items (keep migration flag)
    const keysToKeep = [MIGRATION_FLAG_KEY, 'clerk-db-jwt'];
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key) && !key.startsWith('clerk-')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('Local data cleared successfully');
  } catch (error) {
    console.error('Error clearing local data:', error);
  }
}

/**
 * Reset migration flag (for testing)
 */
export function resetMigrationFlag() {
  localStorage.removeItem(MIGRATION_FLAG_KEY);
  console.log('Migration flag reset');
}
