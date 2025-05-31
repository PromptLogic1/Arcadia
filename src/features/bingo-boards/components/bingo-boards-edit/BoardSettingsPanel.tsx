import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DIFFICULTIES } from '@/types';
import { FORM_LIMITS } from './constants';
import type { Difficulty } from '@/types';

interface FormData {
  board_title: string;
  board_description: string;
  board_tags: string[];
  board_difficulty: Difficulty;
  is_public: boolean;
}

interface FieldErrors {
  title?: string;
  description?: string;
  tags?: string;
}

interface BoardSettingsPanelProps {
  formData: FormData;
  fieldErrors: FieldErrors;
  onUpdateField: <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => void;
  onFormDataChange: (
    updater: (prev: FormData | null) => FormData | null
  ) => void;
}

/**
 * Collapsible settings panel for board configuration
 * Handles form fields for title, description, tags, difficulty, and visibility
 */
export function BoardSettingsPanel({
  formData,
  fieldErrors,
  onUpdateField,
  onFormDataChange,
}: BoardSettingsPanelProps) {
  return (
    <Collapsible className="mb-4">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between rounded-lg border border-cyan-500/50 bg-gray-800/50 p-2 shadow-md transition-colors hover:bg-gray-800/70"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-cyan-400" />
            <span className="text-lg font-semibold text-cyan-400">
              Board Settings
            </span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-4 rounded-lg bg-gray-800/30 p-4">
        {/* Title Field */}
        <div className="space-y-2 pr-4">
          <Label htmlFor="board_title">
            Title
            <span className="ml-2 text-xs text-gray-400">
              ({formData?.board_title?.length || 0}/
              {FORM_LIMITS.TITLE_MAX_LENGTH})
            </span>
          </Label>
          <Input
            id="board_title"
            value={formData.board_title}
            onChange={e => onUpdateField('board_title', e.target.value)}
            className={cn(
              'bg-gray-800/50',
              fieldErrors.title
                ? 'border-red-500/50 focus:border-red-500/70'
                : 'border-cyan-500/50'
            )}
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.title}</p>
          )}
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Description
            <span className="ml-2 text-xs text-gray-400">
              ({formData?.board_description?.length || 0}/
              {FORM_LIMITS.DESCRIPTION_MAX_LENGTH})
            </span>
          </Label>
          <Textarea
            id="board_description"
            value={formData.board_description}
            onChange={e => onUpdateField('board_description', e.target.value)}
            placeholder="Enter board description"
            className="min-h-[100px] border-cyan-500/20 bg-gray-800/50 break-words"
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-400">
              {fieldErrors.description}
            </p>
          )}
        </div>

        {/* Tags Field */}
        <div className="space-y-2">
          <Label htmlFor="board_tags">
            Tags
            <span className="ml-2 text-xs text-gray-400">
              ({formData?.board_tags?.length || 0}/{FORM_LIMITS.TAGS_MAX_COUNT})
            </span>
          </Label>
          <Input
            id="board_tags"
            value={formData.board_tags.join(', ')}
            onChange={e =>
              onUpdateField(
                'board_tags',
                e.target.value.split(',').map(tag => tag.trim())
              )
            }
            className={cn(
              'bg-gray-800/50',
              fieldErrors.tags
                ? 'border-red-500/50 focus:border-red-500/70'
                : 'border-cyan-500/50'
            )}
            placeholder="Enter tags separated by commas"
          />
          {fieldErrors.tags && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.tags}</p>
          )}
        </div>

        {/* Difficulty Select */}
        <div className="space-y-2">
          <Label htmlFor="board_difficulty">Difficulty</Label>
          <Select
            value={formData.board_difficulty}
            onValueChange={(value: Difficulty) =>
              onFormDataChange((prev: FormData | null) =>
                prev ? { ...prev, board_difficulty: value } : null
              )
            }
          >
            <SelectTrigger className="border-cyan-500/50 bg-gray-800/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-cyan-500 bg-gray-800">
              {DIFFICULTIES.map(difficulty => (
                <SelectItem
                  key={difficulty}
                  value={difficulty}
                  className="capitalize"
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Public Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_public"
            checked={formData.is_public}
            onCheckedChange={checked =>
              onFormDataChange((prev: FormData | null) =>
                prev ? { ...prev, is_public: checked as boolean } : null
              )
            }
          />
          <Label htmlFor="is_public">Make this board public</Label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
