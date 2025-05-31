'use client';

import { useEffect, useState } from 'react';
import { Trophy, Crown, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onPlayAgain 
}: WinnerAnnouncementProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setShow(true);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div 
        className={`
          bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 
          p-1 rounded-2xl shadow-2xl max-w-md w-full mx-4
          transition-all duration-500 transform
          ${show ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
        `}
      >
        <div className="bg-gray-900 rounded-xl p-8">
          <div className="text-center text-white">
            {/* Animated Trophy */}
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 animate-ping">
                <Trophy className="w-24 h-24 text-yellow-400 opacity-75" />
              </div>
              <Trophy className="relative w-24 h-24 text-yellow-400 animate-bounce" />
            </div>
            
            {/* Winner Text */}
            <h2 className="text-5xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              BINGO!
            </h2>
            <p className="text-2xl font-semibold mb-6 flex items-center justify-center gap-2">
              <Crown className="w-6 h-6 text-yellow-400" />
              {winner.displayName} Wins!
              <Crown className="w-6 h-6 text-yellow-400" />
            </p>
            
            {/* Winning Patterns */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <p className="text-lg font-medium mb-3 text-yellow-400">
                Winning Patterns:
              </p>
              <div className="space-y-2">
                {result.patterns.map((pattern, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between bg-gray-700 rounded px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <span className="text-white">{pattern.name}</span>
                    </div>
                    <span className="font-bold text-green-400">
                      +{pattern.points} pts
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-lg text-gray-300">Total Score:</span>
                  <span className="text-2xl font-bold text-yellow-400 flex items-center gap-1">
                    <Sparkles className="w-6 h-6" />
                    {result.totalPoints}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="secondary"
                className="flex-1"
              >
                View Results
              </Button>
              <Button
                onClick={onPlayAgain}
                className="flex-1 bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-semibold"
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