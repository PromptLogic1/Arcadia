/**
 * PlayAreaHub Example - New Pattern Demo
 * 
 * This demonstrates the new Zustand + TanStack Query pattern.
 * Compare with the original PlayAreaHub.tsx to see the differences.
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Users, Plus, RefreshCw } from 'lucide-react';

// New pattern imports
import { useSessionsState, useSessionsActions } from '@/lib/stores/sessions-store';
import { useActiveSessionsQuery, useJoinSessionMutation } from '@/hooks/queries/useSessionsQueries';
import { useAuth } from '@/hooks/useAuth';

export function PlayAreaHubExample() {
  const router = useRouter();
  const { authUser } = useAuth();
  
  // Zustand state (UI state only)
  const { filters, showJoinDialog, joinSessionCode } = useSessionsState();
  const { setFilters, setShowJoinDialog, setJoinSessionCode } = useSessionsActions();

  // TanStack Query for data fetching
  const {
    data: sessionsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useActiveSessionsQuery(filters);

  const joinSessionMutation = useJoinSessionMutation();

  // Event handlers
  const handleJoinByCode = async () => {
    if (!joinSessionCode.trim() || !authUser) return;

    const joinData = {
      session_id: '', // Will be resolved by session code
      user_id: authUser.id,
      display_name: authUser.username || authUser.email?.split('@')[0] || 'Player',
      color: '#FF6B6B', // Default color
    };

    await joinSessionMutation.mutateAsync(joinData);
    setShowJoinDialog(false);
    setJoinSessionCode('');
  };

  const handleSessionSelect = (sessionId: string) => {
    router.push(`/play-area/session/${sessionId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const sessions = sessionsResponse?.sessions || [];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Play Area</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowJoinDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Join by Code
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search sessions..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="max-w-sm"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <Card 
            key={session.id} 
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => handleSessionSelect(session.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">Session {session.session_code}</span>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {session.player_count || 0}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    session.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                    session.status === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Public:</span>
                  <span>{session.settings?.is_public ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No active sessions found.</p>
          <Button className="mt-4" onClick={() => router.push('/challenge-hub')}>
            Create New Session
          </Button>
        </div>
      )}

      {/* Join by Code Dialog */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Join by Session Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter 6-digit code"
                value={joinSessionCode}
                onChange={(e) => setJoinSessionCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowJoinDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleJoinByCode}
                  disabled={joinSessionCode.length !== 6 || joinSessionMutation.isPending}
                >
                  {joinSessionMutation.isPending ? 'Joining...' : 'Join'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}