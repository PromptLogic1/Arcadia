'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { BoardCell, BingoSession, WinDetectionResult } from '../types';
import { WinDetectionService } from '../services/win-detection.service';

export function useBingoGame(sessionId: string) {
  const [session, setSession] = useState<BingoSession | null>(null);
  const [boardState, setBoardState] = useState<BoardCell[]>([]);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [winResult, setWinResult] = useState<WinDetectionResult | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  
  const supabase = createClient();
  const winDetector = useMemo(() => new WinDetectionService(5), []); // Assuming 5x5 board
  
  // Load initial session state
  useEffect(() => {
    async function loadSession() {
      try {
        const { data, error } = await supabase
          .from('bingo_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        
        if (error) throw error;
        
        setSession(data as BingoSession);
        setBoardState(data.current_state || []);
        setVersion(data.version || 0);
        
        // Check if game already has a winner
        if (data.winner_id) {
          setIsWinner(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    loadSession();
  }, [sessionId, supabase]);
  
  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bingo_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const newSession = payload.new as BingoSession;
          setSession(newSession);
          setBoardState(newSession.current_state || []);
          setVersion(newSession.version || 0);
          
          // Check if someone won
          if (newSession.winner_id && !session?.winner_id) {
            setIsWinner(true);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, session?.winner_id, supabase]);
  
  // Check for wins after board state changes
  useEffect(() => {
    if (!boardState || boardState.length === 0 || !session || session.status !== 'active') {
      return;
    }
    
    const result = winDetector.detectWin(boardState);
    setWinResult(result);
  }, [boardState, session, winDetector]);
  
  // Handle winning the game
  const declareWinner = useCallback(async (userId: string) => {
    if (!winResult || !winResult.hasWin || isWinner) return;
    
    try {
      const response = await fetch(`/api/bingo/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner_id: userId,
          winning_patterns: winResult.patterns,
          final_score: winResult.totalPoints
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to declare winner');
      }
      
      setIsWinner(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete game');
    }
  }, [sessionId, winResult, isWinner]);
  
  // Mark/unmark cell
  const markCell = useCallback(async (cellPosition: number, userId: string) => {
    try {
      const response = await fetch(`/api/bingo/sessions/${sessionId}/mark-cell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cell_position: cellPosition,
          user_id: userId,
          action: 'mark',
          version
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Version conflict - reload current state
          window.location.reload(); // Simple conflict resolution
        }
        throw new Error(errorData.error);
      }
      
      // State will be updated via real-time subscription
      // Check for win will happen automatically via useEffect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark cell');
    }
  }, [sessionId, version]);
  
  const unmarkCell = useCallback(async (cellPosition: number, userId: string) => {
    try {
      const response = await fetch(`/api/bingo/sessions/${sessionId}/mark-cell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cell_position: cellPosition,
          user_id: userId,
          action: 'unmark',
          version
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          window.location.reload();
        }
        throw new Error(errorData.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unmark cell');
    }
  }, [sessionId, version]);
  
  const startGame = useCallback(async () => {
    try {
      const response = await fetch(`/api/bingo/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to start game');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    }
  }, [sessionId]);
  
  return {
    session,
    boardState,
    version,
    loading,
    error,
    markCell,
    unmarkCell,
    startGame,
    winResult,
    isWinner,
    declareWinner
  };
}