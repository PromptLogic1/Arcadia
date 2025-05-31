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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface JoinSessionDialogProps {
  trigger?: React.ReactNode;
}

export function JoinSessionDialog({ trigger }: JoinSessionDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) {
      toast({
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
          user_id: user?.id,
          display_name: user?.username || 'Player',
          avatar_url: user?.avatarUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join session');
      }

      const { session } = await response.json();
      
      toast({
        title: 'Success!',
        description: 'Joined session successfully',
      });

      // Navigate to the game page
      router.push(`/play-area/bingo/${session.id}`);
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to join session',
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
          <Button variant="outline" size="lg">
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
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-2xl font-mono tracking-wider"
              disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Ask the host for the session code to join their game
          </p>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
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