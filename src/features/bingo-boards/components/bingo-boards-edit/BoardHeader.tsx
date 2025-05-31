import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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
export function BoardHeader({
  board,
  title,
  isSaving,
  hasErrors,
  onClose,
  onSave,
}: BoardHeaderProps) {
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
            variant="outline"
            className="border-cyan-500/50 bg-gray-800/50 text-cyan-400"
          >
            {board.game_type}
          </Badge>
        </div>

        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onClose}>
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
}
