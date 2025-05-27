import React from 'react'
import { cn } from '@/lib/utils'

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
}

const variantClasses = {
  primary: 'bg-blue-600 border-blue-400 text-white hover:bg-blue-700 shadow-[0_0_15px_rgba(59,130,246,0.5)]',
  secondary: 'bg-purple-600 border-purple-400 text-white hover:bg-purple-700 shadow-[0_0_15px_rgba(147,51,234,0.5)]',
  success: 'bg-green-600 border-green-400 text-white hover:bg-green-700 shadow-[0_0_15px_rgba(34,197,94,0.5)]',
  warning: 'bg-yellow-600 border-yellow-400 text-white hover:bg-yellow-700 shadow-[0_0_15px_rgba(250,204,21,0.5)]',
  danger: 'bg-red-600 border-red-400 text-white hover:bg-red-700 shadow-[0_0_15px_rgba(239,68,68,0.5)]',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  glow = true,
  ...props
}) => {
  return (
    <button
      className={cn(
        'font-semibold rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        glow && 'hover:shadow-[0_0_25px_currentColor] transform hover:scale-105',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
} 