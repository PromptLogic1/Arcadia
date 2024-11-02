import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface BingoLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  contentClassName?: string
  animate?: boolean
  delay?: number
  direction?: 'left' | 'right'
  fullHeight?: boolean
  variant?: 'default' | 'compact'
}

export const BingoLayout: React.FC<BingoLayoutProps> = ({
  children,
  title,
  description,
  className,
  contentClassName,
  animate = true,
  delay = 0,
  direction = 'left',
  fullHeight = false,
  variant = 'default',
}) => {
  const content = (
    <Card className={cn(
      "bg-gray-800/95 backdrop-blur-sm",
      "border-2 border-cyan-500/30 hover:border-cyan-500/50 transition-colors",
      "flex flex-col shadow-lg shadow-cyan-500/10",
      fullHeight && "h-full",
      className
    )}>
      {(title || description) && (
        <CardHeader className={cn(
          "flex-shrink-0",
          variant === 'compact' ? "p-2 sm:p-3" : "p-3 sm:p-4",
          "border-b border-cyan-500/20"
        )}>
          {title && (
            <CardTitle className={cn(
              "font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent",
              variant === 'compact' ? "text-base sm:text-lg" : "text-lg sm:text-2xl"
            )}>
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className="text-cyan-300/80 text-xs sm:text-sm">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(
        "flex-1 min-h-0",
        variant === 'compact' ? "p-2 sm:p-3" : "p-3 sm:p-4",
        contentClassName
      )}>
        {children}
      </CardContent>
    </Card>
  )

  if (!animate) {
    return content
  }

  return (
    <motion.div
      className={cn("w-full", fullHeight && "h-full")}
      initial={{ opacity: 0, x: direction === 'left' ? -50 : 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {content}
    </motion.div>
  )
}

export const BingoSection: React.FC<{
  title?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'compact'
  collapsible?: boolean
}> = ({
  title,
  icon,
  children,
  className,
  variant = 'default',
  collapsible = false
}) => (
  <section className={cn(
    "flex flex-col min-h-0 rounded-lg",
    "bg-gray-800/50 border border-cyan-500/20",
    "transition-all duration-200 hover:border-cyan-500/30 hover:shadow-md hover:shadow-cyan-500/5",
    variant === 'compact' ? "p-2 sm:p-3" : "p-3 sm:p-4",
    className
  )}>
    {title && (
      <h3 className={cn(
        "font-semibold text-cyan-400 flex items-center justify-between",
        variant === 'compact' ? "text-sm mb-2" : "text-base mb-3"
      )}>
        <div className="flex items-center">
          {icon && (
            <span className={cn(
              "mr-2 p-1.5 rounded-md bg-cyan-500/10",
              "transition-colors duration-200 group-hover:bg-cyan-500/20",
              variant === 'compact' ? "text-xs" : "text-sm"
            )}>
              {icon}
            </span>
          )}
          {title}
        </div>
      </h3>
    )}
    <div className={cn(
      "flex-1 min-h-0",
      collapsible ? "overflow-hidden transition-all duration-300" : "overflow-auto"
    )}>
      {children}
    </div>
  </section>
)

export const BingoGrid: React.FC<{
  children: React.ReactNode
  size: number
  className?: string
}> = ({
  children,
  size,
  className
}) => (
  <div
    className={cn(
      "grid bg-gray-800/80 rounded-lg",
      "border border-cyan-500/20 shadow-inner",
      "p-2 sm:p-3 md:p-4",
      className
    )}
    style={{
      gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
      gap: 'clamp(0.25rem, 2vw, 0.5rem)',
      aspectRatio: '1',
    }}
  >
    {children}
  </div>
)

export const BingoContainer: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({
  children,
  className
}) => (
  <div className={cn(
    "w-full min-h-[calc(100vh-4rem)]",
    "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
    "p-2 sm:p-4 md:p-6",
    className
  )}>
    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 h-full max-w-[1800px] mx-auto">
      {children}
    </div>
  </div>
)