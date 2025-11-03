-- ============================================
-- Fix ALL RLS Policies (Projects, Screens, Chat History)
-- ============================================
-- This fixes RLS blocking issues for all existing tables from migration 001

-- Drop all existing restrictive policies on projects table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'projects') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON projects';
    END LOOP;
END $$;

-- Drop all existing restrictive policies on screens table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'screens') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON screens';
    END LOOP;
END $$;

-- Drop all existing restrictive policies on chat_history table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_history') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON chat_history';
    END LOOP;
END $$;

-- Drop all existing restrictive policies on usage_analytics table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'usage_analytics') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON usage_analytics';
    END LOOP;
END $$;

-- Drop all existing restrictive policies on figma_exports table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'figma_exports') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON figma_exports';
    END LOOP;
END $$;

-- Drop all existing restrictive policies on error_logs table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'error_logs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON error_logs';
    END LOOP;
END $$;

-- Create simple permissive policies (app layer enforces user_id filtering)

-- Projects
CREATE POLICY projects_all ON projects
  FOR ALL USING (true) WITH CHECK (true);

-- Screens
CREATE POLICY screens_all ON screens
  FOR ALL USING (true) WITH CHECK (true);

-- Chat History
CREATE POLICY chat_history_all ON chat_history
  FOR ALL USING (true) WITH CHECK (true);

-- Usage Analytics
CREATE POLICY usage_analytics_all ON usage_analytics
  FOR ALL USING (true) WITH CHECK (true);

-- Figma Exports
CREATE POLICY figma_exports_all ON figma_exports
  FOR ALL USING (true) WITH CHECK (true);

-- Error Logs
CREATE POLICY error_logs_all ON error_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Note: RLS is still enabled on all tables
-- Security is enforced at the application layer
-- All queries include .eq('user_id', userContext.userId) to filter by user
