'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Lock,
  Users,
  Play,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionJoinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => Promise<void>;
  sessionCode: string;
  onSessionCodeChange: (code: string) => void;
}

/**
 * Session Join Dialog Component
 * Allows users to join private sessions using session codes
 */
export function SessionJoinDialog({
  isOpen,
  onClose,
  onJoin,
  sessionCode,
  onSessionCodeChange,
}: SessionJoinDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle joining session
  const handleJoin = useCallback(async () => {
    if (!sessionCode.trim()) {
      setError('Please enter a session code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onJoin();
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('Failed to join session');
      setError(err.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  }, [sessionCode, onJoin]);

  // Handle input change
  const handleCodeChange = (value: string) => {
    setError(null);
    onSessionCodeChange(value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && sessionCode.trim()) {
      handleJoin();
    }
  };

  // Validate session code format
  const isValidFormat = sessionCode.length >= 3 && sessionCode.length <= 10;
  const isComplete = sessionCode.length >= 6;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-gray-700 bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5 text-purple-400" />
            Join Private Session
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Enter the session code provided by the host to join their private
            game
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Session Code Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-200">
              Session Code
            </Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="ABC123"
                value={sessionCode}
                onChange={e => handleCodeChange(e.target.value)}
                onKeyDown={handleKeyPress}
                className={cn(
                  'pl-10 text-center font-mono text-lg tracking-wider',
                  'border-gray-600 bg-gray-800/50 text-gray-100 placeholder-gray-400',
                  error && 'border-red-500 focus:border-red-500',
                  isComplete &&
                    !error &&
                    'border-green-500 focus:border-green-500'
                )}
                maxLength={10}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {isComplete && !error && (
                <CheckCircle className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-green-400" />
              )}
            </div>

            {/* Format validation feedback */}
            {sessionCode && !isValidFormat && (
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                Session codes are typically 6 characters long
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {/* Information Card */}
          <Card className="border-gray-700 bg-gray-800/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
                <div className="space-y-2 text-sm text-gray-300">
                  <p className="font-medium text-gray-200">
                    How to find session codes:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-gray-400">
                    <li>Ask the host to share their session code</li>
                    <li>Check Discord, chat, or message from the host</li>
                    <li>Session codes are case-insensitive</li>
                    <li>Codes typically expire after the session ends</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-purple-500/30 bg-purple-500/10">
              <CardContent className="p-3 text-center">
                <Lock className="mx-auto mb-2 h-6 w-6 text-purple-400" />
                <p className="text-xs font-medium text-purple-300">
                  Private Session
                </p>
                <p className="text-xs text-purple-400/70">
                  Host controls access
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-500/10">
              <CardContent className="p-3 text-center">
                <Users className="mx-auto mb-2 h-6 w-6 text-blue-400" />
                <p className="text-xs font-medium text-blue-300">
                  Join Instantly
                </p>
                <p className="text-xs text-blue-400/70">If approved by host</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={!sessionCode.trim() || loading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {loading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Joining...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Join Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
