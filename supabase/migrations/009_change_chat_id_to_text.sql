-- ============================================
-- Change chat_history ID from UUID to TEXT
-- ============================================
-- This allows using AI message IDs (like "msg-xxx") instead of UUIDs

-- Drop the primary key constraint
ALTER TABLE chat_history DROP CONSTRAINT IF EXISTS chat_history_pkey;

-- Change id column from UUID to TEXT
ALTER TABLE chat_history ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Re-add primary key
ALTER TABLE chat_history ADD PRIMARY KEY (id);

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'chat_history' AND column_name = 'id';

-- This will show: id | text | (no length limit)
