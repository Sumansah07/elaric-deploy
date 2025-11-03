import { atom, map } from 'nanostores';

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

// File operations
export const designFileStore = {
  // Create new project
  createProject(name: string): DesignProject {
    const project: DesignProject = {
      id: crypto.randomUUID(),
      name,
      files: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    currentProject.set(project);
    designFiles.set(project.files);
    return project;
  },

  // Add or update file
  setFile(path: string, content: string): void {
    const project = currentProject.get();
    if (!project) return;

    const type = getFileType(path);
    const file: DesignFile = {
      path,
      content,
      type,
      lastModified: Date.now()
    };

    project.files.set(path, file);
    project.updatedAt = Date.now();
    
    designFiles.set(new Map(project.files));
    currentProject.set({ ...project });
  },

  // Get file content
  getFile(path: string): DesignFile | undefined {
    const project = currentProject.get();
    return project?.files.get(path);
  },

  // Delete file
  deleteFile(path: string): void {
    const project = currentProject.get();
    if (!project) return;

    project.files.delete(path);
    project.updatedAt = Date.now();
    
    designFiles.set(new Map(project.files));
    currentProject.set({ ...project });
  },

  // Get all files as array
  getAllFiles(): DesignFile[] {
    const project = currentProject.get();
    return project ? Array.from(project.files.values()) : [];
  },

  // Generate preview URL for HTML files
  generatePreviewUrl(htmlPath: string): string {
    const htmlFile = this.getFile(htmlPath);
    if (!htmlFile || htmlFile.type !== 'html') return '';

    let htmlContent = htmlFile.content;
    
    // Inject CSS and JS files into HTML
    const project = currentProject.get();
    if (project) {
      const cssFiles = Array.from(project.files.values()).filter(f => f.type === 'css');
      const jsFiles = Array.from(project.files.values()).filter(f => f.type === 'js');
      
      // Add CSS
      const cssLinks = cssFiles.map(f => 
        `<style>\n${f.content}\n</style>`
      ).join('\n');
      
      // Add JS
      const jsScripts = jsFiles.map(f => 
        `<script>\n${f.content}\n</script>`
      ).join('\n');
      
      // Inject into HTML
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

  // Export project as ZIP
  async exportAsZip(): Promise<Blob> {
    const project = currentProject.get();
    if (!project) throw new Error('No project to export');

    // Simple ZIP creation (you might want to use a proper ZIP library)
    const files = Array.from(project.files.values());
    const zipContent = files.map(file => 
      `${file.path}:\n${file.content}\n\n---\n\n`
    ).join('');
    
    return new Blob([zipContent], { type: 'text/plain' });
  }
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