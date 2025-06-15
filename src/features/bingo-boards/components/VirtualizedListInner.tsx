'use client';

import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Tables } from '@/types';

type BingoBoard = Tables<'bingo_boards'>;

interface VirtualizedListInnerProps {
  boards: BingoBoard[];
  children: (board: BingoBoard, index: number) => React.ReactNode;
}

export function VirtualizedListInner({
  boards,
  children,
}: VirtualizedListInnerProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: boards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  // Memoize container styles for better performance
  const containerStyle = useMemo(
    () => ({
      height: `${virtualizer.getTotalSize()}px`,
      width: '100%',
      position: 'relative' as const,
    }),
    [virtualizer]
  );

  const parentStyle = useMemo(
    () => ({
      height: '600px',
    }),
    []
  );

  return (
    <div
      ref={parentRef}
      className="max-h-[600px] overflow-auto contain-layout"
      style={parentStyle}
    >
      <div style={containerStyle}>
        {virtualizer.getVirtualItems().map(virtualItem => {
          const itemStyle = {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualItem.size}px`,
            transform: `translateY(${virtualItem.start}px)`,
          };

          return (
            <div key={virtualItem.key} style={itemStyle}>
              {(() => {
                const board = boards[virtualItem.index];
                return board ? children(board, virtualItem.index) : null;
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
