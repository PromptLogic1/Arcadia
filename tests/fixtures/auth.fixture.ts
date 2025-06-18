/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '.env' });
import type { TestUser } from '../auth/types/test-types';
import { generateTestUser, generateAdminUser, generateModeratorUser } from '../auth/utils/test-user-generator';
import { EmailServiceFactory, type EmailTestService } from '../auth/utils/email-test-service';

// Cleanup registry to track created resources
const cleanupRegistry = new Set<() => Promise<void>>();

interface AuthFixtures {
  authenticatedPage: Page;
  adminPage: Page;
  moderatorPage: Page;
  testUser: TestUser;
  adminUser: TestUser;
  moderatorUser: TestUser;
  multipleUsers: TestUser[];
  supabaseAdmin: ReturnType<typeof createClient<Database>>;
  emailService: EmailTestService;
  testEmailAddress: string;
}

export const test = base.extend<AuthFixtures>({
  // Email testing service
  emailService: async ({}, use) => {
    const service = await EmailServiceFactory.create();
    
    cleanupRegistry.add(async () => {
      await service.cleanup();
    });
    
    await use(service);
  },

  // Test email address
  testEmailAddress: async ({ emailService }, use) => {
    const email = await emailService.createTestEmailAddress('auth_test');
    
    cleanupRegistry.add(async () => {
      await emailService.deleteTestEmailAddress(email);
    });
    
    await use(email);
  },

  // Supabase admin client for user management
  supabaseAdmin: async ({}, use) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const client = createClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    await use(client);
  },

  // Regular test user
  testUser: async ({ supabaseAdmin }, use) => {
    const testUser = generateTestUser();
    
    // Create user via Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        username: testUser.username,
        full_name: testUser.full_name,
      },
    });

    if (error) {
      console.error('Failed to create test user:', error);
      throw error;
    }
    
    if (data.user) {
      testUser.id = data.user.id;
      testUser.auth_id = data.user.id;
      
      // Register cleanup
      cleanupRegistry.add(async () => {
        if (data.user) {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        }
      });
    }

    await use(testUser);
  },

  // Admin user
  adminUser: async ({ supabaseAdmin }, use) => {
    const adminUser = generateAdminUser();
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        username: adminUser.username,
        full_name: adminUser.full_name,
        role: 'admin',
      },
    });

    if (error) {
      console.error('Failed to create admin user:', error);
      throw error;
    }
    
    if (data.user) {
      adminUser.id = data.user.id;
      adminUser.auth_id = data.user.id;
      
      // Update user role in database
      await supabaseAdmin
        .from('users')
        .update({ role: 'admin' })
        .eq('auth_id', data.user.id);
      
      cleanupRegistry.add(async () => {
        if (data.user) {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        }
      });
    }

    await use(adminUser);
  },

  // Moderator user
  moderatorUser: async ({ supabaseAdmin }, use) => {
    const modUser = generateModeratorUser();
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: modUser.email,
      password: modUser.password,
      email_confirm: true,
      user_metadata: {
        username: modUser.username,
        full_name: modUser.full_name,
        role: 'moderator',
      },
    });

    if (error) {
      console.error('Failed to create moderator user:', error);
      throw error;
    }
    
    if (data.user) {
      modUser.id = data.user.id;
      modUser.auth_id = data.user.id;
      
      // Update user role in database
      await supabaseAdmin
        .from('users')
        .update({ role: 'moderator' })
        .eq('auth_id', data.user.id);
      
      cleanupRegistry.add(async () => {
        if (data.user) {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        }
      });
    }

    await use(modUser);
  },

  // Multiple test users for concurrent testing
  multipleUsers: async ({ supabaseAdmin }, use) => {
    const users: TestUser[] = [];
    const userCount = 3;
    
    for (let i = 0; i < userCount; i++) {
      const user = generateTestUser();
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          full_name: user.full_name,
        },
      });
      
      if (error) {
        console.error(`Failed to create test user ${i}:`, error);
        continue;
      }
      
      if (data.user) {
        user.id = data.user.id;
        user.auth_id = data.user.id;
        users.push(user);
        
        cleanupRegistry.add(async () => {
          if (data.user) {
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
          }
        });
      }
    }
    
    await use(users);
  },

  // Pre-authenticated page for regular user
  authenticatedPage: async ({ page, testUser }, use) => {
    await loginUser(page, testUser);
    await use(page);
  },

  // Pre-authenticated page for admin
  adminPage: async ({ page, adminUser }, use) => {
    await loginUser(page, adminUser);
    await use(page);
  },

  // Pre-authenticated page for moderator
  moderatorPage: async ({ page, moderatorUser }, use) => {
    await loginUser(page, moderatorUser);
    await use(page);
  },
});

/**
 * Helper function to login a user
 */
async function loginUser(page: Page, user: TestUser): Promise<void> {
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Fill in credentials - use data-testid selectors for reliability
  await page.locator('[data-testid="auth-email-input"]').fill(user.email);
  await page.locator('[data-testid="auth-password-input"]').fill(user.password);
  
  // Submit form using data-testid to avoid strict mode violations
  await page.locator('[data-testid="auth-submit-button"]').click();
  
  // Wait for redirect to dashboard/home
  await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
  
  // Verify authentication
  const userMenu = page.getByTestId('user-menu')
    .or(page.getByRole('button', { name: /user menu/i }))
    .or(page.getByRole('button', { name: /profile/i }));
  
  await userMenu.waitFor({ state: 'visible', timeout: 5000 });
}

// Cleanup hook
test.afterEach(async () => {
  // Run all cleanup functions
  const cleanupPromises = Array.from(cleanupRegistry).map(fn => fn());
  await Promise.all(cleanupPromises);
  
  // Clear the registry
  cleanupRegistry.clear();
});

export { expect } from '@playwright/test';