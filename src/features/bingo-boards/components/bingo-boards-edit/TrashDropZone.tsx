import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TrashDropZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: 'trash-drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "fixed bottom-8 right-8 w-24 h-24 rounded-full",
        "bg-red-500/20 border-2 border-dashed border-red-500/50",
        "flex items-center justify-center transition-all duration-200",
        "shadow-lg backdrop-blur-sm",
        isOver && "bg-red-500/40 border-red-500 scale-110 animate-pulse"
      )}
    >
      <Trash2 
        className={cn(
          "w-10 h-10 text-red-600",
          isOver && "text-red-700 animate-bounce"
        )}
      />
    </div>
  );
}