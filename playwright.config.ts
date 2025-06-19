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
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
      ]
    : [['html', { open: 'always' }]],

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

    /* Permissions - removed as clipboard-write is not supported in Firefox */
    // permissions: ['clipboard-write'],

    /* User agent */
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        permissions: ['clipboard-write'],
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox doesn't support clipboard-write permission
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Webkit doesn't support clipboard-write permission
      },
    },

    /* Mobile viewports */
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        permissions: ['clipboard-write'],
      },
    },

    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        // Safari doesn't support clipboard-write permission
      },
    },

    /* Tablet viewports */
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
        // iPad/Safari doesn't support clipboard-write permission
      },
    },

    /* Test against branded browsers */
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        // Use bundled Edge for compatibility
        permissions: ['clipboard-write'],
      },
    },
  ],

  /* Filter projects for local development */
  ...(process.env.TEST_BROWSER && {
    projects: [
      {
        name: 'chromium',
        use: {
          ...devices['Desktop Chrome'],
          // Use bundled Chromium for local development
          permissions: ['clipboard-write'],
        },
      },
    ],
  }),

  /* Run your local dev server before starting the tests */
  // DISABLED: User already has dev server running
  // webServer will be configured only if needed for CI or isolated testing
  ...(process.env.CI && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      timeout: 120 * 1000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        // Load test environment for CI
        ...(require('dotenv').config({ path: '.env.test' }).parsed || {}),
        NODE_ENV: 'test',
      },
    },
  }),

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',

  /* Path to global setup file */
  globalSetup: require.resolve('./tests/global-setup.ts'),

  /* Path to global teardown file */
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
});
