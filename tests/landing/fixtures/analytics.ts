/**
 * Analytics testing utilities and fixtures
 */

import type { Page } from '@playwright/test';
import type { AnalyticsEvent, ConversionFunnel, MarketingTagType } from '../types';

/**
 * Analytics event tracker for testing
 */
export class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.setupTracking();
  }

  /**
   * Set up event tracking
   */
  private async setupTracking() {
    // Intercept analytics calls
    await this.page.addInitScript(() => {
      // Create a global array to store events
      (window as any).__analyticsEvents = [];

      // Override common analytics methods
      const analyticsProviders = ['gtag', 'ga', 'analytics', '_fbq', 'dataLayer'];
      
      analyticsProviders.forEach(provider => {
        if (provider === 'dataLayer') {
          // Google Tag Manager
          (window as any).dataLayer = new Proxy([], {
            set(target, property, value) {
              if (property === 'length') return true;
              (window as any).__analyticsEvents.push({
                provider: 'gtm',
                data: value,
                timestamp: Date.now(),
              });
              return Reflect.set(target, property, value);
            },
          });
        } else {
          // Other providers
          (window as any)[provider] = (...args: any[]) => {
            (window as any).__analyticsEvents.push({
              provider,
              args,
              timestamp: Date.now(),
            });
          };
        }
      });
    });
  }

  /**
   * Get all tracked events
   */
  async getEvents(): Promise<AnalyticsEvent[]> {
    const rawEvents = await this.page.evaluate(() => {
      return (window as any).__analyticsEvents || [];
    });

    // Parse and normalize events
    this.events = rawEvents.map((event: any) => this.parseEvent(event));
    return this.events;
  }

  /**
   * Parse raw event data into structured format
   */
  private parseEvent(rawEvent: any): AnalyticsEvent {
    const { provider, data, args, timestamp } = rawEvent;

    // Handle different provider formats
    if (provider === 'gtag' && args) {
      const [command, eventName, parameters] = args;
      if (command === 'event') {
        return {
          eventName,
          category: parameters?.event_category || 'engagement',
          action: parameters?.event_action || eventName,
          label: parameters?.event_label,
          value: parameters?.value,
          timestamp,
          metadata: parameters,
        };
      }
    }

    if (provider === 'gtm' && data) {
      return {
        eventName: data.event || 'unknown',
        category: data.eventCategory || 'general',
        action: data.eventAction || data.event,
        label: data.eventLabel,
        value: data.eventValue,
        timestamp,
        metadata: data,
      };
    }

    // Generic fallback
    return {
      eventName: 'unknown',
      category: provider,
      action: 'track',
      timestamp,
      metadata: { provider, data: data || args },
    };
  }

  /**
   * Wait for a specific event to be tracked
   */
  async waitForEvent(
    eventName: string,
    timeout = 5000
  ): Promise<AnalyticsEvent | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await this.getEvents();
      const event = this.events.find(e => e.eventName === eventName);
      if (event) return event;
      await this.page.waitForTimeout(100);
    }

    return null;
  }

  /**
   * Assert that an event was tracked with expected properties
   */
  async expectEvent(
    eventName: string,
    expectedProperties?: Partial<AnalyticsEvent>
  ): Promise<void> {
    const event = await this.waitForEvent(eventName);
    
    if (!event) {
      throw new Error(`Expected analytics event "${eventName}" was not tracked`);
    }

    if (expectedProperties) {
      Object.entries(expectedProperties).forEach(([key, value]) => {
        const actualValue = (event as any)[key];
        if (actualValue !== value) {
          throw new Error(
            `Event "${eventName}" property "${key}" mismatch. Expected: ${value}, Actual: ${actualValue}`
          );
        }
      });
    }
  }

  /**
   * Clear all tracked events
   */
  async clearEvents(): Promise<void> {
    this.events = [];
    await this.page.evaluate(() => {
      (window as any).__analyticsEvents = [];
    });
  }

  /**
   * Get events by category
   */
  getEventsByCategory(category: string): AnalyticsEvent[] {
    return this.events.filter(event => event.category === category);
  }

  /**
   * Get conversion funnel events
   */
  getFunnelEvents(funnelName: string): AnalyticsEvent[] {
    return this.events.filter(event => 
      event.metadata?.funnel === funnelName ||
      event.category === `funnel_${funnelName}`
    );
  }
}

/**
 * Test a complete conversion funnel
 */
export async function testConversionFunnel(
  page: Page,
  funnel: ConversionFunnel,
  analytics: AnalyticsTracker
): Promise<{
  completed: boolean;
  dropoffStage?: string;
  events: AnalyticsEvent[];
  duration: number;
}> {
  const startTime = Date.now();
  const funnelEvents: AnalyticsEvent[] = [];

  try {
    for (const stage of funnel.stages) {
      // Navigate to stage URL
      await page.goto(stage.url);
      await page.waitForLoadState('networkidle');

      // Check for expected events
      for (const expectedEvent of stage.events) {
        const event = await analytics.waitForEvent(expectedEvent.eventName, 5000);
        if (!event) {
          return {
            completed: false,
            dropoffStage: stage.name,
            events: funnelEvents,
            duration: Date.now() - startTime,
          };
        }
        funnelEvents.push(event);
      }
    }

    return {
      completed: true,
      events: funnelEvents,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      completed: false,
      dropoffStage: 'error',
      events: funnelEvents,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Verify marketing tags are present and loading
 */
export async function verifyMarketingTags(
  page: Page,
  expectedTags: MarketingTagType[]
): Promise<{
  tag: MarketingTagType;
  loaded: boolean;
  error?: string;
}[]> {
  const results = [];

  for (const tag of expectedTags) {
    const result = await verifyMarketingTag(page, tag);
    results.push(result);
  }

  return results;
}

/**
 * Verify a specific marketing tag
 */
async function verifyMarketingTag(
  page: Page,
  tag: MarketingTagType
): Promise<{
  tag: MarketingTagType;
  loaded: boolean;
  error?: string;
}> {
  try {
    switch (tag) {
      case 'google-analytics': {
        const hasGA = await page.evaluate(() => {
          return typeof (window as any).gtag === 'function' ||
                 typeof (window as any).ga === 'function';
        });
        return { tag, loaded: hasGA };
      }

      case 'google-tag-manager': {
        const hasGTM = await page.evaluate(() => {
          return Array.isArray((window as any).dataLayer);
        });
        return { tag, loaded: hasGTM };
      }

      case 'facebook-pixel': {
        const hasFBPixel = await page.evaluate(() => {
          return typeof (window as any).fbq === 'function';
        });
        return { tag, loaded: hasFBPixel };
      }

      case 'linkedin-insight': {
        const hasLinkedIn = await page.evaluate(() => {
          return typeof (window as any)._linkedin_data_partner_ids !== 'undefined';
        });
        return { tag, loaded: hasLinkedIn };
      }

      case 'twitter-pixel': {
        const hasTwitter = await page.evaluate(() => {
          return typeof (window as any).twq === 'function';
        });
        return { tag, loaded: hasTwitter };
      }

      case 'hotjar': {
        const hasHotjar = await page.evaluate(() => {
          return typeof (window as any).hj === 'function';
        });
        return { tag, loaded: hasHotjar };
      }

      case 'segment': {
        const hasSegment = await page.evaluate(() => {
          return typeof (window as any).analytics === 'object' &&
                 typeof (window as any).analytics.track === 'function';
        });
        return { tag, loaded: hasSegment };
      }

      default:
        return { tag, loaded: false, error: 'Unknown tag type' };
    }
  } catch (error) {
    return { tag, loaded: false, error: (error as Error).message };
  }
}

/**
 * Test UTM parameter tracking
 */
export async function testUTMTracking(
  page: Page,
  analytics: AnalyticsTracker,
  utmParams: Record<string, string>
): Promise<boolean> {
  // Build URL with UTM parameters
  const url = new URL(page.url());
  Object.entries(utmParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  // Navigate with UTM parameters
  await page.goto(url.toString());
  await page.waitForLoadState('networkidle');

  // Check if page view event contains UTM parameters
  const pageViewEvent = await analytics.waitForEvent('page_view', 3000);
  
  if (!pageViewEvent) return false;

  // Verify UTM parameters are tracked
  const metadata = pageViewEvent.metadata as any;
  return Object.entries(utmParams).every(([key, value]) => 
    metadata[key] === value || 
    metadata.page_location?.includes(`${key}=${value}`)
  );
}

/**
 * Create mock analytics response
 */
export function createMockAnalyticsResponse(
  events: AnalyticsEvent[]
): string {
  return `
    window.__mockAnalytics = {
      events: ${JSON.stringify(events)},
      track: function(event, properties) {
        this.events.push({
          eventName: event,
          ...properties,
          timestamp: Date.now()
        });
      }
    };
  `;
}

/**
 * Common conversion events
 */
export const CONVERSION_EVENTS = {
  pageView: (path: string): AnalyticsEvent => ({
    eventName: 'page_view',
    category: 'engagement',
    action: 'view',
    label: path,
    timestamp: Date.now(),
  }),
  
  ctaClick: (location: string, destination: string): AnalyticsEvent => ({
    eventName: 'cta_click',
    category: 'engagement',
    action: 'click',
    label: `${location}_to_${destination}`,
    timestamp: Date.now(),
    metadata: { location, destination },
  }),
  
  formSubmit: (formName: string): AnalyticsEvent => ({
    eventName: 'form_submit',
    category: 'conversion',
    action: 'submit',
    label: formName,
    timestamp: Date.now(),
  }),
  
  signupComplete: (method: string): AnalyticsEvent => ({
    eventName: 'sign_up',
    category: 'conversion',
    action: 'complete',
    label: method,
    value: 1,
    timestamp: Date.now(),
  }),
  
  purchaseComplete: (value: number, currency = 'USD'): AnalyticsEvent => ({
    eventName: 'purchase',
    category: 'conversion',
    action: 'complete',
    value,
    timestamp: Date.now(),
    metadata: { currency },
  }),
} as const;