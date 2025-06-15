import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
  Settings,
  ChevronLeft,
  Grid3X3,
  Layers,
  Eye,
  EyeOff,
  Save,
} from '@/components/ui/Icons';

// Design System
import { buttonVariants, typography } from './design-system';

// Types
import type { BingoBoard } from '@/types';

interface BoardEditToolbarProps {
  // Board data
  currentBoard: BingoBoard;
  boardTitle: string;

  // UI state
  activeView: 'grid' | 'list';
  showCardPanel: boolean;
  showSettings: boolean;
  isSaving: boolean;

  // Handlers
  onClose: () => void;
  onViewChange: (view: 'grid' | 'list') => void;
  onToggleCardPanel: () => void;
  onToggleSettings: () => void;
  onSave: () => void;
}

/**
 * Toolbar component for the board editor
 * Contains navigation, title, view toggle, and action buttons
 */
export function BoardEditToolbar({
  currentBoard,
  boardTitle,
  activeView,
  showCardPanel,
  showSettings,
  isSaving,
  onClose,
  onViewChange,
  onToggleCardPanel,
  onToggleSettings,
  onSave,
}: BoardEditToolbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-cyan-500/20 bg-gray-900/90 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Navigation and Title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:text-cyan-400"
              aria-label="Go back to challenge hub"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div>
              <h1 className={cn(typography.heading.h3, 'text-gray-100')}>
                {boardTitle || 'Untitled Board'}
              </h1>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {currentBoard.game_type}
                </Badge>
                <span className={cn(typography.caption, 'text-gray-500')}>
                  {currentBoard.size}x{currentBoard.size} Grid
                </span>
              </div>
            </div>
          </div>

          {/* Center: View Toggle */}
          <div className="hidden items-center gap-2 rounded-lg bg-gray-800/50 p-1 md:flex">
            <Button
              size="sm"
              variant={activeView === 'grid' ? 'primary' : 'ghost'}
              onClick={() => onViewChange('grid')}
              className="gap-2"
              aria-label="Switch to grid view"
            >
              <Grid3X3 className="h-4 w-4" />
              Grid View
            </Button>
            <Button
              size="sm"
              variant={activeView === 'list' ? 'primary' : 'ghost'}
              onClick={() => onViewChange('list')}
              className="gap-2"
              aria-label="Switch to list view"
            >
              <Layers className="h-4 w-4" />
              List View
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleCardPanel}
              className="hidden gap-2 lg:flex"
              aria-label={showCardPanel ? 'Hide card panel' : 'Show card panel'}
            >
              {showCardPanel ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showCardPanel ? 'Hide' : 'Show'} Cards
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleSettings}
              aria-label={showSettings ? 'Hide settings' : 'Show settings'}
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              className={cn(buttonVariants({ variant: 'primary', size: 'sm' }))}
              onClick={onSave}
              disabled={isSaving}
              aria-label={isSaving ? 'Saving board...' : 'Save board'}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Board'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
