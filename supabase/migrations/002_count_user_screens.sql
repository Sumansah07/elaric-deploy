-- Function to count total screens for a user across all their projects
CREATE OR REPLACE FUNCTION count_user_screens(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  screen_count INTEGER;
BEGIN
  SELECT COUNT(s.id)::INTEGER
  INTO screen_count
  FROM screens s
  INNER JOIN projects p ON s.project_id = p.id
  WHERE p.user_id = p_user_id;
  
  RETURN COALESCE(screen_count, 0);
END;
$$;
