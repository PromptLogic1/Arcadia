'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Gauge } from 'lucide-react'

interface DifficultySelectorProps {
  difficulty: 'easy' | 'medium' | 'hard'
  onDifficultyChange: (difficulty: 'easy' | 'medium' | 'hard') => void
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  difficulty,
  onDifficultyChange
}) => {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium text-cyan-400">
        <Gauge className="h-4 w-4" />
        Difficulty
      </Label>
      <Select
        value={difficulty}
        onValueChange={onDifficultyChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="easy">Easy</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="hard">Hard</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
} 
