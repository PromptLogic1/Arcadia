import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NeonText } from '@/components/ui/NeonText';
import { cn } from '@/lib/utils';
import { STYLES, UI_MESSAGES } from './constants';
import type { BingoBoard } from '@/types';

interface BoardHeaderProps {
  board: BingoBoard;
  title: string;
  isSaving: boolean;
  hasErrors: boolean;
  onClose: () => void;
  onSave: () => void;
}

/**
 * Header component for the board edit page
 * Displays title, game type badge, and action buttons
 */
const BoardHeaderComponent = ({
  board,
  title,
  isSaving,
  hasErrors,
  onClose,
  onSave,
}: BoardHeaderProps) => {
  return (
    <div className="mb-8 flex flex-col space-y-4">
      <div className="flex flex-col">
        <h1
          className={cn(
            'bg-clip-text text-5xl font-bold break-words text-transparent',
            STYLES.GRADIENT_TITLE
          )}
          style={{ wordBreak: 'break-word' }}
        >
          <NeonText>{title}</NeonText>
        </h1>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between">
        <div className="mb-4 flex items-center gap-4">
          <Badge
            variant="secondary"
            className="border-cyan-500/50 bg-gray-800/50 text-cyan-400"
          >
            {board.game_type}
          </Badge>
        </div>

        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={onClose}>
            Back to Boards
          </Button>

          <Button
            onClick={onSave}
            disabled={hasErrors || isSaving}
            className={cn(
              STYLES.GRADIENT_BUTTON,
              (hasErrors || isSaving) && 'cursor-not-allowed opacity-50'
            )}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner />
                {UI_MESSAGES.SAVE.SAVING}
              </div>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Memoized BoardHeader for performance optimization
export const BoardHeader = React.memo(
  BoardHeaderComponent,
  (prevProps, nextProps) => {
    // Custom comparison for performance
    return (
      prevProps.board.id === nextProps.board.id &&
      prevProps.title === nextProps.title &&
      prevProps.isSaving === nextProps.isSaving &&
      prevProps.hasErrors === nextProps.hasErrors &&
      prevProps.board.updated_at === nextProps.board.updated_at
    );
  }
);

BoardHeader.displayName = 'BoardHeader';
