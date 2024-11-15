'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import type { BoardCell, Player } from '../../types/types'
import { cn } from '@/lib/utils'
import type { FluidTypography } from '../../hooks/useLayout'

interface BingoCellProps {
  cell: BoardCell
  index: number
  isOwner: boolean
  isEditing: boolean
  winner: number | null
  currentPlayer: number
  players: Player[]
  isGameStarted: boolean
  lockoutMode: boolean
  onCellChange: (index: number, value: string) => void
  onCellClick: (index: number, updates?: Partial<BoardCell>) => void
  _onEditStart: (index: number) => void
  onEditEnd: (index: number) => void
  cellType?: 'pvp' | 'pve' | 'quest' | 'achievement'
  isPartOfWinningLine?: boolean
  typography: FluidTypography
}

export const BingoCell = React.memo<BingoCellProps>(({
  cell,
  index,
  isOwner,
  isEditing,
  winner,
  currentPlayer,
  players,
  isGameStarted,
  lockoutMode,
  onCellChange,
  onCellClick,
  _onEditStart,
  onEditEnd,
  cellType,
  isPartOfWinningLine,
  typography
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current
      const length = textarea.value.length
      textarea.focus()
      textarea.setSelectionRange(length, length)
    }
  }, [isEditing])

  const shouldUseWhiteText = (color: string | undefined): boolean => {
    if (!color) return false
    const darkColors = [
      'bg-blue-500', 'bg-purple-500', 'bg-cyan-500', 
      'bg-green-500', 'bg-red-500', 'bg-fuchsia-500'
    ]
    return darkColors.includes(color)
  }

  const handleClick = useCallback((e: React.MouseEvent): void => {
    e.preventDefault()
    
    if (winner || cell.blocked) return

    if (isGameStarted) {
      const currentPlayerColor = players[currentPlayer]?.color
      if (!currentPlayerColor) return

      const hasPlayerColor = cell.colors.includes(currentPlayerColor)

      if (hasPlayerColor) {
        const newColors = cell.colors.filter(color => color !== currentPlayerColor)
        const newCompletedBy = (cell.completedBy || []).filter(color => color !== currentPlayerColor)
        
        onCellClick(index, {
          colors: newColors,
          completedBy: newCompletedBy,
          blocked: cell.blocked,
          text: cell.text
        })
        return
      }

      if (lockoutMode) {
        if (cell.colors.length === 0) {
          onCellClick(index, {
            colors: [currentPlayerColor],
            completedBy: [currentPlayerColor],
            blocked: cell.blocked,
            text: cell.text
          })
        }
        return
      }

      if (cell.colors.length < 4) {
        const newColors = [...cell.colors, currentPlayerColor]
        const newCompletedBy = [...(cell.completedBy || []), currentPlayerColor]
        
        onCellClick(index, {
          colors: newColors,
          completedBy: newCompletedBy,
          blocked: cell.blocked,
          text: cell.text
        })
      }
    } else if (isOwner && !isEditing) {
      _onEditStart(index)
    }
  }, [
    cell,
    lockoutMode,
    currentPlayer,
    players,
    winner,
    isGameStarted,
    isOwner,
    isEditing,
    index,
    onCellClick,
    _onEditStart
  ])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    onCellChange(index, e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') {
      e.preventDefault()
      e.currentTarget.blur()
      onEditEnd(index)
    }
  }

  const handleBlur = () => {
    onEditEnd(index)
  }

  const handleFocus = () => {
    // Fokus-Handling wenn nötig
  }

  // Multi-Color Indikator
  const ColorIndicators = () => (
    <div className="absolute -top-1 -right-1 flex -space-x-1">
      {cell.colors.map((color, idx) => (
        <div
          key={`${color}-${idx}`}
          className={cn(
            "w-3 h-3 rounded-full",
            color,
            "border border-gray-900/20",
            "transform",
            idx > 0 && "-translate-x-1/2"
          )}
        />
      ))}
    </div>
  )

  const canInteract = isGameStarted 
    ? (!lockoutMode || !cell.colors.length || 
       (players[currentPlayer]?.color && 
        (cell.colors.includes(players[currentPlayer].color) || cell.colors.length < 4)))
    : isOwner

  return (
    <div 
      className={cn(
        "relative aspect-square rounded-lg",
        "border border-cyan-500/20",
        "bg-gray-800/50",
        "shadow-sm",
        "transition-all duration-200",
        
        !isEditing && [
          "hover:scale-[1.02]",
          "hover:shadow-lg",
          "hover:shadow-cyan-500/10",
          "hover:border-cyan-500/40",
        ],
        
        canInteract
          ? "cursor-pointer hover:scale-[1.02]"
          : "cursor-not-allowed",
        
        cell.colors.length > 0 && [
          "shadow-[0_0_12px_rgba(76,201,240,0.2)]",
          "border-cyan-500/40"
        ],
        
        isEditing && "ring-2 ring-cyan-500",
        cellType && `border-${cellType}-500/40`,
        isPartOfWinningLine && "ring-2 ring-cyan-400",
        
        "w-full h-full"
      )}
      onClick={handleClick}
    >
      {/* Farbige Overlays für multiple Markierungen */}
      {cell.colors.length > 0 && (
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          {cell.colors.map((color, idx) => (
            <div 
              key={`${color}-${idx}`}
              className={cn(
                "absolute inset-0",
                color,
                "transition-opacity duration-200",
                lockoutMode
                  ? "opacity-80"
                  : {
                      'opacity-20': idx === 0,
                      'opacity-40': idx === 1,
                      'opacity-60': idx === 2,
                      'opacity-80': idx === 3,
                    }[idx]
              )}
            />
          ))}
        </div>
      )}

      {/* Color Indicators */}
      {cell.colors.length > 0 && <ColorIndicators />}

      {/* Content Container */}
      <div className={cn(
        "relative h-full w-full",
        "flex items-center justify-center",
        "p-2 sm:p-3",
        "transition-colors duration-300",
        cell.colors.length > 0 ? "text-white/90" : "text-white/80"
      )}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={cell.text}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full h-full",
              "bg-transparent border-none",
              "font-semibold focus:ring-0 focus:outline-none",
              "transition-colors duration-300",
              "text-center resize-none overflow-hidden",
              "z-10",
              shouldUseWhiteText(cell.colors[cell.colors.length - 1]) 
                ? "text-white" 
                : "text-gray-200"
            )}
            style={typography}
            spellCheck={false}
            maxLength={50}
            placeholder="Enter task..."
          />
        ) : (
          <p 
            className={cn(
              "w-full",
              "text-center break-words",
              "z-10",
              shouldUseWhiteText(cell.colors[cell.colors.length - 1]) 
                ? "text-white" 
                : "text-gray-200",
              isGameStarted && "select-none",
              !cell.text && isOwner && !isGameStarted && "text-gray-500"
            )}
            style={typography}
          >
            {cell.text || (isOwner && !isGameStarted ? "Click to edit..." : "")}
          </p>
        )}
      </div>
    </div>
  )
})

BingoCell.displayName = 'BingoCell'
