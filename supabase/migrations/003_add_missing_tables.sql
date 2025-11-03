-- ============================================
-- Additional Tables for Complete Data Persistence
-- ============================================
-- Description: Design files, project files, user settings, canvas snapshots

-- ============================================
-- DESIGN_FILES TABLE
-- Stores design project files (HTML, CSS, JS)
-- ============================================
CREATE TABLE IF NOT EXISTS design_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- File details
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('html', 'css', 'js', 'json', 'md', 'txt')),
  content TEXT NOT NULL,
  
  -- Metadata
  file_size INTEGER,
  last_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique file paths per project
  UNIQUE(project_id, file_path)
);

CREATE INDEX idx_design_files_project ON design_files(project_id);
CREATE INDEX idx_design_files_user ON design_files(user_id);
CREATE INDEX idx_design_files_type ON design_files(file_type);

-- ============================================
-- PROJECT_FILES TABLE
-- Stores code files for projects (workbench files)
-- ============================================
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- File details
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- File metadata
  is_binary BOOLEAN DEFAULT FALSE,
  mime_type TEXT,
  file_size BIGINT,
  
  -- Status
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique file paths per project
  UNIQUE(project_id, file_path)
);

CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_project_files_user ON project_files(user_id);
CREATE INDEX idx_project_files_deleted ON project_files(is_deleted);
CREATE INDEX idx_project_files_path ON project_files(file_path);

-- ============================================
-- USER_SETTINGS TABLE
-- Stores user preferences and settings
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- UI Settings
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  
  -- Provider Settings (AI providers configuration)
  provider_settings JSONB DEFAULT '{}'::jsonb,
  auto_enabled_providers TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- MCP Settings
  mcp_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Connection Settings
  github_connection JSONB,
  gitlab_connection JSONB,
  vercel_connection JSONB,
  netlify_connection JSONB,
  supabase_connection JSONB,
  
  -- Feature Flags
  viewed_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user ON user_settings(user_id);

-- ============================================
-- CANVAS_SNAPSHOTS TABLE
-- Stores canvas state snapshots for version control
-- ============================================
CREATE TABLE IF NOT EXISTS canvas_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Snapshot details
  name TEXT,
  description TEXT,
  
  -- Canvas state
  canvas_state JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canvas_snapshots_project ON canvas_snapshots(project_id);
CREATE INDEX idx_canvas_snapshots_user ON canvas_snapshots(user_id);
CREATE INDEX idx_canvas_snapshots_created ON canvas_snapshots(created_at DESC);

-- ============================================
-- LOCKED_FILES TABLE
-- Tracks files that are locked from AI modifications
-- ============================================
CREATE TABLE IF NOT EXISTS locked_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Locked item
  file_path TEXT NOT NULL,
  is_directory BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique locks per project
  UNIQUE(project_id, file_path)
);

CREATE INDEX idx_locked_files_project ON locked_files(project_id);
CREATE INDEX idx_locked_files_user ON locked_files(user_id);

-- ============================================
-- AUTO-UPDATE TRIGGERS
-- ============================================

CREATE TRIGGER update_design_files_modified BEFORE UPDATE ON design_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_files_updated BEFORE UPDATE ON project_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE locked_files ENABLE ROW LEVEL SECURITY;

-- Design Files Policies (Simplified - app layer enforces user_id)
CREATE POLICY design_files_all ON design_files
  FOR ALL USING (true) WITH CHECK (true);

-- Project Files Policies (Simplified - app layer enforces user_id)
CREATE POLICY project_files_all ON project_files
  FOR ALL USING (true) WITH CHECK (true);

-- User Settings Policies (Simplified - app layer enforces user_id)
CREATE POLICY user_settings_all ON user_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Canvas Snapshots Policies (Simplified - app layer enforces user_id)
CREATE POLICY canvas_snapshots_all ON canvas_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- Locked Files Policies (Simplified - app layer enforces user_id)
CREATE POLICY locked_files_all ON locked_files
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get total storage used by user
CREATE OR REPLACE FUNCTION calculate_user_storage(p_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_total_bytes BIGINT;
BEGIN
  SELECT 
    COALESCE(SUM(LENGTH(content)), 0) + 
    COALESCE(SUM(file_size), 0)
  INTO v_total_bytes
  FROM (
    SELECT LENGTH(content) as content, 0 as file_size FROM design_files WHERE user_id = p_user_id
    UNION ALL
    SELECT LENGTH(content) as content, file_size FROM project_files WHERE user_id = p_user_id AND is_deleted = FALSE
    UNION ALL
    SELECT LENGTH(html_content) as content, 0 as file_size FROM screens WHERE id IN (
      SELECT id FROM screens WHERE project_id IN (SELECT id FROM projects WHERE user_id = p_user_id)
    )
  ) AS all_content;
  
  RETURN v_total_bytes;
END;
$$ LANGUAGE plpgsql;

-- Function to sync storage usage to users table
CREATE OR REPLACE FUNCTION sync_user_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET storage_used_bytes = calculate_user_storage(NEW.user_id)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update storage usage
CREATE TRIGGER update_storage_on_design_file_change
  AFTER INSERT OR UPDATE OR DELETE ON design_files
  FOR EACH ROW EXECUTE FUNCTION sync_user_storage_usage();

CREATE TRIGGER update_storage_on_project_file_change
  AFTER INSERT OR UPDATE OR DELETE ON project_files
  FOR EACH ROW EXECUTE FUNCTION sync_user_storage_usage();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Add GIN indexes for JSONB columns
CREATE INDEX idx_user_settings_provider_settings ON user_settings USING GIN(provider_settings);
CREATE INDEX idx_user_settings_mcp ON user_settings USING GIN(mcp_settings);
CREATE INDEX idx_canvas_snapshots_state ON canvas_snapshots USING GIN(canvas_state);

-- ============================================
-- FIX: Users table RLS needs INSERT policy for user creation
-- ============================================

-- Add INSERT policy for users table to allow self-registration
CREATE POLICY users_insert_self ON users
  FOR INSERT WITH CHECK (true);

-- ============================================
-- COMPLETION
-- ============================================
COMMENT ON TABLE design_files IS 'Stores design project files (HTML, CSS, JS)';
COMMENT ON TABLE project_files IS 'Stores code files for projects';
COMMENT ON TABLE user_settings IS 'User preferences and settings';
COMMENT ON TABLE canvas_snapshots IS 'Canvas state snapshots for version control';
COMMENT ON TABLE locked_files IS 'Files locked from AI modifications';
