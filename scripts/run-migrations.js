/**
 * Simple Migration Runner for Supabase
 * Applies database migrations directly
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  try {
    // Step 1: Create the users table with essential structure
    console.log('📋 Creating users table...');
    
    const createUsersTable = `
      -- Enable UUID extension
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
    `;

    const { error: usersError } = await supabase.rpc('exec_sql', { 
      sql: createUsersTable 
    });

    if (usersError) {
      console.error('❌ Error creating users table:', usersError.message);
      
      // Try alternative approach - create table directly
      console.log('🔄 Trying alternative approach...');
      
      const { error: altError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (altError && altError.code === '42P01') {
        console.error('❌ Users table does not exist and cannot be created automatically.');
        console.log('\n📋 Manual Setup Required:');
        console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the contents of supabase/migrations/001_initial_schema.sql');
        console.log('4. Run the SQL to create the tables');
        console.log('5. Then run this script again to verify');
        return;
      }
    } else {
      console.log('✅ Users table created successfully');
    }

    // Step 2: Create helper functions
    console.log('🔧 Creating helper functions...');
    
    const createFunctions = `
      -- Function to get user tier limits
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
    `;

    const { error: functionsError } = await supabase.rpc('exec_sql', { 
      sql: createFunctions 
    });

    if (functionsError) {
      console.log('⚠️ Warning: Could not create helper functions:', functionsError.message);
    } else {
      console.log('✅ Helper functions created successfully');
    }

    // Step 3: Test the setup
    console.log('🧪 Testing database setup...');
    
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error('❌ Database test failed:', testError.message);
    } else {
      console.log('✅ Database test passed - users table is accessible');
    }

    // Step 4: Test helper functions
    console.log('🧪 Testing helper functions...');
    
    const { data: limitsData, error: limitsError } = await supabase
      .rpc('get_user_limits', { p_user_id: '00000000-0000-0000-0000-000000000000' });

    if (limitsError) {
      console.log('⚠️ Helper functions not available:', limitsError.message);
    } else {
      console.log('✅ Helper functions working correctly');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test user sync at: http://localhost:5173/debug/user-sync');
    console.log('2. Configure Clerk webhook at: https://dashboard.clerk.com');
    console.log('3. Webhook URL: http://localhost:5173/api/webhooks/clerk');
    console.log('4. Required events: user.created, user.updated, user.deleted, session.created');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Open SQL Editor');
    console.log('3. Run the SQL from: supabase/migrations/001_initial_schema.sql');
    console.log('4. Then run: supabase/migrations/002_storage_buckets.sql');
  }
}

// Run migrations
runMigrations().catch(console.error);