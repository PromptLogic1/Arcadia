import type { FullConfig } from '@playwright/test';
import { chromium } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

/**
 * Global setup for Playwright tests
 *
 * Runs once before all tests to prepare the test environment
 * 1. Load test environment variables
 * 2. Validate critical dependencies
 * 3. Check application health
 * 4. Set up test isolation
 */
async function globalSetup(playwrightConfig: FullConfig): Promise<void> {
  console.log('🚀 Starting global test setup...');

  // Load test environment
  const envPath = path.resolve(__dirname, '..', '.env.test');
  const envResult = dotenvConfig({ path: envPath });

  if (envResult.error) {
    console.warn(
      '⚠️  Warning: Could not load .env.test file:',
      envResult.error.message
    );
    console.log('📄 Using existing environment variables...');
  } else {
    console.log('✅ Loaded test environment from .env.test');
  }

  // Validate critical environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(
      `❌ Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
  console.log('✅ Environment variables validated');

  const { baseURL } = playwrightConfig.projects[0].use;
  const testUrl =
    baseURL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  // Launch browser to check if app is ready
  console.log(`🔍 Checking application health at ${testUrl}...`);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // First check: Basic connectivity
    let retries = 30; // 30 seconds timeout
    let appReady = false;

    while (retries > 0 && !appReady) {
      try {
        const response = await page.goto(testUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 3000,
        });

        if (response && response.ok()) {
          appReady = true;
          console.log('✅ Application is responding');
        }
      } catch (error) {
        console.log(`⏳ Waiting for app to start... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      }
    }

    if (!appReady) {
      console.error('❌ Application is not accessible at', testUrl);
      console.error('🔧 Please ensure your development server is running:');
      console.error('   npm run dev');
      console.error('');
      console.error(
        '💡 If you want to run tests without a dev server, use CI mode:'
      );
      console.error('   CI=true npm run test:e2e');
      throw new Error(
        '❌ Application failed to start within timeout - dev server not running'
      );
    }

    // Second check: Health endpoint validation
    try {
      const healthResponse = await page.goto(`${testUrl}/api/health/live`, {
        timeout: 5000,
      });

      if (healthResponse && healthResponse.ok()) {
        console.log('✅ Health endpoint is responding');
      } else {
        console.warn('⚠️  Warning: Health endpoint not responding properly');
      }
    } catch (error) {
      console.warn('⚠️  Warning: Could not check health endpoint:', error);
    }

    // Third check: Readiness probe (dependencies)
    try {
      const readyResponse = await page.goto(`${testUrl}/api/health/ready`, {
        timeout: 10000,
      });

      if (readyResponse && readyResponse.ok()) {
        console.log('✅ Application dependencies are ready');
      } else {
        console.warn('⚠️  Warning: Some dependencies may not be ready');
        // Don't fail tests if dependencies are not ready - tests should handle gracefully
      }
    } catch (error) {
      console.warn('⚠️  Warning: Could not check readiness endpoint:', error);
    }

    // Store test session info
    process.env.TEST_START_TIME = Date.now().toString();
    process.env.TEST_BASE_URL = testUrl;

    console.log('✅ Global test setup completed successfully');
  } finally {
    await browser.close();
  }
}

export default globalSetup;
