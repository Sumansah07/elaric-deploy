/**
 * Database connection utilities
 * Server-only module for database connection management
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

// Environment variables validation
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL environment variable is required');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY environment variable is required');
}

/**
 * Admin client with service role access (bypasses RLS)
 * Use with caution - only for server-side operations that need full access
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

/**
 * Standard client with anon key (respects RLS)
 * Use for operations that should respect Row Level Security
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

/**
 * Connection health check
 */
export async function checkDatabaseConnection(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }

    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Database configuration for different environments
 */
export const dbConfig = {
  development: {
    maxConnections: 10,
    connectionTimeout: 5000,
    queryTimeout: 30000,
  },
  production: {
    maxConnections: 50,
    connectionTimeout: 10000,
    queryTimeout: 60000,
  },
  test: {
    maxConnections: 5,
    connectionTimeout: 3000,
    queryTimeout: 15000,
  },
};

/**
 * Get current environment configuration
 */
export function getCurrentDbConfig() {
  const env = process.env.NODE_ENV || 'development';
  return dbConfig[env as keyof typeof dbConfig] || dbConfig.development;
}

/**
 * Execute database operation with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  baseDelay = 100
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await operation();

      if (error) {
        throw error;
      }

      if (data === null) {
        throw new Error('No data returned from database operation');
      }

      return data;
    } catch (error) {
      lastError = error;
      
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, {
        error: error instanceof Error ? error.message : error,
        attempt,
        maxRetries,
      });

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Transaction wrapper for multiple operations
 */
export async function withTransaction<T>(
  operations: (client: typeof supabaseAdmin) => Promise<T>
): Promise<T> {
  // Note: Supabase doesn't have explicit transaction support in the client
  // This is a placeholder for future implementation or can be used with
  // stored procedures that handle transactions
  
  try {
    return await operations(supabaseAdmin);
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * Initialize database connection and run health checks
 */
export async function initializeDatabase(): Promise<void> {
  console.log('Initializing database connection...');
  
  const healthCheck = await checkDatabaseConnection();
  
  if (!healthCheck.healthy) {
    throw new Error(`Database connection failed: ${healthCheck.error}`);
  }
  
  console.log(`✓ Database connection healthy (${healthCheck.latency}ms)`);
  
  // Run migrations if needed
  try {
    const { runMigrations } = await import('./migrations.server');
    await runMigrations();
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Graceful database shutdown
 */
export async function shutdownDatabase(): Promise<void> {
  console.log('Shutting down database connections...');
  // Supabase client doesn't require explicit cleanup
  // This is a placeholder for any cleanup operations
  console.log('✓ Database connections closed');
}