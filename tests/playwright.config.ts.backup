import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * 
 * Optimized for reliable, fast test execution with proper typing
 */
export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Test match pattern - only spec files
  testMatch: /.*\.spec\.ts$/,
  
  // Timeout for each test
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Fail on console errors
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Collect trace on retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on retry
    video: 'retain-on-failure',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Accept downloads
    acceptDownloads: true,
    
    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true,
    
    // Locale
    locale: 'en-US',
    
    // Timezone
    timezoneId: 'America/New_York',
    
    // Permissions
    permissions: ['clipboard-read', 'clipboard-write'],
    
    // Offline mode
    offline: false,
    
    // Color scheme
    colorScheme: 'light',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Parallel execution
  fullyParallel: true,
  
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
  
  // Workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
  ],
  
  // Global setup
  globalSetup: require.resolve('./global-setup'),
  
  // Global teardown
  globalTeardown: require.resolve('./global-teardown'),
  
  // Output folder for test artifacts
  outputDir: 'test-results/',
  
  // Folder for test artifacts
  snapshotDir: './tests/screenshots',
  
  // Update snapshots
  updateSnapshots: 'missing',
});