/**
 * Clerk-based authentication navigation component for the header
 * Shows login/register links for guests, user menu for authenticated users
 */

import { useState, useRef, useEffect } from 'react';
import { useUser, useClerk, SignInButton, SignUpButton } from '@clerk/remix';
import { useAuthContext } from '~/lib/auth/auth-provider';

// Extend Window interface to include Clerk
declare global {
  interface Window {
    Clerk?: {
      openUserProfile: () => void;
      user?: any;
      session?: any;
      signOut: () => Promise<void>;
    };
  }
}

interface ClerkAuthNavigationProps {
  className?: string;
}

export function ClerkAuthNavigation({ className = '' }: ClerkAuthNavigationProps) {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { user: authUser, usageLimits, hasReachedLimit } = useAuthContext();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMenuOpen]);

  if (!isSignedIn || !user) {
    // Guest navigation - show login/register links
    return (
      <nav className={`flex items-center space-x-4 ${className}`}>
        <SignInButton 
          mode="modal"
          appearance={{
            variables: {
              colorPrimary: '#3b82f6',
              colorBackground: '#0a0a0a',
              colorInputBackground: '#171717',
              colorInputText: '#ffffff',
              colorText: '#ffffff',
              colorTextSecondary: '#a3a3a3',
              borderRadius: '0.5rem',
            },
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-[#0a0a0a] shadow-2xl border border-neutral-800',
              headerTitle: 'text-white',
              headerSubtitle: 'text-neutral-400',
              socialButtonsBlockButton: 'bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
              formFieldInput: 'bg-neutral-900 border-neutral-700 text-white',
              formFieldLabel: 'text-neutral-300',
              footerActionLink: 'text-blue-500 hover:text-blue-400',
              modalBackdrop: 'bg-black/80',
              modalContent: 'bg-[#0a0a0a]',
            },
          }}
        >
          <button className="inline-flex items-center justify-center px-8 py-2 text-base font-medium text-white bg-black hover:bg-gray-700 border border-gray-800 rounded-lg transition-colors">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton 
          mode="modal"
          appearance={{
            variables: {
              colorPrimary: '#3b82f6',
              colorBackground: '#0a0a0a',
              colorInputBackground: '#171717',
              colorInputText: '#ffffff',
              colorText: '#ffffff',
              colorTextSecondary: '#a3a3a3',
              borderRadius: '0.5rem',
            },
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-[#0a0a0a] shadow-2xl border border-neutral-800',
              headerTitle: 'text-white',
              headerSubtitle: 'text-neutral-400',
              socialButtonsBlockButton: 'bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
              formFieldInput: 'bg-neutral-900 border-neutral-700 text-white',
              formFieldLabel: 'text-neutral-300',
              footerActionLink: 'text-blue-500 hover:text-blue-400',
              modalBackdrop: 'bg-black/80',
              modalContent: 'bg-[#0a0a0a]',
            },
          }}
        >
          <button className="inline-flex items-center justify-center px-8 py-2 text-base font-medium text-white bg-black hover:bg-gray-700 border border-gray-800 rounded-lg transition-colors">
            Sign Up
          </button>
        </SignUpButton>
      </nav>
    );
  }

  // Authenticated user navigation - show user menu
  return (
    <nav className={`relative ${className}`}>
      <div className="flex items-center space-x-4">
        {/* User Menu Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center bg-black text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 rounded-full p-1 border border-gray-700"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName || user.emailAddresses[0]?.emailAddress || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-sm font-medium">
                  {user.fullName
                    ? user.fullName.charAt(0).toUpperCase()
                    : user.emailAddresses[0]?.emailAddress?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor z-50">
              <div className="py-2">
                {/* User Info (mobile) */}
                <div className="sm:hidden px-4 py-2 border-b border-bolt-elements-borderColor">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-bolt-elements-textPrimary">{user.fullName || 'User'}</p>
                      <p className="text-xs text-bolt-elements-textSecondary">{user.emailAddresses[0]?.emailAddress}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {authUser?.subscriptionTier === 'pro' && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                          Pro ✨
                        </span>
                      )}
                      {authUser?.subscriptionTier === 'enterprise' && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                          Enterprise 👑
                        </span>
                      )}
                    </div>
                  </div>
                  {usageLimits && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-bolt-elements-textSecondary">Projects:</span>
                        <span
                          className={hasReachedLimit('projects') ? 'text-red-600' : 'text-bolt-elements-textPrimary'}
                        >
                          {usageLimits.projectsCreated}/{usageLimits.maxProjects}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-bolt-elements-textSecondary">AI Gen:</span>
                        <span
                          className={
                            hasReachedLimit('ai_generations') ? 'text-red-600' : 'text-bolt-elements-textPrimary'
                          }
                        >
                          {usageLimits.aiGenerationsCount}/{usageLimits.maxAiGenerations}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Menu Items */}
                <a
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-white bg-black hover:bg-gray-900 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center space-x-2">
                    <div className="i-ph:house text-base" />
                    <span>Dashboard</span>
                  </div>
                </a>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    // Open Clerk's user profile modal
                    window.Clerk?.openUserProfile();
                  }}
                  className="w-full text-left block px-4 py-2 text-sm text-white bg-black hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="i-ph:user text-base" />
                    <span>Profile</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    // This would open the subscription modal - we'll implement this later
                    window.location.href = '/dashboard#subscription';
                  }}
                  className="w-full text-left block px-4 py-2 text-sm text-white bg-black hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="i-ph:crown text-base" />
                      <span>Subscription</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        authUser?.subscriptionTier === 'pro'
                          ? 'bg-yellow-100 text-yellow-800'
                          : authUser?.subscriptionTier === 'enterprise'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {authUser?.subscriptionTier || 'free'}
                    </span>
                  </div>
                </button>

                <div className="border-t border-bolt-elements-borderColor my-2" />

                {/* Logout */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    signOut();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white bg-black hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="i-ph:sign-out text-base" />
                    <span>Sign Out</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
