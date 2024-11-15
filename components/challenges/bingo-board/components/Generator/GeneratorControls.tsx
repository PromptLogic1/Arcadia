'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Shuffle, Download, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FluidTypography } from '../../hooks/useLayout'

interface GeneratorSettingsProps {
  selectedTypes: Set<string>
  difficultyLevels: {
    normal: number
    hard: number
    extreme: number
  }
  onTypeToggle: (type: string) => void
  onDifficultyChange: (diff: string, newValue: number[]) => void
  typography: FluidTypography
}

const CHALLENGE_TYPES = [
  { id: 'pve', label: 'PvE', color: 'green' },
  { id: 'pvp', label: 'PvP', color: 'red' },
  { id: 'quest', label: 'Quest', color: 'blue' },
  { id: 'achievement', label: 'Achievement', color: 'purple' },
] as const

export const GeneratorSettings: React.FC<GeneratorSettingsProps> = ({
  selectedTypes,
  difficultyLevels,
  onTypeToggle,
  onDifficultyChange,
  typography
}) => {
  return (
    <div className="space-y-8" style={typography}>
      {/* Challenge Type Selection */}
      <div className="space-y-4">
        <Label className="text-base font-semibold text-cyan-300">Challenge Types</Label>
        <div className="grid grid-cols-1 gap-3">
          {CHALLENGE_TYPES.map(type => (
            <div
              key={type.id}
              className={cn(
                "flex items-center p-3 rounded-lg border transition-all",
                "hover:bg-gray-700/30 cursor-pointer",
                selectedTypes.has(type.id)
                  ? `border-${type.color}-500/30 bg-${type.color}-500/10`
                  : "border-gray-700/50 bg-gray-800/30"
              )}
              onClick={() => onTypeToggle(type.id)}
            >
              <Checkbox
                checked={selectedTypes.has(type.id)}
                className={cn(
                  "mr-3",
                  `data-[state=checked]:bg-${type.color}-500 
                   data-[state=checked]:border-${type.color}-500`
                )}
              />
              <span className={cn(
                "text-sm font-medium",
                selectedTypes.has(type.id)
                  ? `text-${type.color}-400`
                  : "text-gray-400"
              )}>
                {type.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="space-y-4">
        <Label className="text-base font-semibold text-cyan-300">Difficulty Levels</Label>
        {Object.entries(difficultyLevels).map(([diff, value]) => (
          <div key={diff} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={cn(
                "font-medium",
                diff === 'normal' ? "text-cyan-300" :
                diff === 'hard' ? "text-amber-300" :
                "text-red-300"
              )}>
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </span>
              <span className="text-gray-400">Level {value}</span>
            </div>
            <Slider
              defaultValue={[value]}
              min={0}
              max={5}
              step={1}
              onValueChange={(newValue) => onDifficultyChange(diff, newValue)}
              className={cn(
                "[&>span]:transition-colors",
                diff === 'normal' ? "[&>span]:bg-cyan-500" :
                diff === 'hard' ? "[&>span]:bg-amber-500" :
                "[&>span]:bg-red-500"
              )}
            />
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 h-11"
          onClick={() => {}}
        >
          <Shuffle className="w-5 h-5 mr-2" />
          Generate Board
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="border-cyan-500/30 text-cyan-300 h-11"
          >
            <Download className="w-5 h-5 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            className="border-cyan-500/30 text-cyan-300 h-11"
          >
            <Upload className="w-5 h-5 mr-2" />
            Import
          </Button>
        </div>
      </div>
    </div>
  )
} 