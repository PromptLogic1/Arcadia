'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useBingoGame } from '@/features/bingo-boards/hooks/useBingoGame';

export default function TestMultiplayerPage() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [testBoardId] = useState('test-board-id'); // Replace with actual board ID
  
  const { session, boardState, markCell, unmarkCell } = useBingoGame(sessionId);

  const createSession = async () => {
    try {
      const response = await fetch('/api/bingo/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: testBoardId,
          displayName: 'Test Player 1',
          color: '#FF6B6B'
        })
      });
      
      if (!response.ok) throw new Error('Failed to create session');
      
      const data = await response.json();
      setSessionId(data.session.id);
      setSessionCode(data.session.session_code);
      console.log('Created session:', data.session.session_code);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const joinSession = async () => {
    try {
      const response = await fetch('/api/bingo/sessions/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_code: joinCode,
          user_id: user?.id || 'test-user-2',
          display_name: 'Test Player 2',
          avatar_url: null
        })
      });
      
      if (!response.ok) throw new Error('Failed to join session');
      
      const data = await response.json();
      setSessionId(data.session.id);
      console.log('Joined session:', data.session);
    } catch (error) {
      console.error('Error joining session:', error);
    }
  };

  const handleCellClick = async (position: number) => {
    if (!user?.id) return;
    
    const cell = boardState[position];
    if (cell?.isMarked) {
      await unmarkCell(position, user.id);
    } else {
      await markCell(position, user.id);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Multiplayer Test Page</h1>
      
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Create Session */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Create Session</h2>
          <Button onClick={createSession} className="w-full mb-4">
            Create New Session
          </Button>
          {sessionCode && (
            <div className="p-4 bg-green-100 dark:bg-green-900 rounded">
              <p className="font-semibold">Session Code:</p>
              <p className="text-2xl font-mono">{sessionCode}</p>
            </div>
          )}
        </Card>
        
        {/* Join Session */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Join Session</h2>
          <Input
            placeholder="Enter session code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="mb-4"
          />
          <Button onClick={joinSession} className="w-full">
            Join Session
          </Button>
        </Card>
      </div>

      {/* Game Board */}
      {session && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Game Board (Session: {session.session_code})
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 25 }).map((_, index) => {
              const cell = boardState[index];
              return (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  className={`
                    p-4 border-2 rounded transition-all
                    ${cell?.isMarked 
                      ? 'bg-green-500 text-white border-green-600' 
                      : 'bg-white dark:bg-gray-800 border-gray-300 hover:border-blue-500'
                    }
                  `}
                >
                  Cell {index + 1}
                  {cell?.isMarked && <div className="text-xs">✓</div>}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-sm">Session ID: {session.id}</p>
            <p className="text-sm">Version: {session.version || 0}</p>
            <p className="text-sm">Status: {session.status}</p>
          </div>
        </Card>
      )}
    </div>
  );
}