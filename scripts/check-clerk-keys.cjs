#!/usr/bin/env node

/**
 * Clerk API Keys Verification Script
 * This script checks if Clerk environment variables are properly configured
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function logHeader(message) {
  log(`\n${colors.bright}${message}${colors.reset}`);
}

// Read .env files
function readEnvFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const vars = {};

    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          vars[key] = value;
        }
      }
    });

    return vars;
  } catch (error) {
    return null;
  }
}

// Validate Clerk publishable key format
function validatePublishableKey(key) {
  if (!key) {
    return { valid: false, message: 'Key is missing or empty' };
  }

  // Clerk publishable keys should start with pk_test_ or pk_live_
  if (!key.startsWith('pk_test_') && !key.startsWith('pk_live_')) {
    return {
      valid: false,
      message: 'Key should start with pk_test_ (development) or pk_live_ (production)'
    };
  }

  // Check if key contains .clerk.accounts.dev or similar domain
  if (!key.includes('.clerk.accounts.dev') && !key.includes('.clerk.accounts.com')) {
    return {
      valid: false,
      message: 'Key format appears incorrect. Should contain .clerk.accounts.dev or .clerk.accounts.com'
    };
  }

  // Check minimum length
  if (key.length < 40) {
    return {
      valid: false,
      message: 'Key appears too short. It may be truncated or incomplete'
    };
  }

  return { valid: true, message: 'Key format looks correct' };
}

// Validate Clerk secret key format
function validateSecretKey(key) {
  if (!key) {
    return { valid: false, message: 'Key is missing or empty' };
  }

  // Clerk secret keys should start with sk_test_ or sk_live_
  if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) {
    return {
      valid: false,
      message: 'Key should start with sk_test_ (development) or sk_live_ (production)'
    };
  }

  // Check minimum length
  if (key.length < 40) {
    return {
      valid: false,
      message: 'Key appears too short. It may be truncated or incomplete'
    };
  }

  return { valid: true, message: 'Key format looks correct' };
}

// Validate webhook secret format
function validateWebhookSecret(key) {
  if (!key) {
    return { valid: false, message: 'Webhook secret is missing (optional but recommended)' };
  }

  // Webhook secrets should start with whsec_
  if (!key.startsWith('whsec_')) {
    return {
      valid: false,
      message: 'Webhook secret should start with whsec_'
    };
  }

  return { valid: true, message: 'Webhook secret format looks correct' };
}

// Main function
function checkClerkKeys() {
  logHeader('╔════════════════════════════════════════════════════════════╗');
  logHeader('║     CLERK AUTHENTICATION KEYS VERIFICATION                ║');
  logHeader('╚════════════════════════════════════════════════════════════╝');

  const envFiles = ['.env', '.env.local', '.env.production'];
  let foundKeys = false;
  let allValid = true;

  // Check each .env file
  for (const envFile of envFiles) {
    const vars = readEnvFile(envFile);

    if (!vars) {
      logWarning(`File ${envFile} not found or couldn't be read`);
      continue;
    }

    logHeader(`\n📄 Checking ${envFile}:`);

    const publishableKey = vars.VITE_CLERK_PUBLISHABLE_KEY;
    const secretKey = vars.CLERK_SECRET_KEY;
    const webhookSecret = vars.CLERK_WEBHOOK_SECRET;

    if (!publishableKey && !secretKey && !webhookSecret) {
      logInfo(`No Clerk keys found in ${envFile}`);
      continue;
    }

    foundKeys = true;

    // Check Publishable Key
    logInfo('\n1. VITE_CLERK_PUBLISHABLE_KEY:');
    if (publishableKey) {
      log(`   Value: ${publishableKey.substring(0, 20)}...`, colors.cyan);
      const result = validatePublishableKey(publishableKey);
      if (result.valid) {
        logSuccess(`   ${result.message}`);
      } else {
        logError(`   ${result.message}`);
        allValid = false;
      }
    } else {
      logError('   Not found or empty');
      allValid = false;
    }

    // Check Secret Key
    logInfo('\n2. CLERK_SECRET_KEY:');
    if (secretKey) {
      log(`   Value: ${secretKey.substring(0, 20)}... (hidden for security)`, colors.cyan);
      const result = validateSecretKey(secretKey);
      if (result.valid) {
        logSuccess(`   ${result.message}`);
      } else {
        logError(`   ${result.message}`);
        allValid = false;
      }
    } else {
      logError('   Not found or empty');
      allValid = false;
    }

    // Check Webhook Secret (optional)
    logInfo('\n3. CLERK_WEBHOOK_SECRET (optional):');
    if (webhookSecret) {
      log(`   Value: ${webhookSecret.substring(0, 20)}... (hidden for security)`, colors.cyan);
      const result = validateWebhookSecret(webhookSecret);
      if (result.valid) {
        logSuccess(`   ${result.message}`);
      } else {
        logWarning(`   ${result.message}`);
      }
    } else {
      logWarning('   Not configured (optional, but recommended for webhooks)');
    }
  }

  // Summary
  logHeader('\n╔════════════════════════════════════════════════════════════╗');
  logHeader('║                        SUMMARY                             ║');
  logHeader('╚════════════════════════════════════════════════════════════╝\n');

  if (!foundKeys) {
    logError('No Clerk keys found in any .env files!');
    logInfo('\nTo set up Clerk authentication:');
    logInfo('1. Go to https://dashboard.clerk.com');
    logInfo('2. Create a new application or select existing one');
    logInfo('3. Navigate to API Keys section');
    logInfo('4. Copy your Publishable Key and Secret Key');
    logInfo('5. Add them to your .env.local file:');
    log('\n   VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE', colors.yellow);
    log('   CLERK_SECRET_KEY=sk_test_YOUR_SECRET_HERE\n', colors.yellow);
    process.exit(1);
  }

  if (!allValid) {
    logError('⚠️  Some Clerk keys are invalid or improperly configured!');
    logInfo('\nCommon issues:');
    logInfo('• Truncated keys: Make sure you copied the entire key');
    logInfo('• Wrong environment: Test keys (pk_test_/sk_test_) for development');
    logInfo('• Base64 encoding: Keys should be plain text, not encoded');
    logInfo('\nHow to fix:');
    logInfo('1. Go to https://dashboard.clerk.com');
    logInfo('2. Select your application');
    logInfo('3. Click on "API Keys" in the sidebar');
    logInfo('4. Copy the FULL keys (they are quite long)');
    logInfo('5. Replace the keys in your .env.local file');
    logInfo('6. Restart your development server');
    process.exit(1);
  }

  logSuccess('✓ All Clerk keys are properly configured!');
  logInfo('\nYour Clerk authentication is ready to use.');
  logInfo('Start your development server with: pnpm run dev\n');
  process.exit(0);
}

// Run the check
checkClerkKeys();
