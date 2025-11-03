/**
 * Database initialization script
 * Run this script to set up the database schema for authentication
 */

import { initDatabaseForEnvironment } from '../app/lib/database/init.server.js';

async function main() {
  try {
    console.log('🚀 Starting database initialization...');
    
    await initDatabaseForEnvironment();
    
    console.log('✅ Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

main();