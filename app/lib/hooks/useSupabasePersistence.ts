/**
 * Hook to initialize Supabase persistence with user context
 */

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/remix';
import { supabasePersistence } from '~/lib/services/supabase-persistence';

export function useSupabasePersistence() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeUser() {
      if (!isLoaded || !isSignedIn || !user) {
        setIsInitialized(false);
        return;
      }

      try {
        // Ensure user exists in Supabase
        const email = user.emailAddresses?.[0]?.emailAddress;
        if (!email) {
          throw new Error('User email not found');
        }

        const userId = await supabasePersistence.ensureUser(
          user.id,
          email,
          user.fullName || undefined
        );

        // Set user context for all operations
        supabasePersistence.setUserContext({
          userId,
          clerkUserId: user.id,
        });

        setIsInitialized(true);
        setError(null);

        console.log('Supabase persistence initialized for user:', user.id);
      } catch (err) {
        console.error('Failed to initialize Supabase persistence:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsInitialized(false);
      }
    }

    initializeUser();
  }, [isLoaded, isSignedIn, user]);

  return {
    isInitialized,
    error,
    syncStatus: supabasePersistence.getSyncStatus(),
  };
}
