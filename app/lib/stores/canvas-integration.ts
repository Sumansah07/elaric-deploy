/**
 * Integration utilities for connecting canvas store with existing workbench
 */

import { canvasStore } from './canvas';
import { workbenchStore } from './workbench';
import { generatePreviewFromCode } from './preview-generator';
import { screenPersistence } from '~/lib/services/screen-persistence';
import { supabasePersistence } from '~/lib/services/supabase-persistence';

/**
 * Monitors file changes and auto-creates canvas pages
 */
export function initializeCanvasIntegration() {
  // Watch for new page directories being created
  workbenchStore.files.subscribe((files) => {
    Object.entries(files).forEach(([path, dirent]) => {
      // Check for HTML files that might be AI-generated
      if (dirent?.type === 'file' && (path.endsWith('.html') || path.endsWith('.htm'))) {
        // For AI-generated files, we want to add them to the canvas regardless of path
        // But avoid duplicate entries by checking if page already exists
        const fileName = path.split('/').pop()?.replace(/\.(html|htm)$/, '') || 'page';
        const pageId = `page-${fileName}`;
        
        if (!canvasStore.getPageById(pageId)) {
          // Extract content to create preview
          const content = dirent.content || '';
          
          // Extract CSS and JS from HTML
          const cssMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
          const jsMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          
          // Generate preview URL from HTML/CSS/JS
          const previewUrl = content ? 
            generatePreviewFromCode(content, cssMatch?.[1], jsMatch?.[1]) : 
            '';
          
          canvasStore.addPage({
            name: fileName,
            path: path,
            previewUrl: previewUrl,
            html: content,
            css: cssMatch?.[1] || '',
            js: jsMatch?.[1] || '',
            size: { width: 400, height: 600 },
          });
          
          // ALSO save to screens table
          const userContext = (supabasePersistence as any).userContext;
          if (userContext) {
            console.log(`💾 Saving screen to DB: ${fileName}, HTML length: ${content.length}`);
            screenPersistence.saveScreen({
              projectId: userContext.userId,
              name: fileName,
              htmlContent: content,
              cssContent: cssMatch?.[1] || '',
              jsContent: jsMatch?.[1] || '',
              canvasPosition: { x: 0, y: 0 },
              screenOrder: 0,
            }).catch(err => console.error('Failed to save screen:', err));
          }
        }
      }
      // Also watch for the original pattern for compatibility
      else if (dirent?.type === 'file' && path.includes('/pages/') && path.endsWith('/index.html')) {
        const pageName = extractPageName(path);
        
        if (pageName && !canvasStore.getPageById(`page-${pageName}`)) {
          const preview = workbenchStore.previews.get()[0];
          
          if (preview) {
            canvasStore.addPage({
              name: pageName,
              path: `/pages/${pageName}`,
              previewUrl: `${preview.baseUrl}/${pageName}`,
              size: { width: 400, height: 600 },
            });
          }
        }
      }
    });
  });
}

/**
 * Extract page name from file path
 * /home/project/pages/cart/index.html -> cart
 */
function extractPageName(filePath: string): string | null {
  const match = filePath.match(/\/pages\/([^\/]+)\//);
  return match ? match[1] : null;
}

/**
 * Sync active page between canvas and editor
 */
export function syncActivePageWithEditor() {
  canvasStore.activePage.subscribe((pageId) => {
    if (pageId) {
      const page = canvasStore.getPageById(pageId);
      
      if (page) {
        const indexPath = `${page.path}/index.html`;
        workbenchStore.setSelectedFile(indexPath);
        workbenchStore.currentView.set('code');
      }
    }
  });
}