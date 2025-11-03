#!/usr/bin/env node

console.log('🔍 Debug Build Environment');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- VERCEL:', process.env.VERCEL);
console.log('- Current working directory:', process.cwd());

// Check if electron directory exists
const fs = require('fs');
const path = require('path');

const electronDir = path.join(process.cwd(), 'electron');
console.log('- Electron directory exists:', fs.existsSync(electronDir));

if (fs.existsSync(electronDir)) {
  console.log('- Electron directory contents:', fs.readdirSync(electronDir));
}

// Check package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  console.log('- Package.json type:', pkg.type);
  console.log('- Package.json name:', pkg.name);
}

console.log('🚀 Starting build...');

// Run the actual build
const { spawn } = require('child_process');

const buildProcess = spawn('node', [
  '--max-old-space-size=8192',
  'node_modules/@remix-run/dev/dist/cli.js',
  'vite:build'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VERCEL: '1',
    NODE_ENV: 'production'
  }
});

buildProcess.on('close', (code) => {
  console.log('✅ Build completed with code:', code);
  process.exit(code);
});

buildProcess.on('error', (error) => {
  console.error('❌ Build error:', error);
  process.exit(1);
});