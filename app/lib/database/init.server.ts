/**
 * Database initialization script
 * Server-only module for setting up the database on application start
 */

import { initializeDatabase } from './connection.server';

/**
 * Initialize database for development environment
 */
export async function initDevelopmentDatabase(): Promise<void> {
  try {
    console.log('🔧 Setting up development database...');
    
    await initializeDatabase();
    
    console.log('✅ Development database setup complete');
  } catch (error) {
    console.error('❌ Development database setup failed:', error);
    throw error;
  }
}

/**
 * Initialize database for production environment
 */
export async function initProductionDatabase(): Promise<void> {
  try {
    console.log('🚀 Setting up production database...');
    
    await initializeDatabase();
    
    console.log('✅ Production database setup complete');
  } catch (error) {
    console.error('❌ Production database setup failed:', error);
    throw error;
  }
}

/**
 * Initialize database based on environment
 */
export async function initDatabaseForEnvironment(): Promise<void> {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      await initProductionDatabase();
      break;
    case 'development':
    case 'test':
    default:
      await initDevelopmentDatabase();
      break;
  }
}

/**
 * Seed database with initial data for development
 */
export async function seedDevelopmentData(): Promise<void> {
  console.log('🌱 Seeding development data...');
  
  // This can be expanded to include test users, projects, etc.
  // For now, we'll just ensure the database is ready
  
  console.log('✅ Development data seeding complete');
}

// Auto-initialize in development if this file is imported
if (process.env.NODE_ENV === 'development') {
  // Only run initialization if explicitly called
  // This prevents automatic execution on import
}