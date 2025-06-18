/**
 * Analytics Event Tracking Utilities
 * Handles event creation, validation, and tracking logic
 */

import { randomUUID } from 'crypto';

export interface AnalyticsEvent {
  id: string;
  name: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  page?: {
    url: string;
    title: string;
    referrer?: string;
  };
  device?: {
    type: string;
    os?: string;
    browser?: string;
  };
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export interface EventContext {
  userId?: string;
  sessionId?: string;
  page?: {
    url: string;
    title: string;
    referrer?: string;
  };
  device?: {
    type: string;
    os?: string;
    browser?: string;
  };
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export interface EventValidation {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export interface ConversionFunnel {
  id: string;
  name: string;
  steps: Array<{
    name: string;
    event: string;
    required: boolean;
  }>;
}

export interface FunnelProgress {
  funnelId: string;
  userId: string;
  completedSteps: number;
  totalSteps: number;
  conversionRate: number;
  lastStepTimestamp?: Date;
  dropoffStep?: string;
}

export interface EventMetrics {
  totalEvents: number;
  uniqueEventTypes: number;
  eventCounts: Record<string, number>;
  totalValue: number;
  averageValue: number;
  eventsPerSession: number;
  eventsPerUser: number;
}

export interface Attribution {
  userId: string;
  firstTouch?: {
    source?: string;
    medium?: string;
    campaign?: string;
    timestamp: Date;
  };
  lastTouch?: {
    source?: string;
    medium?: string;
    campaign?: string;
    timestamp: Date;
  };
  touchpoints: Array<{
    source?: string;
    medium?: string;
    campaign?: string;
    timestamp: Date;
  }>;
}

// Event name validation regex (snake_case)
const EVENT_NAME_REGEX = /^[a-z]+(_[a-z]+)*$/;

// PII patterns to detect
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/, // Credit card
];

/**
 * Create a new analytics event
 */
export function createEvent(
  name: string,
  properties: Omit<AnalyticsEvent, 'id' | 'name' | 'timestamp'>
): AnalyticsEvent {
  return {
    id: randomUUID(),
    name,
    timestamp: new Date(),
    ...properties,
  };
}

/**
 * Validate an analytics event
 */
export function validateEvent(event: AnalyticsEvent): EventValidation {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Required fields
  if (!event.name) {
    errors.push({ field: 'name', message: 'Event name is required' });
  } else if (!EVENT_NAME_REGEX.test(event.name)) {
    errors.push({ 
      field: 'name', 
      message: 'Event name must be in snake_case format' 
    });
  }

  if (!event.category) {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  if (!event.action) {
    errors.push({ field: 'action', message: 'Action is required' });
  }

  // Value validation
  if (event.value !== undefined && event.value < 0) {
    errors.push({ field: 'value', message: 'Value must be non-negative' });
  }

  // Check for PII in metadata
  if (event.metadata) {
    const metadataStr = JSON.stringify(event.metadata);
    for (const pattern of PII_PATTERNS) {
      if (pattern.test(metadataStr)) {
        warnings.push({
          field: 'metadata',
          message: 'Potential PII detected in metadata. Ensure data is properly anonymized.',
        });
        break;
      }
    }
  }

  // Label length
  if (event.label && event.label.length > 100) {
    warnings.push({
      field: 'label',
      message: 'Label exceeds recommended length of 100 characters',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Enrich event with context data
 */
export function enrichEvent(
  event: AnalyticsEvent,
  context: EventContext
): AnalyticsEvent {
  return {
    ...event,
    userId: event.userId || context.userId,
    sessionId: event.sessionId || context.sessionId,
    page: event.page || context.page,
    device: event.device || context.device,
    utm: event.utm || context.utm,
  };
}

/**
 * Batch events for efficient transmission
 */
export function batchEvents(
  events: AnalyticsEvent[],
  options: {
    maxBatchSize?: number;
    maxBatchBytes?: number;
  } = {}
): AnalyticsEvent[][] {
  const { maxBatchSize = 100, maxBatchBytes = 50000 } = options;
  
  if (events.length === 0) return [];

  const batches: AnalyticsEvent[][] = [];
  let currentBatch: AnalyticsEvent[] = [];
  let currentBatchSize = 0;

  for (const event of events) {
    const eventSize = JSON.stringify(event).length;
    
    if (
      currentBatch.length >= maxBatchSize ||
      (currentBatchSize + eventSize > maxBatchBytes && currentBatch.length > 0)
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }

    currentBatch.push(event);
    currentBatchSize += eventSize;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Analytics Event Tracker
 */
export class AnalyticsEventTracker {
  private events: AnalyticsEvent[] = [];
  private context: EventContext = {};
  private funnels: Map<string, ConversionFunnel> = new Map();
  private funnelProgress: Map<string, FunnelProgress> = new Map();
  private pageTimers: Map<string, number> = new Map();
  private lastEventTime: Map<string, number> = new Map();
  private attribution: Map<string, Attribution> = new Map();
  private maxEvents: number;
  private dedupeWindowMs: number;

  constructor(options: {
    maxEvents?: number;
    dedupeWindowMs?: number;
  } = {}) {
    this.maxEvents = options.maxEvents || 1000;
    this.dedupeWindowMs = options.dedupeWindowMs || 1000;
  }

  /**
   * Set global context for all events
   */
  setContext(context: EventContext): void {
    this.context = context;
  }

  /**
   * Track an event
   */
  track(
    name: string,
    properties: Omit<AnalyticsEvent, 'id' | 'name' | 'timestamp'>
  ): AnalyticsEvent {
    // Check for duplicate events
    const eventKey = `${name}:${JSON.stringify(properties)}`;
    const lastTime = this.lastEventTime.get(eventKey);
    const now = Date.now();

    if (lastTime && now - lastTime < this.dedupeWindowMs) {
      // Duplicate event, return the last one
      return this.events[this.events.length - 1];
    }

    this.lastEventTime.set(eventKey, now);

    // Create and enrich event
    const event = createEvent(name, properties);
    const enrichedEvent = enrichEvent(event, this.context);

    // Validate event
    const validation = validateEvent(enrichedEvent);
    if (!validation.valid) {
      console.error('Invalid event:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn('Event warnings:', validation.warnings);
    }

    // Store event
    this.events.push(enrichedEvent);

    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update attribution
    this.updateAttribution(enrichedEvent);

    // Update funnel progress
    this.updateFunnelProgress(enrichedEvent);

    return enrichedEvent;
  }

  /**
   * Get all tracked events
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get events by category
   */
  getEventsByCategory(category: string): AnalyticsEvent[] {
    return this.events.filter(e => e.category === category);
  }

  /**
   * Get events by name
   */
  getEventsByName(name: string): AnalyticsEvent[] {
    return this.events.filter(e => e.name === name);
  }

  /**
   * Start tracking a conversion funnel
   */
  startFunnel(funnel: ConversionFunnel, userId: string): void {
    this.funnels.set(funnel.id, funnel);
    this.funnelProgress.set(`${funnel.id}:${userId}`, {
      funnelId: funnel.id,
      userId,
      completedSteps: 0,
      totalSteps: funnel.steps.length,
      conversionRate: 0,
    });
  }

  /**
   * Get funnel progress
   */
  getFunnelProgress(funnelId: string, userId: string): FunnelProgress | undefined {
    return this.funnelProgress.get(`${funnelId}:${userId}`);
  }

  /**
   * Update funnel progress based on event
   */
  private updateFunnelProgress(event: AnalyticsEvent): void {
    if (!event.userId) return;

    Array.from(this.funnelProgress.entries()).forEach(([_key, progress]) => {
      const funnel = this.funnels.get(progress.funnelId);
      if (!funnel) return;

      const nextStepIndex = progress.completedSteps;
      if (nextStepIndex >= funnel.steps.length) return;

      const nextStep = funnel.steps[nextStepIndex];
      if (nextStep.event === event.name) {
        progress.completedSteps++;
        progress.conversionRate = progress.completedSteps / progress.totalSteps;
        progress.lastStepTimestamp = event.timestamp;

        if (progress.completedSteps < progress.totalSteps) {
          progress.dropoffStep = funnel.steps[progress.completedSteps].name;
        } else {
          delete progress.dropoffStep;
        }
      }
    });
  }

  /**
   * Get event metrics
   */
  getEventMetrics(): EventMetrics {
    const eventCounts: Record<string, number> = {};
    let totalValue = 0;
    const uniqueSessions = new Set<string>();
    const uniqueUsers = new Set<string>();

    for (const event of this.events) {
      eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
      totalValue += event.value || 0;
      
      if (event.sessionId) uniqueSessions.add(event.sessionId);
      if (event.userId) uniqueUsers.add(event.userId);
    }

    return {
      totalEvents: this.events.length,
      uniqueEventTypes: Object.keys(eventCounts).length,
      eventCounts,
      totalValue,
      averageValue: this.events.length > 0 ? totalValue / this.events.length : 0,
      eventsPerSession: uniqueSessions.size > 0 ? this.events.length / uniqueSessions.size : 0,
      eventsPerUser: uniqueUsers.size > 0 ? this.events.length / uniqueUsers.size : 0,
    };
  }

  /**
   * Track scroll depth
   */
  trackScrollDepth(depth: number): void {
    this.track('scroll_depth', {
      category: 'engagement',
      action: 'scroll',
      label: `${depth}%`,
      value: depth,
      metadata: { depth },
    });
  }

  /**
   * Start page timer
   */
  startPageTimer(page: string): void {
    this.pageTimers.set(page, Date.now());
  }

  /**
   * End page timer and track time on page
   */
  endPageTimer(page: string): number {
    const startTime = this.pageTimers.get(page);
    if (!startTime) return 0;

    const timeSpent = Date.now() - startTime;
    this.pageTimers.delete(page);

    this.track('time_on_page', {
      category: 'engagement',
      action: 'time_spent',
      label: page,
      value: timeSpent,
      metadata: { page, duration_ms: timeSpent },
    });

    return timeSpent;
  }

  /**
   * Update attribution data
   */
  private updateAttribution(event: AnalyticsEvent): void {
    if (!event.userId || !event.utm) return;

    let attribution = this.attribution.get(event.userId);
    if (!attribution) {
      attribution = {
        userId: event.userId,
        touchpoints: [],
      };
      this.attribution.set(event.userId, attribution);
    }

    const touchpoint = {
      source: event.utm.source,
      medium: event.utm.medium,
      campaign: event.utm.campaign,
      timestamp: event.timestamp,
    };

    // Update first touch
    if (!attribution.firstTouch) {
      attribution.firstTouch = touchpoint;
    }

    // Update last touch
    attribution.lastTouch = touchpoint;

    // Add to touchpoints
    attribution.touchpoints.push(touchpoint);
  }

  /**
   * Get attribution data
   */
  getAttribution(userId: string): Attribution | undefined {
    return this.attribution.get(userId);
  }

  /**
   * Export events in different formats
   */
  exportEvents(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.events, null, 2);
    }

    // CSV format
    const headers = ['id', 'name', 'category', 'action', 'label', 'value', 'timestamp', 'userId', 'sessionId'];
    const rows = this.events.map(event => 
      headers.map(header => {
        const value = event[header as keyof AnalyticsEvent];
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value?.toString() || '';
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Clear all tracked data
   */
  clear(): void {
    this.events = [];
    this.funnels.clear();
    this.funnelProgress.clear();
    this.pageTimers.clear();
    this.lastEventTime.clear();
    this.attribution.clear();
  }
}

/**
 * Standard event templates
 */
export const EVENT_TEMPLATES = {
  pageView: (path: string): Partial<AnalyticsEvent> => ({
    name: 'page_view',
    category: 'navigation',
    action: 'view',
    label: path,
  }),

  ctaClick: (location: string, destination: string): Partial<AnalyticsEvent> => ({
    name: 'cta_click',
    category: 'engagement',
    action: 'click',
    label: `${location}_to_${destination}`,
    metadata: { location, destination },
  }),

  formSubmit: (formName: string, success: boolean): Partial<AnalyticsEvent> => ({
    name: 'form_submit',
    category: 'conversion',
    action: success ? 'submit_success' : 'submit_error',
    label: formName,
    metadata: { formName, success },
  }),

  signup: (method: string): Partial<AnalyticsEvent> => ({
    name: 'signup',
    category: 'conversion',
    action: 'complete',
    label: method,
    value: 1,
    metadata: { method },
  }),

  purchase: (value: number, currency = 'USD'): Partial<AnalyticsEvent> => ({
    name: 'purchase',
    category: 'conversion',
    action: 'complete',
    value,
    metadata: { currency },
  }),

  search: (query: string, results: number): Partial<AnalyticsEvent> => ({
    name: 'search',
    category: 'engagement',
    action: 'search',
    label: query,
    value: results,
    metadata: { query, resultCount: results },
  }),

  share: (platform: string, content: string): Partial<AnalyticsEvent> => ({
    name: 'share',
    category: 'engagement',
    action: 'share',
    label: platform,
    metadata: { platform, content },
  }),

  error: (errorType: string, message: string): Partial<AnalyticsEvent> => ({
    name: 'error',
    category: 'technical',
    action: 'error',
    label: errorType,
    metadata: { errorType, message },
  }),
};