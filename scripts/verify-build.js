#!/usr/bin/env node

// Simple build verification script
console.log('🔍 Build Verification Script');
console.log('==========================');

// Check if required environment variables are set
const requiredEnvVars = [
  'VITE_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

console.log('\n📋 Environment Variables Check:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: SET (${value.substring(0, 10)}...)`);
  } else {
    console.log(`❌ ${envVar}: MISSING`);
  }
});

// Check if we're in Vercel environment
console.log('\n🌐 Environment Check:');
console.log(`- VERCEL: ${process.env.VERCEL || 'NOT SET'}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);

console.log('\n✅ Build verification complete');