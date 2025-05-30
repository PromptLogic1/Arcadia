import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { BingoCardPreview } from './BingoCard';
import { BingoCardPublic } from './BingoCardPublic';
import { FilterBingoCards } from './FilterBingoCards';
import { GeneratorPanel } from '../Generator/GeneratorPanel';
import { TABS, STYLES, BOARD_EDIT_LAYOUT, UI_MESSAGES } from './constants';
import type { BingoCard, FilterOptions, GameCategory } from '@/types';

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
}: CardManagementTabsProps) {
  return (
    <div
      className="flex flex-col"
      style={{
        maxWidth: BOARD_EDIT_LAYOUT.SIDEBAR_WIDTH.MAX,
        minWidth: BOARD_EDIT_LAYOUT.SIDEBAR_WIDTH.MIN,
      }}
    >
      <Tabs
        defaultValue={TABS.PRIVATE}
        className="w-full"
        onValueChange={onTabChange}
      >
        <TabsList className="mb-4 w-full border border-cyan-500/20 bg-gray-800/50">
          <div
            className="flex-start flex w-full"
            style={{ justifyContent: 'space-around' }}
          >
            <TabsTrigger
              value={TABS.PRIVATE}
              className={cn(...STYLES.TAB_TRIGGER_CLASSES)}
            >
              Private Cards
            </TabsTrigger>
            <TabsTrigger
              value={TABS.PUBLIC}
              className={cn(...STYLES.TAB_TRIGGER_CLASSES)}
            >
              Public Cards
            </TabsTrigger>
            <TabsTrigger
              value={TABS.GENERATOR}
              className={cn(...STYLES.TAB_TRIGGER_CLASSES)}
            >
              Generator
            </TabsTrigger>
          </div>
        </TabsList>

        <PrivateCardsTab
          cards={privateCards}
          isLoading={isLoadingPrivateCards}
          onCardSelect={onCardSelect}
          onCardEdit={onCardEdit}
          onCreateNewCard={onCreateNewCard}
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
}: PrivateCardsTabProps) {
  return (
    <TabsContent value={TABS.PRIVATE} className="mt-2">
      <div className="mb-3 flex items-center">
        <Button
          onClick={onCreateNewCard}
          size="sm"
          className={cn('w-full', STYLES.GRADIENT_BUTTON)}
        >
          <Plus className="mr-1 h-4 w-4" />
          New Card
        </Button>
      </div>

      <ScrollArea className="min-h-[calc(100vh-12rem)]">
        <div className="space-y-2 pr-3">
          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div>
              {cards.map(card => (
                <BingoCardPreview
                  key={card.id}
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
      </ScrollArea>
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

      <ScrollArea className="min-h-[calc(100vh-12rem)]">
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
              {cards.map((card: BingoCard) => (
                <BingoCardPublic
                  key={card.id}
                  card={card}
                  onSelect={onCardSelect}
                  onVote={onVoteCard}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  );
}

interface GeneratorTabProps {
  gameCategory: GameCategory;
  gridSize: number;
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
