#!/usr/bin/env node

// Vercel build script
console.log('🔧 Vercel Build Script');
console.log('====================');

// Set environment variables
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';

console.log('Environment variables set:');
console.log('- VERCEL:', process.env.VERCEL);
console.log('- NODE_ENV:', process.env.NODE_ENV);

// Import the build module directly
import { execSync } from 'child_process';

try {
  console.log('Starting build process...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully');
  process.exit(0);
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}