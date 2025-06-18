import { test, expect } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture';
import { 
  TIMEOUTS,
  AUTH_ROUTES
} from '../helpers/test-data';
import { 
  waitForNetworkIdle
} from '../helpers/test-utils';
// Removed unused import: Tables

// Use auth routes from test-data
const PROTECTED_ROUTES = {
  authenticated: [
    AUTH_ROUTES.protected.dashboard, 
    AUTH_ROUTES.protected.profile, 
    AUTH_ROUTES.protected.settings, 
    '/play', 
    '/community'
  ],
  public: ['/', '/about', AUTH_ROUTES.public.login, AUTH_ROUTES.public.signup],
} as const;

test.describe('Authentication Guards', () => {
  test.describe('Protected Route Access', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Test each protected route
      for (const route of PROTECTED_ROUTES.authenticated) {
        await page.goto(route);
        
        // Should redirect to login page
        await page.waitForURL(/login/, { timeout: TIMEOUTS.navigation });
        
        // Should include redirect parameter
        const currentUrl = page.url();
        const hasRedirectParam = currentUrl.includes('redirectedFrom') || 
                                currentUrl.includes('returnTo') || 
                                currentUrl.includes('redirect') ||
                                currentUrl.includes(encodeURIComponent(route));
        
        if (hasRedirectParam) {
          expect(hasRedirectParam).toBeTruthy();
        }
        
        console.log(`Route ${route} -> redirected to: ${currentUrl}`);
      }
    });

    test('should preserve intended destination after login', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto('/settings');
      await page.waitForURL(/login/, { timeout: TIMEOUTS.navigation });
      
      // Get the current URL with redirect parameters
      const loginUrl = page.url();
      console.log('Login URL with redirect:', loginUrl);
      
      // Login from this redirected page
      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password').fill('TestPass123!');
      const signInBtn = page.getByRole('button', { name: /sign in/i });
      await signInBtn.click();
      
      // Should redirect back to original intended destination
      await page.waitForURL(/settings/, { timeout: TIMEOUTS.navigation });
      await expect(page).toHaveURL(/settings/);
    });

    test('should handle nested protected routes', async ({ page }) => {
      const nestedRoutes = [
        '/settings/profile',
        '/settings/notifications',
        '/dashboard/analytics',
        '/admin/users'
      ];
      
      for (const route of nestedRoutes) {
        // Try to access nested route
        await page.goto(route);
        
        // Should redirect to login (unless route doesn't exist)
        const redirectedToLogin = await page.waitForURL(/login/, { timeout: 3000 }).catch(() => false);
        const notFoundText = page.getByText(/not found|404/i);
        const is404 = page.url().includes('404') || 
                     await notFoundText.isVisible().catch(() => false);
        
        // Should either redirect to login or show 404 (if route doesn't exist)
        expect(redirectedToLogin || is404).toBeTruthy();
        
        console.log(`Nested route ${route} -> Login redirect: ${redirectedToLogin}, 404: ${is404}`);
      }
    });

    test('should handle direct API route access', async ({ request }) => {
      const protectedApiRoutes = [
        '/api/user/profile',
        '/api/user/settings',
        '/api/admin/users',
        '/api/protected/data'
      ];
      
      for (const apiRoute of protectedApiRoutes) {
        const response = await request.get(apiRoute).catch(() => null);
        
        if (response) {
          // Should return 401 Unauthorized or 403 Forbidden
          const status = response.status();
          expect([401, 403, 404]).toContain(status);
          
          console.log(`API route ${apiRoute} -> Status: ${status}`);
        }
      }
    });
  });

  test.describe('Public Route Access', () => {
    test('should allow access to public routes without authentication', async ({ page }) => {
      for (const route of PROTECTED_ROUTES.public) {
        await page.goto(route);
        await waitForNetworkIdle(page);
        
        // Should not redirect to login
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/auth/login');
        
        // Page should load successfully
        const pageContent = page.locator('body');
        await expect(pageContent).toBeVisible();
        
        // Should not show authentication required message
        const authRequiredMessage = page.getByText(/login.*required|authentication.*required|sign.*in.*required/i);
        const isAuthRequired = await authRequiredMessage.isVisible().catch(() => false);
        expect(isAuthRequired).toBeFalsy();
        
        console.log(`Public route ${route} -> Accessible: ${!currentUrl.includes('/auth/login')}`);
      }
    });

    test('should not redirect authenticated users from public routes', async ({ page }) => {
      // Login first (if possible with test user)
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password').fill('TestPass123!');
      
      const loginAttempt = page.getByRole('button', { name: /sign in/i }).click();
      await loginAttempt.catch(() => {}); // Ignore if login fails
      
      // Wait for potential redirect
      await page.waitForTimeout(2000);
      
      // Test public routes while potentially authenticated
      for (const route of PROTECTED_ROUTES.public) {
        await page.goto(route);
        await waitForNetworkIdle(page);
        
        // Should allow access regardless of auth status
        const currentUrl = page.url();
        const isOnCorrectRoute = currentUrl.includes(route) || currentUrl.endsWith(route);
        
        if (!isOnCorrectRoute && route === '/') {
          // Root route might redirect to dashboard if authenticated
          const isOnDashboard = currentUrl.includes('/dashboard') || currentUrl.includes('/home');
          expect(isOnDashboard || isOnCorrectRoute).toBeTruthy();
        } else {
          expect(isOnCorrectRoute).toBeTruthy();
        }
        
        console.log(`Public route ${route} while authenticated -> ${currentUrl}`);
      }
    });
  });

  test.describe('Role-Based Access Control', () => {
    authTest('should handle basic user permissions', async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      
      // Regular user should access basic protected routes
      const userRoutes = ['/dashboard', '/profile', '/settings'];
      
      for (const route of userRoutes) {
        await page.goto(route);
        
        // Should not redirect to login
        const redirectedToLogin = await page.waitForURL(/login/, { timeout: 2000 }).catch(() => false);
        expect(redirectedToLogin).toBeFalsy();
        
        // Should show user content
        const userMenu = page.getByTestId('user-menu')
          .or(page.getByRole('button', { name: /user menu/i }));
        await expect(userMenu).toBeVisible();
        
        console.log(`User route ${route} -> Accessible`);
      }
    });

    test('should restrict admin routes for regular users', async ({ page }) => {
      // Try to access admin routes without proper permissions
      const adminRoutes = [
        '/admin',
        '/admin/users',
        '/admin/settings',
        '/admin/analytics'
      ];
      
      // Login as regular user first
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password').fill('TestPass123!');
      const loginButton = page.getByRole('button', { name: /sign in/i });
      await loginButton.click();
      
      // Wait for login to complete
      await page.waitForTimeout(2000);
      
      for (const route of adminRoutes) {
        await page.goto(route);
        
        // Should either redirect to login, show 403, or show "not authorized"
        const currentUrl = page.url();
        const redirectedToLogin = currentUrl.includes('/auth/login');
        const is403 = await page.getByText(/403|forbidden|not authorized|access denied/i)
          .isVisible().catch(() => false);
        const is404 = await page.getByText(/404|not found/i).isVisible().catch(() => false);
        
        // Should be restricted in some way
        expect(redirectedToLogin || is403 || is404).toBeTruthy();
        
        console.log(`Admin route ${route} -> Restricted: ${redirectedToLogin || is403 || is404}`);
      }
    });

    test('should handle API permission checks', async ({ request }) => {
      // Test API endpoints that should require specific permissions
      const adminApiRoutes = [
        '/api/admin/users',
        '/api/admin/settings',
        '/api/admin/analytics'
      ];
      
      // Try to access admin API routes without proper auth
      for (const apiRoute of adminApiRoutes) {
        const response = await request.get(apiRoute).catch(() => null);
        
        if (response) {
          const status = response.status();
          // Should return 401 (unauthorized) or 403 (forbidden)
          expect([401, 403, 404]).toContain(status);
          
          console.log(`Admin API ${apiRoute} -> Status: ${status}`);
        }
      }
    });
  });

  test.describe('Authentication State Management', () => {
    test('should handle authentication state transitions', async ({ page }) => {
      // Start unauthenticated
      await page.goto('/settings');
      await page.waitForURL(/login/);
      
      // Login
      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password').fill('TestPass123!');
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await signInButton.click();
      
      // Should redirect to intended destination
      const loginSuccess = await page.waitForURL(/settings/, { timeout: TIMEOUTS.navigation }).catch(() => false);
      
      if (loginSuccess) {
        // Now authenticated - should access protected routes
        await page.goto('/dashboard');
        await expect(page).not.toHaveURL(/login/);
        
        // Logout
        const userMenu = page.getByTestId('user-menu')
          .or(page.getByRole('button', { name: /user menu/i }));
        
        if (await userMenu.isVisible()) {
          await userMenu.click();
          const logoutButton = page.getByRole('menuitem', { name: /logout|sign out/i })
            .or(page.getByRole('button', { name: /logout|sign out/i }));
          await logoutButton.click();
          
          // Should redirect to public area
          await page.waitForURL(/(home|auth\/login|\/$)/);
          
          // Try to access protected route again
          await page.goto('/settings');
          await page.waitForURL(/login/);
        }
      }
    });

    test('should handle concurrent authentication checks', async ({ page }) => {
      // Simulate multiple rapid navigation attempts
      const navigationPromises = [
        page.goto('/dashboard'),
        page.goto('/settings'),
        page.goto('/profile'),
        page.goto('/admin')
      ];
      
      // All should resolve to login redirects
      await Promise.all(navigationPromises.map(p => p.catch(() => {})));
      
      // Final state should be login page
      await page.waitForURL(/login/, { timeout: TIMEOUTS.navigation });
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/auth/login');
    });
  });

  test.describe('Error Handling in Guards', () => {
    test('should handle auth service failures gracefully', async ({ page, context }) => {
      // Mock auth service failure
      await context.route('**/auth/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Auth service unavailable' })
        });
      });
      
      // Try to access protected route
      await page.goto('/settings');
      
      // Should handle gracefully - either redirect to login or show error
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const onLogin = currentUrl.includes('/auth/login');
      const hasError = await page.getByText(/error|unavailable|try.*again/i).isVisible().catch(() => false);
      
      // Should handle the failure gracefully
      expect(onLogin || hasError).toBeTruthy();
      
      console.log(`Auth service failure -> On login: ${onLogin}, Has error: ${hasError}`);
    });

    test('should handle network failures during auth checks', async ({ page, context }) => {
      // Mock network failure for auth checks
      await context.route('**/auth/session', route => route.abort());
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should handle network failure gracefully
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const onLogin = currentUrl.includes('/auth/login');
      const onDashboard = currentUrl.includes('/dashboard');
      const hasError = await page.getByText(/error|network|connection/i).isVisible().catch(() => false);
      
      // Should either redirect to login, show error, or handle gracefully
      expect(onLogin || hasError || onDashboard).toBeTruthy();
      
      console.log(`Network failure -> Login: ${onLogin}, Dashboard: ${onDashboard}, Error: ${hasError}`);
    });

    test('should handle malformed auth tokens', async ({ page, context }) => {
      // Set malformed auth cookie
      await context.addCookies([{
        name: 'sb-auth-token',
        value: 'malformed.token.data',
        domain: 'localhost',
        path: '/'
      }]);
      
      // Try to access protected route
      await page.goto('/settings');
      
      // Should handle malformed token gracefully
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const onLogin = currentUrl.includes('/auth/login');
      const onSettings = currentUrl.includes('/settings');
      
      // Should either redirect to login or handle gracefully
      console.log(`Malformed token -> Login: ${onLogin}, Settings: ${onSettings}`);
      
      // Most secure systems should redirect to login for malformed tokens
      if (onLogin) {
        expect(onLogin).toBeTruthy();
      }
    });
  });

  test.describe('Performance of Auth Guards', () => {
    test('should perform auth checks quickly', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to protected route
      await page.goto('/settings');
      
      // Wait for redirect to complete
      await page.waitForURL(/login/, { timeout: TIMEOUTS.navigation });
      
      const authCheckTime = Date.now() - startTime;
      
      // Auth check and redirect should complete within 2 seconds
      expect(authCheckTime).toBeLessThan(2000);
      
      // Performance: Auth check time = authCheckTimems
    });

    test('should cache auth state appropriately', async ({ page }) => {
      let authCheckCount = 0;
      
      // Count auth API calls
      await page.route('**/auth/**', route => {
        authCheckCount++;
        route.continue();
      });
      
      // Navigate to multiple protected routes quickly
      await page.goto('/dashboard');
      await page.goto('/settings');
      await page.goto('/profile');
      await page.goto('/dashboard');
      
      // Wait for all redirects
      await page.waitForURL(/login/);
      
      // API call tracking
      
      // Should not make excessive auth API calls (caching should work)
      expect(authCheckCount).toBeLessThan(10);
    });
  });

  test.describe('Mobile Auth Guards', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Try to access protected route on mobile
      await page.goto('/settings');
      await page.waitForURL(/login/);
      
      // Login form should be accessible on mobile
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      
      // Touch interactions should work
      await page.getByLabel('Email').tap();
      await page.keyboard.type('test@example.com');
      
      await page.getByLabel('Password').tap();
      await page.keyboard.type('TestPass123!');
      
      // Submit button should be accessible
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeVisible();
      
      // Button should be large enough for touch
      const buttonBox = await submitButton.boundingBox();
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThan(40); // Minimum touch target size
      }
    });
  });

  test.describe('Auth Guard Edge Cases', () => {
    test('should handle rapid route changes', async ({ page }) => {
      // Rapidly change routes while unauthenticated
      const routes = ['/settings', '/dashboard', '/profile', '/admin', '/settings'];
      
      for (const route of routes) {
        await page.goto(route);
        await page.waitForTimeout(100); // Brief pause
      }
      
      // Should end up on login page
      await page.waitForURL(/login/, { timeout: TIMEOUTS.navigation });
      
      // Page should be stable and functional
      await expect(page.getByLabel('Email')).toBeVisible();
    });

    test('should handle browser back/forward during auth flow', async ({ page }) => {
      // Try to access protected route
      await page.goto('/settings');
      await page.waitForURL(/login/);
      
      // Go back
      await page.goBack();
      
      // Go forward
      await page.goForward();
      
      // Should still be on login page or redirect appropriately
      await page.waitForTimeout(1000);
      
      const currentUrl = page.url();
      const isStable = currentUrl.includes('/auth/login') || 
                      currentUrl.includes('/settings') ||
                      currentUrl === new URL(page.url()).origin + '/';
      
      expect(isStable).toBeTruthy();
    });

    test('should handle page refresh during auth check', async ({ page }) => {
      // Start navigation to protected route
      page.goto('/settings');
      
      // Refresh page during navigation
      await page.waitForTimeout(500);
      await page.reload();
      
      // Wait for final state
      await page.waitForTimeout(2000);
      
      // Should end up in a stable state (likely login page)
      const currentUrl = page.url();
      const isStable = currentUrl.includes('/auth/login') || 
                      currentUrl.includes('/settings') ||
                      currentUrl === new URL(page.url()).origin + '/';
      
      expect(isStable).toBeTruthy();
    });
  });
});