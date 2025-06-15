import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useState, useCallback } from 'react';
import type { BingoCard, Difficulty } from '@/types';
import { DIFFICULTIES } from '@/types';
import { cn } from '@/lib/utils';

interface BingoCardEditDialogProps {
  card: BingoCard;
  index: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<BingoCard>, index: number) => void;
}

interface CardForm {
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  is_public: boolean;
}

export function BingoCardEditDialog({
  card,
  index,
  isOpen,
  onClose,
  onSave,
}: BingoCardEditDialogProps) {
  const [formData, setFormData] = useState<CardForm>({
    title: card.title,
    description: card.description || '',
    difficulty: card.difficulty,
    tags: card.tags || [],
    is_public: card.is_public || false,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    description?: string;
    tags?: string;
  }>({});
  const [isSaving] = useState(false);

  const isNewCard = card.id === '';
  const buttonText = isNewCard ? 'Create Card' : 'Update Card';

  const validateField = useCallback(
    (field: string, value: string | string[] | boolean): string | null => {
      switch (field) {
        case 'title':
          if (
            typeof value === 'string' &&
            (value.length === 0 || value.length > 50)
          ) {
            return 'Title must be between 1 and 50 characters';
          }
          break;
        case 'description':
          if (typeof value === 'string' && value.length > 255) {
            return 'Description cannot exceed 255 characters';
          }
          break;
        case 'tags':
          if (Array.isArray(value) && value.length > 5) {
            return 'Maximum of 5 tags allowed';
          }
          break;
      }
      return null;
    },
    []
  );

  const updateFormField = useCallback(
    (field: string, value: string | string[] | boolean) => {
      const error = validateField(field, value);

      setFieldErrors(prev => {
        const newErrors = { ...prev };

        if (field === 'title' || field === 'description' || field === 'tags') {
          if (error) {
            newErrors[field] = error;
          } else {
            delete newErrors[field];
          }
        }
        return newErrors;
      });

      setFormData(prev => ({ ...prev, [field]: value }));
    },
    [validateField]
  );

  const handleSave = () => {
    if (!formData) return;

    if (!card.id) {
      onSave(formData, index);
    } else {
      onSave(
        {
          ...formData,
          id: card.id,
        },
        index
      );
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 text-gray-100">
        <DialogHeader>
          <DialogTitle>
            {isNewCard ? 'Create New Card' : 'Edit Card'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title
              <span className="ml-2 text-xs text-gray-400">
                ({formData.title.length}/50)
              </span>
            </Label>
            <Textarea
              id="title"
              value={formData.title}
              onChange={e => updateFormField('title', e.target.value)}
              placeholder="Enter card content"
              className={cn(
                'min-h-[100px] bg-gray-800/50',
                'break-words',
                fieldErrors.title ? 'border-red-500/20' : 'border-cyan-500/20'
              )}
            />
            {fieldErrors.title && (
              <p className="text-xs text-red-400">{fieldErrors.title}</p>
            )}
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">
              Explanation (Optional)
              <span className="ml-2 text-xs text-gray-400">
                ({formData.description.length}/255)
              </span>
            </Label>
            <Textarea
              id="explanation"
              value={formData.description}
              onChange={e => updateFormField('description', e.target.value)}
              placeholder="Add an explanation for your challenge"
              className={cn(
                'min-h-[100px] bg-gray-800/50',
                'break-words',
                fieldErrors.description
                  ? 'border-red-500/20'
                  : 'border-cyan-500/20'
              )}
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-400">{fieldErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Difficulty */}
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: Difficulty) =>
                  updateFormField('difficulty', value)
                }
              >
                <SelectTrigger className="border-cyan-500/20 bg-gray-800/50">
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

            {/* Placeholder for future field */}
            <div></div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags
              <span className="ml-2 text-xs text-gray-400">
                (Comma separated, max 5)
              </span>
            </Label>
            <Input
              id="tags"
              value={formData.tags.join(', ')}
              onChange={e =>
                updateFormField(
                  'tags',
                  e.target.value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag)
                )
              }
              placeholder="Enter tags separated by commas..."
              className="border-cyan-500/20 bg-gray-800/50"
            />
          </div>

          {/* Public/Private */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={checked =>
                updateFormField('is_public', checked as boolean)
              }
            />
            <Label htmlFor="is_public">Make this card public</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="primary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || Object.keys(fieldErrors).length > 0}
            className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
          >
            {isSaving ? 'Saving...' : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
