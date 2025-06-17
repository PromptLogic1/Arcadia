import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

interface TimerState {
  startTime: number | null;
  pausedTime: number | null;
  elapsedTime: number;
  isRunning: boolean;
  isPaused: boolean;
}

interface TimerActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void;
  getFormattedTime: () => string;
}

export interface GameTimerStore extends TimerState {
  actions: TimerActions;
}

let intervalId: NodeJS.Timeout | null = null;

export const useGameTimerStore = createWithEqualityFn<GameTimerStore>()(
  devtools(
    set => ({
      // State
      startTime: null,
      pausedTime: null,
      elapsedTime: 0,
      isRunning: false,
      isPaused: false,

      // Actions
      actions: {
        start: () => {
          set(
            {
              startTime: Date.now(),
              pausedTime: null,
              elapsedTime: 0,
              isRunning: true,
              isPaused: false,
            },
            false,
            'timer/start'
          );

          // Start the interval
          if (intervalId) clearInterval(intervalId);
          intervalId = setInterval(() => {
            const store = useGameTimerStore.getState();
            store.actions.tick();
          }, 100); // Update every 100ms for smooth display
        },

        pause: () => {
          set(
            state => ({
              pausedTime: Date.now(),
              isRunning: false,
              isPaused: true,
              elapsedTime: state.startTime
                ? Date.now() - state.startTime
                : state.elapsedTime,
            }),
            false,
            'timer/pause'
          );

          // Clear the interval
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        },

        resume: () => {
          set(
            state => {
              const pauseDuration = state.pausedTime
                ? Date.now() - state.pausedTime
                : 0;
              return {
                startTime: state.startTime
                  ? state.startTime + pauseDuration
                  : Date.now(),
                pausedTime: null,
                isRunning: true,
                isPaused: false,
              };
            },
            false,
            'timer/resume'
          );

          // Restart the interval
          if (intervalId) clearInterval(intervalId);
          intervalId = setInterval(() => {
            const store = useGameTimerStore.getState();
            store.actions.tick();
          }, 100);
        },

        reset: () => {
          set(
            {
              startTime: null,
              pausedTime: null,
              elapsedTime: 0,
              isRunning: false,
              isPaused: false,
            },
            false,
            'timer/reset'
          );

          // Clear the interval
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        },

        tick: () => {
          set(
            state => {
              if (!state.isRunning || !state.startTime) {
                return state;
              }
              return {
                elapsedTime: Date.now() - state.startTime,
              };
            },
            false,
            'timer/tick'
          );
        },

        getFormattedTime: () => {
          const state = useGameTimerStore.getState();
          const totalSeconds = Math.floor(state.elapsedTime / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          const milliseconds = Math.floor((state.elapsedTime % 1000) / 10);

          return `${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        },
      },
    }),
    { name: 'game-timer-store' }
  )
);

// Selectors
export const useTimerState = () =>
  useGameTimerStore(
    useShallow(state => ({
      elapsedTime: state.elapsedTime,
      isRunning: state.isRunning,
      isPaused: state.isPaused,
    }))
  );

export const useTimerActions = () =>
  useGameTimerStore(useShallow(state => state.actions));

// Cleanup on module unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
}
