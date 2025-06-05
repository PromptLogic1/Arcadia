'use client';

import React, { useState, useCallback } from 'react';
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
import { useAuth } from '@/lib/stores/auth-store';
import { notifications } from '@/lib/notifications';
import { useSessionModern } from '@/features/bingo-boards/hooks/useSessionGame';
import { RealtimeErrorBoundary } from '@/components/error-boundaries';
import type { Player } from '../../../services/session-state.service';

// Types (for future reference - these types are no longer used in this component)

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

  // Use the modern hook for session management
  const { session, initializeSession } = useSessionModern(sessionId);

  // UI state
  const [copySuccess, setCopySuccess] = useState(false);

  // Derived state from the session
  const players = session.players || [];
  const isHost =
    session.players?.some(p => p.id === authUser?.id && p.is_host) || false;
  const playerInSession =
    session.players?.find(p => p.id === authUser?.id) || null;
  const loading = session.isLoading;
  const error = session.error?.message || null;

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
      title: `Join ${session.board_title || 'Gaming Session'}`,
      text: `Join me in a ${session.game_type || 'gaming'} session!`,
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
  const joinSessionAction = useCallback(async () => {
    if (playerInSession || !session || !authUser) return;

    const player: Player = {
      id: authUser.id,
      display_name: authUser.username || authUser.email || 'Unknown',
      avatar_url: authUser.avatar_url || undefined,
      joined_at: new Date().toISOString(),
      is_active: true,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
      is_host: false,
      is_ready: true,
    };

    try {
      await initializeSession(player);
    } catch (error) {
      console.error('Failed to join session:', error);
      notifications.error((error as Error).message || 'Failed to join session');
    }
  }, [playerInSession, session, authUser, initializeSession]);

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
    <RealtimeErrorBoundary componentName="GameSession">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold text-transparent">
              {session.board_title || 'Gaming Session'}
            </h1>
            <p className="mt-1 text-gray-300">
              Hosted by {session.host_username || 'Unknown'}
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
                  className={getDifficultyColor(session.difficulty || 'medium')}
                >
                  {session.difficulty || 'Medium'}
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
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <span className="text-gray-400">Game Type:</span>
                <p className="font-medium text-gray-200">
                  {session.game_type || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Board Size:</span>
                <p className="font-medium text-gray-200">5×5</p>
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
                  onClick={joinSessionAction}
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
              <div key={player.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={player.avatar_url} />
                  <AvatarFallback className="bg-gray-700 text-xs text-gray-300">
                    {player.display_name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-200">
                      {player.display_name}
                      {player.id === authUser?.id && ' (You)'}
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
                  style={{ backgroundColor: player.color || '#666' }}
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
    </RealtimeErrorBoundary>
  );
}
