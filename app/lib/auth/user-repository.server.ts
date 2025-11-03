/**
 * User repository for database operations
 * Server-only module for user data access
 */

import { createClient } from '@supabase/supabase-js';
import type { PublicUser } from './types';

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface CreateUserData {
  email: string;
  hashedPassword: string;
  fullName?: string;
}

export interface UpdateUserData {
  email?: string;
  hashedPassword?: string;
  fullName?: string;
  avatarUrl?: string;
  isEmailVerified?: boolean;
  lastLoginAt?: string;
}

export class UserRepository {
  private supabase = getSupabaseClient();

  /**
   * Create a new user
   * @param userData - User data to create
   * @returns Promise<PublicUser> - Created user (without sensitive data)
   */
  async createUser(userData: CreateUserData): Promise<PublicUser> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          email: userData.email,
          password_hash: userData.hashedPassword,
          full_name: userData.fullName || null,
          subscription_tier: 'free',
          subscription_status: 'active',
          is_email_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          subscription_tier,
          subscription_status,
          is_email_verified,
          created_at,
          updated_at,
          last_login_at
        `)
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Email already exists');
        }
        throw new Error(`Failed to create user: ${error.message}`);
      }

      return this.mapToPublicUser(data);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create user');
    }
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns Promise<PublicUser | null> - User data or null if not found
   */
  async findUserByEmail(email: string): Promise<PublicUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          subscription_tier,
          subscription_status,
          is_email_verified,
          created_at,
          updated_at,
          last_login_at
        `)
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw new Error(`Failed to find user: ${error.message}`);
      }

      return this.mapToPublicUser(data);
    } catch (error) {
      if (error instanceof Error && error.message.includes('No rows returned')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param id - User ID
   * @returns Promise<PublicUser | null> - User data or null if not found
   */
  async findUserById(id: string): Promise<PublicUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          subscription_tier,
          subscription_status,
          is_email_verified,
          created_at,
          updated_at,
          last_login_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw new Error(`Failed to find user: ${error.message}`);
      }

      return this.mapToPublicUser(data);
    } catch (error) {
      if (error instanceof Error && error.message.includes('No rows returned')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get user password hash for authentication
   * @param email - User email
   * @returns Promise<string | null> - Password hash or null if user not found
   */
  async getUserPasswordHash(email: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('password_hash')
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw new Error(`Failed to get password hash: ${error.message}`);
      }

      return data.password_hash;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No rows returned')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update user data
   * @param id - User ID
   * @param updateData - Data to update
   * @returns Promise<PublicUser> - Updated user data
   */
  async updateUser(id: string, updateData: UpdateUserData): Promise<PublicUser> {
    try {
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateData.email) {
        updatePayload.email = updateData.email.toLowerCase();
      }
      if (updateData.hashedPassword) {
        updatePayload.password_hash = updateData.hashedPassword;
      }
      if (updateData.fullName !== undefined) {
        updatePayload.full_name = updateData.fullName;
      }
      if (updateData.avatarUrl !== undefined) {
        updatePayload.avatar_url = updateData.avatarUrl;
      }
      if (updateData.isEmailVerified !== undefined) {
        updatePayload.is_email_verified = updateData.isEmailVerified;
      }
      if (updateData.lastLoginAt) {
        updatePayload.last_login_at = updateData.lastLoginAt;
      }

      const { data, error } = await this.supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          subscription_tier,
          subscription_status,
          is_email_verified,
          created_at,
          updated_at,
          last_login_at
        `)
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Email already exists');
        }
        throw new Error(`Failed to update user: ${error.message}`);
      }

      return this.mapToPublicUser(data);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update user');
    }
  }

  /**
   * Update user's last login timestamp
   * @param id - User ID
   * @returns Promise<void>
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to update last login: ${error.message}`);
      }
    } catch (error) {
      // Log error but don't throw - this is not critical
      console.error('Failed to update last login:', error);
    }
  }

  /**
   * Delete user (soft delete by marking as inactive)
   * @param id - User ID
   * @returns Promise<void>
   */
  async deleteUser(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Check if email exists
   * @param email - Email to check
   * @returns Promise<boolean> - True if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return false;
        }
        throw new Error(`Failed to check email: ${error.message}`);
      }

      return !!data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No rows returned')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Map database row to PublicUser type
   * @param data - Raw database data
   * @returns PublicUser - Mapped user data
   */
  private mapToPublicUser(data: any): PublicUser {
    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      avatar_url: data.avatar_url,
      subscription_tier: data.subscription_tier,
      subscription_status: data.subscription_status,
      is_email_verified: data.is_email_verified,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_login_at: data.last_login_at,
    };
  }
}

// Export singleton instance
export const userRepository = new UserRepository();