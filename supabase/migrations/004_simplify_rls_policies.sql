-- ============================================
-- Simplified RLS Policies (No Clerk Integration Needed)
-- ============================================
-- This migration simplifies RLS policies to work without session variables
-- Each service operation will filter by user_id directly

-- Drop all existing RLS policies that use current_setting
DROP POLICY IF EXISTS design_files_select_own ON design_files;
DROP POLICY IF EXISTS design_files_insert_own ON design_files;
DROP POLICY IF EXISTS design_files_update_own ON design_files;
DROP POLICY IF EXISTS design_files_delete_own ON design_files;

DROP POLICY IF EXISTS project_files_select_own ON project_files;
DROP POLICY IF EXISTS project_files_insert_own ON project_files;
DROP POLICY IF EXISTS project_files_update_own ON project_files;
DROP POLICY IF EXISTS project_files_delete_own ON project_files;

DROP POLICY IF EXISTS user_settings_select_own ON user_settings;
DROP POLICY IF EXISTS user_settings_insert_own ON user_settings;
DROP POLICY IF EXISTS user_settings_update_own ON user_settings;

DROP POLICY IF EXISTS canvas_snapshots_select_own ON canvas_snapshots;
DROP POLICY IF EXISTS canvas_snapshots_insert_own ON canvas_snapshots;
DROP POLICY IF EXISTS canvas_snapshots_delete_own ON canvas_snapshots;

DROP POLICY IF EXISTS locked_files_select_own ON locked_files;
DROP POLICY IF EXISTS locked_files_insert_own ON locked_files;
DROP POLICY IF EXISTS locked_files_delete_own ON locked_files;

-- Create simpler policies that allow all operations
-- Security will be enforced by the application layer (matching user_id in queries)

-- Design Files: Allow all (app layer will filter by user_id)
CREATE POLICY design_files_all ON design_files FOR ALL USING (true) WITH CHECK (true);

-- Project Files: Allow all (app layer will filter by user_id)
CREATE POLICY project_files_all ON project_files FOR ALL USING (true) WITH CHECK (true);

-- User Settings: Allow all (app layer will filter by user_id)
CREATE POLICY user_settings_all ON user_settings FOR ALL USING (true) WITH CHECK (true);

-- Canvas Snapshots: Allow all (app layer will filter by user_id)
CREATE POLICY canvas_snapshots_all ON canvas_snapshots FOR ALL USING (true) WITH CHECK (true);

-- Locked Files: Allow all (app layer will filter by user_id)
CREATE POLICY locked_files_all ON locked_files FOR ALL USING (true) WITH CHECK (true);

-- Keep RLS enabled but with permissive policies
-- The application code will ensure user_id is always included in WHERE clauses
