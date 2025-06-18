/**
 * Mock analytics providers for testing
 */

export const mockGoogleAnalytics = {
  gtag: jest.fn(),
  dataLayer: [],
};

export const mockSegment = {
  track: jest.fn(),
  page: jest.fn(),
  identify: jest.fn(),
};

export const mockFacebookPixel = {
  fbq: jest.fn(),
};

export const mockHotjar = {
  hj: jest.fn(),
};

// Global window mocks
declare global {
  interface Window {
    gtag: jest.MockedFunction<any>;
    ga: jest.MockedFunction<any>;
    dataLayer: any[];
    analytics: {
      track: jest.MockedFunction<any>;
      page: jest.MockedFunction<any>;
      identify: jest.MockedFunction<any>;
    };
    fbq: jest.MockedFunction<any>;
    hj: jest.MockedFunction<any>;
    __analyticsEvents: any[];
  }
}

export function setupAnalyticsMocks() {
  // Mock Google Analytics
  (global as any).window = {
    ...global.window,
    gtag: mockGoogleAnalytics.gtag,
    dataLayer: mockGoogleAnalytics.dataLayer,
    analytics: mockSegment,
    fbq: mockFacebookPixel.fbq,
    hj: mockHotjar.hj,
    __analyticsEvents: [],
  };
}

export function clearAnalyticsMocks() {
  mockGoogleAnalytics.gtag.mockClear();
  mockSegment.track.mockClear();
  mockSegment.page.mockClear();
  mockSegment.identify.mockClear();
  mockFacebookPixel.fbq.mockClear();
  mockHotjar.hj.mockClear();
  
  if (global.window) {
    global.window.__analyticsEvents = [];
    global.window.dataLayer.length = 0;
  }
}