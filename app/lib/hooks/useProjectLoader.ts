/**
 * Hook to load project-specific data
 * Loads chat history, files, designs, and screens for a specific project
 */

import { useEffect, useState } from 'react';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';

export interface ProjectData {
  projectId: string;
  chatHistory: Message[];
  projectFiles: Array<{
    filePath: string;
    content: string;
    isBinary?: boolean;
  }>;
  designFiles: Array<{
    filePath: string;
    content: string;
    fileType: string;
  }>;
}

export function useProjectLoader(projectId: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);

  useEffect(() => {
    if (!projectId) {
      setProjectData(null);
      return;
    }

    const loadProject = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/load`);
        
        if (!response.ok) {
          throw new Error('Failed to load project');
        }

        const data = await response.json();
        
        // Load files into workbench
        if (data.projectFiles && data.projectFiles.length > 0) {
          const filesMap: Record<string, { type: 'file'; content: string }> = {};
          
          data.projectFiles.forEach((file: any) => {
            if (!file.isBinary) {
              filesMap[file.filePath] = {
                type: 'file',
                content: file.content,
              };
            }
          });

          // Update workbench files
          workbenchStore.files.set(filesMap);
        }

        setProjectData(data);
        console.log(`✅ Loaded project ${projectId}:`, {
          chatMessages: data.chatHistory?.length || 0,
          files: data.projectFiles?.length || 0,
          designs: data.designFiles?.length || 0,
        });
      } catch (error) {
        console.error('Error loading project:', error);
        toast.error('Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  return { loading, projectData };
}
