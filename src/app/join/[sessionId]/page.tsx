'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useSessionJoin } from '@/features/play-area/hooks/useSessionJoin';
import { Users, Crown, Gamepad2, AlertCircle } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import {
  RouteErrorBoundary,
  AsyncBoundary,
} from '@/components/error-boundaries';
import { useCallback } from 'react';

interface ColorOption {
  color: string;
  name: string;
}

const PLAYER_COLORS: ColorOption[] = [
  { color: '#06b6d4', name: 'Cyan' },
  { color: '#8b5cf6', name: 'Purple' },
  { color: '#ec4899', name: 'Pink' },
  { color: '#10b981', name: 'Green' },
  { color: '#f59e0b', name: 'Orange' },
  { color: '#ef4444', name: 'Red' },
  { color: '#eab308', name: 'Yellow' },
  { color: '#6366f1', name: 'Indigo' },
  { color: '#14b8a6', name: 'Teal' },
  { color: '#f43f5e', name: 'Rose' },
  { color: '#84cc16', name: 'Lime' },
  { color: '#0ea5e9', name: 'Sky' },
];

function JoinSessionContent({ params }: { params: { sessionId: string } }) {
  const {
    // Server state
    sessionDetails,
    availableColors,

    // UI state
    playerName,
    selectedColor,
    isFormValid,

    // Loading states
    isLoading,
    isJoining,
    hasError,
    errorMessage,

    // Derived state
    canJoin,
    currentPlayerCount,
    maxPlayers,
    sessionTitle,
    gameType,
    difficulty,

    // Actions
    setPlayerName,
    setSelectedColor,
    handleJoinSession,
  } = useSessionJoin({ sessionId: params.sessionId });

  // Navigation handler
  const handleGoBack = useCallback(() => {
    window.history.back();
  }, []);

  // Color selection handler
  const handleColorSelect = useCallback(
    (color: string) => {
      setSelectedColor(color);
    },
    [setSelectedColor]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (hasError || !sessionDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <CardTitle className="text-red-600">Cannot Join Session</CardTitle>
            <CardDescription>
              {typeof errorMessage === 'string'
                ? errorMessage
                : errorMessage?.message || 'Session not found or unavailable'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoBack} className="w-full" variant="primary">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get available color options
  const colorOptions = PLAYER_COLORS.filter(option =>
    availableColors.includes(option.color)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="mx-auto max-w-2xl py-8">
        {/* Session Info Header */}
        <Card className="mb-6 border-gray-700 bg-gray-800/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-cyan-200" />
              <div className="flex-1">
                <CardTitle className="text-cyan-100">{sessionTitle}</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-4">
                  <Badge
                    variant="cyber"
                    className="border-cyan-500/30 text-cyan-300"
                  >
                    {gameType}
                  </Badge>
                  <Badge
                    variant="cyber-purple"
                    className="border-purple-500/30 text-purple-300"
                  >
                    {difficulty}
                  </Badge>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Users className="h-4 w-4" />
                    {currentPlayerCount}/{maxPlayers} players
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Join Form */}
        <Card className="border-gray-700 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-100">
              <Crown className="h-5 w-5" />
              Join Session
            </CardTitle>
            <CardDescription>
              {canJoin
                ? 'Enter your details to join this bingo session'
                : 'This session is currently full'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Player Name */}
            <div className="space-y-2">
              <Label htmlFor="playerName" className="text-cyan-200">
                Player Name
              </Label>
              <Input
                id="playerName"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Enter your display name"
                className="border-gray-600 bg-gray-900/50 text-cyan-100"
                maxLength={20}
                disabled={!canJoin}
              />
              <p className="text-xs text-gray-400">2-20 characters</p>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label className="text-cyan-200">Player Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {colorOptions.map(option => (
                  <button
                    key={option.color}
                    type="button"
                    onClick={() => handleColorSelect(option.color)}
                    disabled={!canJoin}
                    className={cn(
                      'h-12 w-12 rounded-lg border-2 transition-all',
                      'hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50',
                      selectedColor === option.color
                        ? 'border-white ring-2 ring-cyan-400'
                        : 'border-gray-600 hover:border-gray-400'
                    )}
                    style={{ backgroundColor: option.color }}
                    title={option.name}
                  />
                ))}
              </div>
              {selectedColor && (
                <p className="text-xs text-gray-400">
                  Selected:{' '}
                  {PLAYER_COLORS.find(c => c.color === selectedColor)?.name}
                </p>
              )}
            </div>

            {/* Join Button */}
            <div className="pt-4">
              <Button
                onClick={handleJoinSession}
                disabled={!canJoin || !isFormValid || isJoining}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                size="lg"
              >
                {isJoining ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Joining Session...
                  </>
                ) : canJoin ? (
                  'Join Session'
                ) : (
                  'Session Full'
                )}
              </Button>

              {!canJoin && (
                <p className="mt-2 text-center text-sm text-red-400">
                  This session has reached its maximum capacity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function JoinSessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  return (
    <RouteErrorBoundary routeName={`Join-${params.sessionId}`}>
      <AsyncBoundary loadingMessage="Loading session details...">
        <JoinSessionContent params={params} />
      </AsyncBoundary>
    </RouteErrorBoundary>
  );
}
