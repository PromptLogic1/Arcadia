"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "px-4 py-2 rounded cursor-pointer transition-colors",
  {
    variants: {
      color: {
        cyan: "bg-cyan-500 text-white",
        fuchsia: "bg-fuchsia-500 text-white",
        lime: "bg-lime-500 text-black",
        yellow: "bg-yellow-500 text-black",
        red: "bg-red-500 text-white",
        blue: "bg-blue-500 text-white",
        green: "bg-green-500 text-white",
        purple: "bg-purple-500 text-white",
      },
      size: {
        sm: "text-sm",
        md: "text-md",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      color: "cyan",
      size: "md",
    },
  }
)

type ToggleVariants = VariantProps<typeof toggleVariants>

interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  color?: NonNullable<ToggleVariants['color']>
  size?: NonNullable<ToggleVariants['size']>
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, color, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(toggleVariants({ color, size }), className)}
      {...props}
    />
  )
)

Toggle.displayName = "Toggle"

export { Toggle, toggleVariants }
export type { ToggleProps } 