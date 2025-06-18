import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Timer precision types
interface TimerState {
  startTime: number | null;
  pausedTime: number | null;
  totalPausedDuration: number;
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;
}

interface TimerValidation {
  isValid: boolean;
  reason?: string;
  suspiciousPatterns?: string[];
}

interface TimerSnapshot {
  timestamp: number;
  elapsedTime: number;
  state: 'running' | 'paused' | 'stopped';
}

// High-precision timer implementation
export class SpeedrunTimer {
  private state: TimerState = {
    startTime: null,
    pausedTime: null,
    totalPausedDuration: 0,
    isRunning: false,
    isPaused: false,
    currentTime: 0
  };

  private snapshots: TimerSnapshot[] = [];
  private frameCallbacks: Set<(time: number) => void> = new Set();
  private animationFrameId: number | null = null;
  private performanceStart = 0;
  private timeProvider: () => number;

  constructor(timeProvider?: () => number) {
    this.timeProvider = timeProvider || this.getHighPrecisionTime.bind(this);
  }

  // Use high-precision performance API
  private getHighPrecisionTime(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  // Start timer
  start(): boolean {
    if (this.state.isRunning) {
      return false;
    }

    const now = this.timeProvider();
    this.state.startTime = now;
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.totalPausedDuration = 0;
    this.performanceStart = now;

    this.recordSnapshot('running');
    this.startAnimationFrame();

    return true;
  }

  // Pause timer
  pause(): boolean {
    if (!this.state.isRunning || this.state.isPaused) {
      return false;
    }

    const now = this.timeProvider();
    this.state.pausedTime = now;
    this.state.isPaused = true;

    this.recordSnapshot('paused');
    this.stopAnimationFrame();

    return true;
  }

  // Resume timer
  resume(): boolean {
    if (!this.state.isRunning || !this.state.isPaused || !this.state.pausedTime) {
      return false;
    }

    const now = this.timeProvider();
    this.state.totalPausedDuration += now - this.state.pausedTime;
    this.state.pausedTime = null;
    this.state.isPaused = false;

    this.recordSnapshot('running');
    this.startAnimationFrame();

    return true;
  }

  // Stop timer
  stop(): number {
    if (!this.state.isRunning) {
      return this.state.currentTime;
    }

    const finalTime = this.getElapsedTime();
    
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.currentTime = finalTime;

    this.recordSnapshot('stopped');
    this.stopAnimationFrame();

    return finalTime;
  }

  // Reset timer
  reset(): void {
    this.state = {
      startTime: null,
      pausedTime: null,
      totalPausedDuration: 0,
      isRunning: false,
      isPaused: false,
      currentTime: 0
    };
    this.snapshots = [];
    this.frameCallbacks.clear();
    this.stopAnimationFrame();
  }

  // Get elapsed time with millisecond precision
  getElapsedTime(): number {
    if (!this.state.startTime) {
      return 0;
    }

    const now = this.timeProvider();
    let elapsed = now - this.state.startTime;

    // Subtract paused time
    elapsed -= this.state.totalPausedDuration;
    
    if (this.state.isPaused && this.state.pausedTime) {
      elapsed -= (now - this.state.pausedTime);
    }

    return Math.max(0, elapsed);
  }

  // Format time for display
  formatTime(includeMilliseconds = true): string {
    const elapsed = this.state.isRunning ? this.getElapsedTime() : this.state.currentTime;
    
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor(elapsed % 1000);

    if (includeMilliseconds) {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Validate timer integrity
  validateIntegrity(): TimerValidation {
    const validation: TimerValidation = { isValid: true };
    const suspiciousPatterns: string[] = [];

    // Check for time manipulation
    if (this.snapshots.length > 1) {
      for (let i = 1; i < this.snapshots.length; i++) {
        const prev = this.snapshots[i - 1]!;
        const curr = this.snapshots[i]!;
        
        // Check for time going backwards
        if (curr.elapsedTime < prev.elapsedTime && curr.state === 'running' && prev.state === 'running') {
          suspiciousPatterns.push('Time regression detected');
        }

        // Check for impossible time jumps
        const timeDiff = curr.timestamp - prev.timestamp;
        const elapsedDiff = curr.elapsedTime - prev.elapsedTime;
        
        if (Math.abs(timeDiff - elapsedDiff) > 100 && curr.state === 'running' && prev.state === 'running') {
          suspiciousPatterns.push('Time jump detected');
        }
      }
    }

    // Check for impossible speeds (e.g., sub-10 second speedruns)
    const finalTime = this.state.currentTime || this.getElapsedTime();
    if (finalTime > 0 && finalTime < 10000) {
      suspiciousPatterns.push('Suspiciously fast completion time');
    }

    // Check pause abuse
    const pauseCount = this.snapshots.filter(s => s.state === 'paused').length;
    if (pauseCount > 10) {
      suspiciousPatterns.push('Excessive pausing detected');
    }

    if (suspiciousPatterns.length > 0) {
      validation.isValid = false;
      validation.reason = 'Suspicious timer patterns detected';
      validation.suspiciousPatterns = suspiciousPatterns;
    }

    return validation;
  }

  // Record snapshot for validation
  private recordSnapshot(state: 'running' | 'paused' | 'stopped') {
    this.snapshots.push({
      timestamp: this.timeProvider(),
      elapsedTime: this.getElapsedTime(),
      state
    });
  }

  // Animation frame for smooth updates
  private startAnimationFrame() {
    const update = () => {
      const elapsed = this.getElapsedTime();
      this.frameCallbacks.forEach(callback => callback(elapsed));
      
      if (this.state.isRunning && !this.state.isPaused) {
        this.animationFrameId = requestAnimationFrame(update);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopAnimationFrame() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Subscribe to time updates
  onTimeUpdate(callback: (time: number) => void): () => void {
    this.frameCallbacks.add(callback);
    return () => this.frameCallbacks.delete(callback);
  }

  // Get timer state
  getState(): Readonly<TimerState> {
    return { ...this.state };
  }

  // Get validation snapshots
  getSnapshots(): Readonly<TimerSnapshot[]> {
    return [...this.snapshots];
  }

  // Calculate accuracy compared to system time
  calculateAccuracy(): number {
    if (!this.state.startTime || !this.performanceStart) {
      return 0;
    }

    const timerElapsed = this.getElapsedTime();
    const systemElapsed = this.timeProvider() - this.performanceStart;
    const actualElapsed = systemElapsed - this.state.totalPausedDuration;

    if (this.state.isPaused && this.state.pausedTime) {
      const pauseDuration = this.timeProvider() - this.state.pausedTime;
      return Math.abs(timerElapsed - (actualElapsed - pauseDuration));
    }

    return Math.abs(timerElapsed - actualElapsed);
  }
}

// Mock performance.now for fake timers - use a simple counter that advances with time
let mockTime = 1000; // Start at 1000ms to avoid falsy values

// Mock requestAnimationFrame for tests
const mockRAF = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(mockTime), 16) as unknown as number;
};

const mockCAF = (id: number): void => {
  clearTimeout(id);
};

// Apply mocks
(global as any).requestAnimationFrame = mockRAF;
(global as any).cancelAnimationFrame = mockCAF;

// Create a more robust performance mock
const mockPerformance = {
  now: () => {
    return mockTime;
  }
};

// Override both global and window performance
(global as any).performance = mockPerformance;
if (typeof window !== 'undefined') {
  (window as any).performance = mockPerformance;
}

describe('Speedrun Timer', () => {
  let timer: SpeedrunTimer;

  beforeEach(() => {
    // Always reset mockTime first
    mockTime = 1000; // Start at 1000ms to avoid falsy values
    
    jest.useFakeTimers();
    
    // Create timer with mock time provider
    timer = new SpeedrunTimer(() => mockTime);
  });

  afterEach(() => {
    // Stop any running timer and clear callbacks
    if (timer) {
      timer.stop();
      timer.reset();
    }
    jest.useRealTimers();
    // Reset mockTime for next test
    mockTime = 1000;
  });

  // Helper function to advance time and update mock
  const advanceTime = (ms: number) => {
    mockTime += ms;
    jest.advanceTimersByTime(ms);
  };

  describe('Basic Timer Operations', () => {
    test('should start timer', () => {
      const started = timer.start();
      expect(started).toBe(true);
      
      const state = timer.getState();
      expect(state.isRunning).toBe(true);
      expect(state.isPaused).toBe(false);
      expect(state.startTime).not.toBeNull();
    });

    test('should not start when already running', () => {
      timer.start();
      const secondStart = timer.start();
      
      expect(secondStart).toBe(false);
    });

    test('should pause timer', () => {
      timer.start();
      advanceTime(1000);
      
      const paused = timer.pause();
      expect(paused).toBe(true);
      
      const state = timer.getState();
      expect(state.isPaused).toBe(true);
      expect(state.pausedTime).toBeTruthy();
    });

    test('should resume timer', () => {
      timer.start();
      advanceTime(1000);
      timer.pause();
      advanceTime(500);
      
      const resumed = timer.resume();
      expect(resumed).toBe(true);
      
      const state = timer.getState();
      expect(state.isPaused).toBe(false);
      expect(state.pausedTime).toBeNull();
    });

    test('should stop timer and return final time', () => {
      timer.start();
      advanceTime(5000);
      
      const finalTime = timer.stop();
      expect(finalTime).toBeCloseTo(5000, -1);
      
      const state = timer.getState();
      expect(state.isRunning).toBe(false);
      expect(state.currentTime).toBe(finalTime);
    });

    test('should reset timer completely', () => {
      timer.start();
      advanceTime(5000);
      timer.stop();
      timer.reset();
      
      const state = timer.getState();
      expect(state.startTime).toBeNull();
      expect(state.currentTime).toBe(0);
      expect(state.isRunning).toBe(false);
    });
  });

  describe('Time Precision', () => {
    test('should maintain millisecond precision', () => {
      timer.start();
      advanceTime(1234);
      
      const elapsed = timer.getElapsedTime();
      expect(elapsed).toBeCloseTo(1234, 0);
    });

    test('should exclude paused time from elapsed calculation', () => {
      timer.start();
      advanceTime(1000);
      
      timer.pause();
      advanceTime(500); // Paused for 500ms
      
      timer.resume();
      advanceTime(1000);
      
      const elapsed = timer.getElapsedTime();
      expect(elapsed).toBeCloseTo(2000, -1); // Should be 2000ms, not 2500ms
    });

    test('should handle multiple pause/resume cycles', () => {
      timer.start();
      
      // First cycle
      advanceTime(1000);
      timer.pause();
      advanceTime(200);
      timer.resume();
      
      // Second cycle
      advanceTime(1000);
      timer.pause();
      advanceTime(300);
      timer.resume();
      
      // Final run
      advanceTime(1000);
      
      const elapsed = timer.getElapsedTime();
      expect(elapsed).toBeCloseTo(3000, -1); // 3 seconds running, 500ms paused
    });
  });

  describe('Time Formatting', () => {
    test('should format time with milliseconds', () => {
      timer.start();
      advanceTime(65432); // 1:05.432
      
      const formatted = timer.formatTime(true);
      expect(formatted).toBe('01:05.432');
    });

    test('should format time without milliseconds', () => {
      timer.start();
      advanceTime(65432);
      
      const formatted = timer.formatTime(false);
      expect(formatted).toBe('01:05');
    });

    test('should handle times over 10 minutes', () => {
      timer.start();
      advanceTime(725000); // 12:05.000
      
      const formatted = timer.formatTime(true);
      expect(formatted).toBe('12:05.000');
    });
  });

  describe('Timer Validation', () => {
    test('should validate normal timer usage', () => {
      timer.start();
      advanceTime(30000);
      timer.stop();
      
      const validation = timer.validateIntegrity();
      expect(validation.isValid).toBe(true);
    });

    test('should detect suspiciously fast times', () => {
      timer.start();
      advanceTime(5000); // 5 seconds
      timer.stop();
      
      const validation = timer.validateIntegrity();
      expect(validation.isValid).toBe(false);
      expect(validation.suspiciousPatterns).toContain('Suspiciously fast completion time');
    });

    test('should detect excessive pausing', () => {
      timer.start();
      
      // Pause/resume 15 times
      for (let i = 0; i < 15; i++) {
        advanceTime(100);
        timer.pause();
        advanceTime(100);
        timer.resume();
      }
      
      timer.stop();
      
      const validation = timer.validateIntegrity();
      expect(validation.isValid).toBe(false);
      expect(validation.suspiciousPatterns).toContain('Excessive pausing detected');
    });
  });

  describe('Timer Accuracy', () => {
    test('should calculate accuracy correctly', () => {
      timer.start();
      advanceTime(1000);
      
      const accuracy = timer.calculateAccuracy();
      expect(accuracy).toBeLessThan(10); // Should be accurate within 10ms
    });

    test('should maintain accuracy during pause', () => {
      timer.start();
      advanceTime(1000);
      timer.pause();
      advanceTime(500);
      
      const accuracy = timer.calculateAccuracy();
      expect(accuracy).toBeLessThan(10);
    });
  });

  describe('Timer Callbacks', () => {
    test('should notify on time updates', () => {
      const updates: number[] = [];
      const unsubscribe = timer.onTimeUpdate(time => updates.push(time));
      
      timer.start();
      advanceTime(100);
      
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[updates.length - 1]).toBeGreaterThan(0);
      
      unsubscribe();
    });

    test('should stop updates when paused', () => {
      const updates: number[] = [];
      timer.onTimeUpdate(time => updates.push(time));
      
      timer.start();
      advanceTime(100);
      
      const countBeforePause = updates.length;
      
      timer.pause();
      advanceTime(100);
      
      expect(updates.length).toBe(countBeforePause);
    });
  });

  describe('Snapshot History', () => {
    test('should record state changes', () => {
      timer.start();
      advanceTime(1000);
      timer.pause();
      advanceTime(500);
      timer.resume();
      advanceTime(1000);
      timer.stop();
      
      const snapshots = timer.getSnapshots();
      
      expect(snapshots.length).toBe(4); // start, pause, resume, stop
      expect(snapshots[0]?.state).toBe('running');
      expect(snapshots[1]?.state).toBe('paused');
      expect(snapshots[2]?.state).toBe('running');
      expect(snapshots[3]?.state).toBe('stopped');
    });
  });

  describe('Performance Under Load', () => {
    test('should handle rapid start/stop cycles', () => {
      const times: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        timer.reset();
        timer.start();
        advanceTime(100);
        const time = timer.stop();
        times.push(time);
      }
      
      // All times should be consistent
      times.forEach(time => {
        expect(time).toBeCloseTo(100, -1);
      });
    });

    test('should maintain precision with many callbacks', () => {
      const callbacks = Array.from({ length: 50 }, () => jest.fn());
      const unsubscribes = callbacks.map(cb => timer.onTimeUpdate(cb));
      
      timer.start();
      advanceTime(1000);
      
      const elapsed = timer.getElapsedTime();
      expect(elapsed).toBeCloseTo(1000, -1);
      
      // Cleanup
      unsubscribes.forEach(unsub => unsub());
    });
  });
});