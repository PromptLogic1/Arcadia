'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { NeonText } from '@/components/ui/NeonText';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { Loader2 } from '@/components/ui/Icons';

const FloatingElements = dynamic(
  () => import('@/components/ui/FloatingElements'),
  { ssr: false }
);
import { log } from '@/lib/logger';
import {
  useCreateSessionMutation,
  useJoinSessionByCodeMutation,
  useWaitingSessionsForBoards,
} from '@/hooks/queries/useSessionsQueries';
import { RouteErrorBoundary } from '@/components/error-boundaries';

interface DemoBoard {
  id: string;
  title: string;
  description: string;
  game_type: keyof typeof gameTypeIcons;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  votes: number;
  playerCount?: number; // Number of players currently in sessions
}

const DEMO_BOARDS: DemoBoard[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'World of Warcraft: Classic Nostalgia',
    description: 'Relive the golden age of Azeroth with iconic WoW moments',
    game_type: 'World of Warcraft',
    difficulty: 'easy',
    votes: 42,
    // Remove playerCount as it's not tracked in real-time yet
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Fortnite Victory Royale Speedrun',
    description: 'Fast-paced battle royale challenges for competitive players',
    game_type: 'Fortnite',
    difficulty: 'medium',
    votes: 38,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'Minecraft Survival Mastery',
    description: 'From punching trees to defeating the Ender Dragon',
    game_type: 'Minecraft',
    difficulty: 'medium',
    votes: 35,
  },
];

const difficultyColors = {
  easy: 'cyber' as const,
  medium: 'cyber-purple' as const,
  hard: 'cyber-fuchsia' as const,
  expert: 'cyber-emerald' as const,
};

const gameTypeIcons = {
  'World of Warcraft': '🗡️',
  Fortnite: '🏟️',
  Minecraft: '⛏️',
  'Elden Ring': '⚔️',
  'Among Us': '🚀',
  'League of Legends': '⚡',
  'Apex Legends': '🎯',
};

function TryDemoGameContent() {
  const [selectedBoard, setSelectedBoard] = useState<DemoBoard | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [quickPlayInitiated, setQuickPlayInitiated] = useState(false);
  const { authUser } = useAuth();
  const router = useRouter();

  // Use TanStack Query mutations
  const createSessionMutation = useCreateSessionMutation();
  const joinSessionByCodeMutation = useJoinSessionByCodeMutation();

  // Use TanStack Query for finding waiting sessions
  const waitingSessionsQuery = useWaitingSessionsForBoards(
    quickPlayInitiated ? DEMO_BOARDS.map(b => b.id) : []
  );

  const handleQuickPlay = async (board: DemoBoard) => {
    setSelectedBoard(board);
    setError(null);

    // Auto-generate a player name if not authenticated
    if (!authUser && !playerName) {
      setPlayerName(`Player${Math.floor(Math.random() * 1000)}`);
    }
  };

  const createDemoSession = async () => {
    if (!selectedBoard) {
      setError('Please select a board first');
      return;
    }

    if (!authUser?.id) {
      setError('Please sign in to create a session');
      return;
    }

    setError(null);

    try {
      const result = await createSessionMutation.mutateAsync({
        board_id: selectedBoard.id,
        host_id: authUser.id,
        settings: {
          max_players: 8,
          allow_spectators: true,
          auto_start: false,
        },
      });

      if (result.success && result.data && result.data.session_code) {
        // Add the host as a player
        const displayName =
          authUser?.username ||
          playerName ||
          `Player${Math.floor(Math.random() * 1000)}`;
        const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

        // Join the session we just created
        const joinResult = await joinSessionByCodeMutation.mutateAsync({
          sessionCode: result.data.session_code,
          user_id: authUser.id,
          display_name: displayName,
          color,
          team: undefined,
        });

        if (joinResult.sessionId) {
          // Redirect to the game session
          router.push(`/join/${joinResult.sessionId}?demo=true`);
        }
      }
    } catch (err) {
      log.error(
        'Error creating demo session',
        err instanceof Error ? err : new Error(String(err)),
        {
          metadata: {
            component: 'TryDemoGame',
            boardId: selectedBoard.id,
          },
        }
      );

      setError(
        err instanceof Error ? err.message : 'Failed to create demo session'
      );
    }
  };

  const joinRandomSession = async () => {
    if (!authUser?.id) {
      setError('Please sign in to use quick play');
      return;
    }

    setError(null);
    setQuickPlayInitiated(true);

    try {
      // Trigger the query by setting quickPlayInitiated to true
      // The query will automatically fetch waiting sessions
      const waitingSessions = await waitingSessionsQuery.refetch();
      const { boardId, sessions } = waitingSessions.data || {};

      if (boardId && sessions && sessions.length > 0) {
        const session = sessions[0];
        if (!session || !session.session_code) {
          throw new Error('Invalid session data');
        }

        // Join the existing session
        const displayName =
          authUser.username ||
          playerName ||
          `Player${Math.floor(Math.random() * 1000)}`;

        const joinResult = await joinSessionByCodeMutation.mutateAsync({
          sessionCode: session.session_code,
          user_id: authUser.id,
          display_name: displayName,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          team: undefined,
        });

        if (joinResult.sessionId) {
          router.push(`/join/${joinResult.sessionId}?demo=true`);
          return;
        }
      }

      // No waiting sessions found, create a new one with a random board
      const randomBoard =
        DEMO_BOARDS[Math.floor(Math.random() * DEMO_BOARDS.length)];
      if (randomBoard) {
        setSelectedBoard(randomBoard);

        const result = await createSessionMutation.mutateAsync({
          board_id: randomBoard.id,
          host_id: authUser.id,
          settings: {
            max_players: 8,
            allow_spectators: true,
            auto_start: false,
          },
        });

        if (result.success && result.data && result.data.session_code) {
          // Add the host as a player
          const displayName =
            authUser.username ||
            playerName ||
            `Player${Math.floor(Math.random() * 1000)}`;
          const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

          // Join the session we just created
          const joinResult = await joinSessionByCodeMutation.mutateAsync({
            sessionCode: result.data.session_code,
            user_id: authUser.id,
            display_name: displayName,
            color,
            team: undefined,
          });

          if (joinResult.sessionId) {
            router.push(`/join/${joinResult.sessionId}?demo=true`);
          }
        }
      }
    } catch (err) {
      log.error(
        'Error joining random session',
        err instanceof Error ? err : new Error(String(err)),
        {
          metadata: {
            component: 'TryDemoGame',
            feature: 'quick-play',
          },
        }
      );

      setError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setQuickPlayInitiated(false);
    }
  };

  if (selectedBoard) {
    return (
      <Card variant="primary" className="mx-auto max-w-2xl p-8">
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <div className="text-6xl">
              {gameTypeIcons[selectedBoard.game_type] || '🎮'}
            </div>
            <h3 className="neon-glow-cyan text-3xl font-bold">
              {selectedBoard.title}
            </h3>
            <p className="text-lg text-cyan-200/80">
              {selectedBoard.description}
            </p>

            <div className="flex items-center justify-center gap-6 text-sm">
              <Badge
                variant={difficultyColors[selectedBoard.difficulty]}
                size="lg"
              >
                {selectedBoard.difficulty}
              </Badge>
              <div className="flex items-center gap-1 text-cyan-300">
                <svg
                  className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <span>{selectedBoard.votes} votes</span>
              </div>
            </div>
          </div>

          {!authUser && (
            <div className="space-y-3">
              <label className="block text-lg font-medium text-cyan-200">
                Choose your player name:
              </label>
              <Input
                variant="cyber"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="mx-auto max-w-xs"
                maxLength={20}
              />
            </div>
          )}

          {error && (
            <div className="cyber-card border-red-500/50 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button
              onClick={() => {
                setSelectedBoard(null);
                setError(null);
              }}
              variant="secondary"
              size="lg"
              disabled={
                createSessionMutation.isPending ||
                joinSessionByCodeMutation.isPending
              }
            >
              Choose Different Board
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={createDemoSession}
              disabled={
                createSessionMutation.isPending ||
                joinSessionByCodeMutation.isPending ||
                (!authUser && !playerName.trim())
              }
            >
              {createSessionMutation.isPending ||
              joinSessionByCodeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Game...
                </>
              ) : (
                <>
                  <svg
                    className="mr-2 h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Start Playing Now!
                </>
              )}
            </Button>
          </div>

          <div className="border-t border-cyan-500/30 pt-4">
            <p className="text-sm text-cyan-300/70">
              🎮 Demo games are open to everyone • Real-time multiplayer • No
              account required
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <CyberpunkBackground
      variant="grid"
      intensity="medium"
      className="bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90 py-24"
    >
      <FloatingElements
        variant="particles"
        count={15}
        speed="fast"
        color="fuchsia"
      />
      <div className="relative z-20 container mx-auto px-4">
        <div className="space-y-12">
          {/* Section Header */}
          <div className="space-y-6 text-center">
            <h2 className="">
              <NeonText
                variant="solid"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
              >
                🎮 Try Multiplayer Bingo
              </NeonText>
              <br />
              <NeonText
                variant="solid"
                color="cyan"
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl"
              >
                Right Now!
              </NeonText>
            </h2>
            <p className="mx-auto max-w-3xl px-4 text-base leading-relaxed text-cyan-200/80 sm:px-0 sm:text-lg md:text-xl">
              Jump into live multiplayer games instantly. No account required -
              just pick a game and start playing with others around the world!
            </p>

            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Button
                onClick={joinRandomSession}
                disabled={
                  createSessionMutation.isPending ||
                  joinSessionByCodeMutation.isPending ||
                  waitingSessionsQuery.isLoading
                }
                variant="primary"
                size="lg"
                className="px-8 py-6 text-lg"
                aria-label="Join a random multiplayer bingo game session"
              >
                {createSessionMutation.isPending ||
                joinSessionByCodeMutation.isPending ||
                waitingSessionsQuery.isLoading ? (
                  <>
                    <Loader2
                      className="mr-2 h-6 w-6 animate-spin"
                      aria-hidden="true"
                    />
                    Finding Game...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                    </svg>
                    Quick Play (30s)
                  </>
                )}
              </Button>

              <div className="text-lg font-medium text-cyan-300/70">or</div>

              <div className="text-lg text-cyan-200/80">
                Choose your game below ↓
              </div>
            </div>
          </div>

          {/* Demo Board Selection */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {DEMO_BOARDS.map(board => (
              <Card
                key={board.id}
                variant="primary"
                className="group h-full cursor-pointer p-8 transition-all hover:scale-105"
                onClick={() => handleQuickPlay(board)}
              >
                <div className="flex h-full flex-col space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-5xl">
                      {gameTypeIcons[board.game_type] || '🎮'}
                    </div>
                    <Badge
                      variant={difficultyColors[board.difficulty]}
                      size="lg"
                    >
                      {board.difficulty}
                    </Badge>
                  </div>

                  <div className="flex flex-1 flex-col space-y-3 text-center">
                    <h3 className="neon-glow-cyan text-xl font-bold transition-colors group-hover:text-cyan-300">
                      {board.title}
                    </h3>
                    <p className="leading-relaxed text-cyan-200/70">
                      {board.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-center text-cyan-300/80">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                      <span className="font-medium">{board.votes} votes</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="group-hover:variant-cyber w-full transition-all"
                    size="lg"
                    onClick={e => {
                      e.stopPropagation();
                      handleQuickPlay(board);
                    }}
                    aria-label={`Play ${board.title} bingo board`}
                  >
                    <svg
                      className="mr-2 h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                    </svg>
                    Play This Board
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-4 text-center">
              <div className="cyber-card mx-auto flex h-16 w-16 items-center justify-center rounded-full border-cyan-500/50">
                <svg
                  className="h-8 w-8 text-cyan-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z" />
                </svg>
              </div>
              <h4 className="neon-glow-cyan text-xl font-bold">
                Instant Multiplayer
              </h4>
              <p className="leading-relaxed text-cyan-200/70">
                Join live games in seconds. Real-time sync with other players
                around the world.
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="cyber-card mx-auto flex h-16 w-16 items-center justify-center rounded-full border-purple-500/50">
                <svg
                  className="h-8 w-8 text-purple-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                </svg>
              </div>
              <h4 className="neon-glow-purple text-xl font-bold">
                Win Detection
              </h4>
              <p className="leading-relaxed text-cyan-200/70">
                Automatic pattern recognition and victory celebrations with
                real-time scoring.
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="cyber-card mx-auto flex h-16 w-16 items-center justify-center rounded-full border-emerald-500/50">
                <svg
                  className="h-8 w-8 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h4 className="neon-glow-emerald text-xl font-bold">
                Social Gaming
              </h4>
              <p className="leading-relaxed text-cyan-200/70">
                Play with friends or meet new players in public games and
                tournaments.
              </p>
            </div>
          </div>

          {error && (
            <div className="cyber-card mx-auto max-w-2xl border-red-500/50 bg-red-500/10 p-6">
              <p className="text-center text-lg text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>
    </CyberpunkBackground>
  );
}

function TryDemoGame() {
  return (
    <RouteErrorBoundary routeName="TryDemoGame">
      <TryDemoGameContent />
    </RouteErrorBoundary>
  );
}

export default TryDemoGame;
