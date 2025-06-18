/**
 * Analytics testing utilities and fixtures
 */

import type { Page } from '@playwright/test';
import type { 
  AnalyticsEvent, 
  ConversionFunnel, 
  MarketingTagType 
} from '../types';
import type { TestWindow } from '../../types/test-types';

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
      (window as TestWindow).__analyticsEvents = [];

      // Override common analytics methods
      const analyticsProviders = ['gtag', 'ga', 'analytics', '_fbq', 'dataLayer'];
      
      analyticsProviders.forEach(provider => {
        if (provider === 'dataLayer') {
          // Google Tag Manager
          (window as TestWindow).dataLayer = new Proxy([], {
            set(target, property, value) {
              if (property === 'length') return true;
              (window as TestWindow).__analyticsEvents?.push({
                provider: 'gtm',
                data: value,
                timestamp: Date.now(),
              });
              return Reflect.set(target, property, value);
            },
          });
        } else {
          // Other providers
          const win = window as TestWindow;
          const func = (...args: unknown[]) => {
            win.__analyticsEvents?.push({
              provider,
              data: args[0],
              args,
              timestamp: Date.now(),
            });
          };
          (win as unknown as Record<string, unknown>)[provider] = func;
        }
      });
    });
  }

  /**
   * Get all tracked events
   */
  async getEvents(): Promise<AnalyticsEvent[]> {
    const rawEvents = await this.page.evaluate(() => {
      return (window as TestWindow).__analyticsEvents || [];
    });

    // Parse and normalize events
    this.events = rawEvents.map((event: unknown) => this.parseEvent(event));
    return this.events;
  }

  /**
   * Parse raw event data into structured format
   */
  private parseEvent(rawEvent: unknown): AnalyticsEvent {
    if (!rawEvent || typeof rawEvent !== 'object') {
      throw new Error('Invalid event data');
    }
    
    const event = rawEvent as { provider?: string; data?: unknown; args?: unknown[]; timestamp?: number };
    const { provider = '', data, args, timestamp = Date.now() } = event;

    // Handle different provider formats
    if (provider === 'gtag' && args) {
      const [command, eventName, parameters] = args;
      if (command === 'event') {
        const params = parameters && typeof parameters === 'object' ? parameters as Record<string, unknown> : {};
        return {
          id: crypto.randomUUID(),
          name: eventName as string,
          category: (params.event_category as string) || 'engagement',
          action: (params.event_action as string) || (eventName as string),
          label: params.event_label as string | undefined,
          value: params.value as number | undefined,
          timestamp: new Date(timestamp),
          metadata: params,
        };
      }
    }

    if (provider === 'gtm' && data && typeof data === 'object') {
      const gtmData = data as Record<string, unknown>;
      return {
        id: crypto.randomUUID(),
        name: (gtmData.event as string) || 'unknown',
        category: (gtmData.eventCategory as string) || 'general',
        action: (gtmData.eventAction as string) || (gtmData.event as string) || 'unknown',
        label: gtmData.eventLabel as string | undefined,
        value: gtmData.eventValue as number | undefined,
        timestamp: new Date(timestamp),
        metadata: gtmData as Record<string, unknown>,
      };
    }

    // Generic fallback
    return {
      id: crypto.randomUUID(),
      name: 'unknown',
      category: provider,
      action: 'track',
      timestamp: new Date(timestamp),
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
      const event = this.events.find(e => e.name === eventName);
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
        const actualValue = (event as unknown as Record<string, unknown>)[key];
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
      (window as TestWindow).__analyticsEvents = [];
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
        const event = await analytics.waitForEvent(expectedEvent.name, 5000);
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
          return typeof (window as TestWindow).gtag === 'function' ||
                 typeof (window as TestWindow).ga === 'function';
        });
        return { tag, loaded: hasGA };
      }

      case 'google-tag-manager': {
        const hasGTM = await page.evaluate(() => {
          return Array.isArray((window as TestWindow).dataLayer);
        });
        return { tag, loaded: hasGTM };
      }

      case 'facebook-pixel': {
        const hasFBPixel = await page.evaluate(() => {
          return typeof (window as TestWindow).fbq === 'function';
        });
        return { tag, loaded: hasFBPixel };
      }

      case 'linkedin-insight': {
        const hasLinkedIn = await page.evaluate(() => {
          return typeof (window as TestWindow)._linkedin_data_partner_ids !== 'undefined';
        });
        return { tag, loaded: hasLinkedIn };
      }

      case 'twitter-pixel': {
        const hasTwitter = await page.evaluate(() => {
          return typeof (window as TestWindow).twq === 'function';
        });
        return { tag, loaded: hasTwitter };
      }

      case 'hotjar': {
        const hasHotjar = await page.evaluate(() => {
          return typeof (window as TestWindow).hj === 'function';
        });
        return { tag, loaded: hasHotjar };
      }

      case 'segment': {
        const hasSegment = await page.evaluate(() => {
          return typeof (window as TestWindow).analytics === 'object' &&
                 (window as TestWindow).analytics !== null &&
                 typeof (window as TestWindow).analytics?.track === 'function';
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
  const metadata = pageViewEvent.metadata;
  if (!metadata || typeof metadata !== 'object') return false;
  
  const metadataObj = metadata as Record<string, unknown>;
  return Object.entries(utmParams).every(([key, value]) => 
    metadataObj[key] === value || 
    (typeof metadataObj.page_location === 'string' && metadataObj.page_location.includes(`${key}=${value}`))
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
    id: crypto.randomUUID(),
    name: 'page_view',
    category: 'engagement',
    action: 'view',
    label: path,
    timestamp: new Date(),
  }),
  
  ctaClick: (location: string, destination: string): AnalyticsEvent => ({
    id: crypto.randomUUID(),
    name: 'cta_click',
    category: 'engagement',
    action: 'click',
    label: `${location}_to_${destination}`,
    timestamp: new Date(),
    metadata: { location, destination },
  }),
  
  formSubmit: (formName: string): AnalyticsEvent => ({
    id: crypto.randomUUID(),
    name: 'form_submit',
    category: 'conversion',
    action: 'submit',
    label: formName,
    timestamp: new Date(),
  }),
  
  signupComplete: (method: string): AnalyticsEvent => ({
    id: crypto.randomUUID(),
    name: 'sign_up',
    category: 'conversion',
    action: 'complete',
    label: method,
    value: 1,
    timestamp: new Date(),
  }),
  
  purchaseComplete: (value: number, currency = 'USD'): AnalyticsEvent => ({
    id: crypto.randomUUID(),
    name: 'purchase',
    category: 'conversion',
    action: 'complete',
    value,
    timestamp: new Date(),
    metadata: { currency },
  }),
} as const;