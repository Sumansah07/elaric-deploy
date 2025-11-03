/**
 * TypeScript types for Supabase database schema
 * Auto-generated types for type safety
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          clerk_user_id: string | null; // Made nullable for custom auth
          email: string;
          password_hash: string | null; // Added for custom auth
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: 'free' | 'pro' | 'enterprise';
          subscription_status: 'active' | 'cancelled' | 'past_due' | 'paused';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_starts_at: string | null;
          subscription_ends_at: string | null;
          projects_created: number;
          ai_generations_count: number;
          storage_used_bytes: number;
          is_email_verified: boolean; // Added for custom auth
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          clerk_user_id?: string | null;
          email: string;
          password_hash?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'pro' | 'enterprise';
          subscription_status?: 'active' | 'cancelled' | 'past_due' | 'paused';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_starts_at?: string | null;
          subscription_ends_at?: string | null;
          projects_created?: number;
          ai_generations_count?: number;
          storage_used_bytes?: number;
          is_email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          clerk_user_id?: string | null;
          email?: string;
          password_hash?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'pro' | 'enterprise';
          subscription_status?: 'active' | 'cancelled' | 'past_due' | 'paused';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_starts_at?: string | null;
          subscription_ends_at?: string | null;
          projects_created?: number;
          ai_generations_count?: number;
          storage_used_bytes?: number;
          is_email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          metadata?: Json;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          status: 'active' | 'archived' | 'deleted';
          thumbnail_url: string | null;
          screen_count: number;
          total_prompts: number;
          last_opened_at: string | null;
          canvas_state: Json;
          created_at: string;
          updated_at: string;
          metadata: Json;
          tags: string[];
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          status?: 'active' | 'archived' | 'deleted';
          thumbnail_url?: string | null;
          screen_count?: number;
          total_prompts?: number;
          last_opened_at?: string | null;
          canvas_state?: Json;
          created_at?: string;
          updated_at?: string;
          metadata?: Json;
          tags?: string[];
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          status?: 'active' | 'archived' | 'deleted';
          thumbnail_url?: string | null;
          screen_count?: number;
          total_prompts?: number;
          last_opened_at?: string | null;
          canvas_state?: Json;
          created_at?: string;
          updated_at?: string;
          metadata?: Json;
          tags?: string[];
        };
      };
      screens: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          screen_order: number;
          html_content: string | null;
          css_content: string | null;
          js_content: string | null;
          thumbnail_url: string | null;
          preview_url: string | null;
          canvas_position: Json;
          generation_status: 'pending' | 'generating' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          screen_order?: number;
          html_content?: string | null;
          css_content?: string | null;
          js_content?: string | null;
          thumbnail_url?: string | null;
          preview_url?: string | null;
          canvas_position?: Json;
          generation_status?: 'pending' | 'generating' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          screen_order?: number;
          html_content?: string | null;
          css_content?: string | null;
          js_content?: string | null;
          thumbnail_url?: string | null;
          preview_url?: string | null;
          canvas_position?: Json;
          generation_status?: 'pending' | 'generating' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
          metadata?: Json;
        };
      };
      chat_history: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          model_used: string | null;
          tokens_used: number | null;
          response_time_ms: number | null;
          generated_screens: string[];
          created_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          model_used?: string | null;
          tokens_used?: number | null;
          response_time_ms?: number | null;
          generated_screens?: string[];
          created_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          model_used?: string | null;
          tokens_used?: number | null;
          response_time_ms?: number | null;
          generated_screens?: string[];
          created_at?: string;
          metadata?: Json;
        };
      };
      usage_analytics: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          project_id: string | null;
          screen_id: string | null;
          tokens_consumed: number;
          storage_delta_bytes: number;
          created_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          project_id?: string | null;
          screen_id?: string | null;
          tokens_consumed?: number;
          storage_delta_bytes?: number;
          created_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          project_id?: string | null;
          screen_id?: string | null;
          tokens_consumed?: number;
          storage_delta_bytes?: number;
          created_at?: string;
          metadata?: Json;
        };
      };
      figma_exports: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          figma_file_key: string;
          figma_file_url: string;
          export_status: 'pending' | 'processing' | 'completed' | 'failed';
          screens_exported: number;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          figma_file_key: string;
          figma_file_url: string;
          export_status?: 'pending' | 'processing' | 'completed' | 'failed';
          screens_exported?: number;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          figma_file_key?: string;
          figma_file_url?: string;
          export_status?: 'pending' | 'processing' | 'completed' | 'failed';
          screens_exported?: number;
          error_message?: string | null;
          created_at?: string;
          completed_at?: string | null;
          metadata?: Json;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          expires_at: string;
          created_at: string;
          last_accessed_at: string;
          user_agent: string | null;
          ip_address: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          expires_at: string;
          created_at?: string;
          last_accessed_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          expires_at?: string;
          created_at?: string;
          last_accessed_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          metadata?: Json;
        };
      };
      error_logs: {
        Row: {
          id: string;
          user_id: string | null;
          error_type: string;
          error_message: string;
          error_stack: string | null;
          route: string | null;
          user_agent: string | null;
          ip_address: string | null;
          created_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          error_type: string;
          error_message: string;
          error_stack?: string | null;
          route?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          error_type?: string;
          error_message?: string;
          error_stack?: string | null;
          route?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
          metadata?: Json;
        };
      };
    };
    Functions: {
      get_user_limits: {
        Args: { p_user_id: string };
        Returns: {
          max_projects: number;
          max_ai_generations: number;
          max_storage_gb: number;
          can_export_figma: boolean;
        }[];
      };
      can_create_project: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      increment_usage: {
        Args: {
          p_user_id: string;
          p_event_type: string;
          p_tokens?: number;
          p_storage_bytes?: number;
        };
        Returns: void;
      };
    };
  };
}

// Helper types
export type UserRow = Database['public']['Tables']['users']['Row'];
export type SessionRow = Database['public']['Tables']['sessions']['Row'];
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type ScreenRow = Database['public']['Tables']['screens']['Row'];
export type ChatHistoryRow = Database['public']['Tables']['chat_history']['Row'];
export type UsageAnalyticsRow = Database['public']['Tables']['usage_analytics']['Row'];
export type FigmaExportRow = Database['public']['Tables']['figma_exports']['Row'];
export type ErrorLogRow = Database['public']['Tables']['error_logs']['Row'];

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'paused';
export type ProjectStatus = 'active' | 'archived' | 'deleted';
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type ChatRole = 'user' | 'assistant' | 'system';
