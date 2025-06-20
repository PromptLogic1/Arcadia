import React from 'react';
import { render, screen } from '@testing-library/react';
import { useReportWebVitals } from 'next/web-vitals';
import { WebVitals, measurePerformance, measureDuration } from '../web-vitals';

// Mock next/web-vitals
jest.mock('next/web-vitals', () => ({
  useReportWebVitals: jest.fn(),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = jest
  .spyOn(console, 'warn')
  .mockImplementation(() => {});
const mockConsoleError = jest
  .spyOn(console, 'error')
  .mockImplementation(() => {});

// Mock performance API
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(),
  now: jest.fn(() => 1000),
};

// Setup global performance mock
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    performance: mockPerformance,
    PerformanceObserver: jest.fn().mockImplementation(_callback => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
    })),
  },
  writable: true,
});

Object.defineProperty(global, 'PerformanceObserver', {
  value: jest.fn().mockImplementation(_callback => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  })),
  writable: true,
});

describe('WebVitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('component rendering', () => {
    test('should render without visible output', () => {
      render(<WebVitals />);

      // WebVitals component should not render any visible elements
      // It only sets up analytics hooks
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
      expect(screen.queryByRole('main')).not.toBeInTheDocument();
    });

    test('should call useReportWebVitals', () => {
      render(<WebVitals />);

      expect(useReportWebVitals).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('web vitals reporting', () => {
    test('should handle good metrics without warnings', () => {
      const _mockCallback = jest.fn();
      (useReportWebVitals as jest.Mock).mockImplementation(callback => {
        callback({
          name: 'LCP',
          value: 2000, // Good value
          rating: 'good',
          id: 'test-id',
          attribution: null,
        });
      });

      render(<WebVitals />);

      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test('should warn about poor metrics', () => {
      (useReportWebVitals as jest.Mock).mockImplementation(callback => {
        callback({
          name: 'LCP',
          value: 5000, // Poor value
          rating: 'poor',
          id: 'test-id',
          attribution: {
            element: 'div',
            url: '/test',
            timeToFirstByte: 100,
            resourceLoadDelay: 200,
            resourceLoadDuration: 300,
          },
        });
      });

      render(<WebVitals />);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Web Vitals: LCP',
        expect.objectContaining({
          metric: 'LCP',
          value: 5000,
          rating: 'poor',
          id: 'test-id',
          attribution: expect.objectContaining({
            element: 'div',
            url: '/test',
          }),
        })
      );
    });

    test('should handle metrics that need improvement', () => {
      (useReportWebVitals as jest.Mock).mockImplementation(callback => {
        callback({
          name: 'CLS',
          value: 0.15, // Needs improvement
          rating: 'needs-improvement',
          id: 'test-id',
          attribution: null,
        });
      });

      render(<WebVitals />);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Web Vitals: CLS',
        expect.objectContaining({
          metric: 'CLS',
          value: 0,
          rating: 'needs-improvement',
        })
      );
    });

    test('should handle metrics without attribution', () => {
      (useReportWebVitals as jest.Mock).mockImplementation(callback => {
        callback({
          name: 'FID',
          value: 400, // Poor value
          rating: 'poor',
          id: 'test-id',
          attribution: null,
        });
      });

      render(<WebVitals />);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Web Vitals: FID',
        expect.objectContaining({
          attribution: undefined,
        })
      );
    });
  });

  describe('performance budget checking', () => {
    test('should error when LCP exceeds poor threshold', () => {
      (useReportWebVitals as jest.Mock).mockImplementation(callback => {
        callback({
          name: 'LCP',
          value: 4500, // Above poor threshold (4000)
          rating: 'poor',
          id: 'test-id',
        });
      });

      render(<WebVitals />);

      expect(mockConsoleError).toHaveBeenCalledWith(
        '⚠️ Performance Budget Exceeded: LCP',
        expect.objectContaining({
          value: 4500,
          threshold: 4000,
          severity: 'poor',
        })
      );
    });

    test('should warn when FCP needs improvement', () => {
      (useReportWebVitals as jest.Mock).mockImplementation(callback => {
        callback({
          name: 'FCP',
          value: 2000, // Between good (1800) and poor (3000)
          rating: 'needs-improvement',
          id: 'test-id',
        });
      });

      render(<WebVitals />);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '⚡ Performance Can Be Improved: FCP',
        expect.objectContaining({
          value: 2000,
          threshold: 1800,
          severity: 'needs-improvement',
        })
      );
    });

    test('should not warn for good metrics', () => {
      (useReportWebVitals as jest.Mock).mockImplementation(callback => {
        callback({
          name: 'TTFB',
          value: 500, // Good value (below 800)
          rating: 'good',
          id: 'test-id',
        });
      });

      render(<WebVitals />);

      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe('long task monitoring', () => {
    test('should set up PerformanceObserver for long tasks', () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
      };

      (global.PerformanceObserver as unknown as jest.Mock).mockImplementation(
        () => mockObserver
      );

      render(<WebVitals />);

      expect(global.PerformanceObserver).toHaveBeenCalledWith(
        expect.any(Function)
      );
      expect(mockObserver.observe).toHaveBeenCalledWith({
        entryTypes: ['longtask'],
      });
    });

    test('should warn about long tasks', () => {
      let observerCallback: (list: any) => void;

      (global.PerformanceObserver as unknown as jest.Mock).mockImplementation(
        callback => {
          observerCallback = callback;
          return {
            observe: jest.fn(),
            disconnect: jest.fn(),
          };
        }
      );

      render(<WebVitals />);

      // Simulate a long task
      observerCallback!({
        getEntries: () => [
          {
            duration: 75, // Above 50ms threshold
            startTime: 1000,
          },
        ],
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith('Long Task Detected:', {
        duration: 75,
        startTime: 1000,
      });
    });

    test('should not warn about short tasks', () => {
      let observerCallback: (list: any) => void;

      (global.PerformanceObserver as unknown as jest.Mock).mockImplementation(
        callback => {
          observerCallback = callback;
          return {
            observe: jest.fn(),
            disconnect: jest.fn(),
          };
        }
      );

      render(<WebVitals />);

      // Simulate a short task
      observerCallback!({
        getEntries: () => [
          {
            duration: 30, // Below 50ms threshold
            startTime: 1000,
          },
        ],
      });

      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    test('should handle PerformanceObserver errors gracefully', () => {
      (global.PerformanceObserver as unknown as jest.Mock).mockImplementation(
        () => {
          throw new Error('PerformanceObserver not supported');
        }
      );

      expect(() => {
        render(<WebVitals />);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('should disconnect observer on unmount', () => {
      const mockDisconnect = jest.fn();
      const mockObserver = {
        observe: jest.fn(),
        disconnect: mockDisconnect,
      };

      (global.PerformanceObserver as unknown as jest.Mock).mockImplementation(
        () => mockObserver
      );

      const { unmount } = render(<WebVitals />);
      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});

describe('measurePerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call performance.mark when window is available', () => {
    measurePerformance('test-mark');

    expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark');
  });

  test('should not throw when window is not available', () => {
    const originalWindow = global.window;
    // @ts-expect-error - Testing missing window/performance
    delete global.window;

    expect(() => {
      measurePerformance('test-mark');
    }).not.toThrow();

    global.window = originalWindow;
  });

  test('should not throw when performance is not available', () => {
    const originalPerformance = global.window.performance;
    const originalGlobalPerformance = global.performance;
    
    // @ts-expect-error - Testing missing window/performance
    global.window.performance = undefined;
    // @ts-expect-error - Testing missing global performance
    global.performance = undefined;

    expect(() => {
      measurePerformance('test-mark');
    }).not.toThrow();

    global.window.performance = originalPerformance;
    global.performance = originalGlobalPerformance;
  });
});

describe('measureDuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.getEntriesByName.mockReturnValue([
      {
        duration: 150,
        startTime: 1000,
      },
    ]);
  });

  test('should measure duration between marks', () => {
    measureDuration('start-mark', 'end-mark', 'test-measure');

    expect(mockPerformance.measure).toHaveBeenCalledWith(
      'test-measure',
      'start-mark',
      'end-mark'
    );
  });

  test('should log performance measurement', () => {
    measureDuration('start-mark', 'end-mark', 'test-measure');

    expect(mockConsoleLog).toHaveBeenCalledWith('Performance: test-measure', {
      duration: 150,
      start: 1000,
    });
  });

  test('should handle measurement errors gracefully', () => {
    mockPerformance.measure.mockImplementation(() => {
      throw new Error('Invalid marks');
    });

    expect(() => {
      measureDuration('invalid-start', 'invalid-end', 'test-measure');
    }).not.toThrow();
  });

  test('should handle missing measurement entries', () => {
    mockPerformance.getEntriesByName.mockReturnValue([]);

    measureDuration('start-mark', 'end-mark', 'test-measure');

    expect(mockConsoleLog).not.toHaveBeenCalled();
  });

  test('should not throw when window is not available', () => {
    const originalWindow = global.window;
    // @ts-expect-error - Testing missing window/performance
    delete global.window;

    expect(() => {
      measureDuration('start', 'end', 'measure');
    }).not.toThrow();

    global.window = originalWindow;
  });
});
