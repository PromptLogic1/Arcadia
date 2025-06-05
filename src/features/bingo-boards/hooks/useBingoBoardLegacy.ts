'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useTransition,
  useRef,
} from 'react';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/types';
import type {
  GameBoardCell,
  UseBingoBoardProps,
  UseBingoBoardReturn,
} from '@/types/domains/bingo';
import { BOARD_CONSTANTS, ERROR_MESSAGES } from '@/types/domains/bingo';

type BingoBoardRow = Database['public']['Tables']['bingo_boards']['Row'];
type PostgresChangesPayload<T> = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T | null;
};

// Hilfsfunktionen für Validierung und Fehlerbehandlung
const isTemporaryError = (error: Error) => {
  const temporaryErrors = ['timeout', 'network', 'connection'];
  return temporaryErrors.some(e => error.message.toLowerCase().includes(e));
};

type State = {
  board: BingoBoardRow | null;
  loading: boolean;
  error: Error | null;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: BingoBoardRow }
  | { type: 'FETCH_ERROR'; payload: Error }
  | { type: 'UPDATE_BOARD'; payload: BingoBoardRow }
  | { type: 'UPDATE_ERROR'; payload: Error | null };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { board: action.payload, loading: false, error: null };
    case 'FETCH_ERROR':
      return { board: null, loading: false, error: action.payload };
    case 'UPDATE_BOARD':
      return { ...state, board: action.payload, error: null };
    case 'UPDATE_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

// Add deep clone utility
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const useBingoBoard = ({
  boardId,
}: UseBingoBoardProps): UseBingoBoardReturn => {
  const [state, dispatch] = useReducer(reducer, {
    board: null,
    loading: true,
    error: null,
  });
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(() => createClient(), []);
  
  // Refs to prevent stale closures
  const boardStateRef = useRef<GameBoardCell[] | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  // Update boardStateRef when state changes
  useEffect(() => {
    boardStateRef.current = state.board?.board_state || null;
  }, [state.board?.board_state]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  // Validierung mit Fehler-Feedback
  const validateBoardState = useCallback(
    (state: unknown): state is GameBoardCell[] => {
      if (!Array.isArray(state)) {
        dispatch({
          type: 'UPDATE_ERROR',
          payload: new Error(ERROR_MESSAGES.INVALID_BOARD),
        });
        return false;
      }

      // Erlaube leeres Array als validen State
      if (state.length === 0) {
        return true;
      }

      const isValid = state.every(
        cell =>
          cell &&
          typeof cell === 'object' &&
          typeof cell.text === 'string' &&
          Array.isArray(cell.colors) &&
          Array.isArray(cell.completedBy) &&
          typeof cell.blocked === 'boolean' &&
          typeof cell.isMarked === 'boolean' &&
          typeof cell.cellId === 'string'
      );

      if (!isValid) {
        dispatch({
          type: 'UPDATE_ERROR',
          payload: new Error(ERROR_MESSAGES.INVALID_BOARD),
        });
      }
      return isValid;
    },
    []
  );

  // Fetch board data mit Retry-Logik (fixed stale closures)
  const fetchBoard = useCallback(
    async (attempt = 1): Promise<void> => {
      const maxAttempts = BOARD_CONSTANTS.UPDATE.MAX_RETRIES;
      const retryDelay = BOARD_CONSTANTS.UPDATE.RETRY_DELAY;

      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('bingo_boards')
          .select(
            `
          *,
          creator:creator_id(
            username,
            avatar_url
          )
        `
          )
          .eq('id', boardId)
          .single();

        if (fetchError) {
          if (attempt < maxAttempts) {
            return new Promise((resolve) => {
              retryTimeoutRef.current = setTimeout(() => {
                retryTimeoutRef.current = null;
                fetchBoard(attempt + 1).then(resolve).catch(resolve);
              }, retryDelay * attempt);
            });
          }
          startTransition(() => {
            dispatch({
              type: 'FETCH_ERROR',
              payload: new Error(ERROR_MESSAGES.NETWORK_ERROR),
            });
          });
          return;
        }

        if (!data || !validateBoardState(data.board_state)) {
          if (attempt < maxAttempts) {
            return new Promise((resolve) => {
              retryTimeoutRef.current = setTimeout(() => {
                retryTimeoutRef.current = null;
                fetchBoard(attempt + 1).then(resolve).catch(resolve);
              }, retryDelay * attempt);
            });
          }
          startTransition(() => {
            dispatch({
              type: 'FETCH_ERROR',
              payload: new Error(ERROR_MESSAGES.INVALID_BOARD),
            });
          });
          return;
        }

        startTransition(() => {
          dispatch({ type: 'FETCH_SUCCESS', payload: data });
        });
      } catch (err) {
        if (attempt < maxAttempts && isTemporaryError(err as Error)) {
          return new Promise((resolve) => {
            retryTimeoutRef.current = setTimeout(() => {
              retryTimeoutRef.current = null;
              fetchBoard(attempt + 1).then(resolve).catch(resolve);
            }, retryDelay * attempt);
          });
        }
        startTransition(() => {
          dispatch({
            type: 'FETCH_ERROR',
            payload:
              err instanceof Error
                ? err
                : new Error(ERROR_MESSAGES.SYNC_FAILED),
          });
        });
      }
    },
    [boardId, supabase, validateBoardState]
  );

  // Update board state mit optimistischem Update und Merge-Logik
  const updateBoardState = useCallback(
    async (newState: GameBoardCell[]) => {
      if (!validateBoardState(newState)) {
        const errorMsg = ERROR_MESSAGES.INVALID_BOARD;
        startTransition(() => {
          dispatch({ type: 'UPDATE_ERROR', payload: new Error(errorMsg) });
        });
        throw new Error(errorMsg);
      }

      const previousBoard = state.board ? deepClone(state.board) : null;

      try {
        startTransition(() => {
          if (!state.board) {
            dispatch({
              type: 'UPDATE_ERROR',
              payload: new Error(ERROR_MESSAGES.SYNC_FAILED),
            });
            return;
          }
          dispatch({
            type: 'UPDATE_BOARD',
            payload: {
              ...state.board,
              board_state: newState,
            } as BingoBoardRow,
          });
        });

        const { error: updateError } = await supabase
          .from('bingo_boards')
          .update({ board_state: newState })
          .eq('id', boardId)
          .single();

        if (updateError) {
          if (previousBoard) {
            startTransition(() => {
              dispatch({ type: 'UPDATE_BOARD', payload: previousBoard });
            });
          }
          startTransition(() => {
            dispatch({
              type: 'UPDATE_ERROR',
              payload: new Error(ERROR_MESSAGES.UPDATE_FAILED),
            });
          });
          throw updateError;
        }

        startTransition(() => {
          dispatch({ type: 'UPDATE_ERROR', payload: null });
        });
      } catch (err) {
        if (previousBoard) {
          startTransition(() => {
            dispatch({ type: 'UPDATE_BOARD', payload: previousBoard });
          });
        }
        const errorMsg = ERROR_MESSAGES.UPDATE_FAILED;
        startTransition(() => {
          dispatch({ type: 'UPDATE_ERROR', payload: new Error(errorMsg) });
        });
        throw err;
      }
    },
    [state.board, boardId, supabase, validateBoardState]
  );

  // Initial fetch
  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Update board settings
  const updateBoardSettings = async (
    settings: Partial<Database['public']['Tables']['bingo_boards']['Row']>
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('bingo_boards')
        .update(settings)
        .eq('id', boardId);

      if (updateError) {
        const errorMsg = ERROR_MESSAGES.UPDATE_FAILED;
        dispatch({ type: 'UPDATE_ERROR', payload: new Error(errorMsg) });
        throw new Error(errorMsg);
      }
      return Promise.resolve();
    } catch (err) {
      dispatch({
        type: 'UPDATE_ERROR',
        payload:
          err instanceof Error ? err : new Error(ERROR_MESSAGES.UPDATE_FAILED),
      });
      return Promise.reject(err);
    }
  };

  // Realtime subscriptions mit Merge-Logik (fixed stale closures)
  useEffect(() => {
    // Reset reconnect attempts on effect re-run
    reconnectAttemptsRef.current = 0;
    
    const maxReconnectAttempts = BOARD_CONSTANTS.SYNC.RECONNECT_ATTEMPTS;
    const reconnectDelay = BOARD_CONSTANTS.SYNC.RECONNECT_DELAY;

    const channel = supabase
      .channel(`board_${boardId}`)
      .on<PostgresChangesPayload<BingoBoardRow>>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_boards',
          filter: `id=eq.${boardId}`,
        },
        payload => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedBoard = payload.new as unknown as BingoBoardRow;

            if (
              updatedBoard.board_state &&
              validateBoardState(updatedBoard.board_state)
            ) {
              const boardState = updatedBoard.board_state;
              // Use ref to get current board state for merging
              const currentBoardState = boardStateRef.current;
              
              dispatch({
                type: 'UPDATE_BOARD',
                payload: {
                  ...updatedBoard,
                  board_state: boardState.map(
                    (cell: GameBoardCell, i: number) => ({
                      ...cell,
                      colors: [
                        ...new Set([
                          ...(currentBoardState?.[i]?.colors || []),
                          ...(cell.colors || []),
                        ]),
                      ],
                    })
                  ),
                },
              });
            }
          }
        }
      )
      .on('system', 'disconnect', () => {
        const tryReconnect = () => {
          // Check current attempt count from ref
          if (reconnectAttemptsRef.current >= maxReconnectAttempts) return;
          
          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          
          reconnectAttemptsRef.current++;
          const currentAttempt = reconnectAttemptsRef.current;

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            
            channel.subscribe((status: string) => {
              if (status === 'SUBSCRIBED') {
                reconnectAttemptsRef.current = 0;
              } else if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                tryReconnect();
              }
            });
          }, reconnectDelay * currentAttempt);
        };

        tryReconnect();
      })
      .subscribe();

    return () => {
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      supabase.removeChannel(channel);
    };
  }, [boardId, supabase, validateBoardState]); // Removed state.board?.board_state dependency

  return {
    board: state.board,
    loading: state.loading || isPending,
    error: state.error,
    updateBoardState,
    updateBoardSettings,
  };
};
