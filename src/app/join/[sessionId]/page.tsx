'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLAYER_COLORS, PLAYER_CONSTANTS } from '@/features/bingo-boards/types';

interface SessionDetails {
  teamMode: boolean;
  currentPlayers: number;
  settings: {
    teamMode: boolean;
  };
}

export default function JoinSession({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState(
    PLAYER_COLORS[0]?.color || '#06b6d4'
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(
    null
  );

  const supabase = createClient();

  // Check authentication and session details on mount
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/auth/login?redirect=/join/${params.sessionId}`);
        return;
      }

      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select(
          `
          *,
          bingo_boards!inner(settings)
        `
        )
        .eq('id', params.sessionId)
        .single();

      if (sessionError || !sessionData) {
        setError('Session not found');
        return;
      }

      if (sessionData.status !== 'active') {
        setError('This session is no longer active');
        return;
      }

      // Get player count separately
      const { count: playerCount } = await supabase
        .from('bingo_session_players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', params.sessionId);

      const boardSettings = sessionData.bingo_boards?.settings;
      const teamMode = boardSettings?.team_mode ?? false;

      setSessionDetails({
        teamMode,
        currentPlayers: playerCount ?? 0,
        settings: {
          teamMode,
        },
      });
    };
    checkAuth();
  }, [supabase, router, params.sessionId]);

  const handleJoin = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/bingo/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: params.sessionId,
          playerName,
          color: selectedColor,
          team: sessionDetails?.teamMode ? Math.floor(Math.random() * 2) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join session');
      }

      // Redirect to waiting room or board page
      router.push(`/board/${params.sessionId}`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to join session'
      );
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
        <Card className="w-full max-w-md border-red-500/20 bg-gray-800 p-6">
          <h1 className="mb-4 text-2xl font-bold text-red-400">Error</h1>
          <p className="mb-6 text-gray-300">{error}</p>
          <Button onClick={() => router.push('/')} className="w-full">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md border-cyan-500/20 bg-gray-800 p-6">
        <h1 className="mb-6 text-2xl font-bold text-cyan-400">
          Join Bingo Session
        </h1>

        {sessionDetails && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Player Name
              </label>
              <Input
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="bg-gray-900/50"
                maxLength={PLAYER_CONSTANTS.LIMITS.MAX_NAME_LENGTH}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">Color</label>
              <Select value={selectedColor} onValueChange={setSelectedColor}>
                <SelectTrigger className="bg-gray-900/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_COLORS.map(colorOption => (
                    <SelectItem
                      key={colorOption.color}
                      value={colorOption.color}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: colorOption.color }}
                        />
                        <span>{colorOption.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sessionDetails.teamMode && (
              <div className="rounded-lg bg-cyan-500/10 p-3">
                <p className="text-sm text-cyan-300">
                  This is a team mode session. You&apos;ll be automatically
                  assigned to a team.
                </p>
              </div>
            )}

            <Button
              onClick={handleJoin}
              disabled={!playerName || loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              {loading ? 'Joining...' : 'Join Session'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
