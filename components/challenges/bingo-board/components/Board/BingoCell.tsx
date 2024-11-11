import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import type { BoardCell } from '../shared/types';
import { cn } from '@/lib/utils';
import type { FluidTypography } from '../../hooks/useResponsiveLayout';

interface BingoCellProps {
  cell: BoardCell;
  index: number;
  isOwner: boolean;
  isEditing: boolean;
  winner: number | null;
  currentPlayer: number;
  isGameStarted: boolean;
  lockoutMode: boolean;
  onCellChange: (index: number, value: string) => void;
  onCellClick: (index: number) => void;
  onEditStart: (index: number) => void;
  onEditEnd: (index: number) => void;
  progress?: number;
  cellType?: 'pvp' | 'pve' | 'quest' | 'achievement';
  isPartOfWinningLine?: boolean;
  typography: FluidTypography;
}

export const BingoCell = React.memo<BingoCellProps>(({
  cell,
  index,
  isOwner,
  isEditing,
  winner,
  currentPlayer,
  isGameStarted,
  lockoutMode,
  onCellChange,
  onCellClick,
  onEditStart,
  onEditEnd,
  progress = 0,
  cellType,
  isPartOfWinningLine,
  typography
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleRewardUnlock = useCallback(() => {
    // Implement reward unlock logic
  }, []);

  const handleCellClick = useCallback(
    (e: React.MouseEvent): void => {
      e.preventDefault();

      if (!isGameStarted) {
        if (isOwner && !isEditing) {
          onEditStart(index);
        }
        return;
      }

      if (winner || cell.blocked) return;

      if (lockoutMode && cell.completedBy?.length) return;

      onCellClick(index);

      // If this is a hard/extreme cell with 'block' reward and not completed by current player
      if (
        cell.difficulty &&
        cell.difficulty !== 'normal' &&
        cell.reward === 'block' &&
        !cell.completedBy?.includes(cell.colors[currentPlayer] || '')
      ) {
        handleRewardUnlock();
      }
    },
    [
      cell,
      index,
      isGameStarted,
      isOwner,
      isEditing,
      lockoutMode,
      winner,
      currentPlayer,
      handleRewardUnlock,
      onCellClick,
      onEditStart,
    ]
  );

  const adjustTextSize = useCallback(() => {
    // Implement adjustTextSize logic
  }, []);

  useEffect(() => {
    if (isEditing) {
      adjustTextSize();
    }
  }, [isEditing, cell.text, adjustTextSize]);

  useEffect(() => {
    const handleResize = (): void => {
      adjustTextSize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustTextSize]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      const newValue = e.target.value;
      if (newValue.length <= 50) {
        onCellChange(index, newValue);
        requestAnimationFrame(adjustTextSize);
      }
    },
    [index, onCellChange, adjustTextSize]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (isComposing) return;

      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') {
        e.preventDefault();
        e.currentTarget.blur();
        setIsFocused(false);
        onEditEnd(index);
      }
    },
    [index, onEditEnd, isComposing]
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setTimeout(() => {
      if (isEditing) {
        onEditEnd(index);
      }
    }, 100);
  }, [isEditing, index, onEditEnd]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  const cellClasses = cn(
    "relative aspect-square rounded-lg",
    "bg-[#1a1f2e]",
    "shadow-[0_2px_4px_rgba(0,0,0,0.1)]",
    "border border-[#00b4d8]/40",
    "before:absolute before:inset-0 before:rounded-lg",
    "before:shadow-[inset_0_0_12px_rgba(0,180,216,0.1)]",
    "before:pointer-events-none",
    "transition-all duration-200",
    "hover:scale-[1.02] hover:shadow-lg",
    "hover:shadow-cyan-500/10 hover:border-[#00b4d8]/60",
    "hover:before:shadow-[inset_0_0_16px_rgba(0,180,216,0.15)]",
    {
      'border-[#4cc9f0] shadow-[0_0_12px_rgba(76,201,240,0.2)]': cell.colors.length > 0,
      'border-gray-600/20 opacity-50 cursor-not-allowed': cell.blocked,
      'border-cyan-500/60 ring-2 ring-cyan-400/30': isFocused || isEditing,
      'ring-2 ring-[#4cc9f0] shadow-lg': isPartOfWinningLine,
      'border-red-500/40': cellType === 'pvp',
      'border-green-500/40': cellType === 'pve',
      'border-blue-500/40': cellType === 'quest',
      'border-purple-500/40': cellType === 'achievement',
    }
  );

  const isEmpty = !cell.text.trim();

  // Optimierte Container-Klassen
  const textContainerClasses = cn(
    'w-full h-full',
    'relative',
    'transition-all duration-300 ease-out',
    'flex items-center justify-center',
    cell.colors.length > 0 ? 'text-white/90' : 'text-white/80'
  );

  // Optimierte Textarea-Klassen
  const textareaClasses = cn(
    'w-full h-full',
    'bg-transparent border-none',
    'font-semibold focus:ring-0 focus:outline-none',
    'transition-all duration-300 ease-out',
    'text-center',
    'px-2 py-1',
    'resize-none overflow-hidden',
    isEditing ? 'opacity-90' : 'opacity-100',
    !isEditing && 'pointer-events-none',
    cell.colors.length > 0 && 'font-bold'
  );

  const CompletedIndicator = () => (
    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#4cc9f0] shadow-lg
      flex items-center justify-center transform translate-x-1/4 -translate-y-1/4">
      <Check className="w-3 h-3 text-white" />
    </div>
  );

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className={cellClasses} onClick={handleCellClick}>
      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-700/50">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-[#4cc9f0] 
              transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className={textContainerClasses} style={{ minHeight: '100%' }}>
        {isEmpty && !isEditing && isOwner && !isGameStarted ? (
          <div className="text-white/50 text-sm font-medium flex items-center justify-center h-full">
            Click to add task...
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={cell.text}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            className={textareaClasses}
            style={{
              ...typography,
              textShadow: cell.colors.length > 0 
                ? '0 1px 2px rgba(0,0,0,0.5)'
                : 'none',
              resize: 'none',
              overflow: 'hidden',
              willChange: 'transform',
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
            }}
            readOnly={!isOwner || winner !== null || !isEditing}
            maxLength={50}
            spellCheck={false}
          />
        )}
      </div>

      {/* Completed Indicator */}
      {cell.colors.length > 0 && <CompletedIndicator />}

      {/* Type Indicator */}
      {cellType && (
        <div className={cn(
          'absolute top-2 left-2 w-2 h-2 rounded-full',
          'ring-1 ring-white/20 shadow-sm',
          {
            'bg-red-500': cellType === 'pvp',
            'bg-green-500': cellType === 'pve',
            'bg-blue-500': cellType === 'quest',
            'bg-purple-500': cellType === 'achievement',
          }
        )} />
      )}

      {/* Difficulty Badge */}
      {cell.difficulty && cell.difficulty !== 'normal' && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full 
          text-[10px] font-medium bg-white/10 text-white/90">
          {cell.difficulty}
        </div>
      )}

      {/* Edit Controls */}
      <AnimatePresence mode="wait">
        {isEditing && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute bottom-2 right-2 p-1.5 rounded-full
              bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg
              transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              setIsFocused(false);
              onEditEnd(index);
            }}
          >
            <Check className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Character Count */}
      {isEditing && (
        <div className={cn(
          "absolute top-2 right-2 px-1.5 py-0.5 rounded-full",
          "text-[10px] font-medium backdrop-blur-sm",
          cell.text.length >= 50 
            ? "bg-red-500/20 text-red-300" 
            : "bg-white/10 text-white/70"
        )}>
          {cell.text.length}/50
        </div>
      )}

      {!isEditing && cell.text.length > 30 && (
        <div className="absolute inset-0 group">
          <div className="opacity-0 group-hover:opacity-100 
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
            px-2 py-1 bg-gray-900 rounded text-xs text-white/90
            transition-opacity duration-200 whitespace-normal max-w-[200px]
            pointer-events-none">
            {cell.text}
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function für bessere Memoization
  return (
    prevProps.cell === nextProps.cell &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.winner === nextProps.winner &&
    prevProps.currentPlayer === nextProps.currentPlayer &&
    prevProps.isGameStarted === nextProps.isGameStarted
  )
});

BingoCell.displayName = 'BingoCell'
