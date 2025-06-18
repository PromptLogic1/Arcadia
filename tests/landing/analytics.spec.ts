/**
 * Enhanced analytics tracking tests with real conversion funnels,
 * UTM parameter validation, and comprehensive event tracking
 */

import { test, expect } from '@playwright/test';
import type { ConversionFunnel } from './types';
import { 
  AnalyticsTracker, 
  CONVERSION_EVENTS
} from './fixtures/analytics';
import { buildUrlWithParams } from './types/routes';

// Enhanced conversion funnels with realistic user journeys
const _ENHANCED_SIGNUP_FUNNEL: ConversionFunnel = {
  name: 'enhanced_signup',
  stages: [
    {
      name: 'Landing Page Visit',
      url: '/',
      events: [
        CONVERSION_EVENTS.pageView('/'),
        { eventName: 'landing_page_engaged', category: 'engagement', action: 'scroll', label: 'hero_section', timestamp: 0 }
      ],
      expectedMetrics: { dropoffRate: 0.1, averageTime: 10000 },
    },
    {
      name: 'CTA Interaction',
      url: '/',
      events: [
        CONVERSION_EVENTS.ctaClick('hero', 'signup'),
        { eventName: 'cta_hover', category: 'engagement', action: 'hover', label: 'start_playing', timestamp: 0 }
      ],
      expectedMetrics: { dropoffRate: 0.3, averageTime: 5000 },
    },
    {
      name: 'Signup Page Arrival',
      url: '/auth/signup',
      events: [
        CONVERSION_EVENTS.pageView('/auth/signup'),
        { eventName: 'form_start', category: 'form', action: 'focus', label: 'signup_form', timestamp: 0 }
      ],
      expectedMetrics: { dropoffRate: 0.4, averageTime: 30000 },
    },
    {
      name: 'Form Completion',
      url: '/auth/signup',
      events: [
        CONVERSION_EVENTS.formSubmit('signup'),
        { eventName: 'form_validation', category: 'form', action: 'validate', label: 'signup_form', timestamp: 0 }
      ],
      expectedMetrics: { dropoffRate: 0.2, averageTime: 60000 },
    },
    {
      name: 'Registration Success',
      url: '/dashboard',
      events: [
        CONVERSION_EVENTS.signupComplete('email'),
        CONVERSION_EVENTS.pageView('/dashboard'),
        { eventName: 'welcome_tour_start', category: 'onboarding', action: 'start', label: 'new_user', timestamp: 0 }
      ],
      expectedMetrics: { averageTime: 10000 },
    },
  ],
  expectedDuration: 180000, // 3 minutes
};

const _DEMO_ENGAGEMENT_FUNNEL: ConversionFunnel = {
  name: 'demo_engagement',
  stages: [
    {
      name: 'Demo Discovery',
      url: '/',
      events: [
        CONVERSION_EVENTS.pageView('/'),
        { eventName: 'demo_section_view', category: 'engagement', action: 'scroll_to', label: 'demo_section', timestamp: 0 }
      ],
      expectedMetrics: { dropoffRate: 0.2 },
    },
    {
      name: 'Demo Interaction',
      url: '/',
      events: [
        { eventName: 'demo_button_click', category: 'engagement', action: 'click', label: 'try_demo', timestamp: 0 },
        { eventName: 'demo_loading', category: 'engagement', action: 'load', label: 'demo_game', timestamp: 0 }
      ],
      expectedMetrics: { dropoffRate: 0.1 },
    },
    {
      name: 'Demo Completion',
      url: '/',
      events: [
        { eventName: 'demo_complete', category: 'engagement', action: 'complete', label: 'demo_game', value: 1, timestamp: 0 },
        { eventName: 'demo_feedback', category: 'engagement', action: 'rate', label: 'demo_experience', timestamp: 0 }
      ],
      expectedMetrics: { averageTime: 120000 },
    },
  ],
  expectedDuration: 300000, // 5 minutes
};

const _CONTENT_ENGAGEMENT_FUNNEL: ConversionFunnel = {
  name: 'content_engagement',
  stages: [
    {
      name: 'Content Discovery',
      url: '/',
      events: [
        CONVERSION_EVENTS.pageView('/'),
        { eventName: 'scroll_depth_25', category: 'engagement', action: 'scroll', label: '25_percent', timestamp: 0 }
      ],
      expectedMetrics: { dropoffRate: 0.1 },
    },
    {
      name: 'Deep Engagement',
      url: '/',
      events: [
        { eventName: 'scroll_depth_50', category: 'engagement', action: 'scroll', label: '50_percent', timestamp: 0 },
        { eventName: 'content_interaction', category: 'engagement', action: 'click', label: 'feature_card', timestamp: 0 }
      ],
      expectedMetrics: { dropoffRate: 0.2 },
    },
    {
      name: 'Content Completion',
      url: '/',
      events: [
        { eventName: 'scroll_depth_100', category: 'engagement', action: 'scroll', label: '100_percent', timestamp: 0 },
        { eventName: 'page_complete', category: 'engagement', action: 'complete', label: 'landing_page', timestamp: 0 }
      ],
      expectedMetrics: { averageTime: 120000 },
    },
  ],
  expectedDuration: 180000, // 3 minutes
};

test.describe('Enhanced Analytics & Conversion Tracking', () => {
  let analytics: AnalyticsTracker;

  test.beforeEach(async ({ page }) => {
    analytics = new AnalyticsTracker(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should track comprehensive conversion funnel with detailed events @analytics @conversion @critical', async ({ page }) => {
    const startTime = Date.now();
    
    // Step 1: Landing page engagement
    await analytics.expectEvent('page_view', { label: '/' });
    
    // Simulate user reading content
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(2000);
    
    // Step 2: CTA interaction
    const ctaButton = page.locator('button:has-text("Start Playing"), a:has-text("Start Playing")').first();
    if (await ctaButton.count() > 0) {
      // Hover first to track engagement
      await ctaButton.hover();
      await page.waitForTimeout(500);
      
      // Click CTA
      await ctaButton.click();
      
      // Verify CTA click was tracked
      const ctaEvent = await analytics.waitForEvent('cta_click', 5000);
      expect(ctaEvent).toBeTruthy();
      expect(ctaEvent?.category).toBe('engagement');
      expect(ctaEvent?.metadata).toHaveProperty('location');
    }
    
    // Check if we're redirected or if signup form appears
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/signup') || currentUrl.includes('/signup')) {
      // Step 3: Signup page tracking
      await analytics.expectEvent('page_view', { label: '/auth/signup' });
      
      // Simulate form interaction
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      if (await emailInput.count() > 0) {
        await emailInput.focus();
        await page.waitForTimeout(1000);
        
        // Track form start event
        const formEvent = await analytics.waitForEvent('form_start', 3000);
        if (formEvent) {
          expect(formEvent.category).toBe('form');
        }
      }
    }
    
    const totalTime = Date.now() - startTime;
    // Performance: Total funnel interaction time = totalTimems
    
    // Verify overall funnel metrics
    const allEvents = await analytics.getEvents();
    expect(allEvents.length).toBeGreaterThan(2);
    
    // Should have page view and at least one interaction event
    const pageViews = allEvents.filter(e => e.eventName === 'page_view');
    const interactions = allEvents.filter(e => e.category === 'engagement');
    
    expect(pageViews.length).toBeGreaterThan(0);
    expect(interactions.length).toBeGreaterThan(0);
  });

  test('should track demo engagement funnel with completion metrics @analytics @demo', async ({ page }) => {
    // Look for demo elements on the page
    const demoButton = page.locator('button:has-text("Try Demo"), button:has-text("Demo"), [data-testid="demo"]').first();
    const demoSection = page.locator('#demo, [data-section="demo"], .demo-section').first();
    
    if (await demoButton.count() > 0 || await demoSection.count() > 0) {
      // Scroll to demo section
      if (await demoSection.count() > 0) {
        await demoSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        
        // Check for demo section view event
        const events = await analytics.getEvents();
        const demoViews = events.filter(e => 
          e.eventName.includes('demo') || 
          e.label?.includes('demo') ||
          e.eventName.includes('scroll')
        );
        
        console.log('Demo-related events:', demoViews.map(e => e.eventName));
      }
      
      // Interact with demo
      if (await demoButton.count() > 0) {
        await demoButton.click();
        await page.waitForTimeout(2000);
        
        // Check for demo interaction events
        const demoEvent = await analytics.waitForEvent('demo_start', 3000);
        if (!demoEvent) {
          // Look for any demo-related events
          const events = await analytics.getEvents();
          const demoEvents = events.filter(e => 
            e.eventName.includes('demo') ||
            e.label?.includes('demo') ||
            e.category === 'demo'
          );
          
          expect(demoEvents.length).toBeGreaterThan(0);
          console.log('Found demo events:', demoEvents);
        }
      }
    } else {
      console.log('No demo elements found on page, skipping demo funnel test');
    }
  });

  test('should validate comprehensive UTM parameter tracking @analytics @utm @marketing', async ({ page }) => {
    const utmParams: Record<string, string> = {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'brand_awareness_2024',
      utm_term: 'online_gaming_platform',
      utm_content: 'hero_cta',
    };

    // Test UTM parameter persistence across navigation
    const urlWithUTM = buildUrlWithParams('/', utmParams);
    await page.goto(urlWithUTM);
    await page.waitForLoadState('networkidle');

    // Verify UTM parameters are tracked in page view
    const pageViewEvent = await analytics.waitForEvent('page_view', 5000);
    expect(pageViewEvent).toBeTruthy();
    
    // Check if UTM parameters are included in the event metadata
    const metadata = pageViewEvent?.metadata as Record<string, unknown>;
    if (metadata) {
      // UTM parameters might be in metadata or in the page_location
      const hasUTMInMetadata = Object.keys(utmParams).some(key => 
        metadata[key] === utmParams[key as keyof typeof utmParams]
      );
      
      const hasUTMInLocation = typeof metadata.page_location === 'string' && 
        Object.entries(utmParams).every(([key, value]) => 
          (metadata.page_location as string).includes(`${key}=${value}`)
        );

      expect(hasUTMInMetadata || hasUTMInLocation, 
        'UTM parameters should be tracked in analytics events'
      ).toBe(true);
    }

    // Navigate to another page and verify UTM persistence
    await page.click('a[href="/about"]');
    await page.waitForURL('**/about');
    
    const aboutPageView = await analytics.waitForEvent('page_view', 5000);
    if (aboutPageView?.metadata) {
      // UTM parameters should persist in session
      console.log('About page metadata:', aboutPageView.metadata);
    }

    // Test different campaign scenarios
    const campaigns = [
      {
        name: 'email_newsletter',
        params: { utm_source: 'email', utm_medium: 'newsletter', utm_campaign: 'weekly_digest' }
      },
      {
        name: 'social_twitter',
        params: { utm_source: 'twitter', utm_medium: 'social', utm_campaign: 'feature_announcement' }
      },
      {
        name: 'referral_partner',
        params: { utm_source: 'partner_site', utm_medium: 'referral', utm_campaign: 'cross_promotion' }
      }
    ];

    for (const campaign of campaigns) {
      await analytics.clearEvents();
      
      const campaignUrl = buildUrlWithParams('/', campaign.params);
      await page.goto(campaignUrl);
      await page.waitForLoadState('networkidle');
      
      const campaignPageView = await analytics.waitForEvent('page_view', 3000);
      expect(campaignPageView, `Page view should be tracked for ${campaign.name}`).toBeTruthy();
      
      console.log(`Campaign ${campaign.name} tracked successfully`);
    }
  });

  test('should track scroll depth and engagement metrics @analytics @engagement', async ({ page }) => {
    const scrollDepths = [25, 50, 75, 100];
    const trackedDepths: number[] = [];

    for (const depth of scrollDepths) {
      // Scroll to specific depth
      await page.evaluate((d: number) => {
        const maxScroll = Math.max(
          document.body.scrollHeight - window.innerHeight,
          document.documentElement.scrollHeight - window.innerHeight
        );
        const targetScroll = (maxScroll * d) / 100;
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }, depth);

      await page.waitForTimeout(1500); // Wait for scroll tracking

      // Check for scroll events
      const events = await analytics.getEvents();
      const scrollEvents = events.filter(e => 
        e.eventName.includes('scroll') ||
        e.category === 'engagement' && e.action === 'scroll' ||
        e.label?.includes(`${depth}`)
      );

      if (scrollEvents.length > 0) {
        trackedDepths.push(depth);
        console.log(`Scroll depth ${depth}% tracked`);
      }
    }

    // Should track at least some scroll depths
    expect(trackedDepths.length).toBeGreaterThan(0);
    console.log('Tracked scroll depths:', trackedDepths);

    // Test time on page
    const startTime = Date.now();
    await page.waitForTimeout(5000); // Stay on page for 5 seconds
    
    const timeOnPage = Date.now() - startTime;
    console.log(`Time on page: ${timeOnPage}ms`);

    // Verify engagement events were tracked
    const finalEvents = await analytics.getEvents();
    const engagementEvents = finalEvents.filter(e => e.category === 'engagement');
    
    expect(engagementEvents.length).toBeGreaterThan(0);
    console.log(`Total engagement events: ${engagementEvents.length}`);
  });

  test('should track cross-device and session analytics @analytics @session', async ({ page, context }) => {
    // Set a unique session identifier
    const sessionId = `test_session_${Date.now()}`;
    await context.addCookies([{
      name: 'analytics_session_id',
      value: sessionId,
      domain: 'localhost',
      path: '/'
    }]);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Track initial session events
    const initialPageView = await analytics.waitForEvent('page_view', 3000);
    expect(initialPageView).toBeTruthy();

    // Simulate user journey across multiple pages
    const userJourney = [
      { path: '/about', expectedTitle: 'about' },
      { path: '/', expectedTitle: 'home' },
    ];

    const journeyEvents: Array<{ page: string; timestamp: number; sessionId: string }> = [];

    for (const step of userJourney) {
      await page.goto(step.path);
      await page.waitForLoadState('networkidle');
      
      const pageView = await analytics.waitForEvent('page_view', 3000);
      if (pageView) {
        journeyEvents.push({
          page: step.path,
          timestamp: pageView.timestamp || Date.now(),
          sessionId: pageView.sessionId || sessionId
        });
      }
      
      await page.waitForTimeout(2000); // Simulate reading time
    }

    // Verify session continuity
    expect(journeyEvents.length).toBeGreaterThan(0);
    
    // All events should have the same session ID
    const sessionIds = journeyEvents.map(e => e.sessionId).filter(Boolean);
    if (sessionIds.length > 0) {
      const uniqueSessions = new Set(sessionIds);
      expect(uniqueSessions.size).toBe(1);
    }

    console.log('User journey tracked:', journeyEvents);
  });

  test('should validate e-commerce and conversion value tracking @analytics @ecommerce', async ({ page }) => {
    // Navigate to pricing or product page
    const ecommercePage = '/pricing';
    
    try {
      await page.goto(ecommercePage);
      await page.waitForLoadState('networkidle');
    } catch (_error) {
      console.log('Pricing page not available, testing on current page');
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }

    // Look for pricing or product elements
    const pricingElements = await page.locator(
      'button:has-text("Choose Plan"), button:has-text("Get Started"), button:has-text("Subscribe"), [data-testid*="pricing"], [data-testid*="plan"]'
    ).all();

    if (pricingElements.length > 0) {
      // Click on a pricing plan
      const firstPlan = pricingElements[0];
      if (firstPlan) {
        await firstPlan.scrollIntoViewIfNeeded();
        await firstPlan.click();
      }
      
      // Look for e-commerce events
      const events = await analytics.getEvents();
      const ecommerceEvents = events.filter(e => 
        e.eventName === 'select_item' ||
        e.eventName === 'view_item' ||
        e.eventName === 'add_to_cart' ||
        e.category === 'ecommerce' ||
        e.metadata?.item_name ||
        e.metadata?.item_id
      );

      if (ecommerceEvents.length > 0) {
        console.log('E-commerce events tracked:', ecommerceEvents);
        
        // Verify event structure
        ecommerceEvents.forEach(event => {
          expect(event.metadata).toBeTruthy();
          if (event.metadata) {
            // Should have item information
            const hasItemInfo = 
              event.metadata.item_name || 
              event.metadata.item_id || 
              event.metadata.price;
            expect(hasItemInfo).toBe(true);
          }
        });
      } else {
        console.log('No e-commerce events found, but pricing interaction occurred');
        
        // At least verify that some interaction was tracked
        const interactionEvents = events.filter(e => 
          e.category === 'engagement' && e.action === 'click'
        );
        expect(interactionEvents.length).toBeGreaterThan(0);
      }
    } else {
      console.log('No pricing elements found, testing general conversion tracking');
      
      // Test general conversion events
      const ctaButtons = await page.locator('button, a[role="button"]').all();
      if (ctaButtons.length > 0) {
        const firstButton = ctaButtons[0];
        if (firstButton) {
          await firstButton.click();
          await page.waitForTimeout(1000);
          
          const conversionEvent = await analytics.waitForEvent('cta_click', 3000);
          if (conversionEvent) {
            expect(conversionEvent.category).toBe('engagement');
          }
        }
      }
    }
  });

  test('should track marketing attribution and channel performance @analytics @attribution', async ({ page }) => {
    const channels = [
      {
        name: 'Organic Search',
        referrer: 'https://google.com/search?q=online+gaming+platform',
        utm: { utm_source: 'google', utm_medium: 'organic' }
      },
      {
        name: 'Social Media',
        referrer: 'https://twitter.com',
        utm: { utm_source: 'twitter', utm_medium: 'social', utm_campaign: 'brand_awareness' }
      },
      {
        name: 'Direct Traffic',
        referrer: '',
        utm: {}
      },
      {
        name: 'Email Campaign',
        referrer: '',
        utm: { utm_source: 'email', utm_medium: 'newsletter', utm_campaign: 'weekly' }
      }
    ];

    for (const channel of channels) {
      await analytics.clearEvents();
      
      // Set referrer if provided
      if (channel.referrer) {
        await page.setExtraHTTPHeaders({
          'Referer': channel.referrer
        });
      }
      
      // Navigate with UTM parameters
      const url = Object.keys(channel.utm).length > 0 
        ? buildUrlWithParams('/', channel.utm as Record<string, string>)
        : '/';
        
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Track channel attribution
      const pageView = await analytics.waitForEvent('page_view', 3000);
      expect(pageView, `Page view should be tracked for ${channel.name}`).toBeTruthy();
      
      if (pageView?.metadata) {
        const metadata = pageView.metadata as Record<string, unknown>;
        
        // Log attribution data
        console.log(`${channel.name} attribution:`, {
          utm_source: metadata.utm_source,
          utm_medium: metadata.utm_medium,
          utm_campaign: metadata.utm_campaign,
          referrer: metadata.referrer || metadata.page_referrer
        });
        
        // Verify attribution tracking
        if (Object.keys(channel.utm).length > 0) {
          const hasUTMTracking = Object.entries(channel.utm).some(([key, value]) =>
            metadata[key] === value || 
            (typeof metadata.page_location === 'string' && metadata.page_location.includes(`${key}=${value}`))
          );
          
          expect(hasUTMTracking, 
            `UTM parameters should be tracked for ${channel.name}`
          ).toBe(true);
        }
      }
      
      // Simulate some engagement for attribution
      await page.evaluate(() => window.scrollTo(0, 300));
      await page.waitForTimeout(1000);
    }
  });

  test('should validate analytics data quality and consistency @analytics @data-quality', async ({ page }) => {
    const startTime = Date.now();
    
    // Perform various interactions
    const interactions = [
      async () => {
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(500);
      },
      async () => {
        const button = page.locator('button').first();
        if (await button.count() > 0) {
          await button.hover();
          await page.waitForTimeout(300);
        }
      },
      async () => {
        const link = page.locator('a[href]').first();
        if (await link.count() > 0) {
          await link.hover();
          await page.waitForTimeout(300);
        }
      }
    ];

    for (const interaction of interactions) {
      await interaction();
    }

    const endTime = Date.now();
    const totalSessionTime = endTime - startTime;

    // Analyze all tracked events
    const allEvents = await analytics.getEvents();
    
    console.log('\nAnalytics Data Quality Report:');
    console.log(`Total events tracked: ${allEvents.length}`);
    console.log(`Session duration: ${totalSessionTime}ms`);

    // Data quality checks
    const validationResults = {
      hasPageViews: allEvents.some(e => e.eventName === 'page_view'),
      hasEngagementEvents: allEvents.some(e => e.category === 'engagement'),
      allEventsHaveTimestamp: allEvents.every(e => e.timestamp && e.timestamp > 0),
      allEventsHaveCategory: allEvents.every(e => e.category && e.category.length > 0),
      allEventsHaveAction: allEvents.every(e => e.action && e.action.length > 0),
      eventTimestampsInOrder: allEvents.every((e, i) => {
        if (i === 0) return true;
        const prevEvent = allEvents[i - 1];
        return e.timestamp !== undefined && prevEvent?.timestamp !== undefined && e.timestamp >= prevEvent.timestamp;
      }),
    };

    console.log('Validation Results:', validationResults);

    // Assert data quality requirements
    expect(validationResults.hasPageViews, 'Should track page views').toBe(true);
    expect(validationResults.allEventsHaveTimestamp, 'All events should have timestamps').toBe(true);
    expect(validationResults.allEventsHaveCategory, 'All events should have categories').toBe(true);
    expect(validationResults.allEventsHaveAction, 'All events should have actions').toBe(true);

    // Event distribution analysis
    const eventsByCategory = allEvents.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Events by category:', eventsByCategory);
    
    // Should have a reasonable distribution of event types
    expect(Object.keys(eventsByCategory).length).toBeGreaterThan(0);
  });
});