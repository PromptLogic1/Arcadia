/**
 * Date Utilities Tests
 *
 * Tests for date formatting and manipulation functions
 */

import { formatDate, formatRelativeTime } from '@/lib/utils';

describe('Date Utilities', () => {
  // Mock current date for consistent testing
  const mockNow = new Date('2024-01-15T12:00:00Z');
  const originalDate = Date;

  beforeEach(() => {
    // Mock Date constructor
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockNow.toISOString());
        } else {
          // @ts-expect-error - spreading arguments to Date constructor
          super(...args);
        }
      }

      static now() {
        return mockNow.getTime();
      }
    } as DateConstructor;
  });

  afterEach(() => {
    // Restore original Date
    global.Date = originalDate;
  });

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const dateString = '2024-01-15T12:00:00Z';
      const formatted = formatDate(dateString);

      expect(formatted).toBe('January 15, 2024');
    });

    it('should format Date object correctly', () => {
      const date = new Date('2023-12-25T00:00:00Z');
      const formatted = formatDate(date);

      expect(formatted).toBe('December 25, 2023');
    });

    it('should handle different date formats', () => {
      const dates = [
        '2024-02-29T00:00:00Z', // Leap year
        '2000-01-01T00:00:00Z', // Y2K
        '2023-07-04T00:00:00Z', // Regular date
      ];

      const expected = ['February 29, 2024', 'January 1, 2000', 'July 4, 2023'];

      dates.forEach((date, index) => {
        expect(formatDate(date)).toBe(expected[index]);
      });
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = 'invalid-date';
      const formatted = formatDate(invalidDate);

      // Invalid dates typically return "Invalid Date"
      expect(formatted).toBe('Invalid Date');
    });

    it('should handle edge cases', () => {
      // Very old date
      expect(formatDate('1900-01-01T00:00:00Z')).toBe('January 1, 1900');

      // Future date (accounting for potential timezone differences)
      const futureFormatted = formatDate('2099-12-31T23:59:59Z');
      expect(futureFormatted).toMatch(/December 31, 2099|January 1, 2100/);
    });
  });

  describe('formatRelativeTime', () => {
    it('should format "just now" for recent times', () => {
      const recentDate = new Date(mockNow.getTime() - 30 * 1000); // 30 seconds ago
      const formatted = formatRelativeTime(recentDate);

      expect(formatted).toBe('just now');
    });

    it('should format minutes correctly', () => {
      const testCases = [
        { offset: 60, expected: '1m ago' }, // 1 minute
        { offset: 120, expected: '2m ago' }, // 2 minutes
        { offset: 1800, expected: '30m ago' }, // 30 minutes
        { offset: 3540, expected: '59m ago' }, // 59 minutes
      ];

      testCases.forEach(({ offset, expected }) => {
        const date = new Date(mockNow.getTime() - offset * 1000);
        expect(formatRelativeTime(date)).toBe(expected);
      });
    });

    it('should format hours correctly', () => {
      const testCases = [
        { offset: 3600, expected: '1h ago' }, // 1 hour
        { offset: 7200, expected: '2h ago' }, // 2 hours
        { offset: 43200, expected: '12h ago' }, // 12 hours
        { offset: 86399, expected: '23h ago' }, // Just under 24 hours
      ];

      testCases.forEach(({ offset, expected }) => {
        const date = new Date(mockNow.getTime() - offset * 1000);
        expect(formatRelativeTime(date)).toBe(expected);
      });
    });

    it('should format days correctly', () => {
      const testCases = [
        { offset: 86400, expected: '1d ago' }, // 1 day
        { offset: 172800, expected: '2d ago' }, // 2 days
        { offset: 604800, expected: '7d ago' }, // 1 week
        { offset: 2592000 - 1, expected: '29d ago' }, // Just under 30 days
      ];

      testCases.forEach(({ offset, expected }) => {
        const date = new Date(mockNow.getTime() - offset * 1000);
        expect(formatRelativeTime(date)).toBe(expected);
      });
    });

    it('should use full date for older times', () => {
      const oldDate = new Date(mockNow.getTime() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      const formatted = formatRelativeTime(oldDate);

      // Should return the full formatted date
      expect(formatted).toBe(formatDate(oldDate));
    });

    it('should handle future dates', () => {
      const futureDate = new Date(mockNow.getTime() + 60 * 1000); // 1 minute in future
      const formatted = formatRelativeTime(futureDate);

      // Future dates show as "just now" since the difference is negative
      expect(formatted).toBe('just now');
    });

    it('should handle date strings', () => {
      const dateString = new Date(mockNow.getTime() - 300 * 1000).toISOString(); // 5 minutes ago
      const formatted = formatRelativeTime(dateString);

      expect(formatted).toBe('5m ago');
    });

    it('should handle edge cases at boundaries', () => {
      // Exactly 1 minute
      const oneMinute = new Date(mockNow.getTime() - 60 * 1000);
      expect(formatRelativeTime(oneMinute)).toBe('1m ago');

      // Exactly 1 hour
      const oneHour = new Date(mockNow.getTime() - 3600 * 1000);
      expect(formatRelativeTime(oneHour)).toBe('1h ago');

      // Exactly 1 day
      const oneDay = new Date(mockNow.getTime() - 86400 * 1000);
      expect(formatRelativeTime(oneDay)).toBe('1d ago');

      // Exactly 30 days (should show full date)
      const thirtyDays = new Date(mockNow.getTime() - 2592000 * 1000);
      expect(formatRelativeTime(thirtyDays)).toBe(formatDate(thirtyDays));
    });

    it('should handle invalid dates', () => {
      const invalidDate = 'invalid-date';
      const formatted = formatRelativeTime(invalidDate);

      // Should fall back to formatDate for invalid dates
      expect(formatted).toBe('Invalid Date');
    });
  });

  describe('Date utilities integration', () => {
    it('should work together for different use cases', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const dates = [
        {
          date: new Date('2024-01-15T11:59:30Z'),
          relative: 'just now',
          full: 'January 15, 2024',
        },
        {
          date: new Date('2024-01-15T10:00:00Z'),
          relative: '2h ago',
          full: 'January 15, 2024',
        },
        {
          date: new Date('2024-01-10T12:00:00Z'),
          relative: '5d ago',
          full: 'January 10, 2024',
        },
        {
          date: new Date('2023-12-01T12:00:00Z'),
          relative: 'December 1, 2023',
          full: 'December 1, 2023',
        },
      ];

      // Override Date.now for this test
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      dates.forEach(({ date, relative, full }) => {
        expect(formatRelativeTime(date)).toBe(relative);
        expect(formatDate(date)).toBe(full);
      });

      jest.restoreAllMocks();
    });

    it('should handle timezone differences gracefully', () => {
      // Dates should be formatted consistently regardless of timezone
      const utcDate = '2024-01-15T00:00:00Z';
      const formatted = formatDate(utcDate);

      // The exact output might vary based on locale, but should be consistent
      expect(formatted).toMatch(/January \d{1,2}, 2024/);
    });
  });
});
