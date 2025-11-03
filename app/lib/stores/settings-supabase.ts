/**
 * User Settings with Supabase Sync
 * Replaces localStorage-based settings
 */

import { atom } from 'nanostores';
import { supabasePersistence, type UserSettings } from '~/lib/services/supabase-persistence';

// Re-export constants from original settings for compatibility
export { URL_CONFIGURABLE_PROVIDERS, LOCAL_PROVIDERS, shortcutsStore, tabConfigurationStore, resetTabConfiguration } from './settings';
export type { Shortcut, Shortcuts, ProviderSetting } from './settings';

// Settings state
export const userSettings = atom<UserSettings>({});
export const isLoadingSettings = atom<boolean>(false);
export const settingsSyncStatus = atom<'idle' | 'syncing' | 'synced' | 'error'>('idle');

let syncTimeout: NodeJS.Timeout | null = null;

export const settingsStore = {
  /**
   * Load settings from Supabase
   */
  async loadSettings(): Promise<void> {
    isLoadingSettings.set(true);
    try {
      const settings = await supabasePersistence.getUserSettings();
      if (settings) {
        userSettings.set(settings);
        
        // Apply theme immediately
        if (settings.theme) {
          document.documentElement.setAttribute('data-theme', settings.theme);
        }
      }
      settingsSyncStatus.set('synced');
    } catch (error) {
      console.error('Failed to load settings:', error);
      settingsSyncStatus.set('error');
    } finally {
      isLoadingSettings.set(false);
    }
  },

  /**
   * Save settings to Supabase (debounced)
   */
  async saveSettings(updates: Partial<UserSettings>): Promise<void> {
    const current = userSettings.get();
    const updated = { ...current, ...updates };
    userSettings.set(updated);

    // Apply theme immediately
    if (updates.theme) {
      document.documentElement.setAttribute('data-theme', updates.theme);
    }

    // Debounce sync to Supabase
    if (syncTimeout) clearTimeout(syncTimeout);
    
    syncTimeout = setTimeout(async () => {
      settingsSyncStatus.set('syncing');
      try {
        await supabasePersistence.saveUserSettings(updated);
        settingsSyncStatus.set('synced');
      } catch (error) {
        console.error('Failed to save settings:', error);
        settingsSyncStatus.set('error');
      }
    }, 1000); // Wait 1 second before syncing
  },

  /**
   * Get current settings
   */
  getSettings(): UserSettings {
    return userSettings.get();
  },

  /**
   * Update theme
   */
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await this.saveSettings({ theme });
  },

  /**
   * Update provider settings
   */
  async setProviderSettings(providerSettings: Record<string, any>): Promise<void> {
    await this.saveSettings({ providerSettings });
  },

  /**
   * Update auto-enabled providers
   */
  async setAutoEnabledProviders(providers: string[]): Promise<void> {
    await this.saveSettings({ autoEnabledProviders: providers });
  },

  /**
   * Update MCP settings
   */
  async setMcpSettings(mcpSettings: Record<string, any>): Promise<void> {
    await this.saveSettings({ mcpSettings });
  },

  /**
   * Update connection settings
   */
  async setGithubConnection(connection: Record<string, any> | undefined): Promise<void> {
    await this.saveSettings({ githubConnection: connection });
  },

  async setGitlabConnection(connection: Record<string, any> | undefined): Promise<void> {
    await this.saveSettings({ gitlabConnection: connection });
  },

  async setVercelConnection(connection: Record<string, any> | undefined): Promise<void> {
    await this.saveSettings({ vercelConnection: connection });
  },

  async setNetlifyConnection(connection: Record<string, any> | undefined): Promise<void> {
    await this.saveSettings({ netlifyConnection: connection });
  },

  async setSupabaseConnection(connection: Record<string, any> | undefined): Promise<void> {
    await this.saveSettings({ supabaseConnection: connection });
  },

  /**
   * Mark feature as viewed
   */
  async markFeatureViewed(featureId: string): Promise<void> {
    const current = userSettings.get();
    const viewedFeatures = [...(current.viewedFeatures || [])];
    
    if (!viewedFeatures.includes(featureId)) {
      viewedFeatures.push(featureId);
      await this.saveSettings({ viewedFeatures });
    }
  },

  /**
   * Check if feature was viewed
   */
  isFeatureViewed(featureId: string): boolean {
    const current = userSettings.get();
    return (current.viewedFeatures || []).includes(featureId);
  },
};
