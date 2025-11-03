/**
 * Database Migration Runner
 * Applies pending migrations to Supabase database
 */

import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData, Form, useActionData } from '@remix-run/react';
import { db } from '~/lib/database/supabase.server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function loader(args: LoaderFunctionArgs) {
  // Check if migrations table exists
  let migrationsExist = false;
  let appliedMigrations: string[] = [];

  try {
    const { data, error } = await db.client
      .from('schema_migrations')
      .select('version')
      .order('version');

    if (!error) {
      migrationsExist = true;
      appliedMigrations = data?.map(m => m.version) || [];
    }
  } catch (error) {
    // Migrations table doesn't exist yet
  }

  // Available migrations
  const availableMigrations = [
    '001_initial_schema.sql',
    '002_storage_buckets.sql'
  ];

  return json({
    migrationsExist,
    appliedMigrations,
    availableMigrations,
    pendingMigrations: availableMigrations.filter(m => !appliedMigrations.includes(m))
  });
}

export async function action(args: ActionFunctionArgs) {
  const formData = await args.request.formData();
  const action = formData.get('action');

  if (action === 'create_migrations_table') {
    try {
      await db.client.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `
      });

      return json({ success: true, message: 'Migrations table created successfully' });
    } catch (error) {
      return json({ success: false, error: error.message });
    }
  }

  if (action === 'apply_migrations') {
    try {
      // Apply initial schema migration
      const initialSchemaSql = `
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Create migrations table first
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          clerk_user_id TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          full_name TEXT,
          avatar_url TEXT,
          
          -- Subscription info
          subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
          subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'paused')),
          stripe_customer_id TEXT UNIQUE,
          stripe_subscription_id TEXT,
          subscription_starts_at TIMESTAMPTZ,
          subscription_ends_at TIMESTAMPTZ,
          
          -- Usage limits
          projects_created INTEGER NOT NULL DEFAULT 0,
          ai_generations_count INTEGER NOT NULL DEFAULT 0,
          storage_used_bytes BIGINT NOT NULL DEFAULT 0,
          
          -- Metadata
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_login_at TIMESTAMPTZ,
          metadata JSONB DEFAULT '{}'::jsonb
        );

        -- Create indexes for users table
        CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
        CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
        CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

        -- Projects table
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- Project details
          name TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
          thumbnail_url TEXT,
          
          -- Project metadata
          screen_count INTEGER NOT NULL DEFAULT 0,
          total_prompts INTEGER NOT NULL DEFAULT 0,
          last_opened_at TIMESTAMPTZ,
          
          -- Canvas state (stores zoom, pan, positions)
          canvas_state JSONB DEFAULT '{}'::jsonb,
          
          -- Timestamps
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          
          -- Additional metadata
          metadata JSONB DEFAULT '{}'::jsonb,
          tags TEXT[] DEFAULT ARRAY[]::TEXT[]
        );

        -- Create indexes for projects table
        CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
        CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_projects_last_opened ON projects(last_opened_at DESC NULLS LAST);
        CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);

        -- Helper functions
        CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
        RETURNS TABLE(
          max_projects INTEGER,
          max_ai_generations INTEGER,
          max_storage_gb INTEGER,
          can_export_figma BOOLEAN
        ) AS $$
        DECLARE
          v_tier TEXT;
        BEGIN
          SELECT subscription_tier INTO v_tier FROM users WHERE id = p_user_id;
          
          CASE v_tier
            WHEN 'free' THEN
              RETURN QUERY SELECT 5, 100, 1, FALSE;
            WHEN 'pro' THEN
              RETURN QUERY SELECT 50, 10000, 50, TRUE;
            WHEN 'enterprise' THEN
              RETURN QUERY SELECT 999999, 999999, 1000, TRUE;
            ELSE
              RETURN QUERY SELECT 5, 100, 1, FALSE;
          END CASE;
        END;
        $$ LANGUAGE plpgsql;

        -- Function to check if user can create project
        CREATE OR REPLACE FUNCTION can_create_project(p_user_id UUID)
        RETURNS BOOLEAN AS $$
        DECLARE
          v_current_count INTEGER;
          v_max_projects INTEGER;
        BEGIN
          SELECT projects_created INTO v_current_count FROM users WHERE id = p_user_id;
          SELECT max_projects INTO v_max_projects FROM get_user_limits(p_user_id);
          
          RETURN v_current_count < v_max_projects;
        END;
        $$ LANGUAGE plpgsql;

        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('001_initial_schema.sql') ON CONFLICT DO NOTHING;
      `;

      // Execute the migration
      const { error } = await db.client.rpc('exec_sql', { sql: initialSchemaSql });

      if (error) {
        throw error;
      }

      return json({ 
        success: true, 
        message: 'Initial schema migration applied successfully! Users table created.' 
      });
    } catch (error) {
      return json({ success: false, error: error.message });
    }
  }

  return json({ success: false, error: 'Invalid action' });
}

export default function AdminMigrate() {
  const { migrationsExist, appliedMigrations, availableMigrations, pendingMigrations } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-bolt-elements-background-depth-1 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-8">
          🗄️ Database Migration Runner
        </h1>

        {actionData && (
          <div className={`mb-6 p-4 rounded-lg ${
            actionData.success 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <h3 className="font-medium mb-2">
              {actionData.success ? '✅ Success' : '❌ Error'}
            </h3>
            <p className="text-sm">
              {actionData.success ? actionData.message : actionData.error}
            </p>
          </div>
        )}

        {/* Migration Status */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Migration Status
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-bolt-elements-textSecondary">Migrations Table:</span>
              <span className={migrationsExist ? "text-green-600" : "text-red-600"}>
                {migrationsExist ? "✅ Exists" : "❌ Missing"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-bolt-elements-textSecondary">Applied Migrations:</span>
              <span className="text-bolt-elements-textPrimary">
                {appliedMigrations.length} / {availableMigrations.length}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-bolt-elements-textSecondary">Pending Migrations:</span>
              <span className={pendingMigrations.length > 0 ? "text-yellow-600" : "text-green-600"}>
                {pendingMigrations.length > 0 ? `⚠️ ${pendingMigrations.length} pending` : "✅ Up to date"}
              </span>
            </div>
          </div>
        </div>

        {/* Available Migrations */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Available Migrations
          </h2>
          
          <div className="space-y-2">
            {availableMigrations.map((migration) => (
              <div key={migration} className="flex justify-between items-center p-3 bg-bolt-elements-background-depth-1 rounded">
                <span className="text-bolt-elements-textPrimary font-mono text-sm">{migration}</span>
                <span className={appliedMigrations.includes(migration) ? "text-green-600" : "text-yellow-600"}>
                  {appliedMigrations.includes(migration) ? "✅ Applied" : "⏳ Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Actions
          </h2>
          
          <div className="space-y-4">
            {!migrationsExist && (
              <Form method="post">
                <input type="hidden" name="action" value="create_migrations_table" />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  📋 Create Migrations Table
                </button>
              </Form>
            )}

            {pendingMigrations.length > 0 && (
              <div>
                <Form method="post">
                  <input type="hidden" name="action" value="apply_migrations" />
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    🚀 Apply Pending Migrations
                  </button>
                </Form>
                <p className="text-bolt-elements-textSecondary text-sm mt-2">
                  This will create the users table and other required database structures.
                </p>
              </div>
            )}

            {pendingMigrations.length === 0 && migrationsExist && (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium">✅ All migrations are up to date!</p>
                <p className="text-bolt-elements-textSecondary text-sm mt-2">
                  Your database schema is ready. Users should now sync properly.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Manual SQL Option */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Manual Migration (Alternative)
          </h2>
          
          <p className="text-bolt-elements-textSecondary mb-4">
            If the automatic migration doesn't work, you can manually run the SQL in your Supabase dashboard:
          </p>
          
          <ol className="text-bolt-elements-textSecondary text-sm space-y-2 mb-4">
            <li>1. Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
            <li>2. Navigate to SQL Editor</li>
            <li>3. Copy and paste the migration files from <code>supabase/migrations/</code></li>
            <li>4. Run them in order: 001_initial_schema.sql, then 002_storage_buckets.sql</li>
          </ol>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Important</h4>
            <p className="text-yellow-700 text-sm">
              After running migrations, test the user sync at <a href="/debug/user-sync" className="underline">/debug/user-sync</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}