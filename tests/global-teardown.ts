import type { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * 
 * Runs once after all tests to clean up the test environment
 */
async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log('Starting global test teardown...');
  
  // Clean up any test data if needed
  const testDuration = process.env.TEST_START_TIME 
    ? Date.now() - parseInt(process.env.TEST_START_TIME)
    : 0;
  
  if (testDuration > 0) {
    console.log(`Total test duration: ${(testDuration / 1000).toFixed(2)}s`);
  }
  
  // Clean up environment variables
  delete process.env.TEST_START_TIME;
  
  console.log('Global test teardown completed');
}

export default globalTeardown;