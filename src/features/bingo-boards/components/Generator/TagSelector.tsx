'use client';

import React, { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tags, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  maxTags = 5,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = useCallback(() => {
    if (!inputValue.trim() || selectedTags.length >= maxTags) return;

    const newTag = inputValue.trim().toLowerCase();
    if (!selectedTags.includes(newTag)) {
      onTagsChange([...selectedTags, newTag]);
    }
    setInputValue('');
  }, [inputValue, selectedTags, maxTags, onTagsChange]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
    },
    [selectedTags, onTagsChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      } else if (
        e.key === 'Backspace' &&
        !inputValue &&
        selectedTags.length > 0
      ) {
        const lastTag = selectedTags[selectedTags.length - 1];
        if (lastTag) {
          handleRemoveTag(lastTag);
        }
      }
    },
    [inputValue, selectedTags, handleAddTag, handleRemoveTag]
  );

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium text-cyan-400">
        <Tags className="h-4 w-4" />
        Tags ({selectedTags.length}/{maxTags})
      </Label>

      <div className="flex min-h-[2.5rem] flex-wrap gap-2 rounded-lg border border-cyan-500/20 bg-gray-800/50 p-2">
        {selectedTags.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className={cn(
              'bg-cyan-500/10 text-cyan-300',
              'hover:bg-cyan-500/20',
              'transition-colors duration-200'
            )}
          >
            {tag}
            <Button
              onClick={() => handleRemoveTag(tag)}
              variant="ghost"
              size="icon"
              className="ml-1 h-4 w-4 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tags..."
          className="flex-1"
          disabled={selectedTags.length >= maxTags}
          aria-label="Add a new tag"
        />
        <Button
          onClick={handleAddTag}
          disabled={!inputValue.trim() || selectedTags.length >= maxTags}
          variant="outline"
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedTags.length >= maxTags && (
        <p className="text-xs text-amber-400">Maximum number of tags reached</p>
      )}
    </div>
  );
};
