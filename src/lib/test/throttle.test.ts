/**
 * @file throttle.test.ts
 * @description Tests for throttle utility functions
 */

import { throttle, throttleWithTrailing } from '@/lib/throttle';

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call function immediately on first invocation', () => {
    const mockFn = jest.fn(() => 'result');
    const throttledFn = throttle(mockFn, 100);

    const result = throttledFn();

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result).toBe('result');
  });

  it('should not call function during throttle period', () => {
    const mockFn = jest.fn(() => 'result');
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should call function again after throttle period', () => {
    const mockFn = jest.fn(() => 'result');
    const throttledFn = throttle(mockFn, 100);

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should return last result during throttle period', () => {
    const mockFn = jest.fn();
    mockFn.mockReturnValueOnce('first').mockReturnValueOnce('second');
    
    const throttledFn = throttle(mockFn, 100);

    const result1 = throttledFn();
    const result2 = throttledFn();
    const result3 = throttledFn();

    expect(result1).toBe('first');
    expect(result2).toBe('first');
    expect(result3).toBe('first');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments correctly', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn('arg1', 'arg2', 123);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should use latest arguments when calling during throttle period', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn('first');
    throttledFn('second');
    throttledFn('third');

    // Only first call should execute
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('first');
  });

  it('should preserve function context', () => {
    const obj = {
      value: 'test',
      getValue: function(this: { value: string }) {
        return this.value;
      }
    };

    const throttledGetValue = throttle(obj.getValue, 100);
    const result = throttledGetValue.call(obj);

    expect(result).toBe('test');
  });

  it('should handle different throttle periods', () => {
    const mockFn = jest.fn();
    const shortThrottle = throttle(mockFn, 50);
    const longThrottle = throttle(mockFn, 200);

    shortThrottle();
    longThrottle();

    expect(mockFn).toHaveBeenCalledTimes(2);

    // Call again during throttle periods
    shortThrottle();
    longThrottle();

    expect(mockFn).toHaveBeenCalledTimes(2);

    // Advance past short throttle
    jest.advanceTimersByTime(50);
    shortThrottle();

    expect(mockFn).toHaveBeenCalledTimes(3);

    // Long throttle should still be active
    longThrottle();
    expect(mockFn).toHaveBeenCalledTimes(3);

    // Advance past long throttle
    jest.advanceTimersByTime(150);
    longThrottle();

    expect(mockFn).toHaveBeenCalledTimes(4);
  });

  it('should handle zero throttle period', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 0);

    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(0);
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should handle async functions', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('async result');
    const throttledFn = throttle(mockAsyncFn, 100);

    const result = throttledFn();
    expect(result).toBeInstanceOf(Promise);
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);

    // Subsequent calls during throttle period
    const result2 = throttledFn();
    expect(result2).toBe(result); // Should return same promise
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
  });

  it('should reset throttle state correctly', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);

    // First cycle
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);

    // Second cycle
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(2);

    // Should be throttled again
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(100);

    // Third cycle
    throttledFn();
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});

describe('throttleWithTrailing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call function immediately on first invocation', () => {
    const mockFn = jest.fn();
    const throttledFn = throttleWithTrailing(mockFn, 100);

    throttledFn();

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should schedule trailing call', () => {
    const mockFn = jest.fn();
    const throttledFn = throttleWithTrailing(mockFn, 100);

    throttledFn();
    throttledFn(); // This should be scheduled as trailing call

    expect(mockFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should use latest arguments for trailing call', () => {
    const mockFn = jest.fn();
    const throttledFn = throttleWithTrailing(mockFn, 100);

    throttledFn('first');
    throttledFn('second');
    throttledFn('final');

    expect(mockFn).toHaveBeenCalledWith('first');

    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('final');
  });

  it('should cancel previous trailing call when new call is made', () => {
    const mockFn = jest.fn();
    const throttledFn = throttleWithTrailing(mockFn, 100);

    // First call executes immediately
    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('first');

    // Advance time but not enough to reset throttle
    jest.advanceTimersByTime(50);
    throttledFn('second');

    // Advance more time but still within original throttle period
    jest.advanceTimersByTime(30);
    throttledFn('third');

    // At this point, no additional calls should have been made
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Complete the throttle period from the original call (100ms total)
    jest.advanceTimersByTime(20);

    // Now the trailing call should execute with the latest arguments
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('third');
  });

  it('should preserve function context', () => {
    const obj = {
      value: 'test',
      setValue: function(this: { value: string }, newValue: string) {
        this.value = newValue;
      }
    };

    const throttledSetValue = throttleWithTrailing(obj.setValue as (...args: unknown[]) => unknown, 100);
    throttledSetValue.call(obj, 'immediate');

    expect(obj.value).toBe('immediate');

    throttledSetValue.call(obj, 'trailing');
    jest.advanceTimersByTime(100);

    expect(obj.value).toBe('trailing');
  });

  it('should handle rapid successive calls correctly', () => {
    const mockFn = jest.fn();
    const throttledFn = throttleWithTrailing(mockFn, 100);

    // First call executes immediately
    throttledFn('call-0');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('call-0');

    // Rapid fire additional calls within throttle period
    for (let i = 1; i < 10; i++) {
      jest.advanceTimersByTime(5); // Total time will be 45ms after loop
      throttledFn(`call-${i}`);
    }

    // Should still only have first call
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Complete the throttle period (100ms from first call)
    jest.advanceTimersByTime(55); // 45 + 55 = 100ms total

    // Should execute trailing call with last arguments
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('call-9');
  });

  it('should handle multiple throttle cycles', () => {
    const mockFn = jest.fn();
    const throttledFn = throttleWithTrailing(mockFn, 100);

    // First cycle
    throttledFn('cycle1-first');
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    throttledFn('cycle1-trailing');
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, 'cycle1-first');
    expect(mockFn).toHaveBeenNthCalledWith(2, 'cycle1-trailing');

    // Second cycle - enough time has passed, so this should execute immediately
    throttledFn('cycle2-first');
    expect(mockFn).toHaveBeenCalledTimes(3);
    
    throttledFn('cycle2-trailing');
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(4);
    expect(mockFn).toHaveBeenNthCalledWith(3, 'cycle2-first');
    expect(mockFn).toHaveBeenNthCalledWith(4, 'cycle2-trailing');
  });

  it('should reset and allow immediate execution after throttle period', () => {
    const mockFn = jest.fn();
    const throttledFn = throttleWithTrailing(mockFn, 100);

    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    jest.advanceTimersByTime(150); // More than throttle period
    throttledFn('second');

    // Second call should execute immediately since enough time passed
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, 'first');
    expect(mockFn).toHaveBeenNthCalledWith(2, 'second');
  });

  it('should handle zero throttle period', () => {
    const mockFn = jest.fn();
    const throttledFn = throttleWithTrailing(mockFn, 0);

    throttledFn('first');
    throttledFn('second');

    expect(mockFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(0);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('second');
  });

  it('should calculate remaining time correctly', () => {
    const mockFn = jest.fn();
    const throttledFn = throttleWithTrailing(mockFn, 100);

    throttledFn('first');
    jest.advanceTimersByTime(30);
    throttledFn('second');
    jest.advanceTimersByTime(30);
    throttledFn('third');

    // Only first call executed
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Should wait remaining 40ms (100 - 60)
    jest.advanceTimersByTime(39);
    expect(mockFn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('third');
  });
});