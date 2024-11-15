'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useLayout } from '../../hooks/useLayout'
import { cn } from '@/lib/utils'
import type { GeneratorSettings } from '../../types/generator.types'

interface DifficultySelectorProps {
  difficulty: GeneratorSettings['difficulty']
  onDifficultyChange: (diff: keyof GeneratorSettings['difficulty'], value: number[]) => void
  className?: string
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  difficulty,
  onDifficultyChange,
  className
}) => {
  const { getFluidTypography, getResponsiveSpacing } = useLayout()
  const typography = getFluidTypography(14, 16)
  const spacing = getResponsiveSpacing(16)

  return (
    <div className={cn('space-y-4', className)} style={{ gap: spacing.vertical }}>
      <div className="space-y-2">
        <Label 
          className="text-cyan-300"
          style={{ fontSize: typography.base }}
        >
          Easy
        </Label>
        <Slider
          value={[difficulty.easy]}
          onValueChange={(value) => onDifficultyChange('easy', value)}
          min={0}
          max={5}
          step={1}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label 
          className="text-cyan-300"
          style={{ fontSize: typography.base }}
        >
          Normal
        </Label>
        <Slider
          value={[difficulty.normal]}
          onValueChange={(value) => onDifficultyChange('normal', value)}
          min={0}
          max={5}
          step={1}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label 
          className="text-cyan-300"
          style={{ fontSize: typography.base }}
        >
          Hard
        </Label>
        <Slider
          value={[difficulty.hard]}
          onValueChange={(value) => onDifficultyChange('hard', value)}
          min={0}
          max={5}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  )
} 
