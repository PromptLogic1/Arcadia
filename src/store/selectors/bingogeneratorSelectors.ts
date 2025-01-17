import { RootState } from '../store'

export const selectCardsForSelection = (state: RootState) => state.bingogenerator.cardsforselection
export const selectSelectedCards = (state: RootState) => state.bingogenerator.selectedCards
export const selectIsLoading = (state: RootState) => state.bingogenerator.isLoading
export const selectError = (state: RootState) => state.bingogenerator.error
