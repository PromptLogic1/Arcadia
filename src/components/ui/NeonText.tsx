import React from 'react'
import { cn } from '@/lib/utils'

interface NeonTextProps {
  children: React.ReactNode
  className?: string
  color?: 'blue' | 'purple' | 'pink' | 'green' | 'yellow' | 'red' | 'cyan'
  intensity?: 'low' | 'medium' | 'high'
}

const colorClasses = {
  blue: 'text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]',
  purple: 'text-purple-400 drop-shadow-[0_0_10px_rgba(147,51,234,0.8)]',
  pink: 'text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]',
  green: 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]',
  yellow: 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]',
  red: 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]',
  cyan: 'text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]',
}

const intensityClasses = {
  low: 'drop-shadow-[0_0_5px_currentColor]',
  medium: 'drop-shadow-[0_0_10px_currentColor]',
  high: 'drop-shadow-[0_0_20px_currentColor] animate-pulse',
}

const NeonText: React.FC<NeonTextProps> = ({ 
  children, 
  className, 
  color = 'blue', 
  intensity = 'medium' 
}) => {
  return (
    <span
      className={cn(
        'font-bold tracking-wide',
        colorClasses[color],
        intensityClasses[intensity],
        className
      )}
    >
      {children}
    </span>
  )
}

export default NeonText