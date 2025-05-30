"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface NeonTextProps {
  children: ReactNode
  intensity?: "low" | "medium" | "high"
  className?: string
}

export function NeonText({ children, intensity = "medium", className }: NeonTextProps) {
  const intensityClasses = {
    low: "text-shadow-sm",
    medium: "text-shadow-md drop-shadow-lg",
    high: "text-shadow-lg drop-shadow-xl",
  }

  return (
    <span
      className={cn("relative inline-block", intensityClasses[intensity], className)}
      style={{
        textShadow:
          intensity === "high"
            ? "0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor"
            : intensity === "medium"
              ? "0 0 5px currentColor, 0 0 10px currentColor"
              : "0 0 3px currentColor",
      }}
    >
      {children}
    </span>
  )
}
