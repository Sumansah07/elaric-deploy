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

// Keep package.json as-is since removing type: "module" breaks ESM-only dependencies
console.log('📦 Keeping package.json unchanged to support ESM dependencies');
const originalPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

console.log('🚀 Starting build...');

// Run the actual build
const { spawn } = require('child_process');

const buildProcess = spawn('node', [
  '--max-old-space-size=8192',
  'node_modules/@remix-run/dev/dist/cli.js',
  'vite:build',
  '--mode=production'
], {
  stdio: 'pipe',
  env: {
    ...process.env,
    VERCEL: '1',
    NODE_ENV: 'production',
    VITE_LOG_LEVEL: 'info'
  }
});

let buildOutput = '';
let buildError = '';

buildProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  buildOutput += output;
});

buildProcess.stderr.on('data', (data) => {
  const error = data.toString();
  console.error(error);
  buildError += error;
});

buildProcess.on('close', (code) => {
  // No need to restore package.json since we didn't modify it
  
  console.log('📊 Build Summary:');
  console.log('- Exit code:', code);
  console.log('- Output length:', buildOutput.length);
  console.log('- Error length:', buildError.length);
  
  if (code !== 0) {
    console.log('❌ Build failed. Full error output:');
    console.log('='.repeat(80));
    console.log(buildError);
    console.log('='.repeat(80));
    console.log('❌ Full build output:');
    console.log('='.repeat(80));
    console.log(buildOutput);
    console.log('='.repeat(80));
  } else {
    console.log('✅ Build succeeded!');
  }
  
  process.exit(code);
});

buildProcess.on('error', (error) => {
  console.error('❌ Build process error:', error);
  process.exit(1);
});