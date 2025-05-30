"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface NeonBorderProps {
  children: ReactNode
  className?: string
  intensity?: "low" | "medium" | "high"
  color?: "primary" | "secondary" | "accent"
}

export default function NeonBorder({ children, className, intensity = "medium", color = "primary" }: NeonBorderProps) {
  const intensityClasses = {
    low: "shadow-lg",
    medium: "shadow-xl shadow-primary/20",
    high: "shadow-2xl shadow-primary/30",
  }

  const colorClasses = {
    primary: "border-primary/50 shadow-primary/20",
    secondary: "border-secondary/50 shadow-secondary/20",
    accent: "border-accent/50 shadow-accent/20",
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm",
        intensityClasses[intensity],
        colorClasses[color],
        className,
      )}
    >
      {children}
    </div>
  )
}
