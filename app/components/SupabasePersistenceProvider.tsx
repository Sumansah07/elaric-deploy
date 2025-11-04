/**
 * Supabase Persistence Provider
 * Initializes user context and triggers migration on first login
 */

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/remix';
import { useSupabasePersistence } from '~/lib/hooks/useSupabasePersistence';
import { 
  migrateLocalDataToSupabase, 
  isMigrationCompleted,
  type MigrationResult 
} from '~/lib/migration/migrateLocalToSupabase';
import { settingsStore } from '~/lib/stores/settings-supabase';
import { canvasLoader } from '~/lib/services/canvas-loader';

export function SupabasePersistenceProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { isInitialized, error } = useSupabasePersistence();
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'checking' | 'migrating' | 'completed' | 'error'>('idle');
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // Skip on server-side
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  useEffect(() => {
    async function handleMigration() {
      if (!isLoaded || !isSignedIn || !isInitialized) return;

      // Check if migration is needed
      if (isMigrationCompleted()) {
        setMigrationStatus('completed');
        console.log('🔄 Loading user data...');
        
        // Load user settings
        await settingsStore.loadSettings();
        console.log('✅ Settings loaded');
        
        // Load canvas/designs
        const canvasLoaded = await canvasLoader.loadMostRecentCanvas();
        console.log(canvasLoaded ? '✅ Canvas loaded' : 'ℹ️ No canvas to load');
        
        return;
      }

      // Run migration
      setMigrationStatus('migrating');
      console.log('Starting local to Supabase migration...');

      try {
        const result = await migrateLocalDataToSupabase();
        setMigrationResult(result);
        
        if (result.success) {
          setMigrationStatus('completed');
          console.log('Migration completed successfully:', result);
          
          // Load settings after migration
          await settingsStore.loadSettings();
          
          // Load canvas/designs for user
          await canvasLoader.loadMostRecentCanvas();
        } else {
          setMigrationStatus('error');
          console.error('Migration failed:', result.errors);
        }
      } catch (error) {
        setMigrationStatus('error');
        console.error('Migration error:', error);
      }
    }

    handleMigration();
  }, [isLoaded, isSignedIn, isInitialized]);

  // Show loading state while initializing
  if (!isLoaded || (isSignedIn && !isInitialized)) {
    return (
      <div className="flex items-center justify-center h-screen bg-bolt-elements-background-depth-1">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bolt-elements-textPrimary mx-auto mb-4"></div>
          <p className="text-bolt-elements-textSecondary">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show migration progress
  if (isSignedIn && migrationStatus === 'migrating') {
    return (
      <div className="flex items-center justify-center h-screen bg-bolt-elements-background-depth-1">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bolt-elements-textPrimary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">
            Migrating Your Data
          </h2>
          <p className="text-bolt-elements-textSecondary">
            We're moving your local data to the cloud. This will only happen once.
          </p>
        </div>
      </div>
    );
  }

  // Show migration error
  if (migrationStatus === 'error' && migrationResult) {
    return (
      <div className="flex items-center justify-center h-screen bg-bolt-elements-background-depth-1">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">
            Migration Error
          </h2>
          <p className="text-bolt-elements-textSecondary mb-4">
            Some data couldn't be migrated. You can continue, but some features may not work.
          </p>
          <details className="text-left text-sm text-bolt-elements-textSecondary mb-4">
            <summary className="cursor-pointer font-semibold mb-2">Error Details</summary>
            <ul className="list-disc list-inside">
              {migrationResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </details>
          <button
            onClick={() => setMigrationStatus('completed')}
            className="px-4 py-2 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded hover:bg-bolt-elements-button-primary-backgroundHover"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    );
  }

  // Show error if persistence initialization failed
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bolt-elements-background-depth-1">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">
            Initialization Error
          </h2>
          <p className="text-bolt-elements-textSecondary mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded hover:bg-bolt-elements-button-primary-backgroundHover"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Render children once everything is ready
  return <>{children}</>;
}
