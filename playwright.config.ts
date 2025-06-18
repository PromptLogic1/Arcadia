import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI 
    ? [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]]
    : [['html', { open: 'on-failure' }]],
  
  /* Timeout for each test */
  timeout: 30 * 1000,
  
  /* Global timeout for the entire test run */
  globalTimeout: 60 * 60 * 1000, // 1 hour
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    /* Viewport size */
    viewport: { width: 1280, height: 720 },
    
    /* Ignore HTTPS errors during navigation */
    ignoreHTTPSErrors: true,
    
    /* Locale and timezone */
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    /* Permissions - using only cross-browser compatible permissions */
    permissions: ['clipboard-write'],
    
    /* User agent */
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },

  /* Configure expect assertions */
  expect: {
    /* Maximum time expect() should wait for the condition to be met */
    timeout: 10 * 1000,
    
    /* Configure visual regression testing */
    toHaveScreenshot: {
      maxDiffPixels: 100,
      animations: 'disabled',
    },
    
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.1,
    },
  },

  /* Configure projects for major browsers */
  projects: [
    /* Desktop browsers */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use bundled Chromium instead of system Chrome
      },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile viewports */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    
    /* Tablet viewports */
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
    },

    /* Test against branded browsers */
    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'], 
        // Use bundled Edge for compatibility
      },
    },
  ],
  
  /* Filter projects for local development */
  ...(process.env.TEST_BROWSER && {
    projects: [{
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use bundled Chromium for local development
      },
    }],
  }),

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      // Pass through all environment variables to the web server
      ...process.env,
    },
  },
  
  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',
  
  /* Path to global setup file */
  // globalSetup: path.resolve(__dirname, './tests/global-setup.ts'),
  
  /* Path to global teardown file */
  // globalTeardown: path.resolve(__dirname, './tests/global-teardown.ts'),
});
