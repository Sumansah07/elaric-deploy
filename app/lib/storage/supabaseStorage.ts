/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage buckets
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export class StorageService {
  /**
   * Upload thumbnail image
   */
  async uploadThumbnail(
    userId: string,
    projectId: string,
    file: File | Blob,
    fileName?: string,
  ): Promise<string | null> {
    if (!supabase) {
      console.warn('Supabase not initialized, skipping thumbnail upload');
      return null;
    }

    try {
      const extension = fileName?.split('.').pop() || 'png';
      const path = `${userId}/${projectId}/thumbnail_${Date.now()}.${extension}`;

      const { data, error } = await supabase.storage.from('thumbnails').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('thumbnails').getPublicUrl(path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      return null;
    }
  }

  /**
   * Upload screen thumbnail
   */
  async uploadScreenThumbnail(
    userId: string,
    projectId: string,
    screenId: string,
    file: File | Blob,
  ): Promise<string | null> {
    if (!supabase) {
      return null;
    }

    try {
      const path = `${userId}/${projectId}/screens/${screenId}.png`;

      const { data, error } = await supabase.storage.from('thumbnails').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('thumbnails').getPublicUrl(path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading screen thumbnail:', error);
      return null;
    }
  }

  /**
   * Generate thumbnail from HTML canvas
   */
  async generateAndUploadThumbnail(
    userId: string,
    projectId: string,
    canvas: HTMLCanvasElement,
  ): Promise<string | null> {
    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.8);
      });

      if (!blob) {
        throw new Error('Failed to generate thumbnail blob');
      }

      // Upload blob
      return await this.uploadThumbnail(userId, projectId, blob, 'thumbnail.png');
    } catch (error) {
      console.error('Error generating and uploading thumbnail:', error);
      return null;
    }
  }

  /**
   * Delete thumbnail
   */
  async deleteThumbnail(userId: string, projectId: string): Promise<boolean> {
    if (!supabase) {
      return false;
    }

    try {
      // List all files in the project folder
      const { data: files, error: listError } = await supabase.storage
        .from('thumbnails')
        .list(`${userId}/${projectId}`);

      if (listError || !files || files.length === 0) {
        return false;
      }

      // Delete all files
      const filePaths = files.map((file) => `${userId}/${projectId}/${file.name}`);

      const { error } = await supabase.storage.from('thumbnails').remove(filePaths);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
      return false;
    }
  }

  /**
   * Upload project asset (HTML/CSS/JS files)
   */
  async uploadProjectAsset(
    userId: string,
    projectId: string,
    fileName: string,
    content: string,
  ): Promise<string | null> {
    if (!supabase) {
      return null;
    }

    try {
      const path = `${userId}/${projectId}/assets/${fileName}`;
      const blob = new Blob([content], { type: 'text/plain' });

      const { data, error } = await supabase.storage.from('project-assets').upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        throw error;
      }

      // Get signed URL (private bucket)
      const { data: signedUrl, error: signedError } = await supabase.storage
        .from('project-assets')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (signedError || !signedUrl) {
        throw signedError;
      }

      return signedUrl.signedUrl;
    } catch (error) {
      console.error('Error uploading project asset:', error);
      return null;
    }
  }

  /**
   * Get storage usage for user
   */
  async getStorageUsage(userId: string): Promise<number> {
    if (!supabase) {
      return 0;
    }

    try {
      let totalSize = 0;

      // Get thumbnails storage
      const { data: thumbnails } = await supabase.storage.from('thumbnails').list(userId);

      if (thumbnails) {
        totalSize += thumbnails.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
      }

      // Get project assets storage
      const { data: assets } = await supabase.storage.from('project-assets').list(userId);

      if (assets) {
        totalSize += assets.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
      }

      return totalSize;
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return 0;
    }
  }

  /**
   * Clean up old files (for maintenance)
   */
  async cleanupOldFiles(userId: string, daysOld = 30): Promise<number> {
    if (!supabase) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;

    try {
      // List and filter old files
      const { data: files } = await supabase.storage.from('thumbnails').list(userId);

      if (files) {
        const oldFiles = files.filter((file) => {
          const createdAt = new Date(file.created_at);
          return createdAt < cutoffDate;
        });

        if (oldFiles.length > 0) {
          const paths = oldFiles.map((file) => `${userId}/${file.name}`);
          const { error } = await supabase.storage.from('thumbnails').remove(paths);

          if (!error) {
            deletedCount = oldFiles.length;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return 0;
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    return supabase !== null;
  }
}

// Export singleton instance
export const storage = new StorageService();
