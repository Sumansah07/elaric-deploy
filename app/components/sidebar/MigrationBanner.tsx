/**
 * Migration Banner Component
 * Shows when user has local chats that can be synced to cloud
 */

import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/Button';
import { hasLocalChatsToMigrate, syncLocalChatsToSupabase, type MigrationProgress } from '~/lib/migration/sync-local-to-supabase';

export function MigrationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkMigration = async () => {
      const dismissed = localStorage.getItem('migration_banner_dismissed');
      if (dismissed) {
        setDismissed(true);
        return;
      }

      const needsMigration = await hasLocalChatsToMigrate();
      setShowBanner(needsMigration);
    };

    checkMigration();
  }, []);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const result = await syncLocalChatsToSupabase((prog) => {
        setProgress(prog);
      });

      if (result.success > 0) {
        setTimeout(() => {
          setShowBanner(false);
          localStorage.setItem('migration_banner_dismissed', 'true');
        }, 2000);
      }
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('migration_banner_dismissed', 'true');
  };

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <div className="mx-3 mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="flex items-start gap-2">
        <div className="i-ph:cloud-arrow-up text-purple-600 dark:text-purple-400 h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100">
            Sync Your Chats to Cloud
          </h3>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            Access your chat history from any device by syncing to cloud storage.
          </p>
          
          {isMigrating && progress && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 mb-1">
                <span>{progress.current}</span>
                <span>{progress.completed} / {progress.total}</span>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5">
                <div
                  className="bg-purple-600 dark:bg-purple-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={handleMigrate}
              disabled={isMigrating}
              className="text-xs"
            >
              {isMigrating ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              disabled={isMigrating}
              className="text-xs"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
