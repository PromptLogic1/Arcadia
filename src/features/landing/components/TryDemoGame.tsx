'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NeonText } from '@/components/ui/NeonText';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';
import { useAuth } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  GiPlayButton,
  GiTeamIdea,
  GiSandsOfTime,
  GiTrophyCup,
  GiLightningTrio,
  GiStarMedal,
  GiConsoleController,
} from 'react-icons/gi';
import { log } from '@/lib/logger';
import {
  useCreateSessionMutation,
  useJoinSessionByCodeMutation,
  useWaitingSessionsForBoards,
} from '@/hooks/queries/useSessionsQueries';

interface DemoBoard {
  id: string;
  title: string;
  description: string;
  game_type: string;
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

function TryDemoGame() {
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
    if (!selectedBoard || !authUser?.id) return;

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

      if (result.session && result.session.session_code) {
        // Add the host as a player
        const displayName =
          authUser?.username ||
          playerName ||
          `Player${Math.floor(Math.random() * 1000)}`;
        const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

        // Join the session we just created
        const joinResult = await joinSessionByCodeMutation.mutateAsync({
          sessionCode: result.session.session_code,
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
          }
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

        if (result.session && result.session.session_code) {
          // Add the host as a player
          const displayName =
            authUser.username ||
            playerName ||
            `Player${Math.floor(Math.random() * 1000)}`;
          const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

          // Join the session we just created
          const joinResult = await joinSessionByCodeMutation.mutateAsync({
            sessionCode: result.session.session_code,
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
          }
        }
      );
      setError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setQuickPlayInitiated(false);
    }
  };

  if (selectedBoard) {
    return (
      <Card variant="cyber" glow="subtle" className="mx-auto max-w-2xl p-8">
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <div className="text-6xl">
              {gameTypeIcons[
                selectedBoard.game_type as keyof typeof gameTypeIcons
              ] || '🎮'}
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
                <GiStarMedal className="h-4 w-4 fill-yellow-400 text-yellow-400" />
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
              onClick={() => setSelectedBoard(null)}
              variant="cyber-outline"
              size="lg"
              disabled={
                createSessionMutation.isPending ||
                joinSessionByCodeMutation.isPending
              }
            >
              Choose Different Board
            </Button>
            <Button
              variant="cyber"
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
                  <GiPlayButton className="mr-2 h-5 w-5" />
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
      variant="circuit"
      intensity="strong"
      className="bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90 py-24"
    >
      <FloatingElements
        variant="orbs"
        count={15}
        speed="fast"
        color="fuchsia"
        repositioning={true}
      />
      <div className="relative z-20 container mx-auto px-4">
        <div className="space-y-12">
          {/* Section Header */}
          <div className="space-y-6 text-center">
            <h2 className="">
              <NeonText
                variant="gradient"
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
                variant="cyber"
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
                    <GiLightningTrio
                      className="mr-2 h-6 w-6"
                      aria-hidden="true"
                    />
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
                variant="cyber"
                glow="subtle"
                className="group cursor-pointer p-8 transition-all hover:scale-105"
                onClick={() => handleQuickPlay(board)}
              >
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="text-5xl">
                      {gameTypeIcons[
                        board.game_type as keyof typeof gameTypeIcons
                      ] || '🎮'}
                    </div>
                    <Badge
                      variant={difficultyColors[board.difficulty]}
                      size="lg"
                    >
                      {board.difficulty}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <h3 className="neon-glow-cyan text-xl font-bold transition-colors group-hover:text-cyan-300">
                      {board.title}
                    </h3>
                    <p className="leading-relaxed text-cyan-200/70">
                      {board.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-center text-cyan-300/80">
                    <div className="flex items-center gap-2">
                      <GiStarMedal className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{board.votes} votes</span>
                    </div>
                  </div>

                  <Button
                    variant="cyber-outline"
                    className="group-hover:variant-cyber w-full transition-all"
                    size="lg"
                    onClick={() => handleQuickPlay(board)}
                    aria-label={`Play ${board.title} bingo board`}
                  >
                    <GiConsoleController className="mr-2 h-5 w-5" />
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
                <GiSandsOfTime className="h-8 w-8 text-cyan-400" />
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
                <GiTrophyCup className="h-8 w-8 text-purple-400" />
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
                <GiTeamIdea className="h-8 w-8 text-emerald-400" />
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

export default TryDemoGame;
