import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { z } from 'zod';
import type { GameCategory, Difficulty as _Difficulty } from '@/types';
import type { Enums } from '@/types/database-generated';

// Type alias for clean usage
type DifficultyLevel = Enums<'difficulty_level'>;

// Create constants from enum types
const Constants = {
  public: {
    Enums: {
      difficulty_level: ['beginner', 'easy', 'medium', 'hard', 'expert'] as const,
    }
  }
} as const;
import {
  type CardCategory,
  CARD_CATEGORIES,
} from '@/features/bingo-boards/types/generator.types';
import { GENERATOR_UI_CONFIG } from '../constants';

// Form Schema with Zod for type-safe validation
const generatorFormSchema = z
  .object({
    categories: z.array(z.string()).min(1, 'At least one category is required'),
    useAllCategories: z.boolean(),
    difficulty: z.enum([...Constants.public.Enums.difficulty_level] as [
      DifficultyLevel,
      ...DifficultyLevel[],
    ]),
    poolSize: z.enum(['Small', 'Medium', 'Large'] as const),
    minVotes: z
      .number()
      .min(
        GENERATOR_UI_CONFIG.MIN_VOTES_MIN,
        'Minimum votes cannot be negative'
      ),
    usePrivateCards: z.boolean(),
    usePublicCards: z.boolean(),
  })
  .refine(data => data.usePrivateCards || data.usePublicCards, {
    message: 'At least one card source must be selected',
    path: ['usePublicCards'],
  })
  .refine(data => data.useAllCategories || data.categories.length > 0, {
    message: 'Categories are required when not using all categories',
    path: ['categories'],
  });

export type GeneratorFormData = z.infer<typeof generatorFormSchema>;

// Default form values
const getDefaultValues = (): GeneratorFormData => ({
  categories: [...CARD_CATEGORIES],
  useAllCategories: true,
  difficulty: Constants.public.Enums.difficulty_level[2] || 'medium', // Default to medium
  poolSize: 'Medium',
  minVotes: GENERATOR_UI_CONFIG.MIN_VOTES_DEFAULT,
  usePrivateCards: true,
  usePublicCards: true,
});

interface UseGeneratorFormOptions {
  _gameCategory: GameCategory;
  _gridSize: number;
  onGenerate?: (data: GeneratorFormData) => Promise<void>;
}

interface UseGeneratorFormReturn {
  // Form methods from React Hook Form
  register: ReturnType<typeof useForm<GeneratorFormData>>['register'];
  handleSubmit: ReturnType<typeof useForm<GeneratorFormData>>['handleSubmit'];
  control: ReturnType<typeof useForm<GeneratorFormData>>['control'];
  formState: ReturnType<typeof useForm<GeneratorFormData>>['formState'];
  setValue: ReturnType<typeof useForm<GeneratorFormData>>['setValue'];
  watch: ReturnType<typeof useForm<GeneratorFormData>>['watch'];
  reset: ReturnType<typeof useForm<GeneratorFormData>>['reset'];

  // Computed values
  formData: GeneratorFormData;
  isFormValid: boolean;

  // Event handlers
  onSubmit: (data: GeneratorFormData) => Promise<void>;
  handleCategoryToggle: (category: CardCategory) => void;
  handleAllCategoriesToggle: (checked: boolean) => void;

  // State
  isGenerating: boolean;
  generationError: string | null;
}

export function useGeneratorForm({
  _gameCategory,
  _gridSize,
  onGenerate,
}: UseGeneratorFormOptions): UseGeneratorFormReturn {
  // Initialize React Hook Form with Zod validation
  const form = useForm<GeneratorFormData>({
    resolver: zodResolver(generatorFormSchema),
    defaultValues: getDefaultValues(),
    mode: 'onChange',
  });

  const { register, handleSubmit, control, formState, setValue, watch, reset } =
    form;

  // Watch form data for real-time updates
  const formData = useWatch({ control }) as GeneratorFormData;

  // Computed values
  const isFormValid = formState.isValid && !formState.isSubmitting;
  const isGenerating = formState.isSubmitting;
  const generationError = formState.errors.root?.message || null;

  // Handle form submission
  const onSubmit = useCallback(
    async (data: GeneratorFormData) => {
      try {
        if (onGenerate) {
          await onGenerate(data);
        }
      } catch (error) {
        // Set form-level error
        form.setError('root', {
          message: error instanceof Error ? error.message : 'Generation failed',
        });
      }
    },
    [onGenerate, form]
  );

  // Handle category toggle
  const handleCategoryToggle = useCallback(
    (category: CardCategory) => {
      const currentCategories = formData.categories || [];
      const newCategories = currentCategories.includes(category)
        ? currentCategories.filter(c => c !== category)
        : [...currentCategories, category];

      setValue('categories', newCategories, { shouldValidate: true });
    },
    [formData.categories, setValue]
  );

  // Handle "use all categories" toggle
  const handleAllCategoriesToggle = useCallback(
    (checked: boolean) => {
      setValue('useAllCategories', checked, { shouldValidate: true });
      if (checked) {
        setValue('categories', [...CARD_CATEGORIES], { shouldValidate: true });
      } else {
        setValue('categories', [], { shouldValidate: true });
      }
    },
    [setValue]
  );

  // Auto-update categories when useAllCategories changes
  useEffect(() => {
    if (
      formData.useAllCategories &&
      formData.categories.length !== CARD_CATEGORIES.length
    ) {
      setValue('categories', [...CARD_CATEGORIES], { shouldValidate: true });
    }
  }, [formData.useAllCategories, formData.categories.length, setValue]);

  return {
    // Form methods
    register,
    handleSubmit,
    control,
    formState,
    setValue,
    watch,
    reset,

    // Computed values
    formData,
    isFormValid,

    // Event handlers
    onSubmit,
    handleCategoryToggle,
    handleAllCategoriesToggle,

    // State
    isGenerating,
    generationError,
  };
}
