import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { BoardCell } from '../shared/types'
import { cn } from '@/lib/utils'

interface BingoCellProps {
  cell: BoardCell
  index: number
  isOwner: boolean
  isEditing: boolean
  winner: number | null
  currentPlayer: number
  onCellChange: (index: number, value: string) => void
  onCellClick: (index: number) => void
  onEditStart: (index: number) => void
  onEditEnd: (index: number) => void
}

type FontSize = {
  min: number
  max: number
}

const FONT_SIZES: Readonly<FontSize> = {
  min: 12,
  max: 20
} as const

const MAX_CHARS = 120 as const

type TextAreaEvent = React.ChangeEvent<HTMLTextAreaElement>
type MouseEvent = React.MouseEvent<HTMLDivElement | HTMLButtonElement>
type KeyboardEvent = React.KeyboardEvent<HTMLTextAreaElement>

export const BingoCell: React.FC<BingoCellProps> = ({
  cell,
  index,
  isOwner,
  isEditing,
  winner,
  currentPlayer,
  onCellChange,
  onCellClick,
  onEditStart,
  onEditEnd,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [fontSize, setFontSize] = useState<number>(FONT_SIZES.max)
  
  const handleCellClick = (e: MouseEvent): void => {
    e.preventDefault()
    if (!isEditing && !winner && currentPlayer !== undefined) {
      onCellClick(index)
    }
  }

  const handleTextClick = (e: MouseEvent): void => {
    e.stopPropagation()
    if (!isEditing && isOwner) {
      onEditStart(index)
    }
  }

  const handleTextChange = (e: TextAreaEvent): void => {
    const newValue = e.target.value
    if (newValue.length <= MAX_CHARS) {
      onCellChange(index, newValue)
    }
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEditEnd(index)
    }
  }

  const adjustTextSize = (): void => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const container = textarea.parentElement
    if (!container) return

    // Reset to default state
    textarea.style.fontSize = `${FONT_SIZES.max}px`
    textarea.style.marginTop = '0'
    
    let currentSize = FONT_SIZES.max
    
    // First try to fit by reducing font size
    while (
      (textarea.scrollHeight > container.clientHeight ||
      textarea.scrollWidth > container.clientWidth) &&
      currentSize > FONT_SIZES.min
    ) {
      currentSize -= 0.5
      textarea.style.fontSize = `${currentSize}px`
    }

    // If still overflowing, calculate upward shift
    if (textarea.scrollHeight > container.clientHeight) {
      const overflow = textarea.scrollHeight - container.clientHeight
      const shift = Math.min(overflow / 2, container.clientHeight / 4)
      textarea.style.marginTop = `-${shift}px`
    }
    
    setFontSize(currentSize)
  }

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
    adjustTextSize()
  }, [isEditing, cell.text])

  useEffect(() => {
    const handleResize = (): void => {
      adjustTextSize()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const textShadow = cell.colors.length > 0 
    ? '0 2px 4px rgba(0,0,0,0.8)' 
    : '0 1px 2px rgba(0,0,0,0.5)'

  return (
    <div
      className={cn(
        "relative aspect-square",
        "rounded-md border border-cyan-500/20",
        "bg-gray-800/80 overflow-hidden",
        "transition-all duration-300 ease-in-out",
        "hover:shadow-lg hover:shadow-cyan-500/10",
        "hover:border-cyan-500/40",
        isEditing && "ring-2 ring-cyan-500"
      )}
      onClick={handleCellClick}
    >
      {/* Color Layers */}
      {cell.colors.length > 0 && (
        <div className="absolute inset-0 flex">
          {cell.colors.map((color, colorIndex) => (
            <div
              key={`${color}-${colorIndex}`}
              className={cn(
                "flex-1",
                color,
                "transition-opacity duration-200 ease-in-out",
                "opacity-80"
              )}
            />
          ))}
        </div>
      )}

      {/* Text Container */}
      <div 
        className={cn(
          "absolute inset-0",
          "flex items-center justify-center",
          isOwner && !isEditing && "group",
          isOwner && !winner && "cursor-text"
        )}
        onClick={handleTextClick}
      >
        <div className={cn(
          "relative flex items-center justify-center",
          "w-full h-full",
          "px-2",
          isOwner && !isEditing && "group-hover:bg-cyan-500/10 rounded-md transition-colors"
        )}>
          <div className="relative w-full flex items-center justify-center">
            <textarea
              ref={textareaRef}
              value={cell.text}
              onChange={handleTextChange}
              onBlur={() => isEditing && onEditEnd(index)}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full text-center bg-transparent border-none",
                "text-white resize-none overflow-hidden font-medium",
                "focus:ring-0 focus:outline-none",
                "transition-all duration-200",
                "absolute top-1/2 -translate-y-1/2",
                isEditing ? "opacity-90" : "opacity-100",
                !isEditing && "pointer-events-none",
                cell.colors.length > 0 && "text-shadow-lg"
              )}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: '1.2',
                height: 'auto',
                textShadow,
              }}
              readOnly={!isOwner || winner !== null || !isEditing}
              maxLength={MAX_CHARS}
              placeholder={isOwner ? "Click to add task..." : ""}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Edit Controls */}
      <AnimatePresence>
        {isEditing && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute bottom-1.5 right-1.5",
              "bg-cyan-500 hover:bg-cyan-400",
              "rounded-full p-1.5 shadow-lg",
              "transition-colors duration-200"
            )}
            onClick={(e: MouseEvent) => {
              e.stopPropagation()
              onEditEnd(index)
            }}
          >
            <Check className="h-3 w-3 text-gray-900" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Character Count */}
      {isEditing && (
        <div className="absolute top-1.5 right-1.5 text-[10px] text-cyan-300/70 bg-gray-900/50 px-1.5 py-0.5 rounded-full">
          {cell.text.length}/{MAX_CHARS}
        </div>
      )}
    </div>
  )
}