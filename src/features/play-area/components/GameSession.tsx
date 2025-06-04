'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Users,
  Play,
  Crown,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Share2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { notifications } from '@/lib/notifications';
import { createClient } from '@/lib/supabase';

// Types
import type { PlayAreaSession, PlayAreaPlayer } from '../types';

interface GameSessionProps {
  sessionId: string;
}

/**
 * Game Session Component
 * Main interface for active gaming sessions
 */
export function GameSession({ sessionId }: GameSessionProps) {
  const router = useRouter();
  const { authUser, isAuthenticated } = useAuth();
  const supabase = createClient();

  // State management
  const [session, setSession] = useState<PlayAreaSession | null>(null);
  const [players, setPlayers] = useState<PlayAreaPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [playerInSession, setPlayerInSession] = useState<PlayAreaPlayer | null>(
    null
  );
  const [copySuccess, setCopySuccess] = useState(false);

  // Load session data
  const loadSession = useCallback(async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select(
          `
          *,
          board:bingo_boards(
            id, title, description, game_type, difficulty, size,
            creator_id, board_state
          )
        `
        )
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Session not found');
      }

      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('bingo_session_players')
        .select(
          `
          *,
          user:users(id, username, avatar_url)
        `
        )
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (playersError) {
        throw playersError;
      }

      // Transform session data
      const transformedSession: PlayAreaSession = {
        id: sessionData.id,
        board_id: sessionData.board_id,
        host_id: sessionData.host_id,
        session_code: sessionData.session_code,
        status: sessionData.status,
        current_state: sessionData.current_state,
        settings: sessionData.settings,
        started_at: sessionData.started_at,
        ended_at: sessionData.ended_at,
        created_at: sessionData.created_at,
        updated_at: sessionData.updated_at,
        version: sessionData.version,
        winner_id: sessionData.winner_id,
        board: sessionData.board
          ? {
              id: sessionData.board.id,
              title: sessionData.board.title,
              description: sessionData.board.description,
              game_type: sessionData.board.game_type,
              difficulty: sessionData.board.difficulty,
              size: sessionData.board.size,
              creator_id: sessionData.board.creator_id,
              // Required properties with defaults
              board_state: sessionData.board.board_state,
              bookmarked_count: null,
              cloned_from: null,
              created_at: null,
              is_public: null,
              settings: null,
              status: null,
              updated_at: null,
              version: null,
              votes: null,
            }
          : undefined,
        players: [],
        current_player_count: playersData?.length || 0,
        max_players: sessionData.settings?.max_players || 4,
        spectators: [],
        host: undefined,
        winner: undefined,
      };

      // Transform players data
      const transformedPlayers: PlayAreaPlayer[] = (playersData || []).map(
        player => ({
          id: player.id || '',
          user_id: player.user_id,
          session_id: player.session_id,
          display_name: player.display_name,
          color: player.color,
          avatar_url: player.avatar_url,
          is_host: player.is_host || false,
          is_ready: player.is_ready || false,
          joined_at: player.joined_at,
          left_at: player.left_at,
          position: player.position,
          score: player.score,
          team: player.team,
          created_at: player.created_at,
          updated_at: player.updated_at,
          // Extended properties
          user: player.user
            ? {
                id: player.user.id,
                username: player.user.username,
                avatar_url: player.user.avatar_url || undefined,
              }
            : undefined,
          is_current_user: player.user_id === authUser?.id,
          is_online: true, // We'll implement presence tracking later
          completed_cells: 0, // We'll calculate this later
        })
      );

      // Find host and current user
      const hostPlayer = transformedPlayers.find(p => p.is_host);
      const currentPlayer = transformedPlayers.find(
        p => p.user_id === authUser?.id
      );

      transformedSession.host = hostPlayer;
      transformedSession.players = transformedPlayers;

      setSession(transformedSession);
      setPlayers(transformedPlayers);
      setIsHost(sessionData.host_id === authUser?.id);
      setPlayerInSession(currentPlayer || null);
    } catch (error) {
      console.error('Failed to load session:', error);
      setError((error as Error).message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId, authUser?.id, supabase]);

  // Initialize session data
  useEffect(() => {
    if (isAuthenticated) {
      loadSession();
    }
  }, [isAuthenticated, loadSession]);

  // Real-time subscription for session updates
  useEffect(() => {
    if (!sessionId || !isAuthenticated) return;

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          loadSession();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_session_players',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isAuthenticated, supabase, loadSession]);

  // Copy session code to clipboard
  const copySessionCode = useCallback(async () => {
    if (!session?.session_code) return;

    try {
      await navigator.clipboard.writeText(session.session_code);
      setCopySuccess(true);
      notifications.success('Session code copied to clipboard!');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      notifications.error('Failed to copy session code');
    }
  }, [session?.session_code]);

  // Share session
  const shareSession = useCallback(async () => {
    if (!session) return;

    const shareData = {
      title: `Join ${session.board?.title || 'Gaming Session'}`,
      text: `Join me in a ${session.board?.game_type || 'gaming'} session!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Fallback to copying URL
        await navigator.clipboard.writeText(window.location.href);
        notifications.success('Session link copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      notifications.success('Session link copied to clipboard!');
    }
  }, [session]);

  // Start game (host only)
  const startGame = useCallback(async () => {
    if (!isHost || !session) return;

    try {
      const response = await fetch(`/api/bingo/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to start game');
      }

      notifications.success('Game started!');
    } catch (error) {
      console.error('Failed to start game:', error);
      notifications.error('Failed to start game');
    }
  }, [isHost, session, sessionId]);

  // Join session (if not already in)
  const joinSession = useCallback(async () => {
    if (playerInSession || !session) return;

    try {
      const response = await fetch('/api/bingo/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join session');
      }

      notifications.success('Joined session successfully!');
      loadSession(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to join session:', error);
      notifications.error((error as Error).message || 'Failed to join session');
    }
  }, [playerInSession, session, sessionId, loadSession]);

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-4 text-center">
            <LoadingSpinner className="mx-auto h-8 w-8" />
            <p className="text-gray-300">Loading game session...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-md border-red-500/50 bg-red-900/20">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-bold text-red-300">
              Session Not Found
            </h2>
            <p className="mb-4 text-red-400">
              {error ||
                "The requested gaming session could not be found or you don't have access to it."}
            </p>
            <Button
              onClick={() => router.push('/play-area')}
              variant="outline"
              className="border-red-500/50 text-red-300 hover:bg-red-500/10"
            >
              Back to Play Area
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authentication required
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-md border-gray-700 bg-gray-800/50">
          <CardContent className="pt-6 text-center">
            <Crown className="mx-auto mb-4 h-12 w-12 text-cyan-400" />
            <h2 className="mb-2 text-xl font-bold text-gray-100">
              Sign In Required
            </h2>
            <p className="mb-4 text-gray-400">
              You need to be signed in to join this gaming session.
            </p>
            <Button
              onClick={() => router.push('/auth/login')}
              className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
      easy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      hard: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      expert: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      colors[difficulty as keyof typeof colors] ||
      'bg-gray-500/20 text-gray-400 border-gray-500/30'
    );
  };

  const getStatusColor = (status: string) => {
    const colors = {
      waiting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      colors[status as keyof typeof colors] ||
      'bg-gray-500/20 text-gray-400 border-gray-500/30'
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold text-transparent">
            {session.board?.title || 'Gaming Session'}
          </h1>
          <p className="mt-1 text-gray-300">
            Hosted by {session.host?.display_name || 'Unknown'}
          </p>
        </div>

        <div className="flex gap-2">
          {session.session_code && (
            <Button
              variant="outline"
              size="sm"
              onClick={copySessionCode}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              {copySuccess ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {session.session_code}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={shareSession}
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/play-area')}
            className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Back to Play Area
          </Button>
        </div>
      </div>

      {/* Session Info */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-gray-700 bg-gray-800/50 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-cyan-400" />
                Session Details
              </CardTitle>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className={getDifficultyColor(
                    session.board?.difficulty || 'medium'
                  )}
                >
                  {session.board?.difficulty || 'Medium'}
                </Badge>
                <Badge
                  variant="outline"
                  className={getStatusColor(session.status || 'waiting')}
                >
                  {session.status === 'waiting'
                    ? 'Waiting for Players'
                    : session.status === 'active'
                      ? 'In Progress'
                      : session.status || 'Unknown'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.board?.description && (
              <p className="text-gray-300">{session.board.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <span className="text-gray-400">Game Type:</span>
                <p className="font-medium text-gray-200">
                  {session.board?.game_type || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Board Size:</span>
                <p className="font-medium text-gray-200">
                  {session.board?.size || 5}×{session.board?.size || 5}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Players:</span>
                <p className="font-medium text-gray-200">
                  {session.current_player_count}/{session.max_players}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <p className="font-medium text-gray-200 capitalize">
                  {session.status || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              {!playerInSession && session.status === 'waiting' && (
                <Button
                  onClick={joinSession}
                  className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Join Game
                </Button>
              )}

              {isHost && session.status === 'waiting' && players.length > 1 && (
                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Game
                </Button>
              )}

              {session.status === 'active' && (
                <div className="flex items-center gap-2 text-green-400">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                  Game in progress
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Players List */}
        <Card className="border-gray-700 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Players ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {players.map(player => (
              <div key={player.user_id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={player.user?.avatar_url} />
                  <AvatarFallback className="bg-gray-700 text-xs text-gray-300">
                    {player.display_name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-200">
                      {player.display_name}
                      {player.is_current_user && ' (You)'}
                    </p>
                    {player.is_host && (
                      <Crown className="h-3 w-3 text-yellow-400" />
                    )}
                  </div>
                  {player.is_ready && (
                    <p className="text-xs text-green-400">Ready</p>
                  )}
                </div>

                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: (player as { color?: string }).color || '#666' }}
                />
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: session.max_players - players.length }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 opacity-50"
                >
                  <div className="h-8 w-8 rounded-full border border-dashed border-gray-600 bg-gray-700" />
                  <p className="text-sm text-gray-500">Waiting for player...</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Game Board Placeholder */}
      <Card className="border-gray-700 bg-gray-800/50">
        <CardHeader>
          <CardTitle>Game Board</CardTitle>
          <CardDescription>
            {session.status === 'waiting'
              ? 'Game will start when the host begins the session'
              : session.status === 'active'
                ? 'Game is currently in progress'
                : 'Game has ended'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto flex aspect-square max-w-lg items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-900/50">
            <div className="space-y-2 text-center">
              <Clock className="mx-auto h-12 w-12 text-gray-500" />
              <p className="text-gray-400">Game board will appear here</p>
              <p className="text-sm text-gray-500">
                {session.status === 'waiting'
                  ? 'Waiting for game to start...'
                  : 'Game board implementation coming soon'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
