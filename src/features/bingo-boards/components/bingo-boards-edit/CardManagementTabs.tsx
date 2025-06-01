import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Sparkles, Package, Globe } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { BingoCardPreview, CreateCardPlaceholder } from './BingoCard';
import { BingoCardPublic } from './BingoCardPublic';
import { FilterBingoCards } from './FilterBingoCards';
import { GeneratorPanel } from '../Generator/GeneratorPanel';
import { TemplateSelector } from './TemplateSelector';
import { TABS, UI_MESSAGES } from './constants';
import type { BingoCard, FilterOptions, GameCategory } from '@/types';
import type { TemplateCard } from '../../data/templates';
import { useDroppable } from '@dnd-kit/core';
import { Trash2, Archive } from 'lucide-react';
import { 
  layout, 
  componentStyles, 
  typography,
  animations,
  buttonVariants,
  cardVariants,
} from './design-system';

interface CardManagementTabsProps {
  // Data
  privateCards: BingoCard[];
  publicCards: BingoCard[];
  currentBoard: { game_type: GameCategory; size: number };

  // Loading states
  isLoadingPrivateCards: boolean;
  isLoadingPublicCards: boolean;

  // Handlers
  onCardSelect: (card: BingoCard) => void;
  onCardEdit: (card: BingoCard, index: number) => void;
  onCreateNewCard: () => void;
  onTabChange: (value: string) => Promise<void>;
  onFilterPublicCards: (filters: FilterOptions) => Promise<void>;
  onClearPublicFilters: () => Promise<void>;
  onVoteCard: (card: BingoCard) => Promise<void>;
  
  // Template handlers
  onApplyTemplate?: (templates: TemplateCard[]) => void;
  onRegenerateGrid?: () => void;
  currentTemplateCount?: number;
  
  // Drag and drop handlers
  onCardReturnToPrivate?: (card: BingoCard) => void;
}

/**
 * Card management tabs component using compound pattern
 * Handles private cards, public cards, and generator functionality
 */
export function CardManagementTabs({
  privateCards,
  publicCards,
  currentBoard,
  isLoadingPrivateCards,
  isLoadingPublicCards,
  onCardSelect,
  onCardEdit,
  onCreateNewCard,
  onTabChange,
  onFilterPublicCards,
  onClearPublicFilters,
  onVoteCard,
  onApplyTemplate,
  onRegenerateGrid,
  currentTemplateCount = 0,
  onCardReturnToPrivate,
}: CardManagementTabsProps) {
  return (
    <div className={cn(
      "flex flex-col",
      layout.sidebar.width,
      layout.sidebar.minWidth,
      layout.sidebar.maxWidth
    )}>
      <Tabs
        defaultValue="templates"
        className="w-full"
        onValueChange={onTabChange}
      >
        <TabsList className={cn(
          "mb-4 w-full",
          componentStyles.tab.list
        )}>
          <div className="flex w-full justify-around">
            <TabsTrigger
              value="templates"
              className={componentStyles.tab.trigger}
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Templates
            </TabsTrigger>
            <TabsTrigger
              value={TABS.PRIVATE}
              className={componentStyles.tab.trigger}
            >
              <Package className="w-4 h-4 mr-1.5" />
              Private
            </TabsTrigger>
            <TabsTrigger
              value={TABS.PUBLIC}
              className={componentStyles.tab.trigger}
            >
              <Globe className="w-4 h-4 mr-1.5" />
              Public Cards
            </TabsTrigger>
            <TabsTrigger
              value={TABS.GENERATOR}
              className={componentStyles.tab.trigger}
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generator
            </TabsTrigger>
          </div>
        </TabsList>

        <TemplatesTab
          gameType={currentBoard.game_type}
          currentTemplateCount={currentTemplateCount}
          onApplyTemplate={onApplyTemplate}
          onRegenerateGrid={onRegenerateGrid}
        />

        <PrivateCardsTab
          cards={privateCards}
          isLoading={isLoadingPrivateCards}
          onCardSelect={onCardSelect}
          onCardEdit={onCardEdit}
          onCreateNewCard={onCreateNewCard}
          onCardReturnToPrivate={onCardReturnToPrivate}
        />

        <PublicCardsTab
          cards={publicCards}
          isLoading={isLoadingPublicCards}
          onCardSelect={onCardSelect}
          onVoteCard={onVoteCard}
          onFilter={onFilterPublicCards}
          onClearFilters={onClearPublicFilters}
        />

        <GeneratorTab
          gameCategory={currentBoard.game_type}
          gridSize={currentBoard.size}
        />
      </Tabs>
    </div>
  );
}

interface PrivateCardsTabProps {
  cards: BingoCard[];
  isLoading: boolean;
  onCardSelect: (card: BingoCard) => void;
  onCardEdit: (card: BingoCard, index: number) => void;
  onCreateNewCard: () => void;
  onCardReturnToPrivate?: (card: BingoCard) => void;
}

/**
 * Private cards tab content
 */
function PrivateCardsTab({
  cards,
  isLoading,
  onCardSelect,
  onCardEdit,
  onCreateNewCard,
  onCardReturnToPrivate,
}: PrivateCardsTabProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'private-cards-drop-zone',
  });

  return (
    <TabsContent value={TABS.PRIVATE} className="mt-2">
      <div className="mb-3 flex items-center">
        <Button
          onClick={onCreateNewCard}
          className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'w-full')}
        >
          <Plus className="mr-1 h-4 w-4" />
          Create New Card
        </Button>
      </div>

      <div className="min-h-[calc(100vh-12rem)] overflow-y-auto">
        <div 
          ref={setNodeRef}
          className={cn(
            "space-y-2 pr-3 min-h-[200px] transition-all duration-200 rounded-lg p-2",
            isOver && "bg-purple-500/10 border-2 border-dashed border-purple-500/50"
          )}
        >
          {/* Drop zone indicator */}
          {isOver && (
            <div className="flex items-center justify-center py-8 text-purple-300">
              <Archive className="mr-2 h-5 w-5" />
              <span className="text-sm font-medium">Drop card to save to private collection</span>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div>
              {cards.length === 0 && !isOver && (
                <div className={cn(
                  "flex flex-col items-center justify-center py-12",
                  "text-gray-400"
                )}>
                  <div className={cn(
                    "w-16 h-16 rounded-full mb-3",
                    "bg-gray-800/50 flex items-center justify-center"
                  )}>
                    <Archive className="h-8 w-8 opacity-50" />
                  </div>
                  <p className={cn(typography.body.normal, "text-center mb-1")}>
                    No private cards yet
                  </p>
                  <p className={cn(typography.caption, "text-center")}>
                    Create new cards or drag them from the grid
                  </p>
                </div>
              )}
              
              {cards.map((card, idx) => (
                <BingoCardPreview
                  key={`private-${card.id || idx}`}
                  card={card}
                  onSelect={onCardSelect}
                  onEdit={card => {
                    const index = cards.findIndex(c => c.id === card.id);
                    if (index !== -1) onCardEdit(card, index);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}

interface PublicCardsTabProps {
  cards: BingoCard[];
  isLoading: boolean;
  onCardSelect: (card: BingoCard) => void;
  onVoteCard: (card: BingoCard) => Promise<void>;
  onFilter: (filters: FilterOptions) => Promise<void>;
  onClearFilters: () => Promise<void>;
}

/**
 * Public cards tab content with filtering
 */
function PublicCardsTab({
  cards,
  isLoading,
  onCardSelect,
  onVoteCard,
  onFilter,
  onClearFilters,
}: PublicCardsTabProps) {
  return (
    <TabsContent value={TABS.PUBLIC} className="mt-2">
      <FilterBingoCards onFilter={onFilter} onClear={onClearFilters} />

      <div className="min-h-[calc(100vh-12rem)] overflow-y-auto">
        <div className="space-y-2 pr-3">
          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : cards.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-gray-400">
              {UI_MESSAGES.CARDS.NO_PUBLIC_CARDS}
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map((card: BingoCard, idx) => (
                <BingoCardPublic
                  key={`public-${card.id || idx}`}
                  card={card}
                  onSelect={onCardSelect}
                  onVote={onVoteCard}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}

interface GeneratorTabProps {
  gameCategory: GameCategory;
  gridSize: number;
}

/**
 * Templates tab content
 */
interface TemplatesTabProps {
  gameType: GameCategory;
  currentTemplateCount: number;
  onApplyTemplate?: (templates: TemplateCard[]) => void;
  onRegenerateGrid?: () => void;
}

function TemplatesTab({ 
  gameType, 
  currentTemplateCount, 
  onApplyTemplate, 
  onRegenerateGrid 
}: TemplatesTabProps) {
  return (
    <TabsContent value="templates" className="mt-2">
      <TemplateSelector
        gameType={gameType}
        currentTemplateCount={currentTemplateCount}
        onApplyTemplate={onApplyTemplate || (() => {})}
        onRegenerateGrid={onRegenerateGrid || (() => {})}
      />
    </TabsContent>
  );
}

/**
 * Generator tab content
 */
function GeneratorTab({ gameCategory, gridSize }: GeneratorTabProps) {
  return (
    <TabsContent value={TABS.GENERATOR} className="mt-2">
      <GeneratorPanel gameCategory={gameCategory} gridSize={gridSize} />
    </TabsContent>
  );
}
