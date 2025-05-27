import * as React from "react"
import { cn } from "@/src/lib/utils"

interface NeonTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  color?: "blue" | "green" | "purple" | "pink" | "yellow"
  intensity?: "low" | "medium" | "high"
}

const NeonText = React.forwardRef<HTMLSpanElement, NeonTextProps>(
  ({ className, children, color = "blue", intensity = "medium", ...props }, ref) => {
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