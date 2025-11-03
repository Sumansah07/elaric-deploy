/**
 * Canvas Manager Component
 * Provides canvas persistence controls and snapshot management
 */

import React, { useState, useEffect } from 'react';
import { canvasPersistence, type CanvasSnapshot } from '~/lib/stores/canvas-persistence';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface CanvasManagerProps {
  projectId: string;
  userId: string;
  className?: string;
}

export function CanvasManager({ projectId, userId, className = '' }: CanvasManagerProps) {
  const [snapshots, setSnapshots] = useState<CanvasSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [showSnapshots, setShowSnapshots] = useState(false);

  // Initialize canvas persistence
  useEffect(() => {
    const initializePersistence = async () => {
      setLoading(true);
      try {
        await canvasPersistence.initialize(projectId, userId);
        loadSnapshots();
      } catch (error) {
        console.error('Error initializing canvas persistence:', error);
      } finally {
        setLoading(false);
      }
    };

    initializePersistence();

    // Cleanup on unmount
    return () => {
      canvasPersistence.cleanup();
    };
  }, [projectId, userId]);

  // Load snapshots
  const loadSnapshots = async () => {
    try {
      const snapshotList = await canvasPersistence.getSnapshots();
      setSnapshots(snapshotList);
    } catch (error) {
      console.error('Error loading snapshots:', error);
    }
  };

  // Manual save
  const handleManualSave = async () => {
    setLoading(true);
    try {
      const success = await canvasPersistence.saveCanvasState(true);
      if (success) {
        setLastSaveTime(new Date());
      }
    } catch (error) {
      console.error('Error saving canvas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create snapshot
  const handleCreateSnapshot = async () => {
    const name = prompt('Enter snapshot name:');
    if (!name) return;

    setLoading(true);
    try {
      const success = await canvasPersistence.createSnapshot(name);
      if (success) {
        await loadSnapshots();
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load snapshot
  const handleLoadSnapshot = async (snapshotId: string) => {
    if (!confirm('Loading this snapshot will replace your current canvas. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const success = await canvasPersistence.loadSnapshot(snapshotId);
      if (success) {
        setShowSnapshots(false);
      }
    } catch (error) {
      console.error('Error loading snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle auto-save
  const handleToggleAutoSave = () => {
    const newState = !autoSaveEnabled;
    setAutoSaveEnabled(newState);
    canvasPersistence.setAutoSave(newState);
  };

  return (
    <div className={`bg-bolt-elements-background-depth-2 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">
          Canvas Management
        </h3>
        <div className="flex items-center space-x-2">
          {loading && <LoadingSpinner size="sm" />}
          <span className="text-xs text-bolt-elements-textSecondary">
            {lastSaveTime ? `Saved ${lastSaveTime.toLocaleTimeString()}` : 'Not saved'}
          </span>
        </div>
      </div>

      {/* Auto-save toggle */}
      <div className="flex items-center justify-between mb-4 p-3 bg-bolt-elements-background-depth-1 rounded-lg">
        <div>
          <h4 className="font-medium text-bolt-elements-textPrimary">Auto-save</h4>
          <p className="text-sm text-bolt-elements-textSecondary">
            Automatically save changes as you work
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={autoSaveEnabled}
            onChange={handleToggleAutoSave}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={handleManualSave}
          disabled={loading}
          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <div className="i-ph:floppy-disk text-sm" />
          <span>Save Now</span>
        </button>

        <button
          onClick={handleCreateSnapshot}
          disabled={loading}
          className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <div className="i-ph:camera text-sm" />
          <span>Snapshot</span>
        </button>
      </div>

      {/* Snapshots section */}
      <div className="border-t border-bolt-elements-borderColor pt-4">
        <button
          onClick={() => setShowSnapshots(!showSnapshots)}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="font-medium text-bolt-elements-textPrimary">
            Snapshots ({snapshots.length})
          </h4>
          <div className={`i-ph:caret-down text-sm transition-transform ${showSnapshots ? 'rotate-180' : ''}`} />
        </button>

        {showSnapshots && (
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {snapshots.length === 0 ? (
              <p className="text-sm text-bolt-elements-textSecondary text-center py-4">
                No snapshots yet. Create one to save your current canvas state.
              </p>
            ) : (
              snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex items-center justify-between p-3 bg-bolt-elements-background-depth-1 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-bolt-elements-textPrimary truncate">
                      {snapshot.name || 'Untitled Snapshot'}
                    </h5>
                    <p className="text-xs text-bolt-elements-textSecondary">
                      {new Date(snapshot.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    <button
                      onClick={() => handleLoadSnapshot(snapshot.id)}
                      disabled={loading}
                      className="p-1 text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition-colors"
                      title="Load snapshot"
                    >
                      <div className="i-ph:download text-sm" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Delete this snapshot?')) {
                          // TODO: Implement delete snapshot API
                          console.log('Delete snapshot:', snapshot.id);
                        }
                      }}
                      disabled={loading}
                      className="p-1 text-red-600 hover:text-red-700 disabled:text-gray-400 transition-colors"
                      title="Delete snapshot"
                    >
                      <div className="i-ph:trash text-sm" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}