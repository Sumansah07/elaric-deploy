/**
 * Dashboard route - protected page for authenticated users using Clerk
 */

import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { useUser, useClerk } from '@clerk/remix';
import { useAuthContext } from '~/lib/auth/auth-provider';
import { getAuthenticatedUser, checkUsageLimits } from '~/lib/auth/clerk.server';
import { db } from '~/lib/database/supabase.server';
import { SubscriptionModal } from '~/components/billing/SubscriptionModal';
import { UsageLimitWarning, UsageProgressBar } from '~/components/billing/UsageLimitWarning';
import { FloatingPathsBackground } from '~/components/ui/floating-paths-background';
import { Button } from '~/components/ui/button-shadcn';
import { useState } from 'react';

export const meta: MetaFunction = () => {
  return [{ title: 'Dashboard - Elaric AI' }, { name: 'description', content: 'Your Elaric AI dashboard' }];
};

export const loader = async (args: LoaderFunctionArgs) => {
  try {
    // Get authenticated user and sync with Supabase
    const user = await getAuthenticatedUser(args);

    // Get usage limits
    const limits = await checkUsageLimits(args);

    // Get user's recent projects
    let projects = [];
    let actualProjectCount = 0;
    if (user.supabaseUserId) {
      try {
        projects = await db.getUserProjects(user.supabaseUserId, 6); // Get 6 most recent
        actualProjectCount = projects.length;
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    }

    return json({
      user: {
        clerkUserId: user.clerkUserId,
        supabaseUserId: user.supabaseUserId,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
      },
      limits: {
        ...limits,
        projectsCreated: actualProjectCount, // Use actual count from projects table
      },
      projects,
    });
  } catch (error) {
    console.error('Dashboard loader error:', error);
    // Return minimal data if there's an error
    return json({
      user: null,
      limits: null,
      projects: [],
    });
  }
};

export default function DashboardPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { user: authUser, usageLimits } = useAuthContext();
  const loaderData = useLoaderData<typeof loader>();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Check for successful upgrade and sync subscription
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success' && !syncing) {
      setSyncing(true);
      fetch('/api/billing/sync-subscription', {
        method: 'POST',
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log('✅ Subscription synced:', data.tier);
            // Reload page to show updated subscription
            window.location.href = '/dashboard';
          } else {
            console.error('Failed to sync subscription:', data);
          }
        })
        .catch((error) => {
          console.error('Error syncing subscription:', error);
        })
        .finally(() => {
          setSyncing(false);
        });
    }
  });

  // Show loading while Clerk is initializing
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

  // Redirect to home if not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bolt-elements-background-depth-1">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-bolt-elements-textPrimary mb-4">Access Denied</h2>
          <p className="text-bolt-elements-textSecondary mb-6">You need to be signed in to access the dashboard.</p>
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bolt-elements-background-depth-1 relative">
      {/* Floating Paths Background */}
      <FloatingPathsBackground className="opacity-20" />

      {/* Header */}
      <header className="bg-bolt-elements-background-depth-2 shadow-sm border-b border-bolt-elements-borderColor relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1
                className="text-xl font-semibold text-bolt-elements-textPrimary cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.location.href = '/'}
              >
                Elaric AI Dashboard
              </h1>

            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || user.emailAddresses[0]?.emailAddress || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {user?.fullName
                        ? user.fullName.charAt(0).toUpperCase()
                        : user?.emailAddresses[0]?.emailAddress?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-bolt-elements-textPrimary">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-bolt-elements-textSecondary">{user?.emailAddresses[0]?.emailAddress}</p>
                </div>
              </div>

              <Button onClick={() => signOut()} variant="destructive" size="default">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="rounded-lg p-8">
            <div className="text-center">
              <div className="i-ph:user-circle text-6xl text-bolt-elements-textSecondary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-bolt-elements-textPrimary mb-2">Welcome to Elaric AI!</h2>
              <p className="text-bolt-elements-textSecondary mb-6">
                You're successfully authenticated and ready to start building.
              </p>

              {/* Usage Limit Warnings */}
              <div className="space-y-4 mb-8 max-w-4xl mx-auto">
                <UsageLimitWarning limitType="projects" onUpgrade={() => setShowSubscriptionModal(true)} />
                <UsageLimitWarning limitType="ai_generations" onUpgrade={() => setShowSubscriptionModal(true)} />
                <UsageLimitWarning limitType="storage" onUpgrade={() => setShowSubscriptionModal(true)} />
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
                {/* Projects Card */}
                <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-bolt-elements-textSecondary">Projects</p>
                      <p className="text-2xl font-bold text-bolt-elements-textPrimary">
                        {loaderData.limits?.projectsCreated || 0}
                      </p>
                    </div>
                    <div className="i-ph:folder text-3xl text-blue-600" />
                  </div>
                  <div className="mt-2">
                    <UsageProgressBar
                      label=""
                      used={loaderData.limits?.projectsCreated || 0}
                      max={loaderData.limits?.maxProjects || 5}
                    />
                  </div>
                </div>

                {/* Screens Created Card */}
                <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-bolt-elements-textSecondary">Screens Created</p>
                      <p className="text-2xl font-bold text-bolt-elements-textPrimary">
                        {loaderData.limits?.aiGenerationsCount || 0}
                      </p>
                    </div>
                    <div className="i-ph:devices text-3xl text-green-600" />
                  </div>
                  <div className="mt-2">
                    <UsageProgressBar
                      label=""
                      used={loaderData.limits?.aiGenerationsCount || 0}
                      max={loaderData.limits?.maxAiGenerations || 100}
                    />
                  </div>
                </div>

                {/* Storage Card */}
                <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-bolt-elements-textSecondary">Storage</p>
                      <p className="text-2xl font-bold text-bolt-elements-textPrimary">
                        {loaderData.limits?.storageUsedGB || '0.00'} GB
                      </p>
                    </div>
                    <div className="i-ph:hard-drive text-3xl text-purple-600" />
                  </div>
                  <div className="mt-2">
                    <UsageProgressBar
                      label=""
                      used={parseFloat(loaderData.limits?.storageUsedGB || '0')}
                      max={loaderData.limits?.maxStorageGB || 1}
                      unit=" GB"
                    />
                  </div>
                </div>
              </div>

              {/* User Info Card */}
              <div className="bg-bolt-elements-background-depth-2 rounded-lg p-6 max-w-md mx-auto mb-8">
                <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-4">Account Information</h3>
                <div className="space-y-3 text-left">
                  <div className="flex justify-between">
                    <span className="text-bolt-elements-textSecondary">Name:</span>
                    <span className="text-bolt-elements-textPrimary font-medium">
                      {user?.fullName || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bolt-elements-textSecondary">Email:</span>
                    <span className="text-bolt-elements-textPrimary font-medium">
                      {user?.emailAddresses[0]?.emailAddress}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bolt-elements-textSecondary">Subscription:</span>
                    <span
                      className={`font-medium capitalize ${loaderData.user?.subscriptionTier === 'pro' ? 'text-yellow-600' : 'text-blue-600'
                        }`}
                    >
                      {loaderData.user?.subscriptionTier || 'free'}
                      {loaderData.user?.subscriptionTier === 'pro' && <span className="ml-1 text-xs">✨</span>}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bolt-elements-textSecondary">Status:</span>
                    <span
                      className={`font-medium capitalize ${loaderData.user?.subscriptionStatus === 'active' ? 'text-green-600' : 'text-red-600'
                        }`}
                    >
                      {loaderData.user?.subscriptionStatus || 'active'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bolt-elements-textSecondary">Plan:</span>
                    <Button
                      onClick={() => setShowSubscriptionModal(true)}
                      variant="solid"
                      size="sm"
                      className="bg-black text-white hover:bg-gray-900 font-medium text-sm px-4 py-2 rounded-md transition-colors duration-200"
                    >
                      {loaderData.user?.subscriptionTier === 'pro' ? 'Manage Plan' : 'Upgrade Plan'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recent Projects */}
              {loaderData.projects && loaderData.projects.length > 0 && (
                <div className="max-w-4xl mx-auto">
                  <h3 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4 text-left">
                    Recent Projects
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loaderData.projects.map((project: any) => (
                      <a
                        key={project.id}
                        href={`/chat/${project.id}`}
                        className="bg-bolt-elements-background-depth-2 rounded-lg p-4 hover:bg-bolt-elements-background-depth-3 transition-colors cursor-pointer block"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-bolt-elements-textPrimary truncate">{project.name}</h4>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}
                          >
                            {project.status}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-sm text-bolt-elements-textSecondary mb-3 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-bolt-elements-textSecondary">
                          <span>
                            {project.last_opened_at
                              ? `Opened ${new Date(project.last_opened_at).toLocaleDateString()}`
                              : `Created ${new Date(project.created_at).toLocaleDateString()}`}
                          </span>
                          <div className="i-ph:arrow-right" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={async () => {
                    const name = prompt('Enter project name:');
                    if (name) {
                      try {
                        const response = await fetch('/api/projects/create', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name }),
                        });

                        if (response.ok) {
                          window.location.reload();
                        } else {
                          const error = await response.json();
                          alert(error.error || 'Failed to create project');
                        }
                      } catch (error) {
                        alert('Failed to create project');
                      }
                    }
                  }}
                  disabled={!loaderData.limits?.canCreateProject}
                  variant="solid"
                  size="lg"
                  className="bg-black hover:bg-black/90 text-white"
                >
                  Create Project
                </Button>
                <Button
                  onClick={() => openUserProfile()}
                  variant="solid"
                  size="lg"
                  className="bg-black hover:bg-black/90 text-white"
                >
                  Edit Profile
                </Button>
                <Button
                  asChild
                  variant="solid"
                  size="lg"
                  className="bg-black hover:bg-black/90 text-white border-black"
                >
                  <a href="/">Back to Home</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        currentTier={loaderData.user?.subscriptionTier}
      />
    </div>
  );
}
