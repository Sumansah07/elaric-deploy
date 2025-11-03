import { atom, map, type MapStore } from 'nanostores';
import type { BoltAction } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';
import { canvasStore } from '~/lib/stores/canvas';
import { generatePreviewFromCode } from '~/lib/stores/preview-generator';
import { screenPersistence } from '~/lib/services/screen-persistence';
import { canvasLoader } from '~/lib/services/canvas-loader';
import { WORK_DIR } from '~/utils/constants';
import { getOrCreateCurrentProject, createScreenIdentifier, markScreenCreated } from '~/lib/stores/project';

const logger = createScopedLogger('DesignActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

/**
 * Simplified Action Runner for Design Tool
 * Only handles file operations and HTML generation
 */
export class DesignActionRunner {
  #currentExecutionPromise: Promise<void> = Promise.resolve();
  runnerId = atom<string>(`${Date.now()}`);
  actions: ActionsMap = map({});
  #onFileCreate?: (filePath: string, content: string) => Promise<any>;

  constructor(onFileCreate?: (filePath: string, content: string) => Promise<any>) {
    this.#onFileCreate = onFileCreate;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return;
    }

    if (isStreaming && action.type !== 'file') {
      return;
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: !isStreaming });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId, isStreaming);
      })
      .catch((error) => {
        logger.error('Action execution promise failed:', error);
      });

    await this.#currentExecutionPromise;
  }

  async #executeAction(actionId: string, isStreaming: boolean = false) {
    const action = this.actions.get()[actionId];

    this.#updateAction(actionId, { status: 'running' });

    try {
      switch (action.type) {
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
        default: {
          // Skip unsupported actions (shell, build, start, etc.)
          logger.debug(`Skipping unsupported action type: ${action.type}`);
          break;
        }
      }

      this.#updateAction(actionId, {
        status: isStreaming ? 'running' : action.abortSignal.aborted ? 'aborted' : 'complete',
      });
    } catch (error) {
      if (action.abortSignal.aborted) {
        return;
      }

      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
      logger.error(`[${action.type}]:Action failed\n\n`, error);
    }
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    logger.debug(`Processing file: ${action.filePath}`);

    // Extract HTML, CSS, and JS content
    const content = action.content;
    let filePath = action.filePath;

    // Ensure file path starts with WORK_DIR
    if (!filePath.startsWith(WORK_DIR)) {
      filePath = `${WORK_DIR}/${filePath.replace(/^\//, '')}`;
    }

    // Create file in the file store so it appears in Code tab
    if (this.#onFileCreate) {
      await this.#onFileCreate(filePath, content);
    }

    // Check if this is an HTML file that should create a new page
    if (filePath.endsWith('.html') || filePath.includes('index.html')) {
      await this.#createPageFromHTML(filePath, content);
    }

    logger.debug(`File processed: ${filePath}`);
  }

  async #createPageFromHTML(filePath: string, htmlContent: string) {
    // Extract CSS and JS from HTML content
    const cssMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const jsMatch = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

    // Extract body content for cleaner HTML
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const cleanHTML = bodyMatch ? bodyMatch[1] : htmlContent;

    const css = cssMatch ? cssMatch[1] : '';
    const js = jsMatch ? jsMatch[1] : '';

    // Generate page name from file path
    const pageName = filePath.split('/').pop()?.replace('.html', '') || 'New Page';

    // Create preview URL
    const previewUrl = generatePreviewFromCode(cleanHTML, css, js);

    // Add page to canvas - let auto-height determine size
    const pageId = canvasStore.addPage({
      name: pageName,
      path: filePath,
      previewUrl,
      html: cleanHTML,
      css,
      js,
      size: { width: 400, height: 600 }, // Initial size, auto-height will adjust
    });

    // Save screen to Supabase using centralized project management
    try {
      // Get or create a single project for this session (prevents duplicate "My Designs")
      let projectId = canvasLoader.getCurrentProjectId();

      if (!projectId) {
        // Use the project store to ensure only ONE project is created
        projectId = await getOrCreateCurrentProject('My Designs', 'Design project');
        console.log(`✅ Using project for designs: ${projectId}`);
      }

      if (projectId) {
        const page = canvasStore.getPageById(pageId);
        if (page) {
          // Create unique identifier for this screen to prevent duplicates
          const screenId = createScreenIdentifier(projectId, pageName);

          // Only save if this is a NEW screen (not an update)
          if (markScreenCreated(screenId)) {
            console.log(`💾 Saving NEW screen: ${pageName}`);
            await screenPersistence.saveScreen({
              projectId,
              name: pageName,
              htmlContent: cleanHTML,
              cssContent: css,
              jsContent: js,
              canvasPosition: page.position,
              screenOrder: canvasStore.getAllPages().length,
            });
          } else {
            console.log(`⏭️ Skipping duplicate screen save: ${pageName}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save screen:', error);
    }

    logger.debug(`Created page: ${pageName} from ${filePath}`);
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();
    this.actions.setKey(id, { ...actions[id], ...newState });
  }
}
