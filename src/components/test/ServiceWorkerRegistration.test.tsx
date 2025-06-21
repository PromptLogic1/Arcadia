/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ServiceWorkerRegistration, usePWAInstall } from '../ServiceWorkerRegistration';
import { log } from '@/lib/logger';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Get a reference to the mocked logger
const mockLog = log as jest.Mocked<typeof log>;

// Create a mock service worker registration
const createMockRegistration = () => ({
  installing: null as any,
  waiting: null as any,
  active: {
    state: 'activated',
    addEventListener: jest.fn(),
  },
  addEventListener: jest.fn(),
  update: jest.fn(),
  unregister: jest.fn(),
});

// Create a mock service worker
const createMockServiceWorker = () => ({
  state: 'installing',
  addEventListener: jest.fn(),
  postMessage: jest.fn(),
});

describe('ServiceWorkerRegistration', () => {
  let mockServiceWorkerRegister: jest.Mock;
  let mockServiceWorkerContainer: any;
  let originalNavigator: any;
  let originalWindow: any;
  let originalProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment
    originalProcess = process.env;
    process.env = { ...originalProcess, NODE_ENV: 'production' };

    // Mock navigator.serviceWorker
    mockServiceWorkerRegister = jest.fn();
    mockServiceWorkerContainer = {
      register: mockServiceWorkerRegister,
      addEventListener: jest.fn(),
      controller: null,
    };

    originalNavigator = global.navigator;
    originalWindow = global.window;

    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: mockServiceWorkerContainer,
      },
      writable: true,
    });

    // Mock window.confirm and location.reload
    Object.defineProperty(global, 'window', {
      value: {
        ...originalWindow,
        confirm: jest.fn(),
        location: {
          reload: jest.fn(),
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    process.env = originalProcess;
    global.navigator = originalNavigator;
    global.window = originalWindow;
  });

  describe('production environment', () => {
    it('should register service worker in production', async () => {
      const mockRegistration = createMockRegistration();
      mockServiceWorkerRegister.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      // Wait for useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockServiceWorkerRegister).toHaveBeenCalledWith('/sw.js', {
        scope: '/',
      });
      expect(mockLog.info).toHaveBeenCalledWith('Service Worker active');
    });

    it('should add event listeners for service worker updates', async () => {
      const mockRegistration = createMockRegistration();
      mockServiceWorkerRegister.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function)
      );
      expect(mockServiceWorkerContainer.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('should handle service worker registration errors', async () => {
      const mockError = new Error('Registration failed');
      mockServiceWorkerRegister.mockRejectedValue(mockError);

      render(<ServiceWorkerRegistration />);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLog.error).toHaveBeenCalledWith(
        'Service Worker registration failed',
        mockError
      );
    });

    it('should handle updatefound event with new service worker', async () => {
      const mockRegistration = createMockRegistration();
      const mockNewWorker = createMockServiceWorker();
      mockRegistration.installing = mockNewWorker;
      mockServiceWorkerContainer.controller = {}; // Simulate existing controller
      
      let updateFoundHandler: (() => void) | undefined;
      mockRegistration.addEventListener.mockImplementation((event: string, handler: () => void) => {
        if (event === 'updatefound') {
          updateFoundHandler = handler;
        }
      });

      mockServiceWorkerRegister.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Trigger updatefound event
      updateFoundHandler!();

      expect(mockNewWorker.addEventListener).toHaveBeenCalledWith(
        'statechange',
        expect.any(Function)
      );
    });

    it('should prompt user for refresh when new version is available', async () => {
      const mockRegistration = createMockRegistration();
      const mockNewWorker = createMockServiceWorker();
      mockNewWorker.state = 'installed';
      mockRegistration.installing = mockNewWorker;
      mockServiceWorkerContainer.controller = {}; // Simulate existing controller
      
      let updateFoundHandler: (() => void) | undefined;
      let stateChangeHandler: (() => void) | undefined;
      
      mockRegistration.addEventListener.mockImplementation((event: string, handler: () => void) => {
        if (event === 'updatefound') {
          updateFoundHandler = handler;
        }
      });

      mockNewWorker.addEventListener.mockImplementation((event: string, handler: () => void) => {
        if (event === 'statechange') {
          stateChangeHandler = handler;
        }
      });

      (global.window.confirm as jest.Mock).mockReturnValue(true);
      mockServiceWorkerRegister.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Trigger update sequence
      if (updateFoundHandler) {
        updateFoundHandler();
      }
      if (stateChangeHandler) {
        stateChangeHandler();
      }

      expect(global.window.confirm).toHaveBeenCalledWith(
        'New version available! Refresh to update?'
      );
      expect(global.window.location.reload).toHaveBeenCalled();
    });

    it('should not reload if user declines refresh prompt', async () => {
      const mockRegistration = createMockRegistration();
      const mockNewWorker = createMockServiceWorker();
      mockNewWorker.state = 'installed';
      (mockRegistration as any).installing = mockNewWorker;
      mockServiceWorkerContainer.controller = {}; // Simulate existing controller
      
      let updateFoundHandler: (() => void) | undefined;
      let stateChangeHandler: (() => void) | undefined;
      
      mockRegistration.addEventListener.mockImplementation((event: string, handler: () => void) => {
        if (event === 'updatefound') {
          updateFoundHandler = handler;
        }
      });

      mockNewWorker.addEventListener.mockImplementation((event: string, handler: () => void) => {
        if (event === 'statechange') {
          stateChangeHandler = handler;
        }
      });

      (global.window.confirm as jest.Mock).mockReturnValue(false);
      mockServiceWorkerRegister.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Trigger update sequence
      if (updateFoundHandler) {
        updateFoundHandler();
      }
      if (stateChangeHandler) {
        stateChangeHandler();
      }

      expect(global.window.confirm).toHaveBeenCalled();
      expect(global.window.location.reload).not.toHaveBeenCalled();
    });

    it('should handle cache update messages from service worker', async () => {
      const mockRegistration = createMockRegistration();
      let messageHandler: ((event: MessageEvent) => void) | undefined;
      
      mockServiceWorkerContainer.addEventListener.mockImplementation((event: string, handler: (event: MessageEvent) => void) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      mockServiceWorkerRegister.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Simulate message from service worker
      const mockEvent = {
        data: {
          type: 'CACHE_UPDATED',
          url: '/api/data',
        },
      } as MessageEvent;

      if (messageHandler) {
        messageHandler(mockEvent);
      }

      expect(mockLog.info).toHaveBeenCalledWith('Cache updated', {
        metadata: { url: '/api/data' },
      });
    });

    it('should handle updatefound event without installing worker', async () => {
      const mockRegistration = createMockRegistration();
      (mockRegistration as any).installing = null; // No installing worker
      
      let updateFoundHandler: (() => void) | undefined;
      mockRegistration.addEventListener.mockImplementation((event: string, handler: () => void) => {
        if (event === 'updatefound') {
          updateFoundHandler = handler;
        }
      });

      mockServiceWorkerRegister.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Trigger updatefound event with no installing worker
      if (updateFoundHandler) {
        updateFoundHandler();
      }

      // Should not crash or add event listeners to null
      expect(mockLog.error).not.toHaveBeenCalled();
    });
  });

  describe('development environment', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
    });

    it('should not register service worker in development', async () => {
      render(<ServiceWorkerRegistration />);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockServiceWorkerRegister).not.toHaveBeenCalled();
    });
  });

  describe('browser compatibility', () => {
    it('should not register if service worker is not supported', async () => {
      // Remove serviceWorker from navigator
      Object.defineProperty(global, 'navigator', {
        value: {
          ...originalNavigator,
          // serviceWorker not defined
        },
        writable: true,
      });

      render(<ServiceWorkerRegistration />);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockServiceWorkerRegister).not.toHaveBeenCalled();
    });

    it('should handle server-side rendering', () => {
      // Remove serviceWorker from navigator to simulate SSR-like conditions
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: {
          // No serviceWorker property
        },
        writable: true,
        configurable: true,
      });

      render(<ServiceWorkerRegistration />);

      // Should not crash and should not try to register
      expect(mockServiceWorkerRegister).not.toHaveBeenCalled();

      // Restore navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('component lifecycle', () => {
    it('should return null (render nothing)', () => {
      const { container } = render(<ServiceWorkerRegistration />);
      expect(container).toBeEmptyDOMElement();
    });

    it('should cleanup properly on unmount', () => {
      const { unmount } = render(<ServiceWorkerRegistration />);
      
      // Component should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });
});

describe('usePWAInstall', () => {
  let originalWindow: any;
  let mockAddEventListener: jest.Mock;
  let mockRemoveEventListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    originalWindow = global.window;
    mockAddEventListener = jest.fn();
    mockRemoveEventListener = jest.fn();

    global.window = {
      ...originalWindow,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    } as any;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  function TestComponent() {
    usePWAInstall();
    return <div>Test Component</div>;
  }

  it('should add event listeners for PWA install events', () => {
    render(<TestComponent />);

    expect(mockAddEventListener).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function)
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'appinstalled',
      expect.any(Function)
    );
  });

  it('should remove event listeners on unmount', () => {
    const { unmount } = render(<TestComponent />);

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function)
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'appinstalled',
      expect.any(Function)
    );
  });

  it('should handle beforeinstallprompt event', () => {
    let beforeInstallPromptHandler: ((event: Event) => void) | undefined;
    mockAddEventListener.mockImplementation((event: string, handler: (event: Event) => void) => {
      if (event === 'beforeinstallprompt') {
        beforeInstallPromptHandler = handler;
      }
    });

    render(<TestComponent />);

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as Event;

    if (beforeInstallPromptHandler) {
      beforeInstallPromptHandler(mockEvent);
    }

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockLog.info).toHaveBeenCalledWith('PWA install prompt available');
  });

  it('should handle appinstalled event', () => {
    let appInstalledHandler: (() => void) | undefined;
    mockAddEventListener.mockImplementation((event: string, handler: () => void) => {
      if (event === 'appinstalled') {
        appInstalledHandler = handler;
      }
    });

    render(<TestComponent />);

    if (appInstalledHandler) {
      appInstalledHandler();
    }

    expect(mockLog.info).toHaveBeenCalledWith('PWA was installed');
  });

  it('should return null (hook does not return anything)', () => {
    function TestComponentWithReturn() {
      const result = usePWAInstall();
      return <div>{result}</div>;
    }

    const { container } = render(<TestComponentWithReturn />);
    expect(container).toHaveTextContent('');
  });
});