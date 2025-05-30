"use client"

import type React from "react"

import { cn } from "@/lib/utils"

interface ArcadeDecorationProps {
  className?: string
  style?: React.CSSProperties
}

export default function ArcadeDecoration({ className, style }: ArcadeDecorationProps) {
  return (
    <div
      className={cn(
        "absolute w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-xl",
        className,
      )}
      style={style}
    >
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-md" />
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 blur-sm" />
    </div>
  )
}
