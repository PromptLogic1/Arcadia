import React from 'react'
import { cn } from '@/lib/utils'

interface NeonBorderProps {
  children: React.ReactNode
  className?: string
  color?: 'blue' | 'purple' | 'pink' | 'green' | 'yellow' | 'red' | 'cyan'
  intensity?: 'low' | 'medium' | 'high'
  animated?: boolean
}

const colorClasses = {
  blue: 'border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.6)]',
  purple: 'border-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.6)]',
  pink: 'border-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.6)]',
  green: 'border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.6)]',
  yellow: 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]',
  red: 'border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.6)]',
  cyan: 'border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]',
}

const intensityClasses = {
  low: 'border shadow-[0_0_5px_currentColor]',
  medium: 'border-2 shadow-[0_0_10px_currentColor]',
  high: 'border-2 shadow-[0_0_20px_currentColor]',
}

const NeonBorder: React.FC<NeonBorderProps> = ({ 
  children, 
  className, 
  color = 'blue', 
  intensity = 'medium',
  animated = false
}) => {
  return (
    <div
      className={cn(
        'rounded-lg',
        colorClasses[color],
        intensityClasses[intensity],
        animated && 'animate-pulse',
        className
      )}
    >
      {children}
    </div>
  )
}

export default NeonBorder