-- Clear all tables without disturbing functionality
-- This migration deletes all data but preserves table structures, policies, and functions

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = replica;

-- Clear all data from tables (order matters due to foreign keys)
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE chat_sessions CASCADE;
TRUNCATE TABLE canvas_snapshots CASCADE;
TRUNCATE TABLE canvas_pages CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE user_usage CASCADE;
TRUNCATE TABLE users CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify tables are empty (optional, for logging)
DO $$
BEGIN
  RAISE NOTICE 'All tables cleared successfully';
  RAISE NOTICE 'users: % rows', (SELECT COUNT(*) FROM users);
  RAISE NOTICE 'projects: % rows', (SELECT COUNT(*) FROM projects);
  RAISE NOTICE 'chat_sessions: % rows', (SELECT COUNT(*) FROM chat_sessions);
  RAISE NOTICE 'chat_messages: % rows', (SELECT COUNT(*) FROM chat_messages);
  RAISE NOTICE 'canvas_pages: % rows', (SELECT COUNT(*) FROM canvas_pages);
  RAISE NOTICE 'canvas_snapshots: % rows', (SELECT COUNT(*) FROM canvas_snapshots);
  RAISE NOTICE 'user_usage: % rows', (SELECT COUNT(*) FROM user_usage);
END $$;
