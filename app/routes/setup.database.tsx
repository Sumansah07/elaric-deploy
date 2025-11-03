/**
 * Database Setup Page
 * Simple setup for creating the users table
 */

import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { Form, useActionData } from '@remix-run/react';
import { db } from '~/lib/database/supabase.server';

export async function action(args: ActionFunctionArgs) {
  const formData = await args.request.formData();
  const action = formData.get('action');

  if (action === 'create_users_table') {
    try {
      // Try to create the users table directly using individual queries
      console.log('Creating users table...');

      // First, enable UUID extension
      try {
        await db.client.rpc('create_extension_if_not_exists', { extension_name: 'uuid-ossp' });
      } catch (error) {
        console.log('UUID extension might already exist:', error.message);
      }

      // Create users table using a simple INSERT approach to test if it exists
      const { error: testError } = await db.client
        .from('users')
        .select('id')
        .limit(1);

      if (testError && testError.code === '42P01') {
        // Table doesn't exist, we need to create it manually
        return json({ 
          success: false, 
          error: 'Users table does not exist. Please create it manually using the SQL provided below.',
          needsManualSetup: true
        });
      } else if (testError) {
        return json({ 
          success: false, 
          error: `Database error: ${testError.message}` 
        });
      } else {
        // Table exists!
        return json({ 
          success: true, 
          message: 'Users table already exists and is accessible!' 
        });
      }

    } catch (error) {
      return json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  if (action === 'test_connection') {
    try {
      // Test basic connection
      const { data, error } = await db.client
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error) {
        return json({ 
          success: false, 
          error: `Connection test failed: ${error.message}`,
          needsManualSetup: error.code === '42P01'
        });
      }

      return json({ 
        success: true, 
        message: `Connection successful! Found ${data?.length || 0} users in database.` 
      });
    } catch (error) {
      return json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  return json({ success: false, error: 'Invalid action' });
}

export default function SetupDatabase() {
  const actionData = useActionData<typeof action>();

  const createTableSQL = `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
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

-- Helper function to get user limits
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
$$ LANGUAGE plpgsql;`;

  return (
    <div className="min-h-screen bg-bolt-elements-background-depth-1 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-8">
          🛠️ Database Setup
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

        {/* Quick Test */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Quick Test
          </h2>
          
          <p className="text-bolt-elements-textSecondary mb-4">
            Test if the users table exists and is accessible:
          </p>

          <Form method="post">
            <input type="hidden" name="action" value="test_connection" />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🧪 Test Database Connection
            </button>
          </Form>
        </div>

        {/* Manual Setup Instructions */}
        {(actionData?.needsManualSetup || !actionData) && (
          <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
              Manual Database Setup
            </h2>
            
            <p className="text-bolt-elements-textSecondary mb-4">
              Since automatic setup isn't available, please follow these steps:
            </p>

            <ol className="text-bolt-elements-textSecondary space-y-2 mb-6">
              <li>1. Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
              <li>2. Select your project</li>
              <li>3. Navigate to <strong>SQL Editor</strong></li>
              <li>4. Copy the SQL below and paste it into the editor</li>
              <li>5. Click <strong>Run</strong> to execute the SQL</li>
              <li>6. Come back here and click "Test Database Connection"</li>
            </ol>

            <div className="bg-bolt-elements-background-depth-1 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-bolt-elements-textPrimary">SQL to Run:</h4>
                <button
                  onClick={() => navigator.clipboard.writeText(createTableSQL)}
                  className="text-blue-600 hover:text-blue-700 text-sm underline"
                >
                  📋 Copy to Clipboard
                </button>
              </div>
              <pre className="text-xs text-bolt-elements-textSecondary overflow-auto max-h-64 bg-gray-900 text-green-400 p-3 rounded">
                {createTableSQL}
              </pre>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">💡 Pro Tip</h4>
              <p className="text-yellow-700 text-sm">
                After running the SQL, test the connection above. If successful, users will automatically sync when they sign up!
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {actionData?.success && !actionData?.needsManualSetup && (
          <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
              🎉 Database Ready!
            </h2>
            
            <p className="text-bolt-elements-textSecondary mb-4">
              Your database is set up correctly. Next steps:
            </p>

            <div className="space-y-3">
              <a
                href="/debug/user-sync"
                className="block w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-center"
              >
                🔄 Test User Sync
              </a>
              
              <a
                href="/test-auth"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-center"
              >
                🔐 Test Authentication
              </a>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Don't Forget:</h4>
                <p className="text-blue-700 text-sm">
                  Configure your Clerk webhook at <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="underline">dashboard.clerk.com</a> 
                  with URL: <code>http://localhost:5173/api/webhooks/clerk</code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}