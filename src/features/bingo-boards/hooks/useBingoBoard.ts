'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useTransition,
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

  // Fetch board data mit Retry-Logik
  const fetchBoard = useCallback(
    async (attempt = 1) => {
      const maxAttempts = BOARD_CONSTANTS.UPDATE.MAX_RETRIES;
      const retryDelay = BOARD_CONSTANTS.UPDATE.RETRY_DELAY;

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
            await new Promise(resolve =>
              setTimeout(resolve, retryDelay * attempt)
            );
            return fetchBoard(attempt + 1);
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
            await new Promise(resolve =>
              setTimeout(resolve, retryDelay * attempt)
            );
            return fetchBoard(attempt + 1);
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
          await new Promise(resolve =>
            setTimeout(resolve, retryDelay * attempt)
          );
          return fetchBoard(attempt + 1);
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

  // Realtime subscriptions mit Merge-Logik
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = BOARD_CONSTANTS.SYNC.RECONNECT_ATTEMPTS;
    const reconnectDelay = BOARD_CONSTANTS.SYNC.RECONNECT_DELAY;
    const currentBoardState = state.board?.board_state;

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
          if (reconnectAttempts >= maxReconnectAttempts) return;
          reconnectAttempts++;

          setTimeout(() => {
            channel.subscribe((status: string) => {
              if (status === 'SUBSCRIBED') {
                reconnectAttempts = 0;
              } else {
                tryReconnect();
              }
            });
          }, reconnectDelay * reconnectAttempts);
        };

        tryReconnect();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, supabase, validateBoardState, state.board?.board_state]);

  return {
    board: state.board,
    loading: state.loading || isPending,
    error: state.error,
    updateBoardState,
    updateBoardSettings,
  };
};
