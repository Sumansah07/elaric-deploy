/**
 * Hook to initialize Supabase user context
 */

import { useUser } from '@clerk/remix';
import { useEffect } from 'react';
import { supabasePersistence } from '~/lib/services/supabase-persistence';

export function useSupabaseAuth() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      // Get Supabase user ID from user metadata
      const supabaseUserId = user.publicMetadata?.supabaseUserId as string;
      
      if (supabaseUserId) {
        supabasePersistence.setUserContext({
          userId: supabaseUserId,
          clerkUserId: user.id,
        });
        console.log('✅ Supabase user context set:', supabaseUserId);
      }
    }
  }, [user, isLoaded]);

  return { user, isLoaded };
}
