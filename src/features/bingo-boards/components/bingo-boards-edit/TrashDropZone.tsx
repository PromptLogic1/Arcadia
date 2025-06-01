import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, colors } from './design-system';

export function TrashDropZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: 'trash-drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "fixed bottom-8 right-8 z-50",
        "w-20 h-20 rounded-full",
        "bg-gradient-to-br from-red-900/30 to-red-800/20",
        "border-2 border-dashed border-red-500/50",
        "flex items-center justify-center",
        "shadow-2xl shadow-red-500/10",
        "backdrop-blur-md",
        animations.transition.default,
        isOver && [
          "bg-gradient-to-br from-red-500/40 to-red-600/30",
          "border-red-500 border-solid",
          "scale-110",
          "shadow-red-500/30",
        ].join(' ')
      )}
    >
      <div className={cn(
        "relative flex items-center justify-center",
        animations.transition.default,
        isOver && "animate-bounce"
      )}>
        <div className={cn(
          "absolute inset-0 rounded-full bg-red-500/20",
          isOver && "animate-ping"
        )} />
        <Trash2 
          className={cn(
            "relative w-8 h-8",
            "text-red-400",
            animations.transition.default,
            isOver && "text-red-300 scale-110"
          )}
        />
      </div>
      
      {/* Tooltip */}
      <div className={cn(
        "absolute -top-12 left-1/2 -translate-x-1/2",
        "px-3 py-1.5 rounded-lg",
        "bg-gray-900/90 border border-gray-700/50",
        "text-xs text-gray-300 whitespace-nowrap",
        "opacity-0 pointer-events-none",
        animations.transition.default,
        isOver && "opacity-100"
      )}>
        Release to remove
      </div>
    </div>
  );
}