/**
 * Chat Persistence with Supabase
 * Replaces IndexedDB-only chat storage
 */

import type { Message } from 'ai';
import { supabasePersistence } from '~/lib/services/supabase-persistence';
import { atom } from 'nanostores';

export interface ChatHistoryItem {
  id: string;
  messages: Message[];
  urlId?: string;
  description?: string;
  timestamp: string;
  metadata?: {
    gitUrl?: string;
    gitBranch?: string;
    netlifySiteId?: string;
  };
}

// Current chat state
export const currentChatId = atom<string | null>(null);
export const isLoadingChat = atom<boolean>(false);

export const chatPersistenceStore = {
  /**
   * Save chat messages to Supabase
   */
  async saveMessages(
    projectId: string,
    messages: Message[],
    metadata?: {
      model?: string;
      tokensUsed?: number;
      responseTimeMs?: number;
    }
  ): Promise<void> {
    try {
      // Delete existing chat history for this project
      await supabasePersistence.deleteChatHistory(projectId);

      // Save all messages
      for (const message of messages) {
        await supabasePersistence.saveChatMessage({
          projectId,
          role: message.role as 'user' | 'assistant' | 'system',
          content: message.content,
          modelUsed: metadata?.model,
          tokensUsed: metadata?.tokensUsed,
          responseTimeMs: metadata?.responseTimeMs,
        });
      }
    } catch (error) {
      console.error('Failed to save chat messages:', error);
      throw error;
    }
  },

  /**
   * Load chat messages from Supabase
   */
  async loadMessages(projectId: string): Promise<Message[]> {
    isLoadingChat.set(true);
    try {
      const messages = await supabasePersistence.getChatHistory(projectId);
      return messages;
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      return [];
    } finally {
      isLoadingChat.set(false);
    }
  },

  /**
   * Delete chat history
   */
  async deleteChat(projectId: string): Promise<void> {
    try {
      await supabasePersistence.deleteChatHistory(projectId);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw error;
    }
  },

  /**
   * Get all projects with chat history
   */
  async getAllChats(): Promise<ChatHistoryItem[]> {
    try {
      const projects = await supabasePersistence.getProjects();
      
      const chats: ChatHistoryItem[] = [];
      for (const project of projects) {
        const messages = await supabasePersistence.getChatHistory(project.id);
        if (messages.length > 0) {
          chats.push({
            id: project.id,
            urlId: project.id,
            description: project.name,
            messages,
            timestamp: project.updated_at || project.created_at,
            metadata: project.metadata,
          });
        }
      }

      return chats;
    } catch (error) {
      console.error('Failed to get all chats:', error);
      return [];
    }
  },

  /**
   * Set current chat
   */
  setCurrentChat(chatId: string | null) {
    currentChatId.set(chatId);
  },

  /**
   * Get current chat ID
   */
  getCurrentChatId(): string | null {
    return currentChatId.get();
  },
};
