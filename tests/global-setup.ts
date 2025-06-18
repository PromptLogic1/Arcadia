import type { FullConfig } from '@playwright/test';
import { chromium } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * 
 * Runs once before all tests to prepare the test environment
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('Starting global test setup...');
  
  const { baseURL } = config.projects[0].use;
  
  // Launch browser to check if app is ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for app to be ready
    let retries = 30; // 30 seconds timeout
    let appReady = false;
    
    while (retries > 0 && !appReady) {
      try {
        const response = await page.goto(baseURL || 'http://localhost:3000', {
          waitUntil: 'domcontentloaded',
          timeout: 2000,
        });
        
        if (response && response.ok()) {
          appReady = true;
          console.log('Application is ready for testing');
        }
      } catch (error) {
        console.log(`Waiting for app to start... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      }
    }
    
    if (!appReady) {
      throw new Error('Application failed to start within timeout');
    }
    
    // Store any global state if needed
    process.env.TEST_START_TIME = Date.now().toString();
    
  } finally {
    await browser.close();
  }
  
  console.log('Global test setup completed');
}

export default globalSetup;