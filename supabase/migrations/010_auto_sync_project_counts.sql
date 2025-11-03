-- ============================================
-- Migration: Auto-Sync Project Counts & Relations
-- ============================================
-- Version: 010
-- Description: Automatically update project.screen_count when screens are added/removed
--              and ensure all tables are properly synced
-- Date: 2025-11-02

-- ============================================
-- 1. FUNCTION: Auto-update screen_count on projects table
-- ============================================

-- Function to update project screen count when screens change
CREATE OR REPLACE FUNCTION update_project_screen_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update screen_count in projects table
  UPDATE projects
  SET
    screen_count = (
      SELECT COUNT(*)
      FROM screens
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. TRIGGERS: Update screen_count automatically
-- ============================================

-- Trigger when a screen is inserted
DROP TRIGGER IF EXISTS trigger_update_screen_count_insert ON screens;
CREATE TRIGGER trigger_update_screen_count_insert
AFTER INSERT ON screens
FOR EACH ROW
EXECUTE FUNCTION update_project_screen_count();

-- Trigger when a screen is deleted
DROP TRIGGER IF EXISTS trigger_update_screen_count_delete ON screens;
CREATE TRIGGER trigger_update_screen_count_delete
AFTER DELETE ON screens
FOR EACH ROW
EXECUTE FUNCTION update_project_screen_count();

-- Trigger when a screen is moved to another project (rare but possible)
DROP TRIGGER IF EXISTS trigger_update_screen_count_update ON screens;
CREATE TRIGGER trigger_update_screen_count_update
AFTER UPDATE OF project_id ON screens
FOR EACH ROW
WHEN (OLD.project_id IS DISTINCT FROM NEW.project_id)
EXECUTE FUNCTION update_project_screen_count();

-- ============================================
-- 3. FIX: Sync existing screen_count values
-- ============================================

-- Update all existing projects with correct screen counts
UPDATE projects
SET screen_count = (
  SELECT COUNT(*)
  FROM screens
  WHERE screens.project_id = projects.id
)
WHERE screen_count != (
  SELECT COUNT(*)
  FROM screens
  WHERE screens.project_id = projects.id
);

-- Log the fix is commented out as ROW_COUNT doesn't work outside transaction
-- Run this query to see how many were updated:
-- SELECT COUNT(*) FROM projects WHERE screen_count != (SELECT COUNT(*) FROM screens WHERE project_id = projects.id);

-- ============================================
-- 4. FUNCTION: Count user screens across all projects
-- ============================================

-- Already exists from migration 002, but let's ensure it's correct
CREATE OR REPLACE FUNCTION count_user_screens(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_screens INTEGER;
BEGIN
  SELECT COALESCE(SUM(screen_count), 0)
  INTO total_screens
  FROM projects
  WHERE user_id = p_user_id
    AND status = 'active';

  RETURN total_screens;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. FUNCTION: Get project with all related data
-- ============================================

-- Function to fetch complete project data in one query
CREATE OR REPLACE FUNCTION get_project_complete(p_project_id UUID, p_user_id UUID)
RETURNS TABLE(
  -- Project info
  project_id UUID,
  project_name TEXT,
  project_description TEXT,
  project_status TEXT,
  project_created_at TIMESTAMPTZ,
  project_updated_at TIMESTAMPTZ,

  -- Counts
  total_screens INTEGER,
  total_messages INTEGER,

  -- Canvas state
  canvas_state JSONB,

  -- Latest activity
  last_opened_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.status,
    p.created_at,
    p.updated_at,
    p.screen_count,
    (SELECT COUNT(*)::INTEGER FROM chat_history WHERE project_id = p.id),
    p.canvas_state,
    p.last_opened_at,
    (SELECT MAX(created_at) FROM chat_history WHERE project_id = p.id)
  FROM projects p
  WHERE p.id = p_project_id
    AND p.user_id = p_user_id
    AND p.status != 'deleted';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. FUNCTION: Update project last_opened_at when accessed
-- ============================================

CREATE OR REPLACE FUNCTION touch_project(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE projects
  SET
    last_opened_at = NOW(),
    updated_at = NOW()
  WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. VIEW: Project summary with all counts
-- ============================================

CREATE OR REPLACE VIEW project_summary AS
SELECT
  p.id AS project_id,
  p.user_id,
  p.name AS project_name,
  p.status,
  p.created_at,
  p.updated_at,
  p.last_opened_at,

  -- Screen counts
  p.screen_count,
  COALESCE((SELECT COUNT(*) FROM screens WHERE project_id = p.id), 0) AS actual_screen_count,

  -- Message counts
  COALESCE((SELECT COUNT(*) FROM chat_history WHERE project_id = p.id), 0) AS message_count,

  -- Latest activity
  COALESCE((SELECT MAX(created_at) FROM chat_history WHERE project_id = p.id), p.updated_at) AS last_activity,

  -- User info
  u.email AS user_email,
  u.full_name AS user_name,
  u.subscription_tier
FROM projects p
JOIN users u ON p.user_id = u.id
WHERE p.status != 'deleted';

-- ============================================
-- 8. INDEXES: Optimize queries for relationships
-- ============================================

-- Index for faster screen count queries
CREATE INDEX IF NOT EXISTS idx_screens_project_id_count ON screens(project_id)
WHERE generation_status = 'completed';

-- Index for faster message count queries
CREATE INDEX IF NOT EXISTS idx_chat_project_id_count ON chat_history(project_id);

-- Composite index for user's active projects with screens
CREATE INDEX IF NOT EXISTS idx_projects_user_status_screens ON projects(user_id, status, screen_count)
WHERE status = 'active';

-- ============================================
-- 9. FUNCTION: Sync user's total screen count
-- ============================================

CREATE OR REPLACE FUNCTION sync_user_screen_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_count INTEGER;
BEGIN
  -- Calculate total screens across all active projects
  SELECT COALESCE(SUM(screen_count), 0)
  INTO total_count
  FROM projects
  WHERE user_id = p_user_id
    AND status = 'active';

  -- Update user's ai_generations_count (which tracks screens)
  UPDATE users
  SET ai_generations_count = total_count
  WHERE id = p_user_id;

  RETURN total_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. TRIGGER: Update user screen count when project screen_count changes
-- ============================================

CREATE OR REPLACE FUNCTION update_user_total_screens()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync the user's total screen count
  PERFORM sync_user_screen_count(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_user_screens ON projects;
CREATE TRIGGER trigger_sync_user_screens
AFTER INSERT OR UPDATE OF screen_count ON projects
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION update_user_total_screens();

-- ============================================
-- 11. FIX: Sync all user screen counts now
-- ============================================

DO $$
DECLARE
  user_record RECORD;
  total_synced INTEGER := 0;
BEGIN
  -- Update each user's screen count
  FOR user_record IN
    SELECT id FROM users
  LOOP
    PERFORM sync_user_screen_count(user_record.id);
    total_synced := total_synced + 1;
  END LOOP;

  RAISE NOTICE 'Synced screen counts for % users', total_synced;
END $$;

-- ============================================
-- 12. FUNCTION: Get user's projects with full details
-- ============================================

CREATE OR REPLACE FUNCTION get_user_projects_detailed(p_user_id UUID)
RETURNS TABLE(
  project_id UUID,
  project_name TEXT,
  screen_count INTEGER,
  message_count BIGINT,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.screen_count,
    COUNT(ch.id) AS message_count,
    GREATEST(p.updated_at, MAX(ch.created_at)) AS last_activity,
    p.created_at
  FROM projects p
  LEFT JOIN chat_history ch ON ch.project_id = p.id
  WHERE p.user_id = p_user_id
    AND p.status = 'active'
  GROUP BY p.id, p.name, p.screen_count, p.updated_at, p.created_at
  ORDER BY last_activity DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. COMMENTS for documentation
-- ============================================

COMMENT ON FUNCTION update_project_screen_count() IS
  'Automatically updates project.screen_count when screens are inserted/deleted';

COMMENT ON FUNCTION sync_user_screen_count(UUID) IS
  'Syncs user.ai_generations_count with total screens across all active projects';

COMMENT ON FUNCTION get_project_complete(UUID, UUID) IS
  'Fetches complete project data including all counts in a single query';

COMMENT ON VIEW project_summary IS
  'Summary view of all projects with screen counts, message counts, and user info';

-- ============================================
-- 14. VERIFICATION QUERY
-- ============================================

-- Query to verify everything is synced correctly
DO $$
DECLARE
  mismatched_projects INTEGER;
  mismatched_users INTEGER;
BEGIN
  -- Check for projects with incorrect screen_count
  SELECT COUNT(*)
  INTO mismatched_projects
  FROM projects p
  WHERE p.screen_count != (
    SELECT COUNT(*) FROM screens WHERE project_id = p.id
  );

  -- Check for users with incorrect ai_generations_count
  SELECT COUNT(*)
  INTO mismatched_users
  FROM users u
  WHERE u.ai_generations_count != (
    SELECT COALESCE(SUM(screen_count), 0)
    FROM projects
    WHERE user_id = u.id AND status = 'active'
  );

  IF mismatched_projects > 0 THEN
    RAISE WARNING 'Found % projects with incorrect screen_count', mismatched_projects;
  ELSE
    RAISE NOTICE '✅ All project screen counts are correct';
  END IF;

  IF mismatched_users > 0 THEN
    RAISE WARNING 'Found % users with incorrect ai_generations_count', mismatched_users;
  ELSE
    RAISE NOTICE '✅ All user screen counts are correct';
  END IF;
END $$;

-- ============================================
-- COMPLETION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 010 completed successfully';
  RAISE NOTICE '📊 Tables are now synced automatically';
  RAISE NOTICE '🔗 screen_count updates in real-time';
  RAISE NOTICE '👥 User screen totals are synced';
END $$;
