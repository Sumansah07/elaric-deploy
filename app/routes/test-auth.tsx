/**
 * Test Authentication Page
 * Simple page to test Clerk authentication integration
 */

import { useUser, SignInButton, SignUpButton } from '@clerk/remix';

export default function TestAuth() {
  const { user, isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bolt-elements-background-depth-1">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-bolt-elements-textSecondary">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bolt-elements-background-depth-1">
      <div className="max-w-md w-full bg-bolt-elements-background-depth-2 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-bolt-elements-textPrimary mb-6 text-center">
          Authentication Test
        </h1>

        {isSignedIn ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || 'User'}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="text-white text-xl font-bold">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">
              ✅ Authentication Working!
            </h2>
            
            <div className="space-y-2 text-left bg-bolt-elements-background-depth-1 rounded-lg p-4 mb-4">
              <div className="flex justify-between">
                <span className="text-bolt-elements-textSecondary">Name:</span>
                <span className="text-bolt-elements-textPrimary">{user.fullName || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bolt-elements-textSecondary">Email:</span>
                <span className="text-bolt-elements-textPrimary">
                  {user.emailAddresses[0]?.emailAddress || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-bolt-elements-textSecondary">User ID:</span>
                <span className="text-bolt-elements-textPrimary text-xs">{user.id}</span>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href="/dashboard"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-center"
              >
                Go to Dashboard
              </a>
              <a
                href="/"
                className="block w-full bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor py-2 px-4 rounded-lg font-medium transition-colors text-center"
              >
                Back to Home
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="i-ph:user text-2xl text-white" />
            </div>
            
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">
              Not Signed In
            </h2>
            
            <p className="text-bolt-elements-textSecondary mb-6">
              Sign in to test the authentication system
            </p>

            <div className="space-y-3">
              <SignInButton mode="modal">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
                  Sign In
                </button>
              </SignInButton>
              
              <SignUpButton mode="modal">
                <button className="w-full bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor py-2 px-4 rounded-lg font-medium transition-colors">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}