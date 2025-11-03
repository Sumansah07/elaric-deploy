/*
  # Ensure TEXT columns are unlimited
  
  Make sure html_content, css_content, js_content are proper TEXT type
  with no length limits.
*/

-- Ensure columns are TEXT type (unlimited)
ALTER TABLE screens 
  ALTER COLUMN html_content TYPE TEXT,
  ALTER COLUMN css_content TYPE TEXT,
  ALTER COLUMN js_content TYPE TEXT;
