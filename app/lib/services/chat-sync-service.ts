/**
 * Chat Sync Service - Prevents duplicate saves
 * Saves to Supabase ONLY ONCE per message
 */

import type { Message } from 'ai';
import { supabasePersistence } from './supabase-persistence';

const LAST_SYNC_KEY = 'last_supabase_sync';

interface LastSync {
  chatId: string;
  messageIds: string[];
  timestamp: number;
}

export class ChatSyncService {
  private syncing = false;
  private syncedMessages = new Map<string, Set<string>>();

  /**
   * Save messages to Supabase (called ONLY from onFinish)
   */
  async syncToSupabase(
    chatId: string,
    projectId: string,
    messages: Message[],
    metadata?: {
      model: string;
      usage?: { totalTokens: number };
      responseTimeMs?: number;
    }
  ): Promise<void> {
    // Prevent concurrent syncs
    if (this.syncing) {
      console.log('⏭️ Sync already in progress, skipping...');
      return;
    }

    this.syncing = true;

    try {
      // Get already synced messages for this chat
      if (!this.syncedMessages.has(chatId)) {
        this.syncedMessages.set(chatId, new Set());
      }
      const synced = this.syncedMessages.get(chatId)!;

      // Filter to only new messages
      const newMessages = messages.filter(m => !synced.has(m.id) && m.content);

      if (newMessages.length === 0) {
        console.log('⏭️ No new messages to sync');
        return;
      }

      console.log(`💾 Syncing ${newMessages.length} messages to Supabase...`);

      for (const message of newMessages) {
        // Extract usage from annotations
        const annotations = message.annotations as any[];
        const usageAnnotation = annotations?.find?.((a: any) => a?.type === 'usage');
        const tokens = usageAnnotation?.value?.totalTokens || metadata?.usage?.totalTokens;

        await supabasePersistence.saveChatMessage({
          id: message.id,
          projectId,
          role: message.role as any,
          content: message.content,
          modelUsed: metadata?.model,
          tokensUsed: tokens,
          responseTimeMs: metadata?.responseTimeMs,
        });

        synced.add(message.id);
        console.log(`✅ Synced: ${message.id.substring(0, 12)} | ${tokens || 0} tokens`);
      }

      console.log(`✅ Supabase sync complete: ${newMessages.length} messages`);
    } catch (error) {
      console.error('Supabase sync failed:', error);
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Clear synced messages for a chat (when starting new chat)
   */
  clearChat(chatId: string): void {
    this.syncedMessages.delete(chatId);
  }
}

// Singleton instance
export const chatSyncService = new ChatSyncService();
