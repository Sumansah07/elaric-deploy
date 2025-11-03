/**
 * Load Project Data API
 * Loads all project-specific data: chat history, files, designs, screens
 */

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { supabasePersistence } from '~/lib/services/supabase-persistence';

export async function loader(args: LoaderFunctionArgs) {
  try {
    console.log('🔍 API: Loading project data for ID:', args.params.id);

    const user = await getAuthenticatedUser(args);
    console.log('👤 API: User authenticated:', user.clerkUserId, 'Supabase ID:', user.supabaseUserId);

    if (!user.supabaseUserId) {
      console.log('❌ API: User not authenticated - missing Supabase user ID');
      return json({ error: 'User not authenticated' }, { status: 401 });
    }

    const projectId = args.params.id;

    if (!projectId) {
      console.log('❌ API: Project ID missing');
      return json({ error: 'Project ID required' }, { status: 400 });
    }

    // Set user context for Supabase operations
    console.log('🔧 API: Setting user context for Supabase');
    supabasePersistence.setUserContext({
      userId: user.supabaseUserId,
      clerkUserId: user.clerkUserId,
    });

    console.log('📥 API: Loading project data in parallel...');

    // Load all project data in parallel
    const [projects, chatHistory, projectFiles, designFiles] = await Promise.all([
      supabasePersistence
        .getProjects()
        .then((data) => {
          console.log('✅ API: Projects loaded:', data.length);
          return data;
        })
        .catch((err) => {
          console.error('❌ API: Error loading projects:', err);
          throw err;
        }),
      supabasePersistence
        .getChatHistory(projectId)
        .then((data) => {
          console.log('✅ API: Chat history loaded:', data.length, 'messages');
          return data;
        })
        .catch((err) => {
          console.error('❌ API: Error loading chat history:', err);
          throw err;
        }),
      supabasePersistence
        .getProjectFiles(projectId)
        .then((data) => {
          console.log('✅ API: Project files loaded:', data.length, 'files');
          return data;
        })
        .catch((err) => {
          console.error('❌ API: Error loading project files:', err);
          throw err;
        }),
      supabasePersistence
        .getDesignFiles(projectId)
        .then((data) => {
          console.log('✅ API: Design files loaded:', data.length, 'designs');
          return data;
        })
        .catch((err) => {
          console.error('❌ API: Error loading design files:', err);
          throw err;
        }),
    ]);

    // Find the project to get its name
    const project = projects.find((p) => p.id === projectId);
    console.log('📊 API: Project found:', project?.name || 'NOT FOUND');

    const response = {
      projectId,
      projectName: project?.name || 'Project',
      chatHistory,
      projectFiles,
      designFiles,
    };

    console.log('✅ API: Successfully returning project data');
    return json(response);
  } catch (error) {
    console.error('❌ API: CRITICAL ERROR loading project data:', error);
    console.error('❌ API: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      error: error,
    });
    return json(
      {
        error: 'Failed to load project data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
