'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Tag } from '../../types/tagsystem.types'

interface TagSelectorProps {
  availableTags: Tag[]
  selectedTags: Set<string>
  onTagToggle: (tagId: string) => void
  maxTags?: number
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  availableTags,
  selectedTags,
  onTagToggle,
  maxTags = 10
}) => {
  return (
    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
      <div className="flex flex-wrap gap-2">
        {availableTags.map(tag => (
          <Badge
            key={tag.id}
            variant={selectedTags.has(tag.id) ? "default" : "outline"}
            className={`
              cursor-pointer transition-all
              ${selectedTags.has(tag.id) 
                ? 'bg-cyan-500 hover:bg-cyan-600' 
                : 'hover:border-cyan-500'
              }
              ${selectedTags.size >= maxTags && !selectedTags.has(tag.id)
                ? 'opacity-50 cursor-not-allowed'
                : ''
              }
            `}
            onClick={() => {
              if (selectedTags.size < maxTags || selectedTags.has(tag.id)) {
                onTagToggle(tag.id)
              }
            }}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
    </ScrollArea>
  )
} 