'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TIMER_CONSTANTS } from '../types/timer.constants';
import { log } from '@/lib/logger';

// Event-System für Timer-Updates
interface TimerUpdateEvent {
  time: number;
  drift: number;
  isRunning: boolean;
  isPaused: boolean;
  timestamp: number;
}

// Erweiterte Timer-States
interface TimerState {
  time: number;
  isRunning: boolean;
  isPaused: boolean;
  pausedTime: number | null;
}

// Erweiterte Performance-Metriken
export interface TimerStats {
  totalDrift: number;
  maxDrift: number;
  driftCorrections: number;
  averageDrift: number;
  lastCorrectionTime: number;
  averageTickTime: number;
  missedTicks: number;
}

interface UseTimerProps {
  initialTime: number;
  onTimeEnd?: () => void;
  onSessionTimerEnd?: () => void;
}

interface UseTimer {
  // States
  time: number;
  isTimerRunning: boolean;
  isPaused: boolean;

  // Core Functions
  setTime: (time: number) => void;
  setIsTimerRunning: (isRunning: boolean) => void;
  formatTime: (seconds: number) => string;
  resetTimer: () => void;

  // Extended Controls
  pauseTimer: () => void;
  resumeTimer: () => void;

  // Performance Stats
  timerStats: TimerStats;
}

// Timer-Event Interface
interface TimerEvent {
  type: 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'tick';
  time: number;
  isRunning: boolean;
  isPaused: boolean;
  stats: TimerStats;
}

// Event-System Typen
declare global {
  interface WindowEventMap {
    timerUpdate: CustomEvent<TimerUpdateEvent>;
    timerEvent: CustomEvent<TimerEvent>;
  }
}

/**
 * Hook für präzises Timer-Management mit Drift-Kompensation
 *
 * @param initialTime - Startzeit in Sekunden
 * @param onTimeEnd - Optional: Callback wenn Timer abläuft
 * @returns UseTimer Interface mit Timer-Funktionen und States
 */
export const useTimer = ({
  initialTime,
  onTimeEnd,
  onSessionTimerEnd,
}: UseTimerProps): UseTimer => {
  // Timer-States
  const [timerState, setTimerState] = useState<TimerState>({
    time: Math.max(0, initialTime),
    isRunning: false,
    isPaused: false,
    pausedTime: null,
  });

  // Performance-Tracking mit erweiterten Metriken
  const [timerStats, setTimerStats] = useState<TimerStats>({
    totalDrift: 0,
    maxDrift: 0,
    driftCorrections: 0,
    averageDrift: 0,
    lastCorrectionTime: 0,
    averageTickTime: 0,
    missedTicks: 0,
  });

  // Refs für Timing-Präzision
  const lastTick = useRef<number>(Date.now());
  const initialStartTime = useRef<number>(Date.now());
  const startTime = useRef<number>(Date.now());
  const tickTimes = useRef<number[]>([]);
  const timerStateRef = useRef(timerState);
  const onTimeEndRef = useRef(onTimeEnd);
  // Initialize these refs as null first, will be updated after functions are declared
  const emitTimerUpdateRef = useRef<((update: Omit<TimerUpdateEvent, 'timestamp'>) => void) | null>(null);
  const emitTimerEventRef = useRef<((eventType: string, data?: TimerEventData) => void) | null>(null);

  // Update refs whenever dependencies change
  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    onTimeEndRef.current = onTimeEnd;
  }, [onTimeEnd]);

  // Event-Emission mit konstanten Event-Namen
  const emitTimerUpdate = useCallback(
    (update: Omit<TimerUpdateEvent, 'timestamp'>) => {
      try {
        const event = new CustomEvent<TimerUpdateEvent>(
          TIMER_CONSTANTS.EVENTS.TIMER_UPDATE,
          {
            detail: {
              ...update,
              timestamp: Date.now(),
            },
            bubbles: true,
          }
        );
        window.dispatchEvent(event);
      } catch (error) {
        log.error('Error emitting timer update', error, {
          metadata: { hook: 'useTimer' },
        });
      }
    },
    []
  );

  // Event-Emission für Timer-Events
  const emitTimerEvent = useCallback(
    (eventType: TimerEvent['type']) => {
      try {
        const event = new CustomEvent<TimerEvent>('timerEvent', {
          detail: {
            type: eventType,
            time: timerState.time,
            isRunning: timerState.isRunning,
            isPaused: timerState.isPaused,
            stats: timerStats,
          },
          bubbles: true,
        });
        window.dispatchEvent(event);
      } catch (error) {
        log.error('Error emitting timer event', error, {
          metadata: { hook: 'useTimer', eventName: eventType },
        });
      }
    },
    [timerState, timerStats]
  );
  
  // Update refs after functions are declared
  useEffect(() => {
    emitTimerUpdateRef.current = emitTimerUpdate;
  }, [emitTimerUpdate]);

  useEffect(() => {
    emitTimerEventRef.current = emitTimerEvent;
  }, [emitTimerEvent]);

  // Timer-Update mit Konstanten
  const updateTimer = useCallback(() => {
    try {
      const now = Date.now();
      const delta = now - lastTick.current;
      tickTimes.current.push(delta);

      if (tickTimes.current.length > TIMER_CONSTANTS.MAX_TICK_HISTORY) {
        tickTimes.current = tickTimes.current.slice(
          -TIMER_CONSTANTS.MAX_TICK_HISTORY
        );
      }

      const currentState = timerStateRef.current;
      if (currentState.isRunning && currentState.time > 0) {
        const missedTicks = Math.floor(delta / 1000);

        if (missedTicks >= 1) {
          const drift = Math.abs(delta % 1000);
          const newTime = Math.max(0, currentState.time - missedTicks);

          // Aktualisiere Timer-State
          setTimerState(prev => ({
            ...prev,
            time: newTime,
            isRunning: newTime > 0,
          }));

          // Aktualisiere Performance-Metriken
          setTimerStats(prev => {
            const newTotalDrift = prev.totalDrift + drift;
            const newCorrections = prev.driftCorrections + 1;

            return {
              totalDrift: newTotalDrift,
              maxDrift: Math.max(prev.maxDrift, drift),
              driftCorrections: newCorrections,
              averageDrift: newTotalDrift / newCorrections,
              lastCorrectionTime: now,
              averageTickTime:
                tickTimes.current.reduce((a, b) => a + b, 0) /
                tickTimes.current.length,
              missedTicks: prev.missedTicks + missedTicks - 1,
            };
          });

          // Emittiere Update-Event
          emitTimerUpdateRef.current?.({
            time: newTime,
            drift,
            isRunning: newTime > 0,
            isPaused: currentState.isPaused,
          });

          if (newTime === 0) {
            onTimeEndRef.current?.();
          }
          emitTimerEventRef.current?.('tick');
        }
      }

      lastTick.current = now;
    } catch (error) {
      log.error('Timer update error', error, {
        metadata: { hook: 'useTimer' },
      });
      setTimerState(prev => ({ ...prev, isRunning: false }));
      emitTimerEventRef.current('stop');
    }
  }, []); // Empty dependencies - use refs for all dynamic values

  // Haupttimer-Loop mit RAF
  useEffect(() => {
    let animationFrameId: number;

    const timerLoop = () => {
      updateTimer();
      animationFrameId = requestAnimationFrame(timerLoop);
    };

    if (timerState.isRunning && !timerState.isPaused) {
      animationFrameId = requestAnimationFrame(timerLoop);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [timerState.isRunning, timerState.isPaused, updateTimer]);

  // Performance-Monitoring mit Konstanten
  useEffect(() => {
    let performanceCheckInterval: NodeJS.Timeout;

    const currentState = timerStateRef.current;
    if (currentState.isRunning && !currentState.isPaused) {
      performanceCheckInterval = setInterval(() => {
        const now = Date.now();
        const expectedTime =
          initialStartTime.current -
          Math.floor((now - startTime.current) / TIMER_CONSTANTS.TICK_INTERVAL);
        const currentTimerState = timerStateRef.current;
        const drift = Math.abs(currentTimerState.time - expectedTime);

        if (drift > TIMER_CONSTANTS.MAX_DRIFT_THRESHOLD) {
          // Korrigiere große Abweichungen
          setTimerState(prev => ({ ...prev, time: expectedTime }));
          lastTick.current = now;

          setTimerStats(prev => ({
            ...prev,
            totalDrift: prev.totalDrift + drift,
            maxDrift: Math.max(prev.maxDrift, drift),
            driftCorrections: prev.driftCorrections + 1,
          }));
        }
      }, TIMER_CONSTANTS.PERFORMANCE_CHECK_INTERVAL);
    }

    return () => {
      if (performanceCheckInterval) {
        clearInterval(performanceCheckInterval);
      }
    };
  }, [timerState.isRunning, timerState.isPaused]);

  // Pause/Resume Funktionalität
  const pauseTimer = useCallback(() => {
    const currentState = timerStateRef.current;
    if (currentState.isRunning) {
      setTimerState(prev => ({
        ...prev,
        isPaused: true,
        pausedTime: currentState.time,
      }));
      setTimerState(prev => ({ ...prev, isRunning: false }));
      emitTimerEventRef.current('pause');
    }
  }, []);

  const resumeTimer = useCallback(() => {
    const currentState = timerStateRef.current;
    if (currentState.isPaused && currentState.pausedTime !== null) {
      setTimerState(prev => ({
        ...prev,
        isPaused: false,
        time: currentState.pausedTime || prev.time,
      }));
      setTimerState(prev => ({ ...prev, isRunning: true }));
      lastTick.current = Date.now();
      startTime.current = Date.now();
      emitTimerEventRef.current('resume');
    }
  }, []);

  // Zeit-Formatierung
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return [hours, minutes, remainingSeconds]
      .map(unit => unit.toString().padStart(2, '0'))
      .join(':');
  }, []);

  // Timer zurücksetzen
  const resetTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      time: initialTime,
      isRunning: false,
      isPaused: false,
      pausedTime: null,
    }));
    lastTick.current = Date.now();
    startTime.current = Date.now();
    initialStartTime.current = Date.now();
    setTimerStats({
      totalDrift: 0,
      maxDrift: 0,
      driftCorrections: 0,
      averageDrift: 0,
      lastCorrectionTime: 0,
      averageTickTime: 0,
      missedTicks: 0,
    });
    emitTimerEventRef.current('reset');
  }, [initialTime]);

  // Session-Synchronisation
  useEffect(() => {
    if (timerState.time === 0) {
      // Benachrichtige Session über Timer-Ende
      onSessionTimerEnd?.();
    }
  }, [timerState.time, onSessionTimerEnd]);

  // Browser-Refresh Persistenz mit konstanten Storage-Keys
  useEffect(() => {
    // Load saved state only on mount
    try {
      const storedState = localStorage.getItem(`timerState_local`);
      if (storedState) {
        setTimerState(JSON.parse(storedState));
      }
    } catch (error) {
      log.error('Error loading timer state', error, {
        metadata: { hook: 'useTimer' },
      });
    }
  }, []); // Only run on mount

  // Separate effect for handling beforeunload
  useEffect(() => {
    const saveState = () => {
      try {
        localStorage.setItem(
          `timerState_local`,
          JSON.stringify(timerStateRef.current)
        );
      } catch (error) {
        log.error('Error saving timer state', error, {
          metadata: { hook: 'useTimer' },
        });
      }
    };

    window.addEventListener('beforeunload', saveState);
    return () => {
      window.removeEventListener('beforeunload', saveState);
      saveState();
    };
  }, []); // No dependencies needed since we use the ref

  // Timer-Controls mit Event-Emission erweitern
  const setIsTimerRunning = useCallback(
    (isRunning: boolean) => {
      setTimerState(prev => {
        const newState = { ...prev, isRunning };
        emitTimerEventRef.current(isRunning ? 'start' : 'stop');
        return newState;
      });
    },
    []
  );

  return {
    // States
    time: timerState.time,
    isTimerRunning: timerState.isRunning,
    isPaused: timerState.isPaused,

    // Core Functions
    setTime: (time: number) => setTimerState(prev => ({ ...prev, time })),
    setIsTimerRunning,
    formatTime,
    resetTimer,

    // Extended Controls
    pauseTimer,
    resumeTimer,

    // Performance Stats
    timerStats,
  };
};
