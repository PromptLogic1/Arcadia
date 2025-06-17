import { test as base, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

interface AuthFixtures {
  authenticatedPage: Page;
  testUser: {
    email: string;
    password: string;
    id: string;
  };
}

export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use) => {
    // Create a unique test user for each test
    const timestamp = Date.now();
    const testUser = {
      email: `test_${timestamp}@example.com`,
      password: 'Test123!@#',
      id: '',
    };

    // Create user via Supabase Admin API if needed
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
    });

    if (error) {
      console.error('Failed to create test user:', error);
    } else if (data.user) {
      testUser.id = data.user.id;
    }

    await use(testUser);

    // Cleanup: Delete test user after test
    if (testUser.id) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.id);
    }
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Fill in credentials
    await page.getByLabel('Email').fill(testUser.email);
    await page.getByLabel('Password').fill(testUser.password);
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect to dashboard/home
    await page.waitForURL(/(dashboard|home|\/)/);

    await use(page);
  },
});

export { expect } from '@playwright/test';