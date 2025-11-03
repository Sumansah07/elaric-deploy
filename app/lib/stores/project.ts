/**
 * Project Store
 * Manages the current active project and prevents duplicate project creation
 */

import { atom } from 'nanostores';
import { supabasePersistence } from '~/lib/services/supabase-persistence';

interface ProjectState {
  projectId: string | null;
  projectName: string | null;
  isCreating: boolean;
}

// Global project state
export const projectStore = atom<ProjectState>({
  projectId: null,
  projectName: null,
  isCreating: false,
});

// Track screens created in current project (for deduplication)
const screensCreatedInSession = new Set<string>();

/**
 * Get or create the current active project
 * This ensures we only have ONE project per user session
 */
export async function getOrCreateCurrentProject(
  defaultName: string = 'Untitled Project',
  description?: string,
): Promise<string> {
  const state = projectStore.get();

  // Return existing project if available
  if (state.projectId) {
    return state.projectId;
  }

  // Prevent concurrent project creation
  if (state.isCreating) {
    // Wait for creation to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const currentState = projectStore.get();

        if (currentState.projectId && !currentState.isCreating) {
          clearInterval(checkInterval);
          resolve(currentState.projectId);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(state.projectId || '');
      }, 10000);
    });
  }

  // Create new project
  try {
    projectStore.set({
      ...state,
      isCreating: true,
    });

    console.log('🆕 Creating new project:', defaultName);
    const projectId = await supabasePersistence.createProject(defaultName, description);

    projectStore.set({
      projectId,
      projectName: defaultName,
      isCreating: false,
    });

    console.log('✅ Project created:', projectId);

    return projectId;
  } catch (error) {
    console.error('❌ Failed to create project:', error);
    projectStore.set({
      ...state,
      isCreating: false,
    });
    throw error;
  }
}

/**
 * Set the current active project (when user selects/opens an existing project)
 */
export function setCurrentProject(projectId: string, projectName: string) {
  projectStore.set({
    projectId,
    projectName,
    isCreating: false,
  });

  // Clear screen tracking when switching projects
  screensCreatedInSession.clear();

  console.log('📂 Switched to project:', projectName, projectId);
}

/**
 * Update current project name
 */
export function updateProjectName(newName: string) {
  const state = projectStore.get();
  if (state.projectId) {
    projectStore.set({
      ...state,
      projectName: newName,
    });

    // Update in Supabase
    supabasePersistence
      .updateProject(state.projectId, { name: newName })
      .catch((error) => console.error('Failed to update project name:', error));
  }
}

/**
 * Clear current project (start fresh)
 */
export function clearCurrentProject() {
  projectStore.set({
    projectId: null,
    projectName: null,
    isCreating: false,
  });

  screensCreatedInSession.clear();
  console.log('🗑️ Cleared current project');
}

/**
 * Track screen creation to prevent duplicates
 */
export function markScreenCreated(screenIdentifier: string): boolean {
  if (screensCreatedInSession.has(screenIdentifier)) {
    return false; // Already created
  }

  screensCreatedInSession.add(screenIdentifier);

  return true; // Newly created
}

/**
 * Check if screen was already created in this session
 */
export function wasScreenCreated(screenIdentifier: string): boolean {
  return screensCreatedInSession.has(screenIdentifier);
}

/**
 * Get current project ID (or null if none)
 */
export function getCurrentProjectId(): string | null {
  return projectStore.get().projectId;
}

/**
 * Get current project name (or null if none)
 */
export function getCurrentProjectName(): string | null {
  return projectStore.get().projectName;
}

/**
 * Create a unique identifier for a screen
 */
export function createScreenIdentifier(projectId: string, fileName: string): string {
  return `${projectId}:${fileName}`;
}
