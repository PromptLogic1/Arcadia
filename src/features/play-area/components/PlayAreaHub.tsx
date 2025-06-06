'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Users,
  Plus,
  Search,
  Gamepad2,
  Clock,
  Lock,
  Globe,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { log } from '@/lib/logger';
import { useAuth } from '@/lib/stores/auth-store';

// New pattern imports
import {
  useSessionsState,
  useSessionsActions,
} from '@/lib/stores/sessions-store';
import {
  useActiveSessionsQuery,
  useJoinSessionMutation,
  useCreateSessionMutation,
} from '@/hooks/queries/useSessionsQueries';

// Components
import { SessionHostingDialog } from './SessionHostingDialog';
import { SessionJoinDialog } from './SessionJoinDialog';
import { SessionCard } from './SessionCard';
import { SessionFilters } from './SessionFilters';

// Types
import type { SessionSettings } from '../../../services/sessions.service';

interface PlayAreaHubProps {
  className?: string;
}

/**
 * Main Play Area Hub Component
 * Serves as the central interface for hosting and joining game sessions
 *
 * Uses the new Zustand + TanStack Query pattern for clean state management
 */
export function PlayAreaHub({ className }: PlayAreaHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authUser, isAuthenticated, loading: authLoading } = useAuth();

  // Zustand state (UI state only)
  const { filters, showHostDialog, showJoinDialog, joinSessionCode } =
    useSessionsState();
  const {
    setFilters,
    setShowHostDialog,
    setShowJoinDialog,
    setJoinSessionCode,
  } = useSessionsActions();

  // TanStack Query for data fetching
  const {
    data: sessionsResponse,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useActiveSessionsQuery(filters);

  // Mutations for actions
  const createSessionMutation = useCreateSessionMutation();
  const joinSessionMutation = useJoinSessionMutation();

  // Extract sessions from response
  const sessions = sessionsResponse?.sessions || [];

  // Derive hosting intent from URL parameters
  const boardIdFromUrl = searchParams?.get('boardId');
  const shouldHostFromUrl = searchParams?.get('host') === 'true';
  const shouldOpenHostDialog = isAuthenticated && boardIdFromUrl && shouldHostFromUrl;

  // Handle URL parameter-based hosting dialog
  useEffect(() => {
    if (shouldOpenHostDialog) {
      // Open hosting dialog with pre-selected board
      setShowHostDialog(true);
      // Clear URL parameters after processing
      router.replace('/play-area', { scroll: false });
    }
  }, [shouldOpenHostDialog, router, setShowHostDialog]);

  // Handle session hosting
  const handleCreateSession = async (
    boardId: string,
    settings: SessionSettings
  ) => {
    try {
      const result = await createSessionMutation.mutateAsync({
        board_id: boardId,
        host_id: authUser?.id || '',
        settings: {
          max_players: settings.max_players ?? 8,
          allow_spectators: settings.allow_spectators ?? true,
          auto_start: settings.auto_start ?? false,
          time_limit: settings.time_limit ?? undefined,
          require_approval: settings.require_approval ?? false,
          password: settings.password ?? undefined,
        },
      });
      // Navigate to the session
      router.push(`/play-area/session/${result.session?.id}`);
    } catch (error) {
      // Error handling is done in the mutation
      log.error('Failed to create session', error as Error, {
        metadata: { 
          component: 'PlayAreaHub',
          userId: authUser?.id, 
          settings 
        },
      });
    }
  };

  // Handle joining session by code
  const handleJoinByCode = async () => {
    if (!joinSessionCode.trim() || !authUser) return;

    // Note: This will need to be updated when we implement the join-by-code API
    // For now, this is a placeholder since the current service expects session_id
    try {
      // TODO: First need to resolve session code to session_id
      // const sessionResult = await getSessionByCode(joinSessionCode.trim().toUpperCase());
      // const sessionId = sessionResult.session?.id;

      setShowJoinDialog(false);
      setJoinSessionCode('');
      log.warn('Join by code not fully implemented yet', {
        component: 'PlayAreaHub',
        metadata: {
          joinSessionCode: joinSessionCode.trim(),
          userId: authUser?.id,
        },
      });
    } catch (error) {
      log.error('Failed to join session by code', error as Error, {
        metadata: {
          component: 'PlayAreaHub',
          joinSessionCode: joinSessionCode.trim(),
          userId: authUser?.id,
        },
      });
    }
  };

  // Handle joining session directly
  const handleJoinSession = async (sessionId: string) => {
    if (!authUser) return;

    // Get a random color from the default colors
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint
      '#F7DC6F', // Light Yellow
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const joinData = {
      session_id: sessionId,
      user_id: authUser.id,
      display_name:
        authUser.username ||
        authUser.auth_username ||
        authUser.email?.split('@')[0] ||
        'Player',
      color: randomColor || '#3B82F6', // Default to blue if somehow undefined
    };

    try {
      await joinSessionMutation.mutateAsync(joinData);
      // Navigate to the session
      router.push(`/play-area/session/${sessionId}`);
    } catch (error) {
      // Error handling is done in the mutation
      log.error('Failed to join session', error as Error, {
        metadata: { 
          component: 'PlayAreaHub',
          sessionId, 
          userId: authUser?.id, 
          joinData 
        },
      });
    }
  };

  // Sessions are already filtered by the query based on filters
  const filteredSessions = sessions;

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Authentication required
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Gamepad2 className="h-16 w-16 text-gray-400" />
        <h2 className="text-2xl font-bold text-gray-100">Join the Game</h2>
        <p className="max-w-md text-center text-gray-400">
          Sign in to host your own gaming sessions or join others in the Play
          Area.
        </p>
      </div>
    );
  }

  // Check if we came from challenge hub
  const cameFromChallengeHub = searchParams?.get('boardId');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          {/* Breadcrumb Navigation */}
          {cameFromChallengeHub && (
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/challenge-hub')}
                className="h-auto p-0 text-gray-400 hover:text-cyan-400"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Challenge Hub
              </Button>
              <ChevronRight className="h-3 w-3" />
              <span>Play Area</span>
            </div>
          )}

          <h1 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold text-transparent">
            Play Area
          </h1>
          <p className="mt-1 text-gray-300">
            Host your own challenges or join active gaming sessions
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="cyber" onClick={() => setShowHostDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Host Session
          </Button>

          <Button
            variant="cyber-outline"
            onClick={() => setShowJoinDialog(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            Join by Code
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card variant="cyber" glow="subtle">
          <CardHeader className="pb-3">
            <CardTitle className="neon-glow-cyan flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-cyan-400 drop-shadow-lg" />
              Active Players
            </CardTitle>
            <CardDescription className="text-cyan-200/70">
              Currently online and playing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="neon-glow-cyan animate-glow text-2xl font-bold">
              {sessions.reduce((total, session) => {
                const count =
                  'current_player_count' in session
                    ? typeof session.current_player_count === 'number'
                      ? session.current_player_count
                      : 0
                    : 0;
                return total + count;
              }, 0)}
            </div>
            <p className="text-sm text-cyan-300/70">
              Across {sessions.length} sessions
            </p>
          </CardContent>
        </Card>

        <Card variant="cyber" glow="subtle">
          <CardHeader className="pb-3">
            <CardTitle className="neon-glow-purple flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-purple-400 drop-shadow-lg" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-cyan-200/70">
              Latest session updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="cyber-outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="w-full"
            >
              {isRefetching ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Browser */}
      <Tabs defaultValue="public" className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="public" className="gap-2">
              <Globe className="h-4 w-4" />
              Public Sessions
            </TabsTrigger>
            <TabsTrigger value="join-session" className="gap-2">
              <Lock className="h-4 w-4" />
              Join Session
            </TabsTrigger>
          </TabsList>

          <SessionFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        <TabsContent value="public" className="space-y-4">
          {error && (
            <Card className="border-red-500/50 bg-red-900/20">
              <CardContent className="pt-6">
                <p className="text-red-400">{error.message || String(error)}</p>
              </CardContent>
            </Card>
          )}

          {filteredSessions.length === 0 ? (
            <Card variant="cyber">
              <CardContent className="pt-6">
                <div className="py-8 text-center">
                  <Gamepad2 className="mx-auto mb-4 h-16 w-16 text-cyan-400/60" />
                  <h3 className="neon-glow-cyan mb-2 text-xl font-semibold">
                    No Active Sessions
                  </h3>
                  <p className="mb-4 text-cyan-300/70">
                    Be the first to host a gaming session!
                  </p>
                  <Button
                    variant="cyber"
                    onClick={() => setShowHostDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Host Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onJoin={() => handleJoinSession(session.id)}
                  currentUserId={authUser?.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="join-session" className="space-y-4">
          <Card variant="cyber" glow="subtle">
            <CardHeader>
              <CardTitle className="neon-glow-purple flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-400 drop-shadow-lg" />
                Join Session by Code
              </CardTitle>
              <CardDescription className="text-cyan-200/70">
                Enter a session code or password to join a private game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  variant="cyber"
                  placeholder="Enter session code (e.g. ABC123)"
                  value={joinSessionCode}
                  onChange={e =>
                    setJoinSessionCode(e.target.value.toUpperCase())
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleJoinByCode();
                    }
                  }}
                />
                <Button
                  variant="cyber"
                  onClick={handleJoinByCode}
                  disabled={
                    !joinSessionCode.trim() || joinSessionMutation.isPending
                  }
                >
                  {joinSessionMutation.isPending
                    ? 'Joining...'
                    : 'Join Session'}
                </Button>
              </div>
              <p className="text-sm text-cyan-300/70">
                Session codes are case-insensitive and typically 6 characters
                long. Password-protected sessions will prompt for password after
                entering the code.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SessionHostingDialog
        isOpen={showHostDialog}
        onClose={() => setShowHostDialog(false)}
        onCreateSession={handleCreateSession}
        preSelectedBoardId={searchParams?.get('boardId') || undefined}
      />

      <SessionJoinDialog
        isOpen={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        onJoin={handleJoinByCode}
        sessionCode={joinSessionCode}
        onSessionCodeChange={setJoinSessionCode}
      />
    </div>
  );
}
