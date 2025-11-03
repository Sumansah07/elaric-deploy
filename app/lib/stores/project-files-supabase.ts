/**
 * Project Files with Supabase Persistence
 * Replaces IndexedDB-based file storage
 */

import { map, atom } from 'nanostores';
import { supabasePersistence, type ProjectFile } from '~/lib/services/supabase-persistence';

// Re-export FileMap type for compatibility with existing code
export type { FileMap, File, Folder } from './files';

export interface FileNode {
  path: string;
  content: string;
  isBinary: boolean;
  isDeleted: boolean;
}

// Current project files
export const projectFiles = map<Map<string, FileNode>>(new Map());
export const currentProjectId = atom<string | null>(null);
export const isLoadingFiles = atom<boolean>(false);

export const projectFilesStore = {
  /**
   * Load files for a project
   */
  async loadProjectFiles(projectId: string): Promise<void> {
    isLoadingFiles.set(true);
    currentProjectId.set(projectId);

    try {
      const files = await supabasePersistence.getProjectFiles(projectId);
      
      const fileMap = new Map<string, FileNode>();
      files.forEach(f => {
        fileMap.set(f.filePath, {
          path: f.filePath,
          content: f.content,
          isBinary: f.isBinary || false,
          isDeleted: f.isDeleted || false,
        });
      });

      projectFiles.set(fileMap);
    } catch (error) {
      console.error('Failed to load project files:', error);
    } finally {
      isLoadingFiles.set(false);
    }
  },

  /**
   * Save or update a file
   */
  async saveFile(filePath: string, content: string, isBinary: boolean = false): Promise<void> {
    const projectId = currentProjectId.get();
    if (!projectId) {
      console.error('No project selected');
      return;
    }

    // Update local state
    const files = projectFiles.get();
    files.set(filePath, {
      path: filePath,
      content,
      isBinary,
      isDeleted: false,
    });
    projectFiles.set(new Map(files));

    // Sync to Supabase
    try {
      await supabasePersistence.saveProjectFile({
        projectId,
        filePath,
        content,
        isBinary,
        isDeleted: false,
      });
    } catch (error) {
      console.error('Failed to save file to Supabase:', error);
    }
  },

  /**
   * Delete a file (soft delete)
   */
  async deleteFile(filePath: string): Promise<void> {
    const projectId = currentProjectId.get();
    if (!projectId) return;

    // Update local state
    const files = projectFiles.get();
    const file = files.get(filePath);
    if (file) {
      file.isDeleted = true;
      files.set(filePath, file);
      projectFiles.set(new Map(files));
    }

    // Sync to Supabase
    try {
      await supabasePersistence.deleteProjectFile(projectId, filePath);
    } catch (error) {
      console.error('Failed to delete file in Supabase:', error);
    }
  },

  /**
   * Get a file by path
   */
  getFile(filePath: string): FileNode | undefined {
    return projectFiles.get().get(filePath);
  },

  /**
   * Get all files (excluding deleted)
   */
  getAllFiles(): FileNode[] {
    return Array.from(projectFiles.get().values()).filter(f => !f.isDeleted);
  },

  /**
   * Get all file paths
   */
  getAllFilePaths(): string[] {
    return this.getAllFiles().map(f => f.path);
  },

  /**
   * Check if file exists
   */
  fileExists(filePath: string): boolean {
    const file = this.getFile(filePath);
    return file !== undefined && !file.isDeleted;
  },

  /**
   * Clear all files from memory
   */
  clearFiles(): void {
    projectFiles.set(new Map());
    currentProjectId.set(null);
  },
};
