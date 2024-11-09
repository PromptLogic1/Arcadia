import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, Shield, Trophy } from 'lucide-react';
import type { BoardCell } from '../shared/types';
import { cn } from '@/lib/utils';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";

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
  isPartOfWinningLine?: boolean;
  cellType?: 'pvp' | 'pve' | 'quest' | 'achievement';
}

const FONT_SIZES = {
  min: 12,
  max: 20,
} as const;

const MAX_CHARS = 120;

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
  isPartOfWinningLine,
  cellType,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [fontSize, setFontSize] = useState<number>(FONT_SIZES.max);
  const [isComposing, setIsComposing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleRewardUnlock = useCallback(() => {
    // Implement reward unlock logic
  }, []);

  const isEmpty = !cell.text || cell.text.trim() === '';

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
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const container = textarea.parentElement;
    if (!container) return;

    // Reset to default state
    textarea.style.fontSize = `${FONT_SIZES.max}px`;
    textarea.style.marginTop = '0';

    let currentSize = FONT_SIZES.max;

    // Adjust font size to fit
    while (
      (textarea.scrollHeight > container.clientHeight ||
        textarea.scrollWidth > container.clientWidth) &&
      currentSize > FONT_SIZES.min
    ) {
      currentSize -= 0.5;
      textarea.style.fontSize = `${currentSize}px`;
    }

    // Adjust vertical position if still overflowing
    if (textarea.scrollHeight > container.clientHeight) {
      const overflow = textarea.scrollHeight - container.clientHeight;
      const shift = Math.min(overflow / 2, container.clientHeight / 4);
      textarea.style.marginTop = `-${shift}px`;
    }

    setFontSize(currentSize);
  }, []);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
    adjustTextSize();
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
      onCellChange(index, newValue);
      requestAnimationFrame(adjustTextSize);
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

  const textShadow =
    cell.colors.length > 0 ? '0 2px 4px rgba(0,0,0,0.8)' : '0 1px 2px rgba(0,0,0,0.5)';

  return (
    <motion.div
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden",
        "transition-all duration-300",
        "group cursor-pointer",
        {
          'bg-gradient-to-br from-gray-800/95 to-gray-800/75': !cell.colors.length,
          'shadow-lg': isHovered || isEditing,
          'scale-[0.98]': isEditing,
        }
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleCellClick}
      whileHover={{ scale: isEditing ? 0.98 : 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Border Glow Effect */}
      <div className={cn(
        "absolute inset-0 border-2 transition-all duration-300",
        isPartOfWinningLine
          ? "border-cyan-500 shadow-lg shadow-cyan-500/20"
          : cell.blocked
          ? "border-red-500/30"
          : isEditing || isFocused
          ? "border-cyan-500/50"
          : "border-cyan-500/20 group-hover:border-cyan-500/40",
      )} />

      {/* Cell Type Indicator */}
      {cellType && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "absolute top-2 left-2 w-2 h-2 rounded-full",
                {
                  'bg-red-500': cellType === 'pvp',
                  'bg-green-500': cellType === 'pve',
                  'bg-blue-500': cellType === 'quest',
                  'bg-purple-500': cellType === 'achievement',
                }
              )} />
            </TooltipTrigger>
            <TooltipContent>
              {cellType === 'pvp' && 'PvP Challenge'}
              {cellType === 'pve' && 'PvE Challenge'}
              {cellType === 'quest' && 'Quest Challenge'}
              {cellType === 'achievement' && 'Achievement Challenge'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Difficulty Badge */}
      {cell.difficulty && cell.difficulty !== 'normal' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "absolute top-2 right-2 p-1.5 rounded-full",
                "bg-gray-900/50 backdrop-blur-sm",
                "transition-all duration-300",
                {
                  'text-yellow-400 border border-yellow-500/20': cell.difficulty === 'hard',
                  'text-red-400 border border-red-500/20': cell.difficulty === 'extreme',
                }
              )}>
                {cell.difficulty === 'hard' ? (
                  <Star className="h-3 w-3" />
                ) : (
                  <Trophy className="h-3 w-3" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {cell.difficulty.charAt(0).toUpperCase() + cell.difficulty.slice(1)} Difficulty
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Reward Badge */}
      {cell.reward === 'block' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute bottom-2 right-2 p-1.5 rounded-full
                bg-purple-500/20 border border-purple-500/30
                transition-all duration-300">
                <Shield className="h-3 w-3 text-purple-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Earn a block ability</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Color Layers with Animation */}
      <AnimatePresence>
        {cell.colors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex"
          >
            {cell.colors.map((color, index) => (
              <motion.div
                key={`${color}-${index}`}
                className={cn(
                  'flex-1',
                  color,
                  'transition-opacity duration-300',
                  'opacity-80 group-hover:opacity-90'
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Content */}
      <div className="absolute inset-0 p-3 flex items-center justify-center">
        {isEmpty && !isEditing && isOwner && !isGameStarted ? (
          <div className="text-gray-500 text-sm text-center px-2 cursor-text">
            Click to add task...
          </div>
        ) : (
          <div className="relative w-full">
            <textarea
              ref={textareaRef}
              value={cell.text}
              onChange={handleTextChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              maxLength={MAX_CHARS}
              className={cn(
                'w-full text-center bg-transparent border-none text-white resize-none',
                'overflow-hidden font-medium focus:ring-0 focus:outline-none',
                'transition-opacity duration-200',
                'absolute top-1/2 -translate-y-1/2',
                isEditing ? 'opacity-90' : 'opacity-100',
                !isEditing && 'pointer-events-none',
                cell.colors.length > 0 && 'text-shadow-lg',
                !isEditing && !isEmpty && isOwner && !isGameStarted && 'cursor-pointer'
              )}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: '1.2',
                height: 'auto',
                textShadow,
              }}
              readOnly={!isOwner || winner !== null || !isEditing}
              spellCheck={false}
            />
            {!isEditing && !isEmpty && isOwner && !isGameStarted && (
              <div 
                className="absolute inset-0 flex items-center justify-center opacity-0 
                  group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <div className="bg-cyan-500/20 rounded-full p-1">
                  <Check className="h-3 w-3 text-cyan-400" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Controls */}
      <AnimatePresence>
        {isEditing && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-2 right-2 bg-cyan-500 hover:bg-cyan-400
              rounded-full p-1.5 shadow-lg transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation()
              textareaRef.current?.blur()
              setIsFocused(false)
              onEditEnd(index)
            }}
          >
            <Check className="h-3 w-3 text-gray-900" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Character Count */}
      {isEditing && (
        <div className="absolute top-2 right-2 text-[10px] text-cyan-300/70
          bg-gray-900/50 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
          {cell.text.length}/{MAX_CHARS}
        </div>
      )}
    </motion.div>
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
