/**
 * Storage Manager Component
 * Manages file storage, thumbnails, and storage quotas
 */

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '~/lib/auth/auth-provider';
import { UsageProgressBar } from '../billing/UsageLimitWarning';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface StorageItem {
  id: string;
  name: string;
  type: 'image' | 'file' | 'thumbnail' | 'canvas_state';
  size: number;
  url?: string;
  createdAt: string;
  projectId?: string;
}

interface StorageManagerProps {
  projectId?: string;
  className?: string;
}

export function StorageManager({ projectId, className = '' }: StorageManagerProps) {
  const { usageLimits, hasReachedLimit } = useAuthContext();
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [filterType, setFilterType] = useState<string>('all');

  // Load storage items
  useEffect(() => {
    loadStorageItems();
  }, [projectId]);

  const loadStorageItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set('projectId', projectId);
      
      const response = await fetch(`/api/storage/list?${params}`);
      if (response.ok) {
        const { items } = await response.json();
        setStorageItems(items || []);
      }
    } catch (error) {
      console.error('Error loading storage items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete selected items
  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    
    if (!confirm(`Delete ${selectedItems.size} selected items?`)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedItems) }),
      });

      if (response.ok) {
        await loadStorageItems();
        setSelectedItems(new Set());
      }
    } catch (error) {
      console.error('Error deleting items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate thumbnails for images
  const handleGenerateThumbnails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/storage/generate-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        await loadStorageItems();
      }
    } catch (error) {
      console.error('Error generating thumbnails:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clean up unused files
  const handleCleanup = async () => {
    if (!confirm('Remove unused files and optimize storage?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/storage/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const { cleaned } = await response.json();
        alert(`Cleaned up ${cleaned.count} files, freed ${cleaned.size} bytes`);
        await loadStorageItems();
      }
    } catch (error) {
      console.error('Error cleaning up storage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter and sort items
  const filteredItems = storageItems
    .filter(item => filterType === 'all' || item.type === filterType)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  const totalSize = storageItems.reduce((sum, item) => sum + item.size, 0);
  const selectedSize = storageItems
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + item.size, 0);

  return (
    <div className={`bg-bolt-elements-background-depth-2 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">
          Storage Management
        </h3>
        {loading && <LoadingSpinner size="sm" />}
      </div>

      {/* Storage usage */}
      <div className="mb-6">
        <UsageProgressBar
          label="Storage Usage"
          used={parseFloat(usageLimits?.storageUsedGB || '0')}
          max={usageLimits?.maxStorageGB || 1}
          unit=" GB"
        />
        <div className="flex justify-between text-sm text-bolt-elements-textSecondary mt-2">
          <span>Current project: {formatSize(totalSize)}</span>
          <span className={hasReachedLimit('storage') ? 'text-red-600' : ''}>
            {hasReachedLimit('storage') ? 'Storage limit reached' : 'Within limits'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-bolt-elements-textSecondary">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded px-2 py-1"
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm text-bolt-elements-textSecondary">Filter:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded px-2 py-1"
          >
            <option value="all">All files</option>
            <option value="image">Images</option>
            <option value="thumbnail">Thumbnails</option>
            <option value="canvas_state">Canvas states</option>
            <option value="file">Other files</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 ml-auto">
          <button
            onClick={handleGenerateThumbnails}
            disabled={loading}
            className="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
          >
            Generate Thumbnails
          </button>
          <button
            onClick={handleCleanup}
            disabled={loading}
            className="text-sm bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
          >
            Cleanup
          </button>
        </div>
      </div>

      {/* Selection controls */}
      {selectedItems.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <span className="text-sm text-blue-800 dark:text-blue-200">
            {selectedItems.size} items selected ({formatSize(selectedSize)})
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedItems(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear selection
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={loading}
              className="text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
            >
              Delete selected
            </button>
          </div>
        </div>
      )}

      {/* File list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-bolt-elements-textSecondary">
            {loading ? 'Loading...' : 'No files found'}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                selectedItems.has(item.id)
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-bolt-elements-background-depth-1 border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-3'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedItems.has(item.id)}
                onChange={(e) => {
                  const newSelected = new Set(selectedItems);
                  if (e.target.checked) {
                    newSelected.add(item.id);
                  } else {
                    newSelected.delete(item.id);
                  }
                  setSelectedItems(newSelected);
                }}
                className="rounded"
              />

              {/* File icon/thumbnail */}
              <div className="w-10 h-10 bg-bolt-elements-background-depth-3 rounded flex items-center justify-center flex-shrink-0">
                {item.type === 'image' && item.url ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className={`text-lg ${
                    item.type === 'image' ? 'i-ph:image' :
                    item.type === 'thumbnail' ? 'i-ph:image-square' :
                    item.type === 'canvas_state' ? 'i-ph:layout' :
                    'i-ph:file'
                  }`} />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-bolt-elements-textPrimary truncate">
                  {item.name}
                </h4>
                <div className="flex items-center space-x-3 text-sm text-bolt-elements-textSecondary">
                  <span className="capitalize">{item.type.replace('_', ' ')}</span>
                  <span>{formatSize(item.size)}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                    title="View file"
                  >
                    <div className="i-ph:eye text-sm" />
                  </a>
                )}
                <button
                  onClick={() => {
                    const newSelected = new Set([item.id]);
                    setSelectedItems(newSelected);
                  }}
                  className="p-1 text-red-600 hover:text-red-700 transition-colors"
                  title="Select for deletion"
                >
                  <div className="i-ph:trash text-sm" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}