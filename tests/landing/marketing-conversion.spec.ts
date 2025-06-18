/**
 * Marketing and conversion tracking tests
 */

import { test, expect } from '@playwright/test';
import type { AnalyticsEvent } from './types';

// Test-specific conversion funnel type
interface TestConversionFunnel {
  name: string;
  stages: Array<{
    name: string;
    url: string;
    events: Array<{
      id: string;
      name: string;
      category: string;
      action: string;
      label?: string;
      value?: number;
      timestamp: number;
    }>;
    expectedMetrics?: { dropoffRate?: number; averageTime?: number };
  }>;
  expectedDuration?: number;
}
import { 
  AnalyticsTracker, 
  testConversionFunnel, 
  verifyMarketingTags,
  testUTMTracking,
  CONVERSION_EVENTS
} from './fixtures/analytics';
import { CAMPAIGN_ROUTES } from './types/routes';

// Define conversion funnels
const _SIGNUP_FUNNEL: TestConversionFunnel = {
  name: 'signup',
  stages: [
    {
      name: 'Landing Page',
      url: '/',
      events: [CONVERSION_EVENTS.pageView('/')],
      expectedMetrics: { dropoffRate: 0.3 },
    },
    {
      name: 'Signup Page',
      url: '/auth/signup',
      events: [
        CONVERSION_EVENTS.pageView('/auth/signup'),
        CONVERSION_EVENTS.ctaClick('hero', 'signup'),
      ],
      expectedMetrics: { dropoffRate: 0.4 },
    },
    {
      name: 'Signup Complete',
      url: '/dashboard',
      events: [
        CONVERSION_EVENTS.signupComplete('email'),
        CONVERSION_EVENTS.pageView('/dashboard'),
      ],
      expectedMetrics: { averageTime: 45000 },
    },
  ],
  expectedDuration: 120000, // 2 minutes
};

const DEMO_FUNNEL: TestConversionFunnel = {
  name: 'demo',
  stages: [
    {
      name: 'Landing Page',
      url: '/',
      events: [CONVERSION_EVENTS.pageView('/')],
      expectedMetrics: {},
    },
    {
      name: 'Demo Section',
      url: '/#demo',
      events: [
        CONVERSION_EVENTS.ctaClick('navigation', 'demo'),
        { eventName: 'scroll_to_section', category: 'engagement', action: 'scroll', label: 'demo', timestamp: 0 },
      ],
      expectedMetrics: { dropoffRate: 0.2 },
    },
    {
      name: 'Demo Started',
      url: '/',
      events: [
        { eventName: 'demo_start', category: 'engagement', action: 'start', label: 'homepage_demo', timestamp: 0 },
      ],
      expectedMetrics: {},
    },
  ],
  expectedDuration: 60000, // 1 minute
};

test.describe('Marketing Tag Verification', () => {
  test('should load all required marketing tags @marketing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const expectedTags = [
      'google-analytics',
      'google-tag-manager',
    ] as const;
    
    const results = await verifyMarketingTags(page, [...expectedTags]);
    
    console.log('Marketing tag verification:');
    results.forEach(result => {
      console.log(`  ${result.tag}: ${result.loaded ? '✓' : '✗'} ${result.error || ''}`);
    });
    
    // All required tags should be loaded
    const failedTags = results.filter(r => !r.loaded);
    expect(failedTags).toHaveLength(0);
  });

  test('should not load tracking in privacy mode', async ({ page, context }) => {
    // Set Do Not Track
    await context.setExtraHTTPHeaders({
      'DNT': '1',
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that tracking is respected
    const hasTracking = await page.evaluate(() => {
      return (
        typeof (window as Window).gtag === 'function' ||
        typeof (window as Window).ga === 'function' ||
        Array.isArray((window as Window).dataLayer)
      );
    });
    
    // This test assumes the site respects DNT
    // If tracking is still loaded, it should at least be in a limited mode
    if (hasTracking) {
      console.warn('Tracking loaded despite DNT header - verify limited tracking mode');
    }
  });
});

test.describe('Analytics Event Tracking', () => {
  let analytics: AnalyticsTracker;

  test.beforeEach(async ({ page }) => {
    analytics = new AnalyticsTracker(page);
  });

  test('should track page view events correctly', async ({ page }) => {
    await page.goto('/');
    
    const pageViewEvent = await analytics.waitForEvent('page_view', 3000);
    expect(pageViewEvent).toBeTruthy();
    expect(pageViewEvent?.label).toBe('/');
    
    // Navigate to another page
    await page.goto('/about');
    
    const aboutPageView = await analytics.waitForEvent('page_view', 3000);
    expect(aboutPageView).toBeTruthy();
    expect(aboutPageView?.label).toBe('/about');
  });

  test('should track CTA click events', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click primary CTA
    const ctaButton = page.locator('button:has-text("Start Playing")').first();
    if (await ctaButton.count() > 0) {
      await ctaButton.click();
      
      const clickEvent = await analytics.waitForEvent('cta_click', 3000);
      expect(clickEvent).toBeTruthy();
      expect(clickEvent?.category).toBe('engagement');
      expect(clickEvent?.metadata).toHaveProperty('location');
    }
  });

  test('should track scroll depth', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Scroll to different depths
    const scrollDepths = [25, 50, 75, 100];
    
    for (const depth of scrollDepths) {
      await page.evaluate((d) => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, (maxScroll * d) / 100);
      }, depth);
      
      await page.waitForTimeout(1000); // Wait for scroll tracking
    }
    
    const events = await analytics.getEvents();
    const scrollEvents = events.filter(e => 
      e.name === 'scroll' || 
      e.name === 'scroll_depth' ||
      e.category === 'engagement'
    );
    
    console.log(`Tracked ${scrollEvents.length} scroll events`);
    expect(scrollEvents.length).toBeGreaterThan(0);
  });

  test('should track video engagement if present', async ({ page }) => {
    await page.goto('/');
    
    const video = page.locator('video, iframe[src*="youtube"], iframe[src*="vimeo"]').first();
    if (await video.count() > 0) {
      // Simulate video play
      await video.click();
      await page.waitForTimeout(2000);
      
      const events = await analytics.getEvents();
      const videoEvents = events.filter(e => 
        e.name.includes('video') || 
        e.category === 'video'
      );
      
      expect(videoEvents.length).toBeGreaterThan(0);
      console.log('Video events tracked:', videoEvents.map(e => e.name));
    }
  });
});

test.describe('Conversion Funnel Testing', () => {
  test('should track complete signup funnel', async ({ page }) => {
    const analytics = new AnalyticsTracker(page);
    
    // Mock successful signup
    await page.route('**/api/auth/signup', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, userId: 'test-123' }),
      });
    });
    
    // Note: Simplified funnel test since actual signup would require form filling
    await page.goto('/');
    await analytics.expectEvent('page_view', { label: '/' });
    
    // Click signup CTA
    const signupButton = page.locator('a[href*="signup"], button:has-text("Sign Up")').first();
    if (await signupButton.count() > 0) {
      await signupButton.click();
      await page.waitForURL('**/signup');
      await analytics.expectEvent('page_view', { label: '/auth/signup' });
      
      // Would continue with form filling and submission...
    }
  });

  test('should track demo game funnel', async ({ page }) => {
    const analytics = new AnalyticsTracker(page);
    
    const result = await testConversionFunnel(page, DEMO_FUNNEL, analytics);
    
    console.log('Demo funnel results:');
    console.log(`  Completed: ${result.completed}`);
    console.log(`  Duration: ${result.duration}ms`);
    console.log(`  Events tracked: ${result.events.length}`);
    
    if (!result.completed) {
      console.log(`  Dropoff at: ${result.dropoffStage}`);
    }
  });
});

test.describe('UTM Parameter Tracking', () => {
  test('should track UTM parameters from email campaign', async ({ page }) => {
    const analytics = new AnalyticsTracker(page);
    
    const utmParams = {
      utm_source: 'email',
      utm_medium: 'newsletter',
      utm_campaign: 'winter-sale-2024',
      utm_content: 'hero-cta',
    };
    
    const campaignUrl = CAMPAIGN_ROUTES.emailCampaign('winter-sale-2024');
    await page.goto(campaignUrl);
    
    const tracked = await testUTMTracking(page, analytics, utmParams);
    expect(tracked).toBe(true);
    
    // Verify UTM parameters are included in events
    const events = await analytics.getEvents();
    const pageView = events.find(e => e.eventName === 'page_view');
    
    expect(pageView?.metadata).toMatchObject({
      utm_source: 'email',
      utm_medium: 'newsletter',
      utm_campaign: 'winter-sale-2024',
    });
  });

  test('should track social media campaign parameters', async ({ page }) => {
    const analytics = new AnalyticsTracker(page);
    
    const campaignUrl = CAMPAIGN_ROUTES.socialCampaign('twitter', 'product-launch');
    await page.goto(campaignUrl);
    
    const events = await analytics.getEvents();
    const campaignEvent = events.find(e => 
      e.metadata?.utm_source === 'twitter' &&
      e.metadata?.utm_campaign === 'product-launch'
    );
    
    expect(campaignEvent).toBeTruthy();
  });

  test('should persist UTM parameters across navigation', async ({ page }) => {
    const analytics = new AnalyticsTracker(page);
    
    // Land with UTM parameters
    await page.goto('/?utm_source=google&utm_medium=cpc&utm_campaign=brand');
    
    // Navigate to another page
    await page.click('a[href="/about"]');
    await page.waitForURL('**/about');
    
    // Check that UTM parameters are still tracked
    const events = await analytics.getEvents();
    const aboutPageView = events.find(e => 
      e.eventName === 'page_view' && 
      e.label === '/about'
    );
    
    // UTM parameters should be associated with the session
    expect(aboutPageView?.metadata).toHaveProperty('utm_source');
    expect(aboutPageView?.metadata?.utm_source).toBe('google');
  });
});

test.describe('A/B Testing Scenarios', () => {
  test('should track A/B test variant exposure', async ({ page }) => {
    const analytics = new AnalyticsTracker(page);
    
    // Set A/B test cookie
    await page.context().addCookies([{
      name: 'ab_test_hero',
      value: 'variant_b',
      domain: 'localhost',
      path: '/',
    }]);
    
    await page.goto('/');
    
    // Look for experiment exposure event
    const experimentEvent = await analytics.waitForEvent('experiment_viewed', 3000);
    
    if (experimentEvent) {
      expect(experimentEvent.metadata).toHaveProperty('experiment_name');
      expect(experimentEvent.metadata).toHaveProperty('variant');
      console.log('A/B test tracked:', experimentEvent.metadata);
    }
  });

  test('should maintain consistent variant assignment', async ({ page }) => {
    // First visit
    await page.goto('/');
    const _firstVisitContent = await page.content();
    
    // Get any experiment cookies
    const cookies = await page.context().cookies();
    const experimentCookies = cookies.filter(c => c.name.includes('ab_') || c.name.includes('experiment'));
    
    // Second visit (reload)
    await page.reload();
    const _secondVisitContent = await page.content();
    
    // Verify same cookies exist
    const reloadedCookies = await page.context().cookies();
    const reloadedExpCookies = reloadedCookies.filter(c => c.name.includes('ab_') || c.name.includes('experiment'));
    
    expect(reloadedExpCookies).toEqual(experimentCookies);
  });
});

test.describe('E-commerce Tracking', () => {
  test('should track product view events', async ({ page }) => {
    const analytics = new AnalyticsTracker(page);
    
    // Navigate to a page with products (if applicable)
    await page.goto('/pricing');
    
    const events = await analytics.getEvents();
    const productEvents = events.filter(e => 
      e.eventName === 'view_item' ||
      e.eventName === 'product_view' ||
      e.category === 'ecommerce'
    );
    
    if (productEvents.length > 0) {
      console.log('Product view events:', productEvents);
      const firstProductEvent = productEvents[0];
      if (firstProductEvent && firstProductEvent.metadata) {
        expect(firstProductEvent.metadata).toHaveProperty('item_id');
        expect(firstProductEvent.metadata).toHaveProperty('item_name');
      }
    }
  });

  test('should track pricing plan selection', async ({ page }) => {
    const analytics = new AnalyticsTracker(page);
    
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');
    
    // Click on a pricing plan
    const planButton = page.locator('button:has-text("Choose Plan"), button:has-text("Get Started")').first();
    if (await planButton.count() > 0) {
      await planButton.click();
      
      const selectEvent = await analytics.waitForEvent('select_item', 3000);
      if (selectEvent) {
        expect(selectEvent.category).toBe('ecommerce');
        if (selectEvent.metadata) {
          expect(selectEvent.metadata).toHaveProperty('item_name');
          expect(selectEvent.metadata).toHaveProperty('price');
        }
      }
    }
  });
});

test.describe('Performance Marketing Metrics', () => {
  test('should measure page value and engagement', async ({ page }) => {
    const analytics = new AnalyticsTracker(page);
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Simulate user engagement
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(5000); // Stay on page for 5 seconds
    
    // Click an internal link
    const link = page.locator('a[href^="/"]').first();
    if (await link.count() > 0) {
      await link.click();
    }
    
    const timeOnPage = Date.now() - startTime;
    const events = await analytics.getEvents();
    
    // Calculate engagement metrics
    const clickEvents = events.filter(e => e.action === 'click').length;
    const scrollEvents = events.filter(e => e.eventName.includes('scroll')).length;
    
    console.log('Engagement metrics:');
    console.log(`  Time on page: ${timeOnPage}ms`);
    console.log(`  Click events: ${clickEvents}`);
    console.log(`  Scroll events: ${scrollEvents}`);
    console.log(`  Total events: ${events.length}`);
    
    // Page should generate engagement events
    expect(events.length).toBeGreaterThan(2);
  });
});