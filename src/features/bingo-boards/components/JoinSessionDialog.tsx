'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/components/ui/UseToast';
import { useAuth } from '@/lib/stores/auth-store';

interface JoinSessionDialogProps {
  trigger?: React.ReactNode;
}

export function JoinSessionDialog({ trigger }: JoinSessionDialogProps) {
  const router = useRouter();
  const { authUser } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) {
      showToast({
        title: 'Error',
        description: 'Please enter a session code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bingo/sessions/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_code: code.toUpperCase(),
          user_id: authUser?.id,
          display_name: authUser?.username || 'Player',
          avatar_url: authUser?.avatar_url,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join session');
      }

      const { session } = await response.json();

      showToast({
        title: 'Success!',
        description: 'Joined session successfully',
      });

      // Navigate to the game page
      router.push(`/play-area/bingo/${session.id}`);
      setOpen(false);
    } catch (error) {
      showToast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to join session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="secondary" size="lg">
            Join Game
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Bingo Session</DialogTitle>
          <DialogDescription>
            Enter the 6-character code to join a game
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="session-code">Session Code</Label>
            <Input
              id="session-code"
              placeholder="ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center font-mono text-2xl tracking-wider"
              disabled={loading}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Ask the host for the session code to join their game
          </p>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={loading || !code.trim()}>
            {loading ? 'Joining...' : 'Join Game'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
