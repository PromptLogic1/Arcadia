import type { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * 
 * Runs once after all tests to clean up the test environment
 * 1. Clean up test data
 * 2. Report test session statistics
 * 3. Clear test environment variables
 */
async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log('🧹 Starting global test teardown...');
  
  // Calculate test session duration
  const testDuration = process.env.TEST_START_TIME 
    ? Date.now() - parseInt(process.env.TEST_START_TIME)
    : 0;
  
  if (testDuration > 0) {
    const minutes = Math.floor(testDuration / 60000);
    const seconds = ((testDuration % 60000) / 1000).toFixed(2);
    console.log(`⏱️  Total test session duration: ${minutes}m ${seconds}s`);
  }
  
  // Log test environment info
  if (process.env.TEST_BASE_URL) {
    console.log(`🌐 Test environment: ${process.env.TEST_BASE_URL}`);
  }
  
  // Clean up test-specific environment variables
  const testEnvVars = [
    'TEST_START_TIME',
    'TEST_BASE_URL',
    'TEST_PORT',
  ];
  
  testEnvVars.forEach(varName => {
    if (process.env[varName]) {
      delete process.env[varName];
    }
  });
  
  console.log('✅ Global test teardown completed');
}

export default globalTeardown;