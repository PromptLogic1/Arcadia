import { test, expect } from '@playwright/test';
import { waitForNetworkIdle } from '../helpers/test-utils';

test.describe('Navigation - Header & Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);
  });

  test('should display header with logo and navigation links', async ({
    page,
  }) => {
    // Check for header/navigation elements
    const header = page.locator('header, nav, [role="banner"]').first();
    await expect(header).toBeVisible();

    // Check for logo/brand - it might be text-based (NeonText component)
    const logo = page.locator('text=Arcadia').first();
    await expect(logo).toBeVisible();

    // Check for common navigation items
    const navItems = ['Home', 'About', 'Play', 'Community', 'Challenge'];

    for (const item of navItems) {
      // Use flexible selector that works with Link components
      const navLink = page
        .locator(
          `a:has-text("${item}"), button:has-text("${item}"), [href*="${item.toLowerCase()}"]`
        )
        .first();
      if ((await navLink.count()) > 0) {
        await expect(navLink).toBeVisible();
      }
    }
  });

  test('should have functioning mobile menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    // Look for mobile menu trigger (hamburger menu)
    const menuTrigger = page.locator(
      'button[aria-label*="menu"], button:has([data-lucide="menu"]), [data-testid="mobile-menu-trigger"]'
    );

    if ((await menuTrigger.count()) > 0) {
      await expect(menuTrigger).toBeVisible();

      // Click to open menu
      await menuTrigger.click();

      // Check that menu is open
      const mobileMenu = page.locator(
        '[role="menu"], .mobile-menu, [data-testid="mobile-menu"]'
      );
      if ((await mobileMenu.count()) > 0) {
        await expect(mobileMenu).toBeVisible();

        // Close menu
        const closeButton = page.locator(
          'button[aria-label*="close"], button:has([data-lucide="x"]), [data-testid="mobile-menu-close"]'
        );
        if ((await closeButton.count()) > 0) {
          await closeButton.click();
          await expect(mobileMenu).not.toBeVisible();
        }
      }
    }
  });

  test('should highlight active navigation items', async ({ page }) => {
    // Test navigation to About page
    const aboutLink = page
      .locator('a[href="/about"], a:has-text("About")')
      .first();

    if ((await aboutLink.count()) > 0) {
      await aboutLink.click();
      await page.waitForURL('/about');

      // Check that about link is highlighted/active
      const activeAboutLink = page
        .locator('a[href="/about"], a:has-text("About")')
        .first();
      const classes = (await activeAboutLink.getAttribute('class')) || '';

      // Check for common active state indicators
      expect(
        classes.includes('active') ||
          classes.includes('current') ||
          classes.includes('selected') ||
          classes.includes('neon-glow') ||
          (await activeAboutLink.getAttribute('aria-current')) === 'page'
      ).toBe(true);
    }
  });

  test('should maintain scroll position on navigation', async ({ page }) => {
    // Scroll down on homepage
    await page.evaluate(() => window.scrollTo(0, 500));
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Navigate to about page
    const aboutLink = page
      .locator('a[href="/about"], a:has-text("About")')
      .first();
    if ((await aboutLink.count()) > 0) {
      await aboutLink.click();
      await page.waitForURL('/about');

      // Navigate back
      await page.goBack();
      await page.waitForURL('/');

      // Check if scroll position is restored (within reasonable tolerance)
      const finalScrollY = await page.evaluate(() => window.scrollY);
      const scrollDifference = Math.abs(finalScrollY - initialScrollY);
      expect(scrollDifference).toBeLessThan(100);
    }
  });

  test('should handle keyboard navigation in header', async ({ page }) => {
    // Start from the top and tab through header elements
    await page.keyboard.press('Tab');

    // First should be skip link
    await expect(page.locator('text=Skip to main content')).toBeFocused();

    // Continue tabbing through header
    let tabCount = 0;
    const maxTabs = 10; // Prevent infinite loop

    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      tabCount++;

      const focusedElement = page.locator(':focus');
      if ((await focusedElement.count()) > 0) {
        const tagName = await focusedElement.evaluate(el => el.tagName);
        const role = await focusedElement.getAttribute('role');

        // If we've reached main content, header navigation is complete
        if (tagName === 'MAIN' || role === 'main') {
          break;
        }

        // Verify focused element is interactive
        if (['A', 'BUTTON', 'INPUT'].includes(tagName)) {
          await expect(focusedElement).toBeVisible();
        }
      }
    }
  });

  test('should display user menu when authenticated', async ({ page }) => {
    // Mock authentication state
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            userData: { email: 'test@example.com', firstName: 'Test' },
          },
        })
      );
    });

    await page.reload();

    // Look for user menu indicators
    const userMenu = page.locator(
      '[data-testid="user-menu"], .user-menu, button:has-text("Test"), [aria-label*="user"]'
    );

    if ((await userMenu.count()) > 0) {
      await expect(userMenu).toBeVisible();

      // Click to open user menu
      await userMenu.click();

      // Check for common user menu items
      const menuItems = ['Profile', 'Settings', 'Logout', 'Sign Out'];
      let foundMenuItem = false;

      for (const item of menuItems) {
        const menuItem = page.locator(`text=${item}`);
        if ((await menuItem.count()) > 0) {
          await expect(menuItem).toBeVisible();
          foundMenuItem = true;
        }
      }

      expect(foundMenuItem).toBe(true);
    }
  });

  test('should display auth buttons when not authenticated', async ({
    page,
  }) => {
    // Ensure clean auth state
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.reload();

    // Look for login/signup buttons
    const authButtons = page.locator(
      'a[href*="login"], a[href*="signup"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Sign Up")'
    );

    const authButtonCount = await authButtons.count();
    expect(authButtonCount).toBeGreaterThan(0);

    // Test login link functionality
    const loginButton = authButtons.first();
    await loginButton.click();

    // Should navigate to auth page or open auth modal
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(
      currentUrl.includes('/auth') ||
        currentUrl.includes('/login') ||
        (await page.locator('[role="dialog"], .modal').count()) > 0
    ).toBe(true);
  });

  test('should have theme toggle functionality', async ({ page }) => {
    // Look for theme toggle button
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], button[aria-label*="theme"], button:has([data-lucide="sun"]), button:has([data-lucide="moon"])'
    );

    if ((await themeToggle.count()) > 0) {
      await expect(themeToggle).toBeVisible();

      // Get initial theme
      const initialTheme = await page.evaluate(() => {
        return (
          document.documentElement.classList.contains('dark') ||
          document.documentElement.getAttribute('data-theme') ||
          localStorage.getItem('theme')
        );
      });

      // Click theme toggle
      await themeToggle.click();
      await page.waitForTimeout(300); // Wait for transition

      // Check that theme changed
      const newTheme = await page.evaluate(() => {
        return (
          document.documentElement.classList.contains('dark') ||
          document.documentElement.getAttribute('data-theme') ||
          localStorage.getItem('theme')
        );
      });

      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test('should handle search functionality if present', async ({ page }) => {
    // Look for search input or search button
    const searchTrigger = page.locator(
      'input[type="search"], [data-testid="search"], button[aria-label*="search"], button:has([data-lucide="search"])'
    );

    if ((await searchTrigger.count()) > 0) {
      await expect(searchTrigger).toBeVisible();

      // If it's a button, click to open search
      const tagName = await searchTrigger.evaluate(el => el.tagName);
      if (tagName === 'BUTTON') {
        await searchTrigger.click();

        // Look for search input after clicking
        const searchInput = page.locator(
          'input[type="search"], input[placeholder*="search"]'
        );
        if ((await searchInput.count()) > 0) {
          await expect(searchInput).toBeVisible();
          await expect(searchInput).toBeFocused();
        }
      } else {
        // Direct search input
        await searchTrigger.fill('test search');
        await expect(searchTrigger).toHaveValue('test search');
      }
    }
  });
});

test.describe('Navigation - Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display footer with required links', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check for footer element
    const footer = page.locator('footer, [role="contentinfo"]').first();
    await expect(footer).toBeVisible();

    // Check for common footer links
    const footerLinks = [
      'About',
      'Privacy',
      'Terms',
      'Contact',
      'Help',
      'Support',
    ];

    let foundLinks = 0;
    for (const linkText of footerLinks) {
      const link = page.locator(
        `footer a:has-text("${linkText}"), [role="contentinfo"] a:has-text("${linkText}")`
      );
      if ((await link.count()) > 0) {
        await expect(link).toBeVisible();
        foundLinks++;
      }
    }

    // Should have at least some footer links
    expect(foundLinks).toBeGreaterThan(0);
  });

  test('should handle external links securely', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Find external links (starting with http)
    const externalLinks = page.locator(
      'footer a[href^="http"], [role="contentinfo"] a[href^="http"]'
    );
    const externalLinkCount = await externalLinks.count();

    if (externalLinkCount > 0) {
      for (let i = 0; i < externalLinkCount; i++) {
        const link = externalLinks.nth(i);

        // Check security attributes
        await expect(link).toHaveAttribute('target', '_blank');

        const rel = await link.getAttribute('rel');
        expect(rel).toMatch(/noopener|noreferrer/);
      }
    }
  });

  test('should display social media links if present', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Look for social media links
    const socialMediaPatterns = [
      'github.com',
      'twitter.com',
      'discord',
      'linkedin.com',
      'youtube.com',
    ];

    for (const pattern of socialMediaPatterns) {
      const socialLink = page.locator(
        `footer a[href*="${pattern}"], [role="contentinfo"] a[href*="${pattern}"]`
      );

      if ((await socialLink.count()) > 0) {
        await expect(socialLink).toBeVisible();
        await expect(socialLink).toHaveAttribute('target', '_blank');
      }
    }
  });

  test('should contain copyright information', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Look for copyright text
    const copyrightText = page.locator(
      'footer text=/©|Copyright|All rights reserved/, [role="contentinfo"] text=/©|Copyright|All rights reserved/'
    );

    if ((await copyrightText.count()) > 0) {
      await expect(copyrightText).toBeVisible();

      // Should contain current year
      const currentYear = new Date().getFullYear().toString();
      const footerContent = await page
        .locator('footer, [role="contentinfo"]')
        .textContent();
      expect(footerContent).toContain(currentYear);
    }
  });
});

test.describe('Navigation - User Journey', () => {
  test('should support complete landing to play journey', async ({ page }) => {
    // Start at homepage
    await page.goto('/');

    // Find and click "Start Playing" CTA
    const startPlayingButton = page
      .locator(
        'button:has-text("Start Playing"), a:has-text("Start Playing"), button:has-text("Play Now")'
      )
      .first();

    if ((await startPlayingButton.count()) > 0) {
      await startPlayingButton.click();

      // Should navigate to play area
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(
        currentUrl.includes('/play') ||
          currentUrl.includes('/game') ||
          currentUrl.includes('/bingo') ||
          (await page.locator('text=/Play|Game|Select/').count()) > 0
      ).toBe(true);
    }
  });

  test('should support landing to community journey', async ({ page }) => {
    await page.goto('/');

    // Find and click community CTA
    const communityButton = page
      .locator(
        'button:has-text("Join Community"), a:has-text("Community"), a[href*="community"]'
      )
      .first();

    if ((await communityButton.count()) > 0) {
      await communityButton.click();

      // Should navigate to community
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(
        currentUrl.includes('/community') ||
          (await page.locator('text=/Community|Discussion|Chat/').count()) > 0
      ).toBe(true);
    }
  });

  test('should handle breadcrumb navigation if present', async ({ page }) => {
    // Navigate to a sub-page
    await page.goto('/about');

    // Look for breadcrumbs
    const breadcrumbs = page.locator(
      '[aria-label="breadcrumb"], .breadcrumb, nav[aria-label*="breadcrumb"]'
    );

    if ((await breadcrumbs.count()) > 0) {
      await expect(breadcrumbs).toBeVisible();

      // Should contain home link
      const homeLink = breadcrumbs.locator('a:has-text("Home"), a[href="/"]');
      if ((await homeLink.count()) > 0) {
        await homeLink.click();
        await page.waitForURL('/');
      }
    }
  });

  test('should maintain state during navigation', async ({ page }) => {
    // Set some application state (e.g., theme)
    await page.goto('/');

    // Toggle theme if available
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], button[aria-label*="theme"]'
    );
    if ((await themeToggle.count()) > 0) {
      await themeToggle.click();
      await page.waitForTimeout(300);

      const themeAfterToggle = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );

      // Navigate to another page
      await page.goto('/about');

      // Check that theme state is maintained
      const themeOnNewPage = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );

      expect(themeOnNewPage).toBe(themeAfterToggle);
    }
  });

  test('should handle back/forward browser navigation', async ({ page }) => {
    // Start at home
    await page.goto('/');

    // Navigate to about
    await page.goto('/about');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/');

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL('/about');

    // Verify page content loads correctly after navigation
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });
});
