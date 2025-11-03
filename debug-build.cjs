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

// Temporarily modify package.json to remove type: "module"
console.log('🔧 Temporarily modifying package.json...');
const originalPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const modifiedPkg = { ...originalPkg };
delete modifiedPkg.type;
fs.writeFileSync(packageJsonPath, JSON.stringify(modifiedPkg, null, 2));
console.log('- Removed type: "module" from package.json');

console.log('🚀 Starting build...');

// Run the actual build
const { spawn } = require('child_process');

const buildProcess = spawn('node', [
  '--max-old-space-size=8192',
  'node_modules/@remix-run/dev/dist/cli.js',
  'vite:build'
], {
  stdio: 'pipe',
  env: {
    ...process.env,
    VERCEL: '1',
    NODE_ENV: 'production'
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
  // Restore original package.json
  console.log('🔄 Restoring original package.json...');
  fs.writeFileSync(packageJsonPath, JSON.stringify(originalPkg, null, 2));
  
  console.log('📊 Build Summary:');
  console.log('- Exit code:', code);
  console.log('- Output length:', buildOutput.length);
  console.log('- Error length:', buildError.length);
  
  if (code !== 0) {
    console.log('❌ Build failed. Last 1000 chars of error:');
    console.log(buildError.slice(-1000));
    console.log('❌ Last 1000 chars of output:');
    console.log(buildOutput.slice(-1000));
  } else {
    console.log('✅ Build succeeded!');
  }
  
  process.exit(code);
});

buildProcess.on('error', (error) => {
  // Restore original package.json on error
  console.log('🔄 Restoring original package.json after error...');
  fs.writeFileSync(packageJsonPath, JSON.stringify(originalPkg, null, 2));
  console.error('❌ Build process error:', error);
  process.exit(1);
});