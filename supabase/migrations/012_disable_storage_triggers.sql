/*
  # Disable Storage Calculation Triggers
  
  The storage calculation triggers are causing timeouts on every file save.
  Disable them and calculate storage on-demand instead.
*/

-- Drop the triggers that cause timeouts
DROP TRIGGER IF EXISTS update_storage_on_design_file_change ON design_files;
DROP TRIGGER IF EXISTS update_storage_on_project_file_change ON project_files;
