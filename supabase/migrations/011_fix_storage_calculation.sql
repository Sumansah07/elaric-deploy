/*
  # Fix Storage Calculation Function
  
  The calculate_user_storage function was calling LENGTH() on file_size (BIGINT),
  which causes "function length(integer) does not exist" error.
  
  This migration fixes the function to use file_size directly without LENGTH().
*/

-- Drop and recreate the function with correct logic
CREATE OR REPLACE FUNCTION calculate_user_storage(p_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_total_bytes BIGINT;
BEGIN
  SELECT 
    COALESCE(SUM(content_size), 0) + 
    COALESCE(SUM(file_size_val), 0)
  INTO v_total_bytes
  FROM (
    SELECT LENGTH(content) as content_size, 0 as file_size_val FROM design_files WHERE user_id = p_user_id
    UNION ALL
    SELECT LENGTH(content) as content_size, COALESCE(file_size, 0) as file_size_val FROM project_files WHERE user_id = p_user_id AND is_deleted = FALSE
    UNION ALL
    SELECT LENGTH(html_content) as content_size, 0 as file_size_val FROM screens WHERE id IN (
      SELECT id FROM screens WHERE project_id IN (SELECT id FROM projects WHERE user_id = p_user_id)
    )
  ) AS all_content;
  
  RETURN v_total_bytes;
END;
$$ LANGUAGE plpgsql;
