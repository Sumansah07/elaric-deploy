-- ============================================
-- Elaric AI Database Schema - Production Ready
-- ============================================
-- Version: 1.0.0
-- Description: Complete schema for authentication, projects, subscriptions, and analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  
  -- Subscription info
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'paused')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  
  -- Usage limits
  projects_created INTEGER NOT NULL DEFAULT 0,
  ai_generations_count INTEGER NOT NULL DEFAULT 0,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for users table
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Project details
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  thumbnail_url TEXT,
  
  -- Project metadata
  screen_count INTEGER NOT NULL DEFAULT 0,
  total_prompts INTEGER NOT NULL DEFAULT 0,
  last_opened_at TIMESTAMPTZ,
  
  -- Canvas state (stores zoom, pan, positions)
  canvas_state JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Create indexes for projects table
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_last_opened ON projects(last_opened_at DESC NULLS LAST);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);

-- ============================================
-- SCREENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS screens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Screen details
  name TEXT NOT NULL,
  description TEXT,
  screen_order INTEGER NOT NULL DEFAULT 0,
  
  -- Generated code
  html_content TEXT,
  css_content TEXT,
  js_content TEXT,
  
  -- Preview
  thumbnail_url TEXT,
  preview_url TEXT,
  
  -- Canvas positioning
  canvas_position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
  
  -- Status
  generation_status TEXT NOT NULL DEFAULT 'completed' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for screens table
CREATE INDEX idx_screens_project_id ON screens(project_id);
CREATE INDEX idx_screens_order ON screens(screen_order);
CREATE INDEX idx_screens_created_at ON screens(created_at);
CREATE INDEX idx_screens_status ON screens(generation_status);

-- ============================================
-- CHAT_HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Chat message
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- AI metadata
  model_used TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  
  -- Related screens generated from this message
  generated_screens UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for chat_history table
CREATE INDEX idx_chat_project_id ON chat_history(project_id);
CREATE INDEX idx_chat_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_created_at ON chat_history(created_at DESC);
CREATE INDEX idx_chat_role ON chat_history(role);

-- ============================================
-- USAGE_ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'ai_generation', 'screen_created', 'project_created', 
    'code_download', 'figma_export', 'screen_edit',
    'login', 'logout', 'subscription_change'
  )),
  
  -- Event details
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  screen_id UUID REFERENCES screens(id) ON DELETE SET NULL,
  
  -- Resource usage
  tokens_consumed INTEGER DEFAULT 0,
  storage_delta_bytes BIGINT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for usage_analytics table
CREATE INDEX idx_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX idx_analytics_event_type ON usage_analytics(event_type);
CREATE INDEX idx_analytics_created_at ON usage_analytics(created_at DESC);
CREATE INDEX idx_analytics_project_id ON usage_analytics(project_id);

-- ============================================
-- FIGMA_EXPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS figma_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Figma details
  figma_file_key TEXT NOT NULL,
  figma_file_url TEXT NOT NULL,
  export_status TEXT NOT NULL DEFAULT 'pending' CHECK (export_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Export metadata
  screens_exported INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for figma_exports table
CREATE INDEX idx_figma_user_id ON figma_exports(user_id);
CREATE INDEX idx_figma_project_id ON figma_exports(project_id);
CREATE INDEX idx_figma_status ON figma_exports(export_status);
CREATE INDEX idx_figma_created_at ON figma_exports(created_at DESC);

-- ============================================
-- ERROR_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Error details
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Context
  route TEXT,
  user_agent TEXT,
  ip_address INET,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for error_logs table
CREATE INDEX idx_errors_user_id ON error_logs(user_id);
CREATE INDEX idx_errors_type ON error_logs(error_type);
CREATE INDEX idx_errors_created_at ON error_logs(created_at DESC);

-- ============================================
-- AUTO-UPDATE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screens_updated_at BEFORE UPDATE ON screens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE figma_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Users: Users can only see their own data
CREATE POLICY users_select_own ON users
  FOR SELECT USING (clerk_user_id = current_setting('app.current_user_id', true));

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (clerk_user_id = current_setting('app.current_user_id', true));

-- Projects: Users can only access their own projects
CREATE POLICY projects_select_own ON projects
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
  );

CREATE POLICY projects_insert_own ON projects
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
  );

CREATE POLICY projects_update_own ON projects
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
  );

CREATE POLICY projects_delete_own ON projects
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
  );

-- Screens: Users can only access screens from their projects
CREATE POLICY screens_select_own ON screens
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true)
      )
    )
  );

CREATE POLICY screens_insert_own ON screens
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true)
      )
    )
  );

CREATE POLICY screens_update_own ON screens
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true)
      )
    )
  );

CREATE POLICY screens_delete_own ON screens
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id IN (
        SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true)
      )
    )
  );

-- Chat history: Users can only access their own chat history
CREATE POLICY chat_select_own ON chat_history
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
  );

CREATE POLICY chat_insert_own ON chat_history
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
  );

-- Usage analytics: Users can only see their own analytics
CREATE POLICY analytics_select_own ON usage_analytics
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
  );

-- Figma exports: Users can only see their own exports
CREATE POLICY figma_select_own ON figma_exports
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
  );

-- Error logs: Users can only see their own errors
CREATE POLICY errors_select_own ON error_logs
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = current_setting('app.current_user_id', true))
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user tier limits
CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS TABLE(
  max_projects INTEGER,
  max_ai_generations INTEGER,
  max_storage_gb INTEGER,
  can_export_figma BOOLEAN
) AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT subscription_tier INTO v_tier FROM users WHERE id = p_user_id;
  
  CASE v_tier
    WHEN 'free' THEN
      RETURN QUERY SELECT 5, 100, 1, FALSE;
    WHEN 'pro' THEN
      RETURN QUERY SELECT 50, 10000, 50, TRUE;
    WHEN 'enterprise' THEN
      RETURN QUERY SELECT 999999, 999999, 1000, TRUE;
    ELSE
      RETURN QUERY SELECT 5, 100, 1, FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can create project
CREATE OR REPLACE FUNCTION can_create_project(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_max_projects INTEGER;
BEGIN
  SELECT projects_created INTO v_current_count FROM users WHERE id = p_user_id;
  SELECT max_projects INTO v_max_projects FROM get_user_limits(p_user_id);
  
  RETURN v_current_count < v_max_projects;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage counters
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_event_type TEXT,
  p_tokens INTEGER DEFAULT 0,
  p_storage_bytes BIGINT DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  -- Update user counters
  IF p_event_type = 'ai_generation' THEN
    UPDATE users SET ai_generations_count = ai_generations_count + 1 WHERE id = p_user_id;
  ELSIF p_event_type = 'project_created' THEN
    UPDATE users SET projects_created = projects_created + 1 WHERE id = p_user_id;
  END IF;
  
  IF p_storage_bytes > 0 THEN
    UPDATE users SET storage_used_bytes = storage_used_bytes + p_storage_bytes WHERE id = p_user_id;
  END IF;
  
  -- Log the event
  INSERT INTO usage_analytics (user_id, event_type, tokens_consumed, storage_delta_bytes)
  VALUES (p_user_id, p_event_type, p_tokens, p_storage_bytes);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert system user for migrations
INSERT INTO users (
  clerk_user_id, 
  email, 
  full_name, 
  subscription_tier
) VALUES (
  'system',
  'system@elaric.ai',
  'System User',
  'enterprise'
) ON CONFLICT (clerk_user_id) DO NOTHING;

-- ============================================
-- COMPLETION
-- ============================================
COMMENT ON DATABASE postgres IS 'Elaric AI Production Database - Schema Version 1.0.0';
