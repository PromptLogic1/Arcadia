'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Controller } from 'react-hook-form';
import { GAME_CATEGORIES } from '@/src/types/index';
import type { GameCategory } from '@/types';
import { log } from '@/lib/logger';
import { toError } from '@/lib/error-guards';
import { BaseErrorBoundary } from '@/components/error-boundaries';

// =============================================================================
// VALIDATION SCHEMA - Centralized, type-safe validation rules
// =============================================================================

const BOARD_SIZES = [3, 4, 5, 6] as const;
const TITLE_LENGTH_LIMITS = { MIN: 3, MAX: 100 } as const;
const DESCRIPTION_LENGTH_LIMIT = 500;
const DEFAULT_GAME_TYPE: GameCategory = 'World of Warcraft';

const createBoardSchema = z.object({
  board_title: z
    .string()
    .min(
      TITLE_LENGTH_LIMITS.MIN,
      `Title must be at least ${TITLE_LENGTH_LIMITS.MIN} characters`
    )
    .max(
      TITLE_LENGTH_LIMITS.MAX,
      `Title must not exceed ${TITLE_LENGTH_LIMITS.MAX} characters`
    )
    .trim(),
  board_description: z
    .string()
    .max(
      DESCRIPTION_LENGTH_LIMIT,
      `Description must not exceed ${DESCRIPTION_LENGTH_LIMIT} characters`
    ),
  board_size: z
    .number()
    .refine(
      size => BOARD_SIZES.includes(size as (typeof BOARD_SIZES)[number]),
      {
        message: 'Invalid board size',
      }
    ),
  board_game_type: z.custom<GameCategory>(
    game => GAME_CATEGORIES.includes(game as GameCategory),
    {
      message: 'Invalid game type',
    }
  ),
  board_difficulty: z.enum([
    'beginner',
    'easy',
    'medium',
    'hard',
    'expert',
  ] as const),
  is_public: z.boolean(),
  board_tags: z.array(z.string().trim()),
});

// Use the Zod-inferred type directly for complete type safety
type FormData = z.infer<typeof createBoardSchema>;

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface CreateBoardFormProps {
  isOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  createBoardAction: (data: FormData) => Promise<void>;
}

// =============================================================================
// FORM CONSTANTS & UTILITIES
// =============================================================================

const sortedGames = [...GAME_CATEGORIES]
  .filter((game: GameCategory) => game !== 'All Games')
  .sort((a, b) => a.localeCompare(b));

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
] as const;

const DEFAULT_VALUES: FormData = {
  board_title: '',
  board_description: '',
  board_size: 5,
  board_game_type: DEFAULT_GAME_TYPE,
  board_difficulty: 'medium',
  is_public: false,
  board_tags: [],
};

// =============================================================================
// CUSTOM HOOKS
// =============================================================================

/**
 * Custom hook to handle form submission with error handling and logging
 */
function useCreateBoardSubmission(
  createBoardAction: CreateBoardFormProps['createBoardAction'],
  onOpenChange?: CreateBoardFormProps['onOpenChange']
) {
  return async (data: FormData) => {
    try {
      log.info('Board creation started', {
        component: 'CreateBoardForm',
        metadata: { formData: data },
      });

      await createBoardAction(data);

      log.info('Board created successfully', {
        component: 'CreateBoardForm',
        metadata: { boardTitle: data.board_title },
      });

      // Close dialog on successful submission
      onOpenChange?.(false);
    } catch (error) {
      log.error('Failed to create board', toError(error), {
        component: 'CreateBoardForm',
        metadata: { formData: data },
      });

      // Re-throw to let React Hook Form handle the error state
      throw error;
    }
  };
}

// =============================================================================
// FORM FIELD COMPONENTS - Reusable, composable form elements
// =============================================================================

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
  description?: string;
}

function FormField({
  label,
  required,
  error,
  children,
  htmlFor,
  description,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CreateBoardForm({
  isOpen,
  onOpenChange,
  createBoardAction,
}: CreateBoardFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange', // Validate on change for better UX
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  // Watch specific fields for dynamic UI updates
  const titleValue = watch('board_title');
  const descriptionValue = watch('board_description');
  const tagsValue = watch('board_tags');

  const onSubmit = useCreateBoardSubmission(createBoardAction, onOpenChange);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      log.info('CreateBoardForm dialog closed', {
        component: 'CreateBoardForm',
        metadata: { isDirty, hasUnsavedChanges: isDirty },
      });

      // Reset form when closing to prevent stale data
      reset(DEFAULT_VALUES);
    }
    onOpenChange?.(open);
  };

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');
    return tags;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-gray-900 text-gray-100 sm:max-w-[500px]">
        <BaseErrorBoundary level="component">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-2xl font-bold text-transparent">
              Create New Bingo Board
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6">
            {/* Board Title */}
            <FormField
              label="Board Title"
              required
              htmlFor="board_title"
              error={errors.board_title?.message}
              description={`${titleValue?.length || 0}/${TITLE_LENGTH_LIMITS.MAX} characters`}
            >
              <Input
                id="board_title"
                {...register('board_title')}
                className={cn(
                  'border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500',
                  errors.board_title && 'border-red-500/50 focus:border-red-500'
                )}
                placeholder="Enter board title"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Board Description */}
            <FormField
              label="Description"
              htmlFor="board_description"
              error={errors.board_description?.message}
              description={`${descriptionValue?.length || 0}/${DESCRIPTION_LENGTH_LIMIT} characters (Optional)`}
            >
              <Textarea
                id="board_description"
                {...register('board_description')}
                className={cn(
                  'min-h-[80px] border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500',
                  errors.board_description &&
                    'border-red-500/50 focus:border-red-500'
                )}
                placeholder="Enter board description"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Board Size */}
            <FormField
              label="Board Size"
              required
              error={errors.board_size?.message}
            >
              <Controller
                name="board_size"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value.toString()}
                    onValueChange={value => field.onChange(parseInt(value))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500">
                      <SelectValue placeholder="Select board size" />
                    </SelectTrigger>
                    <SelectContent className="border-cyan-500 bg-gray-800">
                      {BOARD_SIZES.map(size => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}x{size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Game Type */}
            <FormField
              label="Game"
              required
              error={errors.board_game_type?.message}
            >
              <Controller
                name="board_game_type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500">
                      <SelectValue placeholder="Select Game" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] border-cyan-500 bg-gray-800">
                      {sortedGames.map(game => (
                        <SelectItem key={game} value={game}>
                          {game}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Difficulty */}
            <FormField
              label="Difficulty"
              required
              error={errors.board_difficulty?.message}
            >
              <Controller
                name="board_difficulty"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500">
                      <SelectValue placeholder="Select Difficulty" />
                    </SelectTrigger>
                    <SelectContent className="border-cyan-500 bg-gray-800">
                      {DIFFICULTY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Tags */}
            <FormField
              label="Tags"
              htmlFor="board_tags"
              error={errors.board_tags?.message}
              description={`${tagsValue?.length || 0} tags entered (Optional, comma-separated)`}
            >
              <Controller
                name="board_tags"
                control={control}
                render={({ field }) => (
                  <Input
                    id="board_tags"
                    value={field.value.join(', ')}
                    onChange={e =>
                      field.onChange(handleTagsChange(e.target.value))
                    }
                    className="border-cyan-500/50 bg-gray-800/50 focus:border-fuchsia-500"
                    placeholder="e.g. raiding, pvp, fun"
                    disabled={isSubmitting}
                  />
                )}
              />
            </FormField>

            {/* Public Checkbox */}
            <FormField label="" error={errors.is_public?.message}>
              <Controller
                name="is_public"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_public"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="is_public" className="text-sm font-normal">
                      Make this board public
                    </Label>
                  </div>
                )}
              />
            </FormField>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 border-t border-gray-800 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="border-cyan-500/50 hover:bg-cyan-500/10"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'bg-gradient-to-r from-cyan-500 to-fuchsia-500',
                  'font-medium text-white',
                  'transition-all duration-200 hover:opacity-90',
                  'shadow-lg shadow-cyan-500/25',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {isSubmitting ? 'Creating...' : 'Create Board'}
              </Button>
            </div>
          </form>
        </BaseErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
