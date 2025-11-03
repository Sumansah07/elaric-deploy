/**
 * Authentication navigation component for the header
 * Shows login/register links for guests, user menu for authenticated users
 */

import { useState, useRef, useEffect } from 'react';
import { Form, useRouteLoaderData } from '@remix-run/react';
import type { PublicUser } from '~/lib/auth/types';

interface AuthNavigationProps {
  className?: string;
}

interface RootLoaderData {
  user?: PublicUser;
}

export function AuthNavigation({ className = '' }: AuthNavigationProps) {
  const rootData = useRouteLoaderData<RootLoaderData>('root');
  const user = rootData?.user;
  
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

  if (!user) {
    // Guest navigation - show login/register links
    return (
      <nav className={`flex items-center space-x-4 ${className}`}>
        <a
          href="/login"
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-black hover:bg-gray-700 border border-gray-800 rounded-lg transition-colors"
        >
          Sign In
        </a>
        <a
          href="/register"
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-black hover:bg-gray-700 border border-gray-800 rounded-lg transition-colors"
        >
          Sign Up
        </a>
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
            className="flex items-center space-x-2 bg-purple-600 text-black hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 rounded-lg p-2"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-black">
                {user.full_name || 'User'}
              </p>
              <p className="text-xs text-black">
                {user.email}
              </p>
            </div>
            <div className={`i-ph:caret-down text-sm transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-bolt-elements-background-depth-2 rounded-lg shadow-lg border border-bolt-elements-borderColor z-50">
              <div className="py-2">
                {/* User Info (mobile) */}
                <div className="sm:hidden px-4 py-2 border-b border-bolt-elements-borderColor">
                  <p className="text-sm font-medium text-bolt-elements-textPrimary">
                    {user.full_name || 'User'}
                  </p>
                  <p className="text-xs text-bolt-elements-textSecondary">
                    {user.email}
                  </p>
                </div>

                {/* Menu Items */}
                <a
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center space-x-2">
                    <div className="i-ph:house text-base" />
                    <span>Dashboard</span>
                  </div>
                </a>
                
                <a
                  href="/profile"
                  className="block px-4 py-2 text-sm text-white bg-black hover:bg-gray-900 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center space-x-2">
                    <div className="i-ph:user text-base" />
                    <span>Profile</span>
                  </div>
                </a>
                
                <a
                  href="/settings"
                  className="block px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center space-x-2">
                    <div className="i-ph:gear text-base" />
                    <span>Settings</span>
                  </div>
                </a>

                <div className="border-t border-bolt-elements-borderColor my-2" />

                {/* Logout */}
                <Form method="post" action="/logout">
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-2 text-sm text-white bg-black hover:bg-gray-900 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="i-ph:sign-out text-base" />
                      <span>Sign Out</span>
                    </div>
                  </button>
                </Form>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}