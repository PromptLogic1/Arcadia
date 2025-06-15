#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Verifying Sentry Configuration...\n');

try {
  // Check if Sentry CLI is available
  console.log('📦 Checking Sentry CLI...');
  try {
    execSync('npx @sentry/cli --version', { stdio: 'inherit' });
    console.log('✅ Sentry CLI is available\n');
  } catch (error) {
    console.error('❌ Sentry CLI not found. Installing...');
    execSync('npm install --save-dev @sentry/cli', { stdio: 'inherit' });
  }

  // Verify auth
  console.log('🔐 Verifying authentication...');
  try {
    const result = execSync('npx @sentry/cli info', { encoding: 'utf8' });
    console.log('✅ Authentication successful');
    console.log(result);
  } catch (error) {
    console.error(
      '❌ Authentication failed. Please check your SENTRY_AUTH_TOKEN'
    );
    process.exit(1);
  }

  // List releases
  console.log('📋 Recent releases:');
  try {
    execSync('npx @sentry/cli releases list --limit 5', { stdio: 'inherit' });
  } catch (error) {
    console.log('No releases found yet (this is normal for new projects)');
  }

  console.log('\n✅ Sentry configuration verified successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Start your dev server: npm run dev');
  console.log('2. Visit http://localhost:3000/test-sentry');
  console.log('3. Run the tests and check your Sentry dashboard');
} catch (error) {
  console.error('\n❌ Sentry verification failed:', error.message);
  process.exit(1);
}
