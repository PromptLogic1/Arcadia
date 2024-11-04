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
}

const FONT_SIZES = {
  min: 12,
  max: 20,
} as const;

const MAX_CHARS = 120;

export const BingoCell: React.FC<BingoCellProps> = ({
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
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [fontSize, setFontSize] = useState<number>(FONT_SIZES.max);

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
      }
    },
    [index, onCellChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onEditEnd(index);
      }
    },
    [index, onEditEnd]
  );

  const textShadow =
    cell.colors.length > 0 ? '0 2px 4px rgba(0,0,0,0.8)' : '0 1px 2px rgba(0,0,0,0.5)';

  const cellClasses = cn(
    'relative aspect-square rounded-md border border-cyan-500/20 bg-gray-800/80',
    'overflow-hidden transition-all duration-300 ease-in-out',
    'hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/40',
    isEditing && 'ring-2 ring-cyan-500',
    cell.blocked && 'opacity-50 cursor-not-allowed',
    cell.difficulty === 'hard' && 'border-yellow-500/50',
    cell.difficulty === 'extreme' && 'border-red-500/50'
  );

  return (
    <div className={cellClasses} onClick={handleCellClick}>
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
        isEditing={isEditing}
        winner={winner}
        isGameStarted={isGameStarted}
        onTextClick={handleTextClick}
      >
        <textarea
          ref={textareaRef}
          value={cell.text}
          onChange={handleTextChange}
          onBlur={() => isEditing && onEditEnd(index)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full text-center bg-transparent border-none text-white resize-none overflow-hidden font-medium focus:ring-0 focus:outline-none transition-all duration-200 absolute top-1/2 -translate-y-1/2',
            isEditing ? 'opacity-90' : 'opacity-100',
            !isEditing && 'pointer-events-none',
            cell.colors.length > 0 && 'text-shadow-lg'
          )}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: '1.2',
            height: 'auto',
            textShadow,
          }}
          readOnly={!isOwner || winner !== null || !isEditing}
          maxLength={MAX_CHARS}
          placeholder={isOwner ? 'Click to add task...' : ''}
          spellCheck={false}
        />
      </TextContainer>

      {/* Edit Controls */}
      <AnimatePresence>
        {isEditing && (
          <EditControls
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEditEnd(index);
            }}
          />
        )}
      </AnimatePresence>

      {/* Character Count */}
      {isEditing && <CharacterCount length={cell.text.length} max={MAX_CHARS} />}
    </div>
  );
};

interface DifficultyIndicatorProps {
  difficulty: string;
}

const DifficultyIndicator: React.FC<DifficultyIndicatorProps> = ({ difficulty }) => (
  <div
    className={cn(
      'absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full',
      difficulty === 'hard' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
    )}
  >
    {difficulty}
  </div>
);

interface RewardIndicatorProps {
  reward: string;
}

const RewardIndicator: React.FC<RewardIndicatorProps> = ({ reward }) => (
  <div className="absolute top-1 right-1 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">
    {reward}
  </div>
);

const BlockedOverlay: React.FC = () => (
  <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px] flex items-center justify-center">
    <div className="text-xs text-gray-400">Blocked</div>
  </div>
);

interface ColorLayersProps {
  colors: string[];
}

const ColorLayers: React.FC<ColorLayersProps> = ({ colors }) => (
  <div className="absolute inset-0 flex">
    {colors.map((color, index) => (
      <div
        key={`${color}-${index}`}
        className={cn('flex-1', color, 'transition-opacity duration-200 ease-in-out opacity-80')}
      />
    ))}
  </div>
);

interface TextContainerProps {
  isOwner: boolean;
  isEditing: boolean;
  winner: number | null;
  isGameStarted: boolean;
  onTextClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

const TextContainer: React.FC<TextContainerProps> = ({
  isOwner,
  isEditing,
  winner,
  isGameStarted,
  onTextClick,
  children,
}) => (
  <div
    className={cn(
      'absolute inset-0 flex items-center justify-center',
      isOwner && !isGameStarted && 'group',
      isOwner && !isGameStarted && !winner && 'cursor-text'
    )}
    onClick={onTextClick}
  >
    <div
      className={cn(
        'relative flex items-center justify-center w-full h-full px-2',
        isOwner && !isGameStarted && !isEditing && 'group-hover:bg-cyan-500/10 rounded-md transition-colors'
      )}
    >
      <div className="relative w-full flex items-center justify-center">{children}</div>
    </div>
  </div>
);

interface EditControlsProps {
  onClick: (e: React.MouseEvent) => void;
}

const EditControls: React.FC<EditControlsProps> = ({ onClick }) => (
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
);

interface CharacterCountProps {
  length: number;
  max: number;
}

const CharacterCount: React.FC<CharacterCountProps> = ({ length, max }) => (
  <div className="absolute top-1.5 right-1.5 text-[10px] text-cyan-300/70 bg-gray-900/50 px-1.5 py-0.5 rounded-full">
    {length}/{max}
  </div>
);
