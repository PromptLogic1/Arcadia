import { useRef, useCallback } from 'react'
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual'

interface UseVirtualListReturn {
  parentRef: React.RefObject<HTMLDivElement>
  virtualizer: Virtualizer<HTMLDivElement, Element>
  scrollToIndex: (index: number) => void
}

export const useVirtualList = <T extends Element>(
  items: T[],
  estimateSize = 200,
  overscan = 5
): UseVirtualListReturn => {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  const scrollToIndex = useCallback((index: number) => {
    virtualizer.scrollToIndex(index, { align: 'center' })
  }, [virtualizer])

  return {
    parentRef,
    virtualizer,
    scrollToIndex,
  }
} 