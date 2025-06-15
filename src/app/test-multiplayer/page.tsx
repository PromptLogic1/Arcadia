'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/stores/auth-store';
import { useBingoGame } from '@/features/bingo-boards/hooks/useBingoGame';
import {
  RouteErrorBoundary,
  RealtimeErrorBoundary,
} from '@/components/error-boundaries';
import { log } from '@/lib/logger';

function TestMultiplayerContent() {
  const { authUser } = useAuth();
  const [sessionId, setSessionId] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [testBoardId] = useState('550e8400-e29b-41d4-a716-446655440001'); // WoW Demo Board

  // Add mountedRef to track component lifecycle
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { session, board, markCell, unmarkCell } = useBingoGame(sessionId);

  const createSession = async () => {
    try {
      const response = await fetch('/api/bingo/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: testBoardId,
          displayName: 'Test Player 1',
          color: '#FF6B6B',
        }),
      });

      if (!response.ok) throw new Error('Failed to create session');

      const data = await response.json();

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      setSessionId(data.session.id);
      setSessionCode(data.session.session_code);
      log.info('Created session', {
        metadata: {
          sessionCode: data.session.session_code,
          sessionId: data.session.id,
        },
      });
    } catch (error) {
      log.error('Error creating session', error, {
        metadata: {
          component: 'TestMultiplayer',
          method: 'createSession',
        },
      });
    }
  };

  const joinSession = async () => {
    try {
      const response = await fetch('/api/bingo/sessions/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_code: joinCode,
          user_id: authUser?.id || 'test-user-2',
          display_name: 'Test Player 2',
          avatar_url: null,
        }),
      });

      if (!response.ok) throw new Error('Failed to join session');

      const data = await response.json();

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      setSessionId(data.session.id);
      log.info('Joined session', {
        metadata: {
          sessionId: data.session.id,
          sessionCode: data.session.session_code,
        },
      });
    } catch (error) {
      log.error('Error joining session', error, {
        metadata: {
          component: 'TestMultiplayer',
          method: 'joinSession',
          joinCode,
        },
      });
    }
  };

  const handleCellClick = async (position: number) => {
    if (!authUser?.id) return;

    const cell = board[position];
    if (cell?.is_marked) {
      await unmarkCell(position, authUser.id);
    } else {
      await markCell(position, authUser.id);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-8 text-3xl font-bold">Multiplayer Test Page</h1>

      <div className="mb-8 grid grid-cols-2 gap-8">
        {/* Create Session */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Create Session</h2>
          <Button
            onClick={createSession}
            className="mb-4 w-full"
            aria-label="Create a new multiplayer bingo session"
          >
            Create New Session
          </Button>
          {sessionCode && (
            <div className="rounded bg-green-100 p-4 dark:bg-green-900">
              <p className="font-semibold">Session Code:</p>
              <p className="font-mono text-2xl">{sessionCode}</p>
            </div>
          )}
        </Card>

        {/* Join Session */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Join Session</h2>
          <Input
            placeholder="Enter session code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            className="mb-4"
            aria-label="Session code input"
            onKeyDown={e => e.key === 'Enter' && joinSession()}
          />
          <Button
            onClick={joinSession}
            className="w-full"
            aria-label="Join an existing bingo session"
          >
            Join Session
          </Button>
        </Card>
      </div>

      {/* Game Board */}
      {session && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Game Board (Session: {session.session_code})
          </h2>
          <div
            className="grid grid-cols-5 gap-2"
            role="grid"
            aria-label="Bingo game board"
          >
            {Array.from({ length: 25 }).map((_, index) => {
              const cell = board[index];
              return (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  className={`rounded border-2 p-4 transition-all ${
                    cell?.is_marked
                      ? 'border-green-600 bg-green-500 text-white'
                      : 'border-gray-300 bg-white hover:border-blue-500 dark:bg-gray-800'
                  } `}
                  aria-label={`Cell ${index + 1}${cell?.is_marked ? ' (marked)' : ''}`}
                  role="gridcell"
                >
                  Cell {index + 1}
                  {cell?.is_marked && (
                    <div className="text-xs" aria-hidden="true">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded bg-gray-100 p-4 dark:bg-gray-800">
            <p className="text-sm">Session ID: {session.id}</p>
            <p className="text-sm">Status: {session.status}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function TestMultiplayerPage() {
  return (
    <RouteErrorBoundary routeName="TestMultiplayer">
      <RealtimeErrorBoundary componentName="TestMultiplayer">
        <TestMultiplayerContent />
      </RealtimeErrorBoundary>
    </RouteErrorBoundary>
  );
}
