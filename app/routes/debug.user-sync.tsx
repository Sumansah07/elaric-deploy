/**
 * Debug User Sync Page
 * Helps debug why users aren't being synced to Supabase
 */

import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData, Form } from '@remix-run/react';
import { useUser } from '@clerk/remix';
import { getOptionalAuth, getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { db } from '~/lib/database/supabase.server';

export async function loader(args: LoaderFunctionArgs) {
  const clerkUserId = await getOptionalAuth(args);
  
  if (!clerkUserId) {
    return json({ 
      authenticated: false, 
      clerkUserId: null, 
      supabaseUser: null,
      error: null 
    });
  }

  try {
    // Try to get user from Supabase
    let supabaseUser = null;
    let supabaseError = null;
    
    try {
      supabaseUser = await db.getUserByClerkId(clerkUserId);
    } catch (error) {
      supabaseError = error.message;
    }

    return json({
      authenticated: true,
      clerkUserId,
      supabaseUser,
      supabaseError,
    });
  } catch (error) {
    return json({
      authenticated: true,
      clerkUserId,
      supabaseUser: null,
      error: error.message,
    });
  }
}

export async function action(args: LoaderFunctionArgs) {
  const formData = await args.request.formData();
  const action = formData.get('action');

  if (action === 'sync') {
    try {
      const user = await getAuthenticatedUser(args);
      return json({ 
        success: true, 
        message: 'User synced successfully',
        user 
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

export default function DebugUserSync() {
  const { authenticated, clerkUserId, supabaseUser, supabaseError, error } = useLoaderData<typeof loader>();
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bolt-elements-background-depth-1">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-bolt-elements-textSecondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bolt-elements-background-depth-1 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-8">
          🔍 User Sync Debug
        </h1>

        {/* Authentication Status */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Authentication Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-bolt-elements-textPrimary mb-2">Client-Side (Clerk)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-bolt-elements-textSecondary">Loaded:</span>
                  <span className={isLoaded ? "text-green-600" : "text-red-600"}>
                    {isLoaded ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bolt-elements-textSecondary">Signed In:</span>
                  <span className={isSignedIn ? "text-green-600" : "text-red-600"}>
                    {isSignedIn ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
                {clerkUser && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-bolt-elements-textSecondary">User ID:</span>
                      <span className="text-bolt-elements-textPrimary text-xs">{clerkUser.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bolt-elements-textSecondary">Email:</span>
                      <span className="text-bolt-elements-textPrimary text-xs">
                        {clerkUser.emailAddresses[0]?.emailAddress}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-bolt-elements-textPrimary mb-2">Server-Side</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-bolt-elements-textSecondary">Authenticated:</span>
                  <span className={authenticated ? "text-green-600" : "text-red-600"}>
                    {authenticated ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
                {clerkUserId && (
                  <div className="flex justify-between">
                    <span className="text-bolt-elements-textSecondary">Clerk ID:</span>
                    <span className="text-bolt-elements-textPrimary text-xs">{clerkUserId}</span>
                  </div>
                )}
                {error && (
                  <div className="text-red-600 text-xs">
                    Error: {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Supabase Sync Status */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Supabase Sync Status
          </h2>

          {authenticated ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-bolt-elements-textSecondary">User in Supabase:</span>
                <span className={supabaseUser ? "text-green-600" : "text-red-600"}>
                  {supabaseUser ? "✅ Found" : "❌ Not Found"}
                </span>
              </div>

              {supabaseError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Supabase Error:</h4>
                  <p className="text-red-700 text-sm">{supabaseError}</p>
                </div>
              )}

              {supabaseUser && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Supabase User Data:</h4>
                  <pre className="text-green-700 text-xs overflow-auto">
                    {JSON.stringify(supabaseUser, null, 2)}
                  </pre>
                </div>
              )}

              {!supabaseUser && !supabaseError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">User Not Synced</h4>
                  <p className="text-yellow-700 text-sm mb-4">
                    The user exists in Clerk but not in Supabase. This could happen if:
                  </p>
                  <ul className="text-yellow-700 text-sm space-y-1 mb-4">
                    <li>• The webhook isn't configured properly</li>
                    <li>• The user was created before webhooks were set up</li>
                    <li>• There was an error during the sync process</li>
                  </ul>
                  
                  <Form method="post">
                    <input type="hidden" name="action" value="sync" />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      🔄 Manually Sync User
                    </button>
                  </Form>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-bolt-elements-textSecondary mb-4">
                Please sign in to check Supabase sync status
              </p>
              <a
                href="/test-auth"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Go to Authentication Test
              </a>
            </div>
          )}
        </div>

        {/* Webhook Debug Info */}
        <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">
            Webhook Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-bolt-elements-textPrimary mb-2">Expected Webhook URL:</h4>
              <code className="bg-bolt-elements-background-depth-1 px-3 py-2 rounded text-sm text-bolt-elements-textPrimary block">
                {typeof window !== 'undefined' ? window.location.origin : '[YOUR_DOMAIN]'}/api/webhooks/clerk
              </code>
            </div>
            
            <div>
              <h4 className="font-medium text-bolt-elements-textPrimary mb-2">Required Events:</h4>
              <ul className="text-bolt-elements-textSecondary text-sm space-y-1">
                <li>• user.created</li>
                <li>• user.updated</li>
                <li>• user.deleted</li>
                <li>• session.created</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Setup Instructions:</h4>
              <ol className="text-blue-700 text-sm space-y-1">
                <li>1. Go to <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="underline">Clerk Dashboard</a></li>
                <li>2. Navigate to Webhooks section</li>
                <li>3. Add the webhook URL above</li>
                <li>4. Select the required events</li>
                <li>5. Make sure the webhook secret matches your .env file</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}