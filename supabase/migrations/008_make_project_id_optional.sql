-- ============================================
-- Make project_id optional in chat_history
-- ============================================
-- This allows chats to exist independently of projects

-- Make project_id nullable
ALTER TABLE chat_history 
  ALTER COLUMN project_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL
-- (The existing constraint already allows this, we just need to make the column nullable)

COMMENT ON COLUMN chat_history.project_id IS 'Optional reference to project. NULL for standalone chats.';
