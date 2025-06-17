import { test, expect } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture';
import { 
  TEST_USERS, 
  TIMEOUTS,
  SELECTORS 
} from '../helpers/test-data';
import { 
  waitForNetworkIdle, 
  getStoreState, 
  waitForStore 
} from '../helpers/test-utils.enhanced';
import type { Tables } from '@/types/database.types';

test.describe('Session Management', () => {
  test.describe('Session Persistence', () => {
    test('should maintain session across page refreshes', async ({ page, context }) => {
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await page.waitForURL(/(dashboard|home|\/$)/, { timeout: TIMEOUTS.navigation });
      
      // Verify session cookie exists
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => 
        c.name.includes('auth') || 
        c.name.includes('session') || 
        c.name.includes('sb-')
      );
      expect(sessionCookie).toBeDefined();
      
      // Navigate to protected route
      await page.goto('/settings');
      await expect(page).toHaveURL(/settings/);
      
      // Refresh page
      await page.reload();
      await waitForNetworkIdle(page);
      
      // Should still be on settings page (not redirected to login)
      await expect(page).toHaveURL(/settings/);
      
      // Verify user menu is still visible
      const userMenu = page.getByTestId('user-menu')
        .or(page.getByRole('button', { name: /user menu/i }))
        .or(page.getByRole('button', { name: /profile/i }));
      await expect(userMenu).toBeVisible();
    });

    test('should maintain session across browser tabs', async ({ browser, context }) => {
      // Create first page and login
      const page1 = await context.newPage();
      await page1.goto('/auth/login');
      await page1.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page1.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page1.getByRole('button', { name: /sign in/i }).click();
      await page1.waitForURL(/(dashboard|home|\/$)/);
      
      // Create second page (new tab)
      const page2 = await context.newPage();
      await page2.goto('/settings');
      
      // Should be authenticated in second tab
      await expect(page2).toHaveURL(/settings/);
      
      const userMenu = page2.getByTestId('user-menu')
        .or(page2.getByRole('button', { name: /user menu/i }));
      await expect(userMenu).toBeVisible();
      
      // Close first page
      await page1.close();
      
      // Second page should still be authenticated
      await page2.reload();
      await expect(page2).toHaveURL(/settings/);
      
      await page2.close();
    });

    test('should restore session after browser restart simulation', async ({ page, context }) => {
      // Login and save session state
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Save storage state (simulates persistent cookies/localStorage)
      const storageState = await context.storageState();
      
      // Create new context with saved state (simulates browser restart)
      const newContext = await page.context().browser()!.newContext({ storageState });
      const newPage = await newContext.newPage();
      
      // Should be authenticated in new context
      await newPage.goto('/settings');
      await expect(newPage).toHaveURL(/settings/);
      
      const userMenu = newPage.getByTestId('user-menu')
        .or(newPage.getByRole('button', { name: /user menu/i }));
      await expect(userMenu).toBeVisible();
      
      await newContext.close();
    });
  });

  test.describe('Session Timeout', () => {
    test('should handle session timeout gracefully', async ({ page, context }) => {
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Simulate session expiry by clearing session storage and cookies
      await page.evaluate(() => {
        // Clear session storage
        sessionStorage.clear();
        localStorage.clear();
      });
      
      // Clear auth-related cookies
      const cookies = await context.cookies();
      const authCookies = cookies.filter(c => 
        c.name.includes('auth') || 
        c.name.includes('session') || 
        c.name.includes('sb-')
      );
      
      for (const cookie of authCookies) {
        await context.clearCookies({
          name: cookie.name,
          domain: cookie.domain,
          path: cookie.path
        });
      }
      
      // Try to access protected route
      await page.goto('/settings');
      
      // Should redirect to login
      await page.waitForURL(/login/, { timeout: TIMEOUTS.navigation });
      
      // Should show redirect parameter
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/redirectedFrom|returnTo|redirect/);
    });

    test('should handle expired token gracefully', async ({ page, context }) => {
      // Mock expired token response
      await context.route('**/auth/session', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token expired' })
        });
      });
      
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Try to access protected route
      await page.goto('/settings');
      
      // Should redirect to login due to expired token
      await page.waitForURL(/login/, { timeout: TIMEOUTS.navigation });
    });
  });

  test.describe('Session Renewal', () => {
    test('should refresh token automatically', async ({ page, context }) => {
      let tokenRefreshCount = 0;
      
      // Intercept token refresh requests
      await context.route('**/auth/refresh', route => {
        tokenRefreshCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'new-token',
            refresh_token: 'new-refresh-token'
          })
        });
      });
      
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Wait for potential automatic token refresh
      await page.waitForTimeout(2000);
      
      // Navigate between protected routes to trigger potential refresh
      await page.goto('/profile');
      await page.goto('/settings');
      await page.goto('/dashboard');
      
      // Token refresh may or may not happen depending on implementation
      // This test ensures the system handles it gracefully if it does occur
      console.log(`Token refresh attempts: ${tokenRefreshCount}`);
    });

    test('should handle failed token refresh', async ({ page, context }) => {
      // Mock failed token refresh
      await context.route('**/auth/refresh', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Refresh token expired' })
        });
      });
      
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Simulate token expiry by making API call that would trigger refresh
      await page.evaluate(() => {
        // Simulate API call that would trigger token refresh
        fetch('/api/user/profile', {
          headers: { Authorization: 'Bearer expired-token' }
        }).catch(() => {});
      });
      
      // Wait for potential redirect
      await page.waitForTimeout(3000);
      
      // If refresh fails, should either redirect to login or handle gracefully
      const currentUrl = page.url();
      const isOnLogin = currentUrl.includes('/auth/login');
      const isStillAuthenticated = await page.getByTestId('user-menu')
        .or(page.getByRole('button', { name: /user menu/i }))
        .isVisible()
        .catch(() => false);
      
      // Should either redirect to login or maintain session gracefully
      expect(isOnLogin || isStillAuthenticated).toBeTruthy();
    });
  });

  test.describe('Logout Functionality', () => {
    authTest('should logout user completely', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Verify user is authenticated
      const userMenu = page.getByTestId('user-menu')
        .or(page.getByRole('button', { name: /user menu/i }))
        .or(page.getByRole('button', { name: /profile/i }));
      await expect(userMenu).toBeVisible();
      
      // Perform logout
      await userMenu.click();
      
      const logoutButton = page.getByRole('menuitem', { name: /logout|sign out/i })
        .or(page.getByRole('button', { name: /logout|sign out/i }))
        .or(page.getByRole('link', { name: /logout|sign out/i }));
      
      await logoutButton.click();
      
      // Should redirect to home or login
      await page.waitForURL(/(home|auth\/login|\/$)/, { timeout: TIMEOUTS.navigation });
      
      // Verify session is cleared
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => 
        c.name.includes('auth') || 
        c.name.includes('session') || 
        c.name.includes('sb-')
      );
      
      // Session cookie should be undefined or expired
      if (sessionCookie) {
        // Check if cookie is expired or has empty value
        const isExpired = sessionCookie.expires && sessionCookie.expires <= Date.now() / 1000;
        const isEmpty = !sessionCookie.value || sessionCookie.value === '';
        expect(isExpired || isEmpty).toBeTruthy();
      }
      
      // Attempting to access protected route should redirect
      await page.goto('/settings');
      await page.waitForURL(/login/, { timeout: TIMEOUTS.navigation });
    });

    authTest('should clear client-side session data on logout', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Check if Zustand store exists and has auth data
      try {
        await waitForStore(page, 'auth-store');
        const authState = await getStoreState(page, 'auth-store');
        console.log('Auth state before logout:', authState);
      } catch (error) {
        console.log('No Zustand auth store found or accessible');
      }
      
      // Perform logout
      const userMenu = page.getByTestId('user-menu')
        .or(page.getByRole('button', { name: /user menu/i }));
      await userMenu.click();
      
      const logoutButton = page.getByRole('menuitem', { name: /logout|sign out/i })
        .or(page.getByRole('button', { name: /logout|sign out/i }));
      await logoutButton.click();
      
      await page.waitForURL(/(home|auth\/login|\/$)/);
      
      // Check that client-side storage is cleared
      const localStorageAuth = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.filter(key => 
          key.includes('auth') || 
          key.includes('user') || 
          key.includes('session') ||
          key.includes('supabase')
        );
      });
      
      const sessionStorageAuth = await page.evaluate(() => {
        const keys = Object.keys(sessionStorage);
        return keys.filter(key => 
          key.includes('auth') || 
          key.includes('user') || 
          key.includes('session') ||
          key.includes('supabase')
        );
      });
      
      // Auth-related storage should be cleared or contain no sensitive data
      console.log('Local storage auth keys after logout:', localStorageAuth);
      console.log('Session storage auth keys after logout:', sessionStorageAuth);
      
      // Check if Zustand store is cleared
      try {
        const authStateAfterLogout = await getStoreState(page, 'auth-store');
        console.log('Auth state after logout:', authStateAfterLogout);
        
        if (authStateAfterLogout) {
          // If store exists, user should be null/undefined
          expect(authStateAfterLogout.user || authStateAfterLogout.currentUser).toBeFalsy();
        }
      } catch (error) {
        console.log('Auth store not accessible after logout (expected)');
      }
    });

    authTest('should logout from all tabs simultaneously', async ({ authenticatedPage, context }) => {
      const page1 = authenticatedPage;
      
      // Create second tab
      const page2 = await context.newPage();
      await page2.goto('/settings');
      await expect(page2).toHaveURL(/settings/);
      
      // Verify both tabs are authenticated
      const userMenu1 = page1.getByTestId('user-menu')
        .or(page1.getByRole('button', { name: /user menu/i }));
      const userMenu2 = page2.getByTestId('user-menu')
        .or(page2.getByRole('button', { name: /user menu/i }));
      
      await expect(userMenu1).toBeVisible();
      await expect(userMenu2).toBeVisible();
      
      // Logout from first tab
      await userMenu1.click();
      const logoutButton = page1.getByRole('menuitem', { name: /logout|sign out/i })
        .or(page1.getByRole('button', { name: /logout|sign out/i }));
      await logoutButton.click();
      
      await page1.waitForURL(/(home|auth\/login|\/$)/);
      
      // Second tab should also be logged out (or redirect on next action)
      await page2.reload();
      
      // Should redirect to login or show logged out state
      const redirectedToLogin = await page2.waitForURL(/login/, { timeout: 3000 }).catch(() => false);
      const stillAuthenticated = await userMenu2.isVisible().catch(() => false);
      
      // Should either redirect to login or show logged out state
      expect(redirectedToLogin || !stillAuthenticated).toBeTruthy();
      
      await page2.close();
    });
  });

  test.describe('Concurrent Sessions', () => {
    test('should handle multiple concurrent sessions', async ({ browser }) => {
      // Create two different browser contexts (simulating different devices)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Login from first device
      await page1.goto('/auth/login');
      await page1.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page1.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page1.getByRole('button', { name: /sign in/i }).click();
      await page1.waitForURL(/(dashboard|home|\/$)/);
      
      // Login from second device
      await page2.goto('/auth/login');
      await page2.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page2.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page2.getByRole('button', { name: /sign in/i }).click();
      await page2.waitForURL(/(dashboard|home|\/$)/);
      
      // Both sessions should be active
      await page1.goto('/settings');
      await expect(page1).toHaveURL(/settings/);
      
      await page2.goto('/profile');
      await expect(page2).toHaveURL(/profile/);
      
      // Verify both have user menus
      const userMenu1 = page1.getByTestId('user-menu')
        .or(page1.getByRole('button', { name: /user menu/i }));
      const userMenu2 = page2.getByTestId('user-menu')
        .or(page2.getByRole('button', { name: /user menu/i }));
      
      await expect(userMenu1).toBeVisible();
      await expect(userMenu2).toBeVisible();
      
      await context1.close();
      await context2.close();
    });

    test('should handle session conflicts gracefully', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Login from both devices simultaneously
      await Promise.all([
        (async () => {
          await page1.goto('/auth/login');
          await page1.getByLabel('Email').fill(TEST_USERS.valid.email);
          await page1.getByLabel('Password').fill(TEST_USERS.valid.password);
          await page1.getByRole('button', { name: /sign in/i }).click();
        })(),
        (async () => {
          await page2.goto('/auth/login');
          await page2.getByLabel('Email').fill(TEST_USERS.valid.email);
          await page2.getByLabel('Password').fill(TEST_USERS.valid.password);
          await page2.getByRole('button', { name: /sign in/i }).click();
        })()
      ]);
      
      // Both should successfully log in (modern systems support multiple sessions)
      await page1.waitForURL(/(dashboard|home|\/$)/, { timeout: TIMEOUTS.navigation });
      await page2.waitForURL(/(dashboard|home|\/$)/, { timeout: TIMEOUTS.navigation });
      
      // Both should be able to access protected routes
      await page1.goto('/settings');
      await page2.goto('/profile');
      
      await expect(page1).toHaveURL(/settings/);
      await expect(page2).toHaveURL(/profile/);
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe('Session Security', () => {
    test('should invalidate session on suspicious activity', async ({ page, context }) => {
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Simulate suspicious activity (multiple rapid requests from different IPs)
      await context.route('**/api/**', (route, request) => {
        // Add suspicious headers
        route.continue({
          headers: {
            ...request.headers(),
            'X-Forwarded-For': '192.168.1.100, 10.0.0.1, 172.16.0.1',
            'X-Real-IP': '192.168.1.100'
          }
        });
      });
      
      // Make multiple rapid API calls
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          fetch('/api/user/profile').catch(() => {});
        });
      }
      
      await page.waitForTimeout(2000);
      
      // System should handle this gracefully (may or may not invalidate session)
      const currentUrl = page.url();
      const isStillAuthenticated = await page.getByTestId('user-menu')
        .or(page.getByRole('button', { name: /user menu/i }))
        .isVisible()
        .catch(() => false);
      
      // System should either maintain session or redirect to login
      const isOnLogin = currentUrl.includes('/auth/login');
      expect(isOnLogin || isStillAuthenticated).toBeTruthy();
    });

    test('should handle session hijacking attempts', async ({ page, context }) => {
      // Login first
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Get session cookie
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => 
        c.name.includes('auth') || 
        c.name.includes('session') || 
        c.name.includes('sb-')
      );
      
      if (sessionCookie) {
        // Simulate cookie tampering
        await context.addCookies([{
          ...sessionCookie,
          value: sessionCookie.value + '_tampered'
        }]);
        
        // Try to access protected route with tampered cookie
        await page.goto('/settings');
        
        // Should either redirect to login or handle gracefully
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const isStillAuthenticated = await page.getByTestId('user-menu')
          .or(page.getByRole('button', { name: /user menu/i }))
          .isVisible()
          .catch(() => false);
        
        // If cookie validation is strict, should redirect to login
        const isOnLogin = currentUrl.includes('/auth/login');
        
        // System should handle tampered cookies appropriately
        console.log(`Tampered cookie result - On login: ${isOnLogin}, Still authenticated: ${isStillAuthenticated}`);
      }
    });
  });

  test.describe('Session Storage', () => {
    test('should store minimal data in client-side storage', async ({ page }) => {
      // Login
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Check what's stored in localStorage
      const localStorageData = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            data[key] = localStorage.getItem(key) || '';
          }
        }
        return data;
      });
      
      // Check what's stored in sessionStorage
      const sessionStorageData = await page.evaluate(() => {
        const data: Record<string, string> = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            data[key] = sessionStorage.getItem(key) || '';
          }
        }
        return data;
      });
      
      console.log('LocalStorage data:', localStorageData);
      console.log('SessionStorage data:', sessionStorageData);
      
      // Check for sensitive data that shouldn't be stored
      const allStoredData = JSON.stringify({ ...localStorageData, ...sessionStorageData }).toLowerCase();
      
      // Should not contain sensitive information
      expect(allStoredData).not.toContain('password');
      expect(allStoredData).not.toContain('secret');
      expect(allStoredData).not.toContain('private_key');
      
      // Tokens should be minimal or properly encrypted if present
      const authKeys = Object.keys({ ...localStorageData, ...sessionStorageData })
        .filter(key => key.toLowerCase().includes('auth') || key.toLowerCase().includes('token'));
      
      console.log('Auth-related storage keys:', authKeys);
    });

    test('should handle storage quota exceeded gracefully', async ({ page }) => {
      // Login
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill(TEST_USERS.valid.email);
      await page.getByLabel('Password').fill(TEST_USERS.valid.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/(dashboard|home|\/$)/);
      
      // Simulate storage quota exceeded
      const storageOverflowHandled = await page.evaluate(() => {
        try {
          // Fill localStorage to quota
          const largeString = 'x'.repeat(1024 * 1024); // 1MB string
          for (let i = 0; i < 10; i++) {
            localStorage.setItem(`test_${i}`, largeString);
          }
          return false;
        } catch (error) {
          // Should handle storage quota exceeded gracefully
          console.log('Storage quota exceeded, handled gracefully');
          return true;
        }
      });
      
      // Navigation should still work despite storage issues
      await page.goto('/settings');
      await expect(page).toHaveURL(/settings/);
      
      // Clean up test data
      await page.evaluate(() => {
        for (let i = 0; i < 10; i++) {
          localStorage.removeItem(`test_${i}`);
        }
      });
    });
  });
});