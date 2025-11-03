/**
 * Settings Page
 * User account and application settings
 */

import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { useUser, useClerk } from '@clerk/remix';
import { useState } from 'react';
import { getAuthenticatedUser } from '~/lib/auth/clerk.server';
import { SubscriptionModal } from '~/components/billing/SubscriptionModal';
import { UsageProgressBar } from '~/components/billing/UsageLimitWarning';

export const meta: MetaFunction = () => {
  return [
    { title: 'Settings - Elaric AI' },
    { name: 'description', content: 'Manage your account settings and preferences' },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await getAuthenticatedUser({ request } as any);
    return json({ user });
  } catch (error) {
    // Redirect to login if not authenticated
    throw new Response('Unauthorized', { status: 401 });
  }
};

export default function SettingsPage() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const loaderData = useLoaderData<typeof loader>();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  if (!user) {
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
    <div className="min-h-screen bg-bolt-elements-background-depth-1">
      {/* Header */}
      <header className="bg-bolt-elements-background-depth-2 shadow-sm border-b border-bolt-elements-borderColor">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
              >
                <div className="i-ph:arrow-left text-xl" />
              </a>
              <h1 className="text-xl font-semibold text-bolt-elements-textPrimary">
                Settings
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Account Settings */}
          <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">
              Account Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-bolt-elements-textPrimary">Profile Information</h3>
                  <p className="text-sm text-bolt-elements-textSecondary">
                    Update your name, email, and profile picture
                  </p>
                </div>
                <button
                  onClick={() => openUserProfile()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Subscription Settings */}
          <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">
              Subscription & Billing
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-bolt-elements-textPrimary">Current Plan</h3>
                  <p className="text-sm text-bolt-elements-textSecondary">
                    You're currently on the{' '}
                    <span className="font-medium capitalize">
                      {loaderData.user.subscriptionTier}
                    </span>{' '}
                    plan
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {loaderData.user.subscriptionTier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                  </button>
                </div>
              </div>

              {/* Usage Overview */}
              <div className="border-t border-bolt-elements-borderColor pt-6">
                <h4 className="font-medium text-bolt-elements-textPrimary mb-4">Usage Overview</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <UsageProgressBar
                      label="Projects"
                      used={0} // Will be loaded from API
                      max={loaderData.user.subscriptionTier === 'pro' ? 50 : 5}
                    />
                  </div>
                  <div className="space-y-2">
                    <UsageProgressBar
                      label="AI Generations"
                      used={0} // Will be loaded from API
                      max={loaderData.user.subscriptionTier === 'pro' ? 1000 : 100}
                    />
                  </div>
                  <div className="space-y-2">
                    <UsageProgressBar
                      label="Storage"
                      used={0} // Will be loaded from API
                      max={loaderData.user.subscriptionTier === 'pro' ? 10 : 1}
                      unit=" GB"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">
              Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-bolt-elements-textPrimary">Email Notifications</h3>
                  <p className="text-sm text-bolt-elements-textSecondary">
                    Receive updates about your projects and account
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-bolt-elements-textPrimary">Auto-save Projects</h3>
                  <p className="text-sm text-bolt-elements-textSecondary">
                    Automatically save your work as you build
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-4">
              Danger Zone
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-red-800 dark:text-red-200">Delete Account</h3>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                      // Handle account deletion
                      alert('Account deletion is not implemented yet.');
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        currentTier={loaderData.user.subscriptionTier}
      />
    </div>
  );
}