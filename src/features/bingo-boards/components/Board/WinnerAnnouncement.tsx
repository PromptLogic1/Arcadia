'use client';

import { useEffect, useState } from 'react';
import { Trophy, Crown, Star, Sparkles } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import type { WinDetectionResult } from '../../types';

interface WinnerAnnouncementProps {
  winner: {
    displayName: string;
    avatarUrl?: string;
  };
  result: WinDetectionResult;
  onClose: () => void;
  onPlayAgain: () => void;
}

export function WinnerAnnouncement({
  winner,
  result,
  onClose,
  onPlayAgain,
}: WinnerAnnouncementProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setShow(true);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className={`mx-4 w-full max-w-md transform rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-1 shadow-2xl transition-all duration-500 ${show ? 'scale-100 opacity-100' : 'scale-90 opacity-0'} `}
      >
        <div className="rounded-xl bg-gray-900 p-8">
          <div className="text-center text-white">
            {/* Animated Trophy */}
            <div className="relative mb-4 inline-block">
              <div className="absolute inset-0 animate-ping">
                <Trophy className="h-24 w-24 text-yellow-400 opacity-75" />
              </div>
              <Trophy className="relative h-24 w-24 animate-bounce text-yellow-400" />
            </div>

            {/* Winner Text */}
            <h2 className="mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-5xl font-bold text-transparent">
              BINGO!
            </h2>
            <p className="mb-6 flex items-center justify-center gap-2 text-2xl font-semibold">
              <Crown className="h-6 w-6 text-yellow-400" />
              {winner.displayName} Wins!
              <Crown className="h-6 w-6 text-yellow-400" />
            </p>

            {/* Winning Patterns */}
            <div className="mb-6 rounded-lg bg-gray-800 p-4">
              <p className="mb-3 text-lg font-medium text-yellow-400">
                Winning Patterns:
              </p>
              <div className="space-y-2">
                {result.patterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded bg-gray-700 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-400" />
                      <span className="text-white">{pattern.name}</span>
                    </div>
                    <span className="font-bold text-green-400">
                      +{pattern.points} pts
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-gray-600 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg text-gray-300">Total Score:</span>
                  <span className="flex items-center gap-1 text-2xl font-bold text-yellow-400">
                    <Sparkles className="h-6 w-6" />
                    {result.totalPoints}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={onClose} variant="secondary" className="flex-1">
                View Results
              </Button>
              <Button
                onClick={onPlayAgain}
                className="flex-1 bg-yellow-500 font-semibold text-gray-900 hover:bg-yellow-400"
              >
                Play Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
