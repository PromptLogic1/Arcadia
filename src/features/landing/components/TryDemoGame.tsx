'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Play,
  Users,
  Clock,
  Trophy,
  Zap,
  Star,
  GamepadIcon,
  Loader2,
} from 'lucide-react';

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
    playerCount: 8,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Fortnite Victory Royale Speedrun',
    description: 'Fast-paced battle royale challenges for competitive players',
    game_type: 'Fortnite',
    difficulty: 'medium',
    votes: 38,
    playerCount: 6,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'Minecraft Survival Mastery',
    description: 'From punching trees to defeating the Ender Dragon',
    game_type: 'Minecraft',
    difficulty: 'medium',
    votes: 35,
    playerCount: 4,
  },
];

const difficultyColors = {
  easy: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  hard: 'bg-orange-100 text-orange-800 border-orange-200',
  expert: 'bg-red-100 text-red-800 border-red-200',
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

export function TryDemoGame() {
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
      <Card className="mx-auto max-w-2xl p-8">
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <div className="text-4xl">
              {gameTypeIcons[
                selectedBoard.game_type as keyof typeof gameTypeIcons
              ] || '🎮'}
            </div>
            <h3 className="text-2xl font-bold">{selectedBoard.title}</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {selectedBoard.description}
            </p>

            <div className="flex items-center justify-center gap-4 text-sm">
              <Badge className={difficultyColors[selectedBoard.difficulty]}>
                {selectedBoard.difficulty}
              </Badge>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{selectedBoard.votes} votes</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{selectedBoard.playerCount || 0} playing</span>
              </div>
            </div>
          </div>

          {!authUser && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Choose your player name:
              </label>
              <Input
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="mx-auto max-w-xs"
                maxLength={20}
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button
              onClick={() => setSelectedBoard(null)}
              variant="outline"
              disabled={isCreating}
            >
              Choose Different Board
            </Button>
            <Button
              onClick={createDemoSession}
              disabled={isCreating || (!authUser && !playerName.trim())}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Game...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Playing Now!
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              🎮 Demo games are open to everyone • Real-time multiplayer • No
              account required
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Action Buttons */}
      <div className="space-y-4 text-center">
        <h2 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-3xl font-bold text-transparent">
          🎮 Try Multiplayer Bingo Now!
        </h2>
        <p className="mx-auto max-w-2xl text-gray-600 dark:text-gray-300">
          Jump into live multiplayer games instantly. No account required - just
          pick a game and start playing with others!
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            onClick={joinRandomSession}
            disabled={isCreating}
            size="lg"
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Finding Game...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Quick Play (30s)
              </>
            )}
          </Button>

          <div className="text-sm text-gray-500">or</div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            Choose your game below ↓
          </div>
        </div>
      </div>

      {/* Demo Board Selection */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {DEMO_BOARDS.map(board => (
          <Card
            key={board.id}
            className="cursor-pointer border-2 p-6 transition-all hover:border-purple-300 hover:shadow-lg"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="text-3xl">
                  {gameTypeIcons[
                    board.game_type as keyof typeof gameTypeIcons
                  ] || '🎮'}
                </div>
                <Badge className={difficultyColors[board.difficulty]}>
                  {board.difficulty}
                </Badge>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{board.title}</h3>
                <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                  {board.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{board.votes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{board.playerCount || 0} playing</span>
                </div>
              </div>

              <Button
                onClick={() => handleQuickPlay(board)}
                className="w-full"
                variant="outline"
              >
                <GamepadIcon className="mr-2 h-4 w-4" />
                Play This Board
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Features Preview */}
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
            <Clock className="h-6 w-6 text-purple-600" />
          </div>
          <h4 className="font-semibold">Instant Multiplayer</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Join live games in seconds. Real-time sync with other players.
          </p>
        </div>

        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Trophy className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="font-semibold">Win Detection</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Automatic pattern recognition and victory celebrations.
          </p>
        </div>

        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <Users className="h-6 w-6 text-green-600" />
          </div>
          <h4 className="font-semibold">Social Gaming</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Play with friends or meet new players in public games.
          </p>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-center text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
