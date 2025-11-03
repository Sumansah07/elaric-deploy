/**
 * Debug Supabase Connection
 * Tests the Supabase connection and database schema
 */

import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/lib/database/supabase.server';

export async function loader(args: LoaderFunctionArgs) {
  const results = {
    connection: { status: 'unknown', error: null },
    tables: { status: 'unknown', error: null, data: null },
    users: { status: 'unknown', error: null, count: 0 },
    environment: {
      supabaseUrl: process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    }
  };

  // Test basic connection
  try {
    const { data, error } = await db.client
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      results.connection = { status: 'error', error: error.message };
    } else {
      results.connection = { status: 'success', error: null };
      results.users = { status: 'success', error: null, count: data?.length || 0 };
    }
  } catch (error) {
    results.connection = { status: 'error', error: error.message };
  }

  // Test table structure
  try {
    const { data, error } = await db.client
      .rpc('get_table_info', { table_name: 'users' });
    
    if (error) {
      results.tables = { status: 'error', error: error.message, data: null };
    } else {
      results.tables = { status: 'success', error: null, data };
    }
  } catch (error) {
    // Fallback: try to describe the users table
    try {
      const { data, error: selectError } = await db.client
        .from('users')
        .select('*')
        .limit(1);
      
      if (selectError) {
        results.tables = { status: 'error', error: selectError.message, data: null };
      } else {
        results.tables = { status: 'partial', error: 'Could not get full schema info', data: data?.[0] || {} };
      }
    } catch (fallbackError) {
      results.tables = { status: 'error', error: fallbackError.message, data: null };
    }
  }

  return json(results);
}

export default function DebugSupabase() {
  const { connection, tables, users, environment } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-bolt-elements-background-depth-1 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-8">
          🗄️ Supabase Debug
        </h1>

        {/* Environment Variables */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Environment Variables
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-bolt-elements-textSecondary">VITE_SUPABASE_URL:</span>
              <span className={environment.supabaseUrl === 'SET' ? "text-green-600" : "text-red-600"}>
                {environment.supabaseUrl === 'SET' ? "✅ SET" : "❌ MISSING"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-bolt-elements-textSecondary">SUPABASE_SERVICE_ROLE_KEY:</span>
              <span className={environment.serviceKey === 'SET' ? "text-green-600" : "text-red-600"}>
                {environment.serviceKey === 'SET' ? "✅ SET" : "❌ MISSING"}
              </span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Connection Status
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-bolt-elements-textSecondary">Database Connection:</span>
              <span className={connection.status === 'success' ? "text-green-600" : "text-red-600"}>
                {connection.status === 'success' ? "✅ Connected" : "❌ Failed"}
              </span>
            </div>

            {connection.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Connection Error:</h4>
                <p className="text-red-700 text-sm">{connection.error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-bolt-elements-textSecondary">Users Table:</span>
              <span className={users.status === 'success' ? "text-green-600" : "text-red-600"}>
                {users.status === 'success' ? `✅ ${users.count} users` : "❌ Error"}
              </span>
            </div>

            {users.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Users Table Error:</h4>
                <p className="text-red-700 text-sm">{users.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Table Schema */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Table Schema
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-bolt-elements-textSecondary">Schema Info:</span>
              <span className={tables.status === 'success' ? "text-green-600" : tables.status === 'partial' ? "text-yellow-600" : "text-red-600"}>
                {tables.status === 'success' ? "✅ Available" : tables.status === 'partial' ? "⚠️ Partial" : "❌ Error"}
              </span>
            </div>

            {tables.error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Schema Warning:</h4>
                <p className="text-yellow-700 text-sm">{tables.error}</p>
              </div>
            )}

            {tables.data && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Sample Data Structure:</h4>
                <pre className="text-green-700 text-xs overflow-auto max-h-64">
                  {JSON.stringify(tables.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Troubleshooting
          </h2>
          
          <div className="space-y-4">
            {environment.supabaseUrl === 'MISSING' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Missing Supabase URL</h4>
                <p className="text-red-700 text-sm">
                  Add VITE_SUPABASE_URL to your .env file with your Supabase project URL.
                </p>
              </div>
            )}

            {environment.serviceKey === 'MISSING' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Missing Service Role Key</h4>
                <p className="text-red-700 text-sm">
                  Add SUPABASE_SERVICE_ROLE_KEY to your .env file with your service role key.
                </p>
              </div>
            )}

            {connection.status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Connection Failed</h4>
                <p className="text-red-700 text-sm mb-2">
                  Check that your Supabase project is running and the credentials are correct.
                </p>
                <ul className="text-red-700 text-sm space-y-1">
                  <li>• Verify the project URL is correct</li>
                  <li>• Check that the service role key is valid</li>
                  <li>• Ensure the project isn't paused</li>
                </ul>
              </div>
            )}

            {users.status === 'error' && connection.status === 'success' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Users Table Issue</h4>
                <p className="text-yellow-700 text-sm mb-2">
                  The database connection works, but there's an issue with the users table.
                </p>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Run the database migrations</li>
                  <li>• Check that the users table exists</li>
                  <li>• Verify the table schema matches expectations</li>
                </ul>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
              <ol className="text-blue-700 text-sm space-y-1">
                <li>1. Fix any environment variable issues above</li>
                <li>2. Ensure your Supabase database schema is set up</li>
                <li>3. Test user sync at <a href="/debug/user-sync" className="underline">/debug/user-sync</a></li>
                <li>4. Check webhook configuration in Clerk dashboard</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}