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
  GiConsoleController
} from 'react-icons/gi';

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
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authUser } = useAuth();
  const router = useRouter();

  const handleQuickPlay = async (board: DemoBoard) => {
    setSelectedBoard(board);
    setError(null);

    // Auto-generate a player name if not authenticated
    if (!authUser && !playerName) {
      setPlayerName(`Player${Math.floor(Math.random() * 1000)}`);
    }
  };

  const createDemoSession = async () => {
    if (!selectedBoard) return;

    setIsCreating(true);
    setError(null);

    try {
      // Create a new session with the selected demo board
      const response = await fetch('/api/bingo/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: selectedBoard.id,
          displayName:
            authUser?.username ||
            playerName ||
            `Player${Math.floor(Math.random() * 1000)}`,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color
          team: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const { session } = await response.json();

      // Redirect to the game session
      router.push(`/join/${session.id}?demo=true`);
    } catch (err) {
      console.error('Error creating demo session:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create demo session'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const joinRandomSession = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Try to find an existing waiting session for any demo board
      for (const board of DEMO_BOARDS) {
        const response = await fetch(
          `/api/bingo/sessions?boardId=${board.id}&status=waiting`
        );
        const sessions = await response.json();

        if (sessions.length > 0) {
          const session = sessions[0];

          // Join the existing session
          const joinResponse = await fetch('/api/bingo/sessions/join-by-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_code: session.session_code,
              user_id: authUser?.id || 'guest-user',
              display_name:
                authUser?.username ||
                playerName ||
                `Player${Math.floor(Math.random() * 1000)}`,
              avatar_url: authUser?.avatar_url || null,
            }),
          });

          if (joinResponse.ok) {
            router.push(`/join/${session.id}?demo=true`);
            return;
          }
        }
      }

      // No waiting sessions found, create a new one with a random board
      const randomBoard =
        DEMO_BOARDS[Math.floor(Math.random() * DEMO_BOARDS.length)];
      if (randomBoard) {
        setSelectedBoard(randomBoard);
        await createDemoSession();
      }
    } catch (err) {
      console.error('Error joining random session:', err);
      setError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setIsCreating(false);
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
            <h3 className="text-3xl font-bold neon-glow-cyan">{selectedBoard.title}</h3>
            <p className="text-cyan-200/80 text-lg">
              {selectedBoard.description}
            </p>

            <div className="flex items-center justify-center gap-6 text-sm">
              <Badge variant={difficultyColors[selectedBoard.difficulty]} size="lg">
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
              disabled={isCreating}
            >
              Choose Different Board
            </Button>
            <Button
              variant="cyber"
              size="lg"
              onClick={createDemoSession}
              disabled={isCreating || (!authUser && !playerName.trim())}
            >
              {isCreating ? (
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
              🎮 Demo games are open to everyone • Real-time multiplayer • No account required
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <CyberpunkBackground variant="circuit" intensity="strong" className="bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90 py-24">
      <FloatingElements variant="orbs" count={15} speed="fast" color="fuchsia" repositioning={true} />
      <div className="relative z-20 container mx-auto px-4">
        <div className="space-y-12">
          {/* Section Header */}
          <div className="space-y-6 text-center">
            <h2 className="">
              <NeonText variant="gradient" className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">🎮 Try Multiplayer Bingo</NeonText>
              <br />
              <NeonText variant="solid" color="cyan" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">Right Now!</NeonText>
            </h2>
            <p className="mx-auto max-w-3xl text-base sm:text-lg md:text-xl text-cyan-200/80 leading-relaxed px-4 sm:px-0">
              Jump into live multiplayer games instantly. No account required - just
              pick a game and start playing with others around the world!
            </p>

            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Button
                onClick={joinRandomSession}
                disabled={isCreating}
                variant="cyber"
                size="lg"
                className="text-lg px-8 py-6"
                aria-label="Join a random multiplayer bingo game session"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" aria-hidden="true" />
                    Finding Game...
                  </>
                ) : (
                  <>
                    <GiLightningTrio className="mr-2 h-6 w-6" aria-hidden="true" />
                    Quick Play (30s)
                  </>
                )}
              </Button>

              <div className="text-lg text-cyan-300/70 font-medium">or</div>

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
                className="cursor-pointer p-8 transition-all hover:scale-105 group"
                onClick={() => handleQuickPlay(board)}
              >
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="text-5xl">
                      {gameTypeIcons[
                        board.game_type as keyof typeof gameTypeIcons
                      ] || '🎮'}
                    </div>
                    <Badge variant={difficultyColors[board.difficulty]} size="lg">
                      {board.difficulty}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-bold neon-glow-cyan group-hover:text-cyan-300 transition-colors">
                      {board.title}
                    </h3>
                    <p className="text-cyan-200/70 leading-relaxed">
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
                    className="w-full group-hover:variant-cyber transition-all"
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full cyber-card border-cyan-500/50">
                <GiSandsOfTime className="h-8 w-8 text-cyan-400" />
              </div>
              <h4 className="text-xl font-bold neon-glow-cyan">Instant Multiplayer</h4>
              <p className="text-cyan-200/70 leading-relaxed">
                Join live games in seconds. Real-time sync with other players around the world.
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full cyber-card border-purple-500/50">
                <GiTrophyCup className="h-8 w-8 text-purple-400" />
              </div>
              <h4 className="text-xl font-bold neon-glow-purple">Win Detection</h4>
              <p className="text-cyan-200/70 leading-relaxed">
                Automatic pattern recognition and victory celebrations with real-time scoring.
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full cyber-card border-emerald-500/50">
                <GiTeamIdea className="h-8 w-8 text-emerald-400" />
              </div>
              <h4 className="text-xl font-bold neon-glow-emerald">Social Gaming</h4>
              <p className="text-cyan-200/70 leading-relaxed">
                Play with friends or meet new players in public games and tournaments.
              </p>
            </div>
          </div>

          {error && (
            <div className="mx-auto max-w-2xl cyber-card border-red-500/50 bg-red-500/10 p-6">
              <p className="text-center text-red-300 text-lg">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>
    </CyberpunkBackground>
  );
}

export default TryDemoGame;
