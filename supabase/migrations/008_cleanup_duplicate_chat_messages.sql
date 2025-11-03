-- ============================================
-- Cleanup Duplicate Chat Messages
-- ============================================
-- This removes duplicate messages keeping only the latest version

-- Delete duplicate messages, keeping only one per unique (project_id, content, role) combination
DELETE FROM chat_history
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, role, content) id
  FROM chat_history
  ORDER BY project_id, role, content, created_at DESC
);

-- Verify cleanup
SELECT 
  project_id,
  COUNT(*) as message_count
FROM chat_history
GROUP BY project_id
ORDER BY project_id;

-- Note: After cleanup, the app will use message.id to prevent future duplicates
