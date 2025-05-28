'use client';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { GAMES, CHALLENGE_TYPES } from './constants';
import { GamepadIcon, Trophy } from 'lucide-react';

interface FilterGroupProps {
  selectedGame: string;
  selectedChallenge: string;
  onGameChange: (value: string) => void;
  onChallengeChange: (value: string) => void;
  className?: string;
}

export const FilterGroup: React.FC<FilterGroupProps> = ({
  selectedGame,
  selectedChallenge,
  onGameChange,
  onChallengeChange,
  className = '',
}) => (
  <div
    className={`flex flex-col space-y-2 md:flex-row md:space-x-4 md:space-y-0 ${className}`}
  >
    <div className="relative">
      <Select value={selectedGame} onValueChange={onGameChange}>
        <SelectTrigger className="min-w-[200px] border-gray-600 bg-gray-800/50 pl-9 transition-colors hover:border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400">
          <GamepadIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <SelectValue placeholder="Select Game" />
        </SelectTrigger>
        <SelectContent className="border-gray-600 bg-gray-800">
          {GAMES.map(game => (
            <SelectItem
              key={game}
              value={game}
              className="cursor-pointer hover:bg-gray-700/50 focus:bg-gray-700/50"
            >
              {game}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="relative">
      <Select value={selectedChallenge} onValueChange={onChallengeChange}>
        <SelectTrigger className="min-w-[200px] border-gray-600 bg-gray-800/50 pl-9 transition-colors hover:border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400">
          <Trophy className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <SelectValue placeholder="Select Challenge" />
        </SelectTrigger>
        <SelectContent className="border-gray-600 bg-gray-800">
          {CHALLENGE_TYPES.map(challenge => (
            <SelectItem
              key={challenge}
              value={challenge}
              className="cursor-pointer hover:bg-gray-700/50 focus:bg-gray-700/50"
            >
              {challenge}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);
