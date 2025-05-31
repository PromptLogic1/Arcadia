import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from './FormField';
import type { Control, FieldErrors } from 'react-hook-form';
import {
  CARD_CATEGORIES,
  type CardCategory,
} from '@/features/bingo-boards/types/generator.types';
import { GENERATOR_LABELS, GENERATOR_STYLES, SPACING } from './constants';
import type { GeneratorFormData } from './hooks/useGeneratorForm';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  control: Control<GeneratorFormData>;
  formData: GeneratorFormData;
  errors: FieldErrors<GeneratorFormData>;
  onCategoryToggle: (category: CardCategory) => void;
  selectedCategories: CardCategory[];
}

/**
 * Enhanced CategorySelector Component with Tailwind v4 Features
 *
 * Handles complex category selection logic including:
 * - "Use All Categories" checkbox with enhanced styling
 * - Individual category selection dropdown with touch optimization
 * - Selected categories display with animated badges
 * - Remove functionality with hover effects
 * - Container query responsive layout
 *
 * Enhanced with v4 features:
 * - Touch-optimized interactions
 * - Animated state transitions
 * - Better visual feedback with text shadows and colored effects
 * - Container-responsive layouts
 */
export const CategorySelector: React.FC<CategorySelectorProps> = ({
  control,
  formData,
  errors,
  onCategoryToggle,
  selectedCategories,
}) => {
  const useAllCategories = formData.useAllCategories;

  return (
    <div className={cn(SPACING.FORM_GROUP, '@container')}>
      {/* Use All Categories Checkbox with Enhanced Styling */}
      <FormField
        name="useAllCategories"
        label={GENERATOR_LABELS.USE_ALL_CATEGORIES}
        control={control}
        type="checkbox"
        error={errors.useAllCategories}
        helpText="Include all available categories automatically"
      />

      {/* Category Selection - Only show when not using all categories */}
      {!useAllCategories && (
        <div className="animate-fade space-y-4">
          <Select onValueChange={onCategoryToggle}>
            <SelectTrigger className={GENERATOR_STYLES.SELECT_TRIGGER}>
              <SelectValue placeholder={GENERATOR_LABELS.SELECT_CATEGORY} />
            </SelectTrigger>
            <SelectContent className={GENERATOR_STYLES.SELECT_CONTENT}>
              {CARD_CATEGORIES.filter(
                category => !selectedCategories.includes(category)
              ).map(category => (
                <SelectItem
                  key={category}
                  value={category}
                  className={GENERATOR_STYLES.SELECT_ITEM}
                >
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selected Categories Display with Enhanced Animations */}
          {selectedCategories.length > 0 && (
            <div className={cn(SPACING.BADGE_GAP, 'animate-fade @container')}>
              <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2 @lg:grid-cols-3">
                {selectedCategories.map((category, index) => (
                  <CategoryBadge
                    key={category}
                    category={category}
                    onRemove={() => onCategoryToggle(category)}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Error Display */}
          {errors.categories && (
            <div className="animate-fade mt-2 flex items-center gap-2">
              <div className="bg-destructive animate-glow h-1 w-1 rounded-full" />
              <p className={GENERATOR_STYLES.ERROR_TEXT}>
                {errors.categories.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced CategoryBadge Component with v4 Features
 *
 * Individual badge for selected categories with:
 * - Enhanced remove functionality with hover effects
 * - Animated entry/exit states
 * - Touch-optimized interactions
 * - Better visual feedback
 */
interface CategoryBadgeProps {
  category: CardCategory;
  onRemove: () => void;
  index?: number;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  onRemove,
  index = 0,
}) => {
  return (
    <div
      className="animate-scale-in hover-lift"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <Badge
        variant="secondary"
        className={cn(
          GENERATOR_STYLES.BADGE_SELECTED,
          'group w-full cursor-pointer justify-between transition-all duration-200'
        )}
      >
        <span className="truncate text-shadow-xs">{category}</span>
        <button
          type="button"
          className={cn(
            'touch-target ml-2 rounded-full p-1',
            'transition-all duration-200',
            'hover:bg-destructive/20 hover:text-destructive',
            'focus:ring-destructive/30 focus:ring-2 focus:outline-none',
            'group-hover:scale-110'
          )}
          onClick={onRemove}
          aria-label={`Remove ${category} category`}
        >
          <X className="pointer-events-none h-3 w-3" />
        </button>
      </Badge>
    </div>
  );
};
