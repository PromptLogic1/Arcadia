'use client'

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { GAMES, CHALLENGE_TYPES } from './constants'
import { GamepadIcon, Trophy } from 'lucide-react'

interface FilterGroupProps {
  selectedGame: string
  selectedChallenge: string
  onGameChange: (value: string) => void
  onChallengeChange: (value: string) => void
  className?: string
}

export const FilterGroup: React.FC<FilterGroupProps> = ({
  selectedGame,
  selectedChallenge,
  onGameChange,
  onChallengeChange,
  className = ''
}) => (
  <div className={`flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 ${className}`}>
    <div className="relative">
      <Select value={selectedGame} onValueChange={onGameChange}>
        <SelectTrigger 
          className="
            bg-gray-800/50 
            border-gray-600 
            hover:border-cyan-500 
            focus:border-cyan-400 
            focus:ring-cyan-400 
            transition-colors
            min-w-[200px]
            pl-9
          "
        >
          <GamepadIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <SelectValue placeholder="Select Game" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          {GAMES.map((game) => (
            <SelectItem 
              key={game} 
              value={game}
              className="hover:bg-gray-700/50 focus:bg-gray-700/50 cursor-pointer"
            >
              {game}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="relative">
      <Select value={selectedChallenge} onValueChange={onChallengeChange}>
        <SelectTrigger 
          className="
            bg-gray-800/50 
            border-gray-600 
            hover:border-cyan-500 
            focus:border-cyan-400 
            focus:ring-cyan-400 
            transition-colors
            min-w-[200px]
            pl-9
          "
        >
          <Trophy className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <SelectValue placeholder="Select Challenge" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          {CHALLENGE_TYPES.map((challenge) => (
            <SelectItem 
              key={challenge} 
              value={challenge}
              className="hover:bg-gray-700/50 focus:bg-gray-700/50 cursor-pointer"
            >
              {challenge}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
) 