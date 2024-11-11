import React from 'react'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  disabled?: boolean
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  disabled = false
}) => {
  return (
    <div className="flex gap-1">
      {[
        'bg-blue-500',
        'bg-purple-500',
        'bg-cyan-500',
        'bg-green-500',
        'bg-red-500',
        'bg-fuchsia-500'
      ].map((colorOption) => (
        <button
          key={colorOption}
          onClick={() => onChange(colorOption)}
          disabled={disabled}
          className={cn(
            "w-6 h-6 rounded-full",
            "transition-all duration-200",
            "hover:scale-110",
            "border-2",
            colorOption,
            color === colorOption ? "border-white" : "border-transparent",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  )
} 