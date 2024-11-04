import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { BoardCell } from '../shared/types';
import { cn } from '@/lib/utils';

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
  progress = 0,
  cellType,
  isPartOfWinningLine,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [fontSize, setFontSize] = useState<number>(FONT_SIZES.max);
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
        !cell.completedBy?.includes(cell.colors[currentPlayer])
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

  const handleTextClick = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation();
      if (!isEditing && isOwner && !isGameStarted) {
        onEditStart(index);
      }
    },
    [isEditing, isOwner, isGameStarted, index, onEditStart]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      const newValue = e.target.value;
      if (newValue.length <= MAX_CHARS) {
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

  const textShadow =
    cell.colors.length > 0 ? '0 2px 4px rgba(0,0,0,0.8)' : '0 1px 2px rgba(0,0,0,0.5)';

  const cellClasses = cn(
    'relative aspect-square rounded-md border bg-gray-800/80',
    'overflow-hidden',
    'transition-[border-color] duration-200',
    {
      'border-cyan-500/20': !cell.blocked,
      'border-gray-600/20': cell.blocked,
      'border-cyan-500/40': isFocused || isEditing,
      'ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/20': isPartOfWinningLine,
      'border-red-500/30': cellType === 'pvp',
      'border-green-500/30': cellType === 'pve',
      'border-blue-500/30': cellType === 'quest',
      'border-purple-500/30': cellType === 'achievement',
      'opacity-50 cursor-not-allowed': cell.blocked,
    }
  );

  const isEmpty = !cell.text.trim();

  return (
    <div className={cellClasses} onClick={handleCellClick}>
      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-700">
          <div 
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Completion Animation */}
      <AnimatePresence>
        {cell.colors.length > 0 && (
          <motion.div
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cell Type Indicator */}
      {cellType && (
        <div className={cn(
          'absolute top-1 left-1 w-2 h-2 rounded-full',
          {
            'bg-red-500': cellType === 'pvp',
            'bg-green-500': cellType === 'pve',
            'bg-blue-500': cellType === 'quest',
            'bg-purple-500': cellType === 'achievement',
          }
        )} />
      )}

      {/* Difficulty Indicator */}
      {cell.difficulty && cell.difficulty !== 'normal' && (
        <DifficultyIndicator difficulty={cell.difficulty} />
      )}

      {/* Reward Indicator */}
      {cell.reward === 'block' && <RewardIndicator reward={cell.reward} />}

      {/* Blocked Overlay */}
      {cell.blocked && <BlockedOverlay />}

      {/* Color Layers */}
      {cell.colors.length > 0 && <ColorLayers colors={cell.colors} />}

      {/* Text Container */}
      <TextContainer
        isOwner={isOwner}
        winner={winner}
        isGameStarted={isGameStarted}
        onTextClick={handleTextClick}
      >
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
              maxLength={MAX_CHARS}
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
      </TextContainer>

      {/* Edit Controls */}
      <AnimatePresence mode="wait">
        {isEditing && (
          <EditControls
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              textareaRef.current?.blur();
              setIsFocused(false);
              onEditEnd(index);
            }}
          />
        )}
      </AnimatePresence>

      {/* Character Count */}
      {isEditing && <CharacterCount length={cell.text.length} max={MAX_CHARS} />}
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

interface DifficultyIndicatorProps {
  difficulty: string;
}

const DifficultyIndicator = React.memo<DifficultyIndicatorProps>(({ difficulty }) => (
  <div
    className={cn(
      'absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full',
      difficulty === 'hard' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
    )}
  >
    {difficulty}
  </div>
));

DifficultyIndicator.displayName = 'DifficultyIndicator'

interface RewardIndicatorProps {
  reward: string;
}

const RewardIndicator = React.memo<RewardIndicatorProps>(({ reward }) => (
  <div className="absolute top-1 right-1 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">
    {reward}
  </div>
));

RewardIndicator.displayName = 'RewardIndicator'

const BlockedOverlay = React.memo(() => (
  <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px] flex items-center justify-center">
    <div className="text-xs text-gray-400">Blocked</div>
  </div>
));

BlockedOverlay.displayName = 'BlockedOverlay'

interface ColorLayersProps {
  colors: string[];
}

const ColorLayers = React.memo<ColorLayersProps>(({ colors }) => (
  <div className="absolute inset-0 flex">
    {colors.map((color, index) => (
      <div
        key={`${color}-${index}`}
        className={cn('flex-1', color, 'transition-opacity duration-200 ease-in-out opacity-80')}
      />
    ))}
  </div>
));

ColorLayers.displayName = 'ColorLayers'

interface TextContainerProps {
  isOwner: boolean;
  winner: number | null;
  isGameStarted: boolean;
  onTextClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

const TextContainer = React.memo<TextContainerProps>(({
  isOwner,
  winner,
  isGameStarted,
  onTextClick,
  children,
}) => (
  <div
    className={cn(
      'absolute inset-0 flex items-center justify-center',
      isOwner && !isGameStarted && !winner && 'cursor-text'
    )}
    onClick={onTextClick}
  >
    <div className="relative w-full h-full flex items-center justify-center">
      {children}
    </div>
  </div>
));

TextContainer.displayName = 'TextContainer'

interface EditControlsProps {
  onClick: (e: React.MouseEvent) => void;
}

const EditControls = React.memo<EditControlsProps>(({ onClick }) => (
  <motion.button
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0, opacity: 0 }}
    transition={{ duration: 0.2 }}
    className={cn(
      'absolute bottom-1.5 right-1.5 bg-cyan-500 hover:bg-cyan-400 rounded-full p-1.5 shadow-lg transition-colors duration-200'
    )}
    onClick={onClick}
  >
    <Check className="h-3 w-3 text-gray-900" />
  </motion.button>
));

EditControls.displayName = 'EditControls'

interface CharacterCountProps {
  length: number;
  max: number;
}

const CharacterCount = React.memo<CharacterCountProps>(({ length, max }) => (
  <div className="absolute top-1.5 right-1.5 text-[10px] text-cyan-300/70 bg-gray-900/50 px-1.5 py-0.5 rounded-full">
    {length}/{max}
  </div>
));

CharacterCount.displayName = 'CharacterCount'
