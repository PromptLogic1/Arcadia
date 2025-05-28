import { useBingoGenerator, useBingoGeneratorActions } from '@/src/lib/stores';

export function useGenerator() {
  const { cardsForSelection, selectedCards, isLoading, error } =
    useBingoGenerator();
  const { clearCardsForSelection, clearSelectedCards } =
    useBingoGeneratorActions();

  return {
    cardsForSelection,
    selectedCards,
    isLoading,
    error,
    clearSelection: clearCardsForSelection,
    clearSelected: clearSelectedCards,
  };
}
