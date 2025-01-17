import { useSelector, useDispatch } from 'react-redux'
import { useCallback } from 'react'
import { 
  selectCardsForSelection, 
  selectSelectedCards, 
  selectIsLoading, 
  selectError 
} from '@/src/store/selectors/bingogeneratorSelectors'
import { 
  clearCardsForSelection, 
  clearSelectedCards 
} from '@/src/store/slices/bingogeneratorSlice'
import { bingoGeneratorService } from '@/src/store/services/bingogenerator-service'

export function useGenerator() {
  const dispatch = useDispatch()
  const cardsForSelection = useSelector(selectCardsForSelection)
  const selectedCards = useSelector(selectSelectedCards)
  const isLoading = useSelector(selectIsLoading)
  const error = useSelector(selectError)

  const clearSelection = useCallback(() => {
    dispatch(clearCardsForSelection())
  }, [dispatch])

  const clearSelected = useCallback(() => {
    dispatch(clearSelectedCards())
  }, [dispatch])

  return {
    cardsForSelection,
    selectedCards,
    isLoading,
    error,
    clearSelection,
    clearSelected
  }
}
