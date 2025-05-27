import React from 'react'
import { cn } from '@/lib/utils'

interface ArcadeDecorationProps {
  children?: React.ReactNode
  className?: string
  variant?: 'border' | 'background' | 'corner'
  color?: 'primary' | 'secondary' | 'accent'
}

const variantClasses = {
  border: 'border-4 border-dashed',
  background: 'bg-gradient-to-br relative overflow-hidden',
  corner: 'relative',
}

const colorClasses = {
  primary: {
    border: 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    background: 'from-cyan-900/20 to-purple-900/20',
    corner: 'before:border-cyan-400 after:border-cyan-400',
  },
  secondary: {
    border: 'border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    background: 'from-pink-900/20 to-yellow-900/20',
    corner: 'before:border-pink-400 after:border-pink-400',
  },
  accent: {
    border: 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]',
    background: 'from-yellow-900/20 to-green-900/20',
    corner: 'before:border-yellow-400 after:border-yellow-400',
  },
}

const ArcadeDecoration: React.FC<ArcadeDecorationProps> = ({
  children,
  className,
  variant = 'border',
  color = 'primary',
}) => {
  const baseClasses = variantClasses[variant]
  const colorClass = colorClasses[color][variant]

  if (variant === 'corner') {
    return (
      <div
        className={cn(
          'relative',
          'before:absolute before:top-0 before:left-0 before:w-4 before:h-4 before:border-t-2 before:border-l-2',
          'after:absolute after:bottom-0 after:right-0 after:w-4 after:h-4 after:border-b-2 after:border-r-2',
          colorClass,
          className
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        baseClasses,
        colorClass,
        'rounded-lg p-4',
        className
      )}
    >
      {variant === 'background' && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-lg" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

export default ArcadeDecoration