'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

const NeonButtonComponent = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ children, className, variant = 'default', size = 'default', ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:scale-[1.02] active:scale-[0.98]',
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-cyan-500/50 before:via-fuchsia-500/50 before:to-cyan-500/50 before:blur-xl before:opacity-0 before:transition-opacity before:duration-300',
        'hover:before:opacity-100',
        className
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-fuchsia-500 opacity-20 transition-opacity duration-300 group-hover:opacity-30" />
    </Button>
  )
)

NeonButtonComponent.displayName = 'NeonButton'

export const NeonButton = NeonButtonComponent
export default NeonButton