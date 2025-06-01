import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Sparkles, 
  Package, 
  Globe, 
  Search,
  Filter,
  RefreshCw,
  Archive,
  Wand2,
} from 'lucide-react';

// Components
import { BingoCardPreview, CreateCardPlaceholder } from './BingoCard';
import { BingoCardPublic } from './BingoCardPublic';
import { FilterBingoCards } from './FilterBingoCards';
import { GeneratorPanel } from '../Generator/GeneratorPanel';
import { TemplateSelector } from './TemplateSelector';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Design System
import { 
  typography,
  animations,
  buttonVariants,
  cardVariants,
} from './design-system';

// Types
import { TABS } from './constants';
import type { BingoCard, FilterOptions, GameCategory } from '@/types';
import type { TemplateCard } from '../../data/templates';
import { useDroppable } from '@dnd-kit/core';

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
}

/**
 * Redesigned Card Management Tabs
 * Optimized for better space usage and cleaner UI
 */
export function CardManagementTabsRedesigned({
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
}: CardManagementTabsProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilters, setActiveFilters] = React.useState<FilterOptions>({});

  // Filter cards based on search
  const filteredPrivateCards = privateCards.filter(card =>
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPublicCards = publicCards.filter(card =>
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <h3 className={cn(typography.heading.h4, "text-gray-100 mb-3")}>
          Card Library
        </h3>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards..."
            className="pl-10 bg-gray-800/50 border-gray-700 focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue={TABS.TEMPLATES}
        className="flex-1 flex flex-col"
        onValueChange={onTabChange}
      >
        <TabsList className="w-full justify-start px-4 bg-transparent border-b border-gray-700/50 rounded-none">
          <TabsTrigger
            value={TABS.TEMPLATES}
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value={TABS.PRIVATE}
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none"
          >
            <Package className="w-4 h-4 mr-1.5" />
            Private
            {privateCards.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {privateCards.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value={TABS.PUBLIC}
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none"
          >
            <Globe className="w-4 h-4 mr-1.5" />
            Public
          </TabsTrigger>
          <TabsTrigger
            value={TABS.GENERATOR}
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none"
          >
            <Wand2 className="w-4 h-4 mr-1.5" />
            AI Generate
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden">
          {/* Templates Tab */}
          <TabsContent value={TABS.TEMPLATES} className="h-full p-4">
            <ScrollArea className="h-full">
              <TemplateSelector
                gameType={currentBoard.game_type}
                onApplyTemplate={onApplyTemplate!}
                onRegenerateGrid={onRegenerateGrid!}
                currentTemplateCount={currentTemplateCount}
              />
            </ScrollArea>
          </TabsContent>

          {/* Private Cards Tab */}
          <TabsContent value={TABS.PRIVATE} className="h-full p-0">
            <PrivateCardsSection
              cards={filteredPrivateCards}
              isLoading={isLoadingPrivateCards}
              onCardSelect={onCardSelect}
              onCardEdit={onCardEdit}
              onCreateNewCard={onCreateNewCard}
            />
          </TabsContent>

          {/* Public Cards Tab */}
          <TabsContent value={TABS.PUBLIC} className="h-full p-0">
            <PublicCardsSection
              cards={filteredPublicCards}
              isLoading={isLoadingPublicCards}
              onCardSelect={onCardSelect}
              onVoteCard={onVoteCard}
              onFilter={onFilterPublicCards}
              onClearFilters={onClearPublicFilters}
            />
          </TabsContent>

          {/* Generator Tab */}
          <TabsContent value={TABS.GENERATOR} className="h-full p-4">
            <ScrollArea className="h-full">
              <GeneratorPanel
                gameCategory={currentBoard.game_type}
                gridSize={currentBoard.size}
              />
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Private Cards Section
function PrivateCardsSection({
  cards,
  isLoading,
  onCardSelect,
  onCardEdit,
  onCreateNewCard,
}: {
  cards: BingoCard[];
  isLoading: boolean;
  onCardSelect: (card: BingoCard) => void;
  onCardEdit: (card: BingoCard, index: number) => void;
  onCreateNewCard: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'private-cards-drop-zone',
  });

  return (
    <div className="h-full flex flex-col">
      {/* Create New Card Button */}
      <div className="p-4 border-b border-gray-700/50">
        <Button
          onClick={onCreateNewCard}
          className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'w-full')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Card
        </Button>
      </div>

      {/* Cards List */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-hidden",
          isOver && "bg-purple-500/10"
        )}
      >
        <ScrollArea className="h-full p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                <Archive className="w-10 h-10 text-gray-600" />
              </div>
              <p className={cn(typography.body.normal, "text-gray-400 mb-2")}>
                No private cards yet
              </p>
              <p className={cn(typography.caption, "text-gray-500")}>
                Create custom cards or drag from the grid
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map((card, idx) => (
                <BingoCardPreview
                  key={`private-${card.id || idx}`}
                  card={card}
                  onSelect={onCardSelect}
                  onEdit={(card) => {
                    const index = cards.findIndex(c => c.id === card.id);
                    if (index !== -1) onCardEdit(card, index);
                  }}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

// Public Cards Section
function PublicCardsSection({
  cards,
  isLoading,
  onCardSelect,
  onVoteCard,
  onFilter,
  onClearFilters,
}: {
  cards: BingoCard[];
  isLoading: boolean;
  onCardSelect: (card: BingoCard) => void;
  onVoteCard: (card: BingoCard) => Promise<void>;
  onFilter: (filters: FilterOptions) => Promise<void>;
  onClearFilters: () => Promise<void>;
}) {
  const [showFilters, setShowFilters] = React.useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Filter Controls */}
      <div className="p-4 border-b border-gray-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearFilters}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        {showFilters && (
          <FilterBingoCards
            onFilter={onFilter}
            onClear={onClearFilters}
          />
        )}
      </div>

      {/* Cards List */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
              <Globe className="w-10 h-10 text-gray-600" />
            </div>
            <p className={cn(typography.body.normal, "text-gray-400 mb-2")}>
              No public cards available
            </p>
            <p className={cn(typography.caption, "text-gray-500")}>
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cards.map((card, idx) => (
              <BingoCardPublic
                key={`public-${card.id || idx}`}
                card={card}
                onSelect={onCardSelect}
                onVote={onVoteCard}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

