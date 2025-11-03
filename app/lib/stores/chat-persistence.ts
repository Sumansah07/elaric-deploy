/**
 * Chat Persistence System
 * Handles saving and loading chat history to/from Supabase
 */

import { debounce } from '~/utils/debounce';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    responseTime?: number;
    generatedScreens?: string[];
    cost?: number;
  };
}

export interface ChatSession {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  totalTokens: number;
  totalCost: number;
}

class ChatPersistence {
  private currentProjectId: string | null = null;
  private currentSessionId: string | null = null;
  private autoSaveEnabled = true;
  private saveInProgress = false;
  private messageQueue: ChatMessage[] = [];

  /**
   * Initialize chat persistence for a project
   */
  async initialize(projectId: string, userId: string) {
    this.currentProjectId = projectId;
    
    // Load or create chat session
    await this.loadOrCreateSession(projectId, userId);
    
    // Set up auto-save
    this.setupAutoSave();
    
    console.log(`Chat persistence initialized for project ${projectId}`);
  }

  /**
   * Load existing chat session or create new one
   */
  async loadOrCreateSession(projectId: string, userId: string): Promise<string> {
    try {
      // Try to load existing session
      const response = await fetch(`/api/chat/session?projectId=${projectId}`);
      
      if (response.ok) {
        const { session } = await response.json();
        this.currentSessionId = session.id;
        return session.id;
      }
      
      // Create new session if none exists
      const createResponse = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: `Chat Session ${new Date().toLocaleDateString()}`,
        }),
      });

      if (createResponse.ok) {
        const { session } = await createResponse.json();
        this.currentSessionId = session.id;
        return session.id;
      }

      throw new Error('Failed to create chat session');
    } catch (error) {
      console.error('Error loading/creating chat session:', error);
      throw error;
    }
  }

  /**
   * Get chat history for current session
   */
  async getChatHistory(): Promise<ChatMessage[]> {
    if (!this.currentSessionId) {
      return [];
    }

    try {
      const response = await fetch(`/api/chat/history?sessionId=${this.currentSessionId}`);
      
      if (response.ok) {
        const { messages } = await response.json();
        return messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          metadata: msg.metadata,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  /**
   * Add message to chat
   */
  async addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: ChatMessage['metadata']
  ): Promise<string> {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      metadata,
    };

    // Add to queue for batch saving
    this.messageQueue.push(message);
    
    // Trigger auto-save
    this.debouncedSave();

    return message.id;
  }

  /**
   * Save queued messages to database
   */
  async saveMessages(force = false): Promise<boolean> {
    if (!this.currentSessionId || this.messageQueue.length === 0) {
      return true;
    }

    if (this.saveInProgress && !force) {
      return false;
    }

    this.saveInProgress = true;

    try {
      const messagesToSave = [...this.messageQueue];
      this.messageQueue = [];

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.currentSessionId,
          messages: messagesToSave.map(msg => ({
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata,
          })),
        }),
      });

      if (!response.ok) {
        // Put messages back in queue if save failed
        this.messageQueue.unshift(...messagesToSave);
        throw new Error(`Failed to save messages: ${response.statusText}`);
      }

      console.log(`Saved ${messagesToSave.length} chat messages`);
      return true;
    } catch (error) {
      console.error('Error saving chat messages:', error);
      return false;
    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Search chat history
   */
  async searchMessages(query: string, limit = 50): Promise<ChatMessage[]> {
    if (!this.currentSessionId) {
      return [];
    }

    try {
      const response = await fetch('/api/chat/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.currentSessionId,
          query,
          limit,
        }),
      });

      if (response.ok) {
        const { messages } = await response.json();
        return messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          metadata: msg.metadata,
        }));
      }

      return [];
    } catch (error) {
      console.error('Error searching chat messages:', error);
      return [];
    }
  }

  /**
   * Get AI usage statistics
   */
  async getAIUsageStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    messageCount: number;
    modelUsage: Record<string, number>;
  }> {
    if (!this.currentProjectId) {
      return {
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        modelUsage: {},
      };
    }

    try {
      const response = await fetch(`/api/chat/usage-stats?projectId=${this.currentProjectId}`);
      
      if (response.ok) {
        const stats = await response.json();
        return stats;
      }

      return {
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        modelUsage: {},
      };
    } catch (error) {
      console.error('Error getting AI usage stats:', error);
      return {
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        modelUsage: {},
      };
    }
  }

  /**
   * Export chat history
   */
  async exportChatHistory(format: 'json' | 'markdown' | 'txt' = 'json'): Promise<string> {
    const messages = await this.getChatHistory();
    
    switch (format) {
      case 'markdown':
        return this.exportAsMarkdown(messages);
      case 'txt':
        return this.exportAsText(messages);
      case 'json':
      default:
        return JSON.stringify(messages, null, 2);
    }
  }

  /**
   * Set up auto-save functionality
   */
  private setupAutoSave() {
    // Save on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveMessages(true);
      }
    });

    // Save on beforeunload
    window.addEventListener('beforeunload', () => {
      this.saveMessages(true);
    });
  }

  /**
   * Debounced save function
   */
  private debouncedSave = debounce(() => {
    if (this.autoSaveEnabled) {
      this.saveMessages();
    }
  }, 2000); // Save 2 seconds after last message

  /**
   * Export as markdown
   */
  private exportAsMarkdown(messages: ChatMessage[]): string {
    let markdown = `# Chat History\n\n`;
    markdown += `Generated on: ${new Date().toLocaleString()}\n\n`;

    messages.forEach(msg => {
      const timestamp = msg.timestamp.toLocaleString();
      const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      
      markdown += `## ${role} - ${timestamp}\n\n`;
      markdown += `${msg.content}\n\n`;
      
      if (msg.metadata) {
        markdown += `*Metadata: ${JSON.stringify(msg.metadata)}*\n\n`;
      }
      
      markdown += `---\n\n`;
    });

    return markdown;
  }

  /**
   * Export as plain text
   */
  private exportAsText(messages: ChatMessage[]): string {
    let text = `Chat History - Generated on: ${new Date().toLocaleString()}\n\n`;

    messages.forEach(msg => {
      const timestamp = msg.timestamp.toLocaleString();
      const role = msg.role.toUpperCase();
      
      text += `[${timestamp}] ${role}: ${msg.content}\n\n`;
    });

    return text;
  }

  /**
   * Enable/disable auto-save
   */
  setAutoSave(enabled: boolean) {
    this.autoSaveEnabled = enabled;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Save any pending messages
    if (this.messageQueue.length > 0) {
      this.saveMessages(true);
    }
    
    this.currentProjectId = null;
    this.currentSessionId = null;
    this.autoSaveEnabled = false;
    this.messageQueue = [];
  }
}

// Export singleton instance
export const chatPersistence = new ChatPersistence();