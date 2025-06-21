/**
 * @file utils.test.ts
 * @description Tests for core utility functions (cn, formatDate, generateId, debounce)
 */

import { cn, formatDate, formatRelativeTime, generateId, debounce } from '@/lib/utils';

describe('cn', () => {
  it('should combine class names using clsx and twMerge', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('should merge conflicting Tailwind classes correctly', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('should handle conditional class names', () => {
    const condition1 = true;
    const condition2 = false;
    const result = cn('base-class', condition1 && 'conditional-class', condition2 && 'hidden-class');
    expect(result).toBe('base-class conditional-class');
  });

  it('should handle arrays of class names', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle objects with boolean values', () => {
    const result = cn({
      'active': true,
      'inactive': false,
      'hover': true
    });
    expect(result).toBe('active hover');
  });

  it('should handle empty or undefined inputs', () => {
    expect(cn()).toBe('');
    expect(cn(undefined)).toBe('');
    expect(cn(null)).toBe('');
    expect(cn('')).toBe('');
  });

  it('should handle complex combinations', () => {
    const result = cn(
      'text-base',
      { 'text-lg': false, 'text-xl': true },
      ['bg-red-500', 'bg-blue-500'], // twMerge should handle conflicting bg colors
      'p-4 p-2' // twMerge should handle conflicting padding
    );
    // twMerge resolves conflicts by keeping the last conflicting class
    expect(result).toContain('text-xl'); // text-xl wins over text-base
    expect(result).toContain('bg-blue-500'); // bg-blue-500 wins over bg-red-500
    expect(result).toContain('p-2'); // p-2 wins over p-4
    expect(result).not.toContain('text-lg'); // false condition
    expect(result).not.toContain('text-base'); // loses to text-xl
    expect(result).not.toContain('bg-red-500'); // loses to bg-blue-500
    expect(result).not.toContain('p-4'); // loses to p-2
  });
});

describe('formatDate', () => {
  it('should format Date objects correctly', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDate(date);
    expect(result).toBe('January 15, 2024');
  });

  it('should format date strings correctly', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBe('January 15, 2024');
  });

  it('should handle ISO date strings correctly', () => {
    const result = formatDate('2024-01-15T10:30:00.000Z');
    expect(result).toBe('January 15, 2024');
  });

  it('should handle different date formats consistently', () => {
    const date1 = formatDate('2024-12-25');
    const date2 = formatDate(new Date('2024-12-25'));
    expect(date1).toBe(date2);
    expect(date1).toBe('December 25, 2024');
  });

  it('should handle edge cases gracefully', () => {
    // Test leap year
    const leapYear = formatDate('2024-02-29');
    expect(leapYear).toBe('February 29, 2024');

    // Test year boundaries
    const newYear = formatDate('2024-01-01');
    expect(newYear).toBe('January 1, 2024');

    const endYear = formatDate('2024-12-31');
    expect(endYear).toBe('December 31, 2024');
  });

  it('should handle invalid dates by returning "Invalid Date"', () => {
    const result = formatDate('invalid-date');
    expect(result).toBe('Invalid Date');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Mock Date.now to ensure consistent tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return "just now" for times less than 60 seconds ago', () => {
    const thirtySecondsAgo = new Date('2024-01-15T11:59:30Z');
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('just now');

    const fiveSecondsAgo = new Date('2024-01-15T11:59:55Z');
    expect(formatRelativeTime(fiveSecondsAgo)).toBe('just now');
  });

  it('should return minutes for times less than an hour ago', () => {
    const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z');
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');

    const thirtyMinutesAgo = new Date('2024-01-15T11:30:00Z');
    expect(formatRelativeTime(thirtyMinutesAgo)).toBe('30m ago');

    const fiftyNineMinutesAgo = new Date('2024-01-15T11:01:00Z');
    expect(formatRelativeTime(fiftyNineMinutesAgo)).toBe('59m ago');
  });

  it('should return hours for times less than a day ago', () => {
    const oneHourAgo = new Date('2024-01-15T11:00:00Z');
    expect(formatRelativeTime(oneHourAgo)).toBe('1h ago');

    const twelveHoursAgo = new Date('2024-01-15T00:00:00Z');
    expect(formatRelativeTime(twelveHoursAgo)).toBe('12h ago');

    const twentyThreeHoursAgo = new Date('2024-01-14T13:00:00Z');
    expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23h ago');
  });

  it('should return days for times less than a month ago', () => {
    const oneDayAgo = new Date('2024-01-14T12:00:00Z');
    expect(formatRelativeTime(oneDayAgo)).toBe('1d ago');

    const sevenDaysAgo = new Date('2024-01-08T12:00:00Z');
    expect(formatRelativeTime(sevenDaysAgo)).toBe('7d ago');

    const twentyNineDaysAgo = new Date('2023-12-17T12:00:00Z');
    expect(formatRelativeTime(twentyNineDaysAgo)).toBe('29d ago');
  });

  it('should return formatted date for times more than a month ago', () => {
    const oneMonthAgo = new Date('2023-12-15T12:00:00Z');
    expect(formatRelativeTime(oneMonthAgo)).toBe('December 15, 2023');

    const oneYearAgo = new Date('2023-01-15T12:00:00Z');
    expect(formatRelativeTime(oneYearAgo)).toBe('January 15, 2023');
  });

  it('should handle string dates', () => {
    const result = formatRelativeTime('2024-01-15T11:55:00Z');
    expect(result).toBe('5m ago');
  });

  it('should handle future dates gracefully', () => {
    const futureDate = new Date('2024-01-15T13:00:00Z');
    const result = formatRelativeTime(futureDate);
    // Future dates will have negative diff, should still return "just now" for small differences
    expect(result).toBe('just now');
  });
});

describe('generateId', () => {
  it('should generate a string ID', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate IDs of expected length', () => {
    const id = generateId();
    // Math.random().toString(36).substr(2, 9) should give us up to 9 characters
    expect(id.length).toBeLessThanOrEqual(9);
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      ids.add(generateId());
    }

    // Should generate mostly unique IDs (allow for small collision rate)
    expect(ids.size).toBeGreaterThan(iterations * 0.99);
  });

  it('should only contain alphanumeric characters', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('should not contain problematic characters', () => {
    const id = generateId();
    expect(id).not.toMatch(/[^a-z0-9]/);
    expect(id).not.toContain(' ');
    expect(id).not.toContain('.');
    expect(id).not.toContain('/');
  });

  it('should generate consistent format across multiple calls', () => {
    const ids = Array.from({ length: 100 }, () => generateId());
    
    for (const id of ids) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^[a-z0-9]+$/);
    }
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    jest.advanceTimersByTime(50);
    debouncedFn();
    jest.advanceTimersByTime(50);
    
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments correctly', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('arg1', 'arg2', 123);
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should use the latest arguments when called multiple times', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('first');
    debouncedFn('second');
    debouncedFn('final');

    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('final');
  });

  it('should handle different wait times', () => {
    const mockFn = jest.fn();
    const shortDebounce = debounce(mockFn, 50);
    const longDebounce = debounce(mockFn, 200);

    shortDebounce();
    longDebounce();

    jest.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(150);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should handle function context properly', () => {
    const mockFn = jest.fn();
    const obj = {
      value: 'test',
      getValue: mockFn
    };

    const debouncedGetValue = debounce(obj.getValue, 100);
    debouncedGetValue();

    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle zero delay', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 0);

    debouncedFn();
    jest.advanceTimersByTime(0);

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle rapid successive calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    // Rapid fire calls
    for (let i = 0; i < 10; i++) {
      debouncedFn(`call-${i}`);
      jest.advanceTimersByTime(10);
    }

    // Should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();

    // Complete the wait period
    jest.advanceTimersByTime(100);

    // Should only be called once with the last arguments
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('call-9');
  });
});