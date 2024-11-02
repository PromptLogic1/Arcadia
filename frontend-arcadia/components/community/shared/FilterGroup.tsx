import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { GAMES, CHALLENGE_TYPES } from './constants'

interface FilterGroupProps {
  selectedGame: string
  selectedChallenge: string
  onGameChange: (value: string) => void
  onChallengeChange: (value: string) => void
}

export const FilterGroup: React.FC<FilterGroupProps> = ({
  selectedGame,
  selectedChallenge,
  onGameChange,
  onChallengeChange,
}) => (
  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
    <Select value={selectedGame} onValueChange={onGameChange}>
      <SelectTrigger className="bg-gray-800 border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400">
        <SelectValue placeholder="Select Game" />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-cyan-500">
        {GAMES.map((game) => (
          <SelectItem key={game} value={game}>
            {game}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={selectedChallenge} onValueChange={onChallengeChange}>
      <SelectTrigger className="bg-gray-800 border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400">
        <SelectValue placeholder="Select Challenge" />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-cyan-500">
        {CHALLENGE_TYPES.map((challenge) => (
          <SelectItem key={challenge} value={challenge}>
            {challenge}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
) 