import * as React from "react"
import { cn } from "@/lib/utils"

interface NeonTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  color?: "blue" | "green" | "purple" | "pink" | "yellow"
  intensity?: "low" | "medium" | "high"
  useGradient?: boolean
  gradientFrom?: string
  gradientTo?: string
}

const NeonText = React.forwardRef<HTMLSpanElement, NeonTextProps>(
  ({ className, children, color = "blue", intensity = "medium", useGradient = false, gradientFrom = 'from-cyan-400', gradientTo = 'to-fuchsia-500', ...props }, ref) => {
    const colorClasses = {
      blue: "text-blue-400",
      green: "text-green-400", 
      purple: "text-purple-400",
      pink: "text-pink-400",
      yellow: "text-yellow-400"
    }

    const shadowClasses = {
      low: `shadow-sm`,
      medium: `shadow-md`,
      high: `shadow-lg`
    }

    const glowClasses = {
      blue: "drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]",
      green: "drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]",
      purple: "drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]", 
      pink: "drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]",
      yellow: "drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"
    }

    if (useGradient) {
      return (
        <span
          ref={ref}
          className={cn(
            "text-transparent bg-clip-text bg-gradient-to-r",
            gradientFrom,
            gradientTo,
            "font-bold tracking-wide",
            className
          )}
          {...props}
        >
          {children}
        </span>
      )
    }

    return (
      <span
        ref={ref}
        className={cn(
          "font-bold tracking-wide",
          colorClasses[color],
          shadowClasses[intensity],
          glowClasses[color],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)
NeonText.displayName = "NeonText"

export default NeonText