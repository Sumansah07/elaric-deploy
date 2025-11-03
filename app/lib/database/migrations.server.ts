/**
 * Database migrations for authentication system
 * Server-only module for database schema management
 */

import { supabaseAdmin } from './supabase.server';

export interface Migration {
  id: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

/**
 * Migration to update users table for custom authentication
 */
export const updateUsersTableMigration: Migration = {
  id: '001',
  name: 'update_users_table_for_auth',
  up: async () => {
    // Add password_hash column and make clerk_user_id nullable
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Add password_hash column if it doesn't exist
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'password_hash') THEN
            ALTER TABLE users ADD COLUMN password_hash TEXT;
          END IF;
        END $$;

        -- Make clerk_user_id nullable for custom auth users
        ALTER TABLE users ALTER COLUMN clerk_user_id DROP NOT NULL;

        -- Add unique constraint on email if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                        WHERE constraint_name = 'users_email_unique' AND table_name = 'users') THEN
            ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
          END IF;
        END $$;

        -- Add is_email_verified column if it doesn't exist
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'is_email_verified') THEN
            ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;
          END IF;
        END $$;
      `
    });
  },
  down: async () => {
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Remove custom auth columns
        ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
        ALTER TABLE users DROP COLUMN IF EXISTS is_email_verified;
        
        -- Make clerk_user_id required again
        ALTER TABLE users ALTER COLUMN clerk_user_id SET NOT NULL;
        
        -- Remove email unique constraint
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;
      `
    });
  }
};

/**
 * Migration to create sessions table
 */
export const createSessionsTableMigration: Migration = {
  id: '002',
  name: 'create_sessions_table',
  up: async () => {
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Create sessions table if it doesn't exist
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
          user_agent TEXT,
          ip_address INET,
          metadata JSONB DEFAULT '{}'::jsonb
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS sessions_last_accessed_idx ON sessions(last_accessed_at);

        -- Enable RLS on sessions table
        ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies for sessions
        DROP POLICY IF EXISTS "Users can only access their own sessions" ON sessions;
        CREATE POLICY "Users can only access their own sessions" ON sessions
          FOR ALL USING (user_id = current_setting('app.current_user_id', true)::text);
      `
    });
  },
  down: async () => {
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Drop sessions table
        DROP TABLE IF EXISTS sessions CASCADE;
      `
    });
  }
};

/**
 * Migration to create auth-related functions
 */
export const createAuthFunctionsMigration: Migration = {
  id: '003',
  name: 'create_auth_functions',
  up: async () => {
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Function to clean up expired sessions
        CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM sessions WHERE expires_at < NOW();
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Function to extend session expiry
        CREATE OR REPLACE FUNCTION extend_session(session_id TEXT, extend_by INTERVAL DEFAULT '7 days')
        RETURNS BOOLEAN AS $$
        BEGIN
          UPDATE sessions 
          SET expires_at = NOW() + extend_by,
              last_accessed_at = NOW()
          WHERE id = session_id AND expires_at > NOW();
          
          RETURN FOUND;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Function to get user by session
        CREATE OR REPLACE FUNCTION get_user_by_session(session_id TEXT)
        RETURNS TABLE(
          user_id TEXT,
          email TEXT,
          full_name TEXT,
          avatar_url TEXT,
          subscription_tier TEXT,
          is_email_verified BOOLEAN
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            u.id,
            u.email,
            u.full_name,
            u.avatar_url,
            u.subscription_tier::TEXT,
            u.is_email_verified
          FROM users u
          INNER JOIN sessions s ON u.id = s.user_id
          WHERE s.id = session_id AND s.expires_at > NOW();
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
  },
  down: async () => {
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Drop auth functions
        DROP FUNCTION IF EXISTS cleanup_expired_sessions();
        DROP FUNCTION IF EXISTS extend_session(TEXT, INTERVAL);
        DROP FUNCTION IF EXISTS get_user_by_session(TEXT);
      `
    });
  }
};

/**
 * All migrations in order
 */
export const migrations: Migration[] = [
  updateUsersTableMigration,
  createSessionsTableMigration,
  createAuthFunctionsMigration
];

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...');

  // Create migrations tracking table if it doesn't exist
  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  // Get executed migrations
  const { data: executedMigrations } = await supabaseAdmin
    .from('schema_migrations')
    .select('id');

  const executedIds = new Set(executedMigrations?.map(m => m.id) || []);

  // Run pending migrations
  for (const migration of migrations) {
    if (!executedIds.has(migration.id)) {
      console.log(`Running migration: ${migration.name}`);
      
      try {
        await migration.up();
        
        // Record migration as executed
        await supabaseAdmin
          .from('schema_migrations')
          .insert({ id: migration.id, name: migration.name });
        
        console.log(`✓ Migration ${migration.name} completed`);
      } catch (error) {
        console.error(`✗ Migration ${migration.name} failed:`, error);
        throw error;
      }
    } else {
      console.log(`⏭ Migration ${migration.name} already executed`);
    }
  }

  console.log('All migrations completed successfully');
}

/**
 * Rollback a specific migration
 */
export async function rollbackMigration(migrationId: string): Promise<void> {
  const migration = migrations.find(m => m.id === migrationId);
  
  if (!migration) {
    throw new Error(`Migration ${migrationId} not found`);
  }

  console.log(`Rolling back migration: ${migration.name}`);
  
  try {
    await migration.down();
    
    // Remove migration record
    await supabaseAdmin
      .from('schema_migrations')
      .delete()
      .eq('id', migrationId);
    
    console.log(`✓ Migration ${migration.name} rolled back`);
  } catch (error) {
    console.error(`✗ Rollback of ${migration.name} failed:`, error);
    throw error;
  }
}