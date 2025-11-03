/**
 * Design Files Store with Supabase Persistence
 * Replaces the in-memory only design-files.ts
 */

import { atom, map } from 'nanostores';
import { supabasePersistence } from '~/lib/services/supabase-persistence';

export interface DesignFile {
  path: string;
  content: string;
  type: 'html' | 'css' | 'js' | 'json' | 'md' | 'txt';
  lastModified: number;
}

export interface DesignProject {
  id: string;
  name: string;
  files: Map<string, DesignFile>;
  createdAt: number;
  updatedAt: number;
}

// Current project store
export const currentProject = atom<DesignProject | null>(null);

// Files in current project
export const designFiles = map<Map<string, DesignFile>>(new Map());

// Loading state
export const isLoadingDesignFiles = atom<boolean>(false);

// Design file operations with Supabase sync
export const designFileStore = {
  /**
   * Load project from Supabase
   */
  async loadProject(projectId: string): Promise<void> {
    isLoadingDesignFiles.set(true);
    try {
      const files = await supabasePersistence.getDesignFiles(projectId);
      
      const fileMap = new Map<string, DesignFile>();
      files.forEach(f => {
        fileMap.set(f.filePath, {
          path: f.filePath,
          content: f.content,
          type: f.fileType,
          lastModified: f.lastModified ? new Date(f.lastModified).getTime() : Date.now(),
        });
      });

      const project: DesignProject = {
        id: projectId,
        name: 'Loaded Project',
        files: fileMap,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      currentProject.set(project);
      designFiles.set(fileMap);
    } catch (error) {
      console.error('Failed to load design project:', error);
    } finally {
      isLoadingDesignFiles.set(false);
    }
  },

  /**
   * Create new project
   */
  async createProject(name: string): Promise<DesignProject> {
    try {
      const projectId = await supabasePersistence.createProject(name, 'Design project');
      
      const project: DesignProject = {
        id: projectId,
        name,
        files: new Map(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      currentProject.set(project);
      designFiles.set(project.files);
      return project;
    } catch (error) {
      console.error('Failed to create design project:', error);
      throw error;
    }
  },

  /**
   * Add or update file (with Supabase sync)
   */
  async setFile(path: string, content: string): Promise<void> {
    const project = currentProject.get();
    if (!project) return;

    const type = getFileType(path);
    const file: DesignFile = {
      path,
      content,
      type,
      lastModified: Date.now(),
    };

    // Update local state
    project.files.set(path, file);
    project.updatedAt = Date.now();
    
    designFiles.set(new Map(project.files));
    currentProject.set({ ...project });

    // Sync to Supabase
    try {
      await supabasePersistence.saveDesignFile({
        projectId: project.id,
        filePath: path,
        fileType: type,
        content,
      });
    } catch (error) {
      console.error('Failed to save design file to Supabase:', error);
    }
  },

  /**
   * Get file content
   */
  getFile(path: string): DesignFile | undefined {
    const project = currentProject.get();
    return project?.files.get(path);
  },

  /**
   * Delete file (with Supabase sync)
   */
  async deleteFile(path: string): Promise<void> {
    const project = currentProject.get();
    if (!project) return;

    // Update local state
    project.files.delete(path);
    project.updatedAt = Date.now();
    
    designFiles.set(new Map(project.files));
    currentProject.set({ ...project });

    // Sync to Supabase
    try {
      await supabasePersistence.deleteDesignFile(project.id, path);
    } catch (error) {
      console.error('Failed to delete design file from Supabase:', error);
    }
  },

  /**
   * Get all files as array
   */
  getAllFiles(): DesignFile[] {
    const project = currentProject.get();
    return project ? Array.from(project.files.values()) : [];
  },

  /**
   * Generate preview URL for HTML files
   */
  generatePreviewUrl(htmlPath: string): string {
    const htmlFile = this.getFile(htmlPath);
    if (!htmlFile || htmlFile.type !== 'html') return '';

    let htmlContent = htmlFile.content;
    
    const project = currentProject.get();
    if (project) {
      const cssFiles = Array.from(project.files.values()).filter(f => f.type === 'css');
      const jsFiles = Array.from(project.files.values()).filter(f => f.type === 'js');
      
      const cssLinks = cssFiles.map(f => 
        `<style>\n${f.content}\n</style>`
      ).join('\n');
      
      const jsScripts = jsFiles.map(f => 
        `<script>\n${f.content}\n</script>`
      ).join('\n');
      
      if (cssLinks) {
        htmlContent = htmlContent.replace('</head>', `${cssLinks}\n</head>`);
      }
      if (jsScripts) {
        htmlContent = htmlContent.replace('</body>', `${jsScripts}\n</body>`);
      }
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    return URL.createObjectURL(blob);
  },

  /**
   * Export project as ZIP
   */
  async exportAsZip(): Promise<Blob> {
    const project = currentProject.get();
    if (!project) throw new Error('No project to export');

    const files = Array.from(project.files.values());
    const zipContent = files.map(file => 
      `${file.path}:\n${file.content}\n\n---\n\n`
    ).join('');
    
    return new Blob([zipContent], { type: 'text/plain' });
  },
};

function getFileType(path: string): DesignFile['type'] {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'html';
    case 'css': return 'css';
    case 'js': return 'js';
    case 'json': return 'json';
    case 'md': return 'md';
    default: return 'txt';
  }
}
