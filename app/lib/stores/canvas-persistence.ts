/**
 * Canvas Persistence System
 * Handles saving and loading canvas state to/from Supabase
 */

import { canvasStore, type PageInfo, type CanvasState } from './canvas';
import { db } from '~/lib/database/supabase.server';
import { debounce } from '~/utils/debounce';

export interface CanvasSnapshot {
  id: string;
  projectId: string;
  canvasState: CanvasState;
  createdAt: string;
  updatedAt: string;
}

class CanvasPersistence {
  private currentProjectId: string | null = null;
  private autoSaveEnabled = true;
  private saveInProgress = false;
  private lastSaveTime = 0;

  /**
   * Initialize canvas persistence for a project
   */
  async initialize(projectId: string, userId: string) {
    this.currentProjectId = projectId;
    
    // Load existing canvas state
    await this.loadCanvasState(projectId);
    
    // Set up auto-save listeners
    this.setupAutoSave();
    
    console.log(`Canvas persistence initialized for project ${projectId}`);
  }

  /**
   * Load canvas state from Supabase
   */
  async loadCanvasState(projectId: string): Promise<boolean> {
    try {
      // Get the latest canvas state for this project
      const response = await fetch(`/api/canvas/load?projectId=${projectId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No existing canvas state found, starting fresh');
          return false;
        }
        throw new Error(`Failed to load canvas state: ${response.statusText}`);
      }

      const { canvasState } = await response.json();
      
      if (canvasState && canvasState.pages) {
        // Clear current state
        canvasStore.clearAll();
        
        // Restore pages
        canvasState.pages.forEach((page: PageInfo) => {
          canvasStore.pages.setKey(page.id, page);
        });
        
        // Restore active page
        if (canvasState.activePage) {
          canvasStore.setActivePage(canvasState.activePage);
        }
        
        console.log(`Loaded ${canvasState.pages.length} pages from database`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading canvas state:', error);
      return false;
    }
  }

  /**
   * Save canvas state to Supabase
   */
  async saveCanvasState(force = false): Promise<boolean> {
    if (!this.currentProjectId) {
      console.warn('No project ID set for canvas persistence');
      return false;
    }

    if (this.saveInProgress && !force) {
      console.log('Save already in progress, skipping');
      return false;
    }

    // Throttle saves to avoid too frequent database writes
    const now = Date.now();
    if (!force && now - this.lastSaveTime < 2000) {
      console.log('Save throttled, too recent');
      return false;
    }

    this.saveInProgress = true;
    this.lastSaveTime = now;

    try {
      const pages = canvasStore.getAllPages();
      const activePage = canvasStore.activePage.get();

      const canvasState: CanvasState = {
        pages,
        activePage,
        nextPosition: { x: 100, y: 100 }, // Reset for consistency
      };

      const response = await fetch('/api/canvas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.currentProjectId,
          canvasState,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save canvas state: ${response.statusText}`);
      }

      console.log(`Canvas state saved for project ${this.currentProjectId}`);
      return true;
    } catch (error) {
      console.error('Error saving canvas state:', error);
      return false;
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Set up auto-save functionality
   */
  private setupAutoSave() {
    if (!this.autoSaveEnabled) return;

    // Debounced save function
    const debouncedSave = debounce(() => {
      if (this.autoSaveEnabled) {
        this.saveCanvasState();
      }
    }, 3000); // Save 3 seconds after last change

    // Listen to canvas store changes
    canvasStore.pages.subscribe(() => {
      debouncedSave();
    });

    canvasStore.activePage.subscribe(() => {
      debouncedSave();
    });

    // Save on page visibility change (user switching tabs/closing)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveCanvasState(true); // Force immediate save
      }
    });

    // Save on beforeunload
    window.addEventListener('beforeunload', () => {
      this.saveCanvasState(true); // Force immediate save
    });
  }

  /**
   * Enable/disable auto-save
   */
  setAutoSave(enabled: boolean) {
    this.autoSaveEnabled = enabled;
    console.log(`Canvas auto-save ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Create a manual snapshot
   */
  async createSnapshot(name?: string): Promise<boolean> {
    if (!this.currentProjectId) return false;

    try {
      const pages = canvasStore.getAllPages();
      const activePage = canvasStore.activePage.get();

      const canvasState: CanvasState = {
        pages,
        activePage,
        nextPosition: { x: 100, y: 100 },
      };

      const response = await fetch('/api/canvas/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.currentProjectId,
          canvasState,
          name: name || `Snapshot ${new Date().toLocaleString()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create snapshot: ${response.statusText}`);
      }

      console.log('Canvas snapshot created');
      return true;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      return false;
    }
  }

  /**
   * Get available snapshots for current project
   */
  async getSnapshots(): Promise<CanvasSnapshot[]> {
    if (!this.currentProjectId) return [];

    try {
      const response = await fetch(`/api/canvas/snapshots?projectId=${this.currentProjectId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get snapshots: ${response.statusText}`);
      }

      const { snapshots } = await response.json();
      return snapshots || [];
    } catch (error) {
      console.error('Error getting snapshots:', error);
      return [];
    }
  }

  /**
   * Load a specific snapshot
   */
  async loadSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/canvas/snapshot/${snapshotId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load snapshot: ${response.statusText}`);
      }

      const { canvasState } = await response.json();
      
      if (canvasState && canvasState.pages) {
        // Clear current state
        canvasStore.clearAll();
        
        // Restore pages
        canvasState.pages.forEach((page: PageInfo) => {
          canvasStore.pages.setKey(page.id, page);
        });
        
        // Restore active page
        if (canvasState.activePage) {
          canvasStore.setActivePage(canvasState.activePage);
        }
        
        console.log(`Loaded snapshot with ${canvasState.pages.length} pages`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading snapshot:', error);
      return false;
    }
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.currentProjectId = null;
    this.autoSaveEnabled = false;
    this.saveInProgress = false;
  }
}

// Export singleton instance
export const canvasPersistence = new CanvasPersistence();