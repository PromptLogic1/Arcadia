/**
 * Analytics Event Tracking Logic Tests
 * Tests the business logic for analytics event generation and validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  AnalyticsEventTracker,
  createEvent,
  validateEvent,
  enrichEvent,
  batchEvents,
  type AnalyticsEvent,
  type EventContext,
  type ConversionFunnel,
} from '../utils/analytics-events';

describe('Analytics Event Tracking', () => {
  let tracker: AnalyticsEventTracker;
  let mockContext: EventContext;

  beforeEach(() => {
    tracker = new AnalyticsEventTracker();
    mockContext = {
      userId: 'test-user-123',
      sessionId: 'session-456',
      page: {
        url: 'https://arcadia.game',
        title: 'Arcadia - Gaming Platform',
        referrer: 'https://google.com',
      },
      device: {
        type: 'desktop',
        os: 'Windows',
        browser: 'Chrome',
      },
      utm: {
        source: 'google',
        medium: 'cpc',
        campaign: 'brand',
      },
    };
    jest.clearAllMocks();
  });

  describe('Event Creation', () => {
    it('should create a basic event with required fields', () => {
      const event = createEvent('page_view', {
        category: 'navigation',
        action: 'view',
        label: '/home',
      });

      expect(event).toMatchObject({
        name: 'page_view',
        category: 'navigation',
        action: 'view',
        label: '/home',
      });
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.id).toMatch(/^[a-f0-9-]+$/);
    });

    it('should create conversion events with value', () => {
      const event = createEvent('purchase', {
        category: 'conversion',
        action: 'complete',
        value: 99.99,
        metadata: {
          currency: 'USD',
          items: ['premium-plan'],
        },
      });

      expect(event.value).toBe(99.99);
      expect(event.metadata).toMatchObject({
        currency: 'USD',
        items: ['premium-plan'],
      });
    });

    it('should handle custom event properties', () => {
      const event = createEvent('custom_interaction', {
        category: 'engagement',
        action: 'interact',
        metadata: {
          element: 'demo-button',
          interaction_type: 'hover',
          duration_ms: 2500,
        },
      });

      expect(event.metadata).toMatchObject({
        element: 'demo-button',
        interaction_type: 'hover',
        duration_ms: 2500,
      });
    });
  });

  describe('Event Validation', () => {
    it('should validate correct events', () => {
      const event: AnalyticsEvent = {
        id: '123',
        name: 'valid_event',
        category: 'test',
        action: 'click',
        timestamp: new Date(),
      };

      const validation = validateEvent(event);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const event = {
        name: 'invalid_event',
        // Missing category and action
      } as any;

      const validation = validateEvent(event);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'category',
          message: 'Category is required',
        })
      );
    });

    it('should validate event name format', () => {
      const event: AnalyticsEvent = {
        id: '123',
        name: 'Invalid Event Name!', // Should be snake_case
        category: 'test',
        action: 'click',
        timestamp: new Date(),
      };

      const validation = validateEvent(event);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          message: expect.stringContaining('snake_case'),
        })
      );
    });

    it('should validate value constraints', () => {
      const event: AnalyticsEvent = {
        id: '123',
        name: 'purchase',
        category: 'conversion',
        action: 'complete',
        value: -10, // Negative value
        timestamp: new Date(),
      };

      const validation = validateEvent(event);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'value',
          message: 'Value must be non-negative',
        })
      );
    });

    it('should warn about PII in events', () => {
      const event: AnalyticsEvent = {
        id: '123',
        name: 'user_action',
        category: 'test',
        action: 'submit',
        metadata: {
          email: 'user@example.com', // PII
          phone: '+1234567890', // PII
        },
        timestamp: new Date(),
      };

      const validation = validateEvent(event);
      expect(validation.warnings).toContainEqual(
        expect.objectContaining({
          field: 'metadata',
          message: expect.stringContaining('PII detected'),
        })
      );
    });
  });

  describe('Event Enrichment', () => {
    it('should enrich event with context data', () => {
      const event = createEvent('page_view', {
        category: 'navigation',
        action: 'view',
      });

      const enriched = enrichEvent(event, mockContext);

      expect(enriched.userId).toBe('test-user-123');
      expect(enriched.sessionId).toBe('session-456');
      expect(enriched.page).toMatchObject({
        url: 'https://arcadia.game',
        title: 'Arcadia - Gaming Platform',
      });
      expect(enriched.device).toMatchObject({
        type: 'desktop',
        os: 'Windows',
      });
    });

    it('should include UTM parameters', () => {
      const event = createEvent('cta_click', {
        category: 'engagement',
        action: 'click',
      });

      const enriched = enrichEvent(event, mockContext);

      expect(enriched.utm).toMatchObject({
        source: 'google',
        medium: 'cpc',
        campaign: 'brand',
      });
    });

    it('should preserve original event data', () => {
      const event = createEvent('custom_event', {
        category: 'test',
        action: 'test',
        metadata: { custom: 'data' },
      });

      const enriched = enrichEvent(event, mockContext);

      expect(enriched.name).toBe('custom_event');
      expect(enriched.metadata?.custom).toBe('data');
    });

    it('should handle missing context gracefully', () => {
      const event = createEvent('test_event', {
        category: 'test',
        action: 'test',
      });

      const enriched = enrichEvent(event, {});

      expect(enriched.id).toBe(event.id);
      expect(enriched.name).toBe(event.name);
      expect(enriched.userId).toBeUndefined();
      expect(enriched.sessionId).toBeUndefined();
    });
  });

  describe('Event Batching', () => {
    it('should batch multiple events', () => {
      const events = [
        createEvent('event_1', { category: 'test', action: 'test' }),
        createEvent('event_2', { category: 'test', action: 'test' }),
        createEvent('event_3', { category: 'test', action: 'test' }),
      ];

      const batches = batchEvents(events, { maxBatchSize: 2 });

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(2);
      expect(batches[1]).toHaveLength(1);
    });

    it('should respect size limits', () => {
      const largeEvent = createEvent('large_event', {
        category: 'test',
        action: 'test',
        metadata: { data: 'x'.repeat(1000) },
      });

      const events = Array(5).fill(largeEvent);
      const batches = batchEvents(events, { 
        maxBatchSize: 10,
        maxBatchBytes: 2000,
      });

      expect(batches.length).toBeGreaterThan(1);
      
      // Each batch should be under size limit
      batches.forEach(batch => {
        const size = JSON.stringify(batch).length;
        expect(size).toBeLessThanOrEqual(2000);
      });
    });

    it('should handle empty event list', () => {
      const batches = batchEvents([]);
      expect(batches).toHaveLength(0);
    });
  });

  describe('AnalyticsEventTracker', () => {
    it('should track events and maintain history', () => {
      tracker.track('page_view', {
        category: 'navigation',
        action: 'view',
        label: '/home',
      });

      tracker.track('cta_click', {
        category: 'engagement',
        action: 'click',
        label: 'hero-cta',
      });

      const events = tracker.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('page_view');
      expect(events[1].name).toBe('cta_click');
    });

    it('should track conversion funnels', () => {
      const funnel: ConversionFunnel = {
        id: 'signup-funnel',
        name: 'Signup Funnel',
        steps: [
          { name: 'View Landing', event: 'page_view', required: true },
          { name: 'Click CTA', event: 'cta_click', required: true },
          { name: 'View Signup', event: 'signup_page_view', required: true },
          { name: 'Submit Form', event: 'signup_submit', required: true },
          { name: 'Complete', event: 'signup_complete', required: true },
        ],
      };

      tracker.startFunnel(funnel, 'user-123');

      // Simulate user journey
      tracker.track('page_view', { category: 'navigation', action: 'view' });
      tracker.track('cta_click', { category: 'engagement', action: 'click' });
      tracker.track('signup_page_view', { category: 'navigation', action: 'view' });
      
      const progress = tracker.getFunnelProgress('signup-funnel', 'user-123');
      expect(progress?.completedSteps).toBe(3);
      expect(progress?.totalSteps).toBe(5);
      expect(progress?.conversionRate).toBeCloseTo(0.6);
    });

    it('should calculate event metrics', () => {
      // Track multiple events with unique properties to avoid deduplication
      for (let i = 0; i < 10; i++) {
        tracker.track('page_view', {
          category: 'navigation',
          action: 'view',
          value: i * 10,
          metadata: { uniqueId: i }, // Make each event unique
        });
      }

      for (let i = 0; i < 5; i++) {
        tracker.track('cta_click', {
          category: 'engagement',
          action: 'click',
          metadata: { uniqueId: i }, // Make each event unique
        });
      }

      const metrics = tracker.getEventMetrics();
      
      expect(metrics.totalEvents).toBe(15);
      expect(metrics.uniqueEventTypes).toBe(2);
      expect(metrics.eventCounts['page_view']).toBe(10);
      expect(metrics.eventCounts['cta_click']).toBe(5);
      expect(metrics.totalValue).toBe(450); // Sum of 0+10+20+...+90
    });

    it('should handle scroll depth tracking', () => {
      tracker.trackScrollDepth(25);
      tracker.trackScrollDepth(50);
      tracker.trackScrollDepth(75);
      tracker.trackScrollDepth(100);

      const scrollEvents = tracker.getEventsByCategory('engagement')
        .filter(e => e.name === 'scroll_depth');

      expect(scrollEvents).toHaveLength(4);
      expect(scrollEvents[0].metadata?.depth).toBe(25);
      expect(scrollEvents[3].metadata?.depth).toBe(100);
    });

    it('should track time on page', () => {
      // Mock Date.now to be more predictable
      const startTime = 1000;
      const endTime = 1100;
      let callCount = 0;
      
      jest.spyOn(Date, 'now').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? startTime : endTime;
      });
      
      // Simulate page session
      tracker.startPageTimer('/home');
      const timeSpent = tracker.endPageTimer('/home');
      
      expect(timeSpent).toBe(100); // Exact difference
      
      const events = tracker.getEventsByName('time_on_page');
      expect(events).toHaveLength(1);
      expect(events[0].value).toBe(100);
    });

    it('should deduplicate events', () => {
      const event = {
        category: 'test',
        action: 'click',
        metadata: { element: 'button' },
      };

      // Track same event multiple times quickly
      tracker.track('duplicate_test', event);
      tracker.track('duplicate_test', event);
      tracker.track('duplicate_test', event);

      const events = tracker.getEvents();
      
      // Should only have one event (deduplicated)
      const duplicateEvents = events.filter(e => e.name === 'duplicate_test');
      expect(duplicateEvents).toHaveLength(1);
    });

    it('should respect event limits', () => {
      const limitedTracker = new AnalyticsEventTracker({ maxEvents: 5 });

      // Track more than limit
      for (let i = 0; i < 10; i++) {
        limitedTracker.track(`event_${i}`, {
          category: 'test',
          action: 'test',
        });
      }

      const events = limitedTracker.getEvents();
      expect(events).toHaveLength(5);
      
      // Should keep the most recent events
      expect(events[0].name).toBe('event_5');
      expect(events[4].name).toBe('event_9');
    });

    it('should export events in different formats', () => {
      tracker.track('test_event', {
        category: 'test',
        action: 'test',
        value: 100,
      });

      // Export as CSV
      const csv = tracker.exportEvents('csv');
      expect(csv).toContain('id,name,category,action,label,value,timestamp,userId,sessionId');
      expect(csv).toContain('test_event,test,test');

      // Export as JSON
      const json = tracker.exportEvents('json');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('test_event');
    });
  });

  describe('Marketing Attribution', () => {
    it('should track first-touch attribution', () => {
      const firstTouchContext: EventContext = {
        ...mockContext,
        utm: {
          source: 'facebook',
          medium: 'social',
          campaign: 'awareness',
        },
      };

      tracker.setContext(firstTouchContext);
      tracker.track('first_visit', {
        category: 'attribution',
        action: 'first_touch',
      });

      const attribution = tracker.getAttribution('test-user-123');
      expect(attribution?.firstTouch).toMatchObject({
        source: 'facebook',
        medium: 'social',
        campaign: 'awareness',
      });
    });

    it('should track last-touch attribution', () => {
      // First visit
      tracker.track('page_view', { 
        category: 'navigation', 
        action: 'view',
        userId: 'test-user-123',
        utm: { source: 'google', medium: 'organic' },
      });

      // Later visit with different source
      tracker.track('page_view', { 
        category: 'navigation', 
        action: 'view',
        userId: 'test-user-123',
        utm: { source: 'email', medium: 'newsletter' },
      });

      const attribution = tracker.getAttribution('test-user-123');
      expect(attribution?.lastTouch).toMatchObject({
        source: 'email',
        medium: 'newsletter',
      });
    });

    it('should track multi-touch attribution', () => {
      const sources = [
        { source: 'google', medium: 'cpc' },
        { source: 'facebook', medium: 'social' },
        { source: 'email', medium: 'newsletter' },
        { source: 'direct', medium: 'none' },
      ];

      sources.forEach((utm, index) => {
        tracker.setContext({ ...mockContext, utm });
        tracker.track('page_view', { 
          category: 'navigation', 
          action: 'view',
          metadata: { session: index },
        });
      });

      const attribution = tracker.getAttribution('test-user-123');
      expect(attribution?.touchpoints).toHaveLength(4);
      expect(attribution?.touchpoints[0]).toMatchObject(sources[0]);
      expect(attribution?.touchpoints[3]).toMatchObject(sources[3]);
    });
  });
});