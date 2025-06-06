import { useBingoGenerator, useBingoGeneratorActions } from '@/src/lib/stores';

export function useGenerator() {
  const { cardsForSelection, selectedCards } = useBingoGenerator();
  const { clearCardsForSelection, clearSelectedCards } =
    useBingoGeneratorActions();

  return {
    cardsForSelection,
    selectedCards,
    clearSelection: clearCardsForSelection,
    clearSelected: clearSelectedCards,
  };
}
