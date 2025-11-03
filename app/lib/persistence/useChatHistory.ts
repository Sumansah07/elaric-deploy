import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import {
  getMessages,
  getNextId,
  getUrlId,
  openDatabase,
  setMessages,
  duplicateChat,
  createChatFromMessages,
  getSnapshot,
  setSnapshot,
  type IChatMetadata,
} from './db';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';
import { supabasePersistence } from '~/lib/services/supabase-persistence';
import { projectSync } from '~/lib/services/project-sync';
import { getOrCreateCurrentProject, setCurrentProject, clearCurrentProject } from '~/lib/stores/project';

import { detectProjectCommands, createCommandActionsString } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

export const db = persistenceEnabled ? await openDatabase() : undefined;

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);

// Track saved message IDs to prevent duplicate saves to Supabase
// Use Map with chatId as key to track per-chat
const savedMessagesByChat = new Map<string, Set<string>>();

function isMessageSaved(chatId: string, messageId: string): boolean {
  const chatMessages = savedMessagesByChat.get(chatId);
  return chatMessages?.has(messageId) || false;
}

function markMessageSaved(chatId: string, messageId: string): void {
  if (!savedMessagesByChat.has(chatId)) {
    savedMessagesByChat.set(chatId, new Set());
  }
  savedMessagesByChat.get(chatId)!.add(messageId);
}

/**
 * Maps IndexedDB chat IDs to Supabase project UUIDs
 * Now uses centralized project store to prevent duplicate "My Designs" projects
 */
async function getOrCreateSupabaseProjectId(chatId: string, chatName: string): Promise<string> {
  // If chatId is already a UUID, use it directly
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(chatId)) {
    setCurrentProject(chatId, chatName);
    return chatId;
  }

  const mappingKey = `supabase_project_${chatId}`;

  // Check if mapping already exists
  if (typeof localStorage !== 'undefined') {
    const existing = localStorage.getItem(mappingKey);
    if (existing) {
      setCurrentProject(existing, chatName);
      return existing;
    }
  }

  // Use centralized project store to get or create project
  // This prevents creating multiple "My Designs" projects
  try {
    const projectId = await getOrCreateCurrentProject(chatName || 'New Project', 'Chat conversation');

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(mappingKey, projectId);
    }

    console.log(`✅ Using project ${projectId} for chat ${chatId}`);
    return projectId;
  } catch (error) {
    console.error('Failed to get/create project:', error);
    // Fallback: generate a UUID client-side (not ideal but works)
    const fallbackUuid = crypto.randomUUID();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(mappingKey, fallbackUuid);
    }
    return fallbackUuid;
  }
}
export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();
  const [searchParams] = useSearchParams();

  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  useEffect(() => {
    if (!db) {
      setReady(true);

      if (persistenceEnabled) {
        const error = new Error('Chat persistence is unavailable');
        logStore.logError('Chat persistence initialization failed', error);
        toast.error('Chat persistence is unavailable');
      }

      return;
    }

    if (mixedId) {
      // Try to load from Supabase first, then fallback to IndexedDB
      const loadProjectData = async () => {
        console.log('🔍 Loading project data for ID:', mixedId);
        try {
          // Try loading from Supabase
          console.log('📡 Fetching from Supabase API:', `/api/projects/${mixedId}/load`);
          const response = await fetch(`/api/projects/${mixedId}/load`);
          console.log('📡 Supabase API response status:', response.status, response.ok);

          if (response.ok) {
            const data = await response.json();
            console.log('📡 Supabase API data:', {
              hasData: !!data,
              hasChatHistory: !!data.chatHistory,
              chatHistoryLength: data.chatHistory?.length || 0,
              projectName: data.projectName,
            });

            // ALWAYS restore files and canvas, regardless of chat history
            console.log('📦 Processing project data from Supabase');

            // Restore project files to workbench
            if (data.projectFiles && data.projectFiles.length > 0) {
              console.log('📁 Restoring', data.projectFiles.length, 'files to workbench');
              const filesMap: Record<string, { type: 'file'; content: string }> = {};

              data.projectFiles.forEach((file: any) => {
                filesMap[file.file_path || file.filePath] = {
                  type: 'file',
                  content: file.content,
                };
              });

              // Set files in workbench
              workbenchStore.files.set(filesMap);
              console.log('✅ Files restored to workbench');
            }

            // Set project context for canvas loading
            setCurrentProject(mixedId, data.projectName || 'Project');

            // Load canvas/screens for this project
            console.log('🎨 Loading canvas for project:', mixedId);
            import('~/lib/services/canvas-loader').then(({ canvasLoader }) => {
              canvasLoader.loadProjectCanvas(mixedId).catch((err) => {
                console.error('❌ Failed to load canvas:', err);
              });
            });

            // Restore chat messages (if any)
            if (data.chatHistory && data.chatHistory.length > 0) {
              console.log('✅ Loaded chat history from Supabase:', data.chatHistory.length, 'messages');
              setInitialMessages(data.chatHistory);
            } else {
              console.log('ℹ️ No chat history found, starting with empty messages');
              setInitialMessages([]);
            }

            setUrlId(mixedId);
            chatId.set(mixedId);
            description.set(data.projectName || 'Project');
            setReady(true);
            return;
          } else {
            const errorText = await response.text();
            console.log('❌ Supabase API error:', response.status, errorText);
          }
        } catch (error) {
          console.log('❌ Could not load from Supabase, trying IndexedDB:', error);
        }

        // Fallback to IndexedDB
        Promise.all([getMessages(db, mixedId), getSnapshot(db, mixedId)])
          .then(async ([storedMessages, snapshot]) => {
            if (storedMessages && storedMessages.messages.length > 0) {
              /*
               * const snapshotStr = localStorage.getItem(`snapshot:${mixedId}`); // Remove localStorage usage
               * const snapshot: Snapshot = snapshotStr ? JSON.parse(snapshotStr) : { chatIndex: 0, files: {} }; // Use snapshot from DB
               */
              const validSnapshot = snapshot || { chatIndex: '', files: {} }; // Ensure snapshot is not undefined
              const summary = validSnapshot.summary;

              const rewindId = searchParams.get('rewindTo');
              let startingIdx = -1;
              const endingIdx = rewindId
                ? storedMessages.messages.findIndex((m) => m.id === rewindId) + 1
                : storedMessages.messages.length;
              const snapshotIndex = storedMessages.messages.findIndex((m) => m.id === validSnapshot.chatIndex);

              if (snapshotIndex >= 0 && snapshotIndex < endingIdx) {
                startingIdx = snapshotIndex;
              }

              if (snapshotIndex > 0 && storedMessages.messages[snapshotIndex].id == rewindId) {
                startingIdx = -1;
              }

              let filteredMessages = storedMessages.messages.slice(startingIdx + 1, endingIdx);
              let archivedMessages: Message[] = [];

              if (startingIdx >= 0) {
                archivedMessages = storedMessages.messages.slice(0, startingIdx + 1);
              }

              setArchivedMessages(archivedMessages);

              if (startingIdx > 0) {
                const files = Object.entries(validSnapshot?.files || {})
                  .map(([key, value]) => {
                    if (value?.type !== 'file') {
                      return null;
                    }

                    return {
                      content: value.content,
                      path: key,
                    };
                  })
                  .filter((x): x is { content: string; path: string } => !!x); // Type assertion
                const projectCommands = await detectProjectCommands(files);

                // Call the modified function to get only the command actions string
                const commandActionsString = createCommandActionsString(projectCommands);

                filteredMessages = [
                  {
                    id: generateId(),
                    role: 'user',
                    content: `Restore project from snapshot`, // Removed newline
                    annotations: ['no-store', 'hidden'],
                  },
                  {
                    id: storedMessages.messages[snapshotIndex].id,
                    role: 'assistant',

                    // Combine followup message and the artifact with files and command actions
                    content: `Bolt Restored your chat from a snapshot. You can revert this message to load the full chat history.
                  <boltArtifact id="restored-project-setup" title="Restored Project & Setup" type="bundled">
                  ${Object.entries(snapshot?.files || {})
                    .map(([key, value]) => {
                      if (value?.type === 'file') {
                        return `
                      <boltAction type="file" filePath="${key}">
${value.content}
                      </boltAction>
                      `;
                      } else {
                        return ``;
                      }
                    })
                    .join('\n')}
                  ${commandActionsString}
                  </boltArtifact>
                  `, // Added commandActionsString, followupMessage, updated id and title
                    annotations: [
                      'no-store',
                      ...(summary
                        ? [
                            {
                              chatId: storedMessages.messages[snapshotIndex].id,
                              type: 'chatSummary',
                              summary,
                            } satisfies ContextAnnotation,
                          ]
                        : []),
                    ],
                  },

                  // Remove the separate user and assistant messages for commands
                  /*
                   *...(commands !== null // This block is no longer needed
                   *  ? [ ... ]
                   *  : []),
                   */
                  ...filteredMessages,
                ];
                restoreSnapshot(mixedId);
              }

              setInitialMessages(filteredMessages);

              setUrlId(storedMessages.urlId);
              description.set(storedMessages.description);
              chatId.set(storedMessages.id);
              chatMetadata.set(storedMessages.metadata);
            } else {
              // No messages found - this is OK for new projects
              // Don't redirect, just set ready
              console.log('⚠️ No messages found in IndexedDB for project:', mixedId);
              console.log('📝 Setting up as new chat');
              setUrlId(mixedId);
              chatId.set(mixedId);
              description.set('New Chat');
            }

            console.log('✅ Setting ready to true, initialMessages length:', initialMessages.length);
            setReady(true);
          })
          .catch((error) => {
            console.error('❌ Error loading from IndexedDB:', error);
            logStore.logError('Failed to load chat messages or snapshot', error);
            // Don't show error toast for new projects
            console.log('⚠️ Setting ready to true despite error');
            setReady(true);
          });
      };

      loadProjectData();
    } else {
      // Handle case where there is no mixedId (e.g., new chat)
      setReady(true);
    }
  }, [mixedId, db, navigate, searchParams]); // Added db, navigate, searchParams dependencies

  const takeSnapshot = useCallback(
    async (chatIdx: string, files: FileMap, _chatId?: string | undefined, chatSummary?: string) => {
      const id = chatId.get();

      if (!id || !db) {
        return;
      }

      const snapshot: Snapshot = {
        chatIndex: chatIdx,
        files,
        summary: chatSummary,
      };

      // localStorage.setItem(`snapshot:${id}`, JSON.stringify(snapshot)); // Remove localStorage usage
      try {
        await setSnapshot(db, id, snapshot);
      } catch (error) {
        console.error('Failed to save snapshot:', error);
        toast.error('Failed to save chat snapshot.');
      }
    },
    [db],
  );

  const restoreSnapshot = useCallback(async (id: string, snapshot?: Snapshot) => {
    // This is a no-op because webcontainer is removed.
  }, []);

  return {
    ready: !mixedId || ready,
    initialMessages,
    updateChatMestaData: async (metadata: IChatMetadata) => {
      const id = chatId.get();

      if (!db || !id) {
        return;
      }

      try {
        await setMessages(db, id, initialMessages, urlId, description.get(), undefined, metadata);
        chatMetadata.set(metadata);
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory: async (
      messages: Message[],
      metadata?: {
        model?: string;
        provider?: string;
        usage?: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        };
        responseTimeMs?: number;
      },
    ) => {
      if (!db || messages.length === 0) {
        return;
      }

      const { firstArtifact } = workbenchStore;
      messages = messages.filter((m) => !m.annotations?.includes('no-store'));

      let _urlId = urlId;

      if (!urlId && firstArtifact?.id) {
        const urlId = await getUrlId(db, firstArtifact.id);
        _urlId = urlId;
        navigateChat(urlId);
        setUrlId(urlId);
      }

      let chatSummary: string | undefined = undefined;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.role === 'assistant') {
        const annotations = lastMessage.annotations as JSONValue[];
        const filteredAnnotations = (annotations?.filter(
          (annotation: JSONValue) =>
            annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
        ) || []) as { type: string; value: any } & { [key: string]: any }[];

        if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
          chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
        }
      }

      takeSnapshot(messages[messages.length - 1].id, workbenchStore.files.get(), _urlId, chatSummary);

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);
      }

      // Ensure chatId.get() is used here as well
      if (initialMessages.length === 0 && !chatId.get()) {
        const nextId = await getNextId(db);

        chatId.set(nextId);

        if (!urlId) {
          navigateChat(nextId);
        }
      }

      // Ensure chatId.get() is used for the final setMessages call
      const finalChatId = chatId.get();

      if (!finalChatId) {
        console.error('Cannot save messages, chat ID is not set.');
        toast.error('Failed to save chat messages: Chat ID missing.');

        return;
      }

      await setMessages(
        db,
        finalChatId, // Use the potentially updated chatId
        [...archivedMessages, ...messages],
        urlId,
        description.get(),
        undefined,
        chatMetadata.get(),
      );

      // Sync to Supabase for cloud sync
      try {
        const supabaseProjectId = await getOrCreateSupabaseProjectId(finalChatId, description.get() || 'New Chat');

        // Use project sync service for reliable syncing
        projectSync.queueSync({
          projectId: supabaseProjectId,
          projectName: description.get() || 'New Chat',
          messages: [...archivedMessages, ...messages],
          files: workbenchStore.files.get(),
        });
      } catch (error) {
        console.error('Failed to queue project sync:', error);
      }
    },
    duplicateCurrentChat: async (listItemId: string) => {
      if (!db || (!mixedId && !listItemId)) {
        return;
      }

      try {
        const newId = await duplicateChat(db, mixedId || listItemId);
        navigate(`/chat/${newId}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },
    importChat: async (description: string, messages: Message[], metadata?: IChatMetadata) => {
      if (!db) {
        return;
      }

      try {
        const newId = await createChatFromMessages(db, description, messages, metadata);
        window.location.href = `/chat/${newId}`;
        toast.success('Chat imported successfully');
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to import chat: ' + error.message);
        } else {
          toast.error('Failed to import chat');
        }
      }
    },
    exportChat: async (id = urlId) => {
      if (!db || !id) {
        return;
      }

      const chat = await getMessages(db, id);
      const chatData = {
        messages: chat.messages,
        description: chat.description,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
