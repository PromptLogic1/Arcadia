import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Edit2, Check } from 'lucide-react'
import { BoardCell } from '../shared/types'

interface BingoCellProps {
  cell: BoardCell
  index: number
  isOwner: boolean
  isEditing: boolean
  winner: number | null
  onCellChange: (index: number, value: string) => void
  onCellClick: (index: number) => void
  onEditStart: (index: number) => void
  onEditEnd: (index: number) => void
}

export const BingoCell: React.FC<BingoCellProps> = ({
  cell,
  index,
  isOwner,
  isEditing,
  winner,
  onCellChange,
  onCellClick,
  onEditStart,
  onEditEnd,
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (!isEditing) {
        onCellClick(index)
      }
    },
    [isEditing, index, onCellClick]
  )

  return (
    <motion.div
      className={`relative aspect-square flex items-center justify-center rounded-md border-2 border-gray-600 overflow-hidden ${
        cell.colors.length > 0 ? '' : 'bg-gray-800'
      } group cursor-pointer transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md`}
      onClick={handleClick}
      onContextMenu={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Bingo cell ${index + 1}`}
      role="button"
      tabIndex={0}
    >
      {/* Color Layers */}
      {cell.colors.length > 0 && (
        <div className="absolute inset-0 flex">
          {cell.colors.map((color, colorIndex) => (
            <div key={colorIndex} className={`flex-1 ${color}`} />
          ))}
        </div>
      )}

      {/* Cell Content */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
          isEditing ? 'top-0' : 'top-1/2 transform -translate-y-1/2'
        }`}
      >
        <textarea
          value={cell.text}
          onChange={(e) => onCellChange(index, e.target.value)}
          onBlur={() => onEditEnd(index)}
          className={`w-full h-full text-center bg-transparent border-none text-white text-xs md:text-sm focus:ring-2 focus:ring-cyan-500 resize-none overflow-hidden font-bold shadow-sm ${
            isEditing ? '' : 'pointer-events-none'
          }`}
          readOnly={!isOwner || winner !== null || !isEditing}
          maxLength={50}
          style={{
            wordWrap: 'break-word',
            textShadow: '0 0 3px rgba(0,0,0,0.8)',
          }}
          aria-label={`Bingo cell ${index + 1} text`}
        />
      </div>

      {/* Edit Controls */}
      {isOwner && !isEditing && isHovered && (
        <button
          className="absolute top-1 right-1 bg-gray-800 rounded-full p-1 opacity-75 hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onEditStart(index)
          }}
          aria-label={`Edit cell ${index + 1}`}
        >
          <Edit2 className="h-4 w-4 text-cyan-400" />
        </button>
      )}

      {isOwner && isEditing && (
        <button
          className="absolute bottom-1 right-1 bg-cyan-500 rounded-full p-1 hover:bg-cyan-600 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onEditEnd(index)
          }}
          aria-label={`Submit edit for cell ${index + 1}`}
        >
          <Check className="h-4 w-4 text-white" />
        </button>
      )}
    </motion.div>
  )
}