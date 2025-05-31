'use client';

import React, { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { GameCategory } from '@/types/database-types';
import { Constants } from '@/types/database-core';
import { GENERATOR_CONFIG } from '@/features/bingo-boards/types/generator.types';
import { useGeneratorPanel } from '../../hooks/useGeneratorPanel';
import {
  useGeneratorForm,
  type GeneratorFormData,
} from './hooks/useGeneratorForm';
import { FormField } from './FormField';
import { CategorySelector } from './CategorySelector';
import { ErrorFeedback } from './ErrorFeedback';
import {
  GENERATOR_LABELS,
  GENERATOR_STYLES,
  SPACING,
  GENERATOR_UI_CONFIG,
} from './constants';
import { cn } from '@/lib/utils';

interface GeneratorPanelProps {
  gameCategory: GameCategory;
  gridSize: number;
}

/**
 * GeneratorPanel Component
 *
 * Modern, modular implementation of the board generator panel.
 *
 * Key improvements over original:
 * - React Hook Form integration for performance and validation
 * - Modular component architecture
 * - Type-safe form handling with Zod validation
 * - Extracted constants and reusable components
 * - Performance optimizations with useCallback/useMemo
 * - Clear separation of concerns
 *
 * Architecture:
 * - useGeneratorForm: Form state management with RHF + Zod
 * - CategorySelector: Complex category selection logic
 * - FormField: Reusable form inputs with consistent styling
 * - ErrorFeedback: Structured error display with helpful tips
 */
export function GeneratorPanel({
  gameCategory,
  gridSize,
}: GeneratorPanelProps) {
  // Legacy hook integration - TODO: Merge with useGeneratorForm
  const legacyPanel = useGeneratorPanel(
    gameCategory,
    gridSize,
    true, // usePublicCards - will be managed by form
    true // usePrivateCards - will be managed by form
  );

  // Custom generator callback that integrates with legacy hook
  const handleGenerate = useCallback(
    async (formData: GeneratorFormData) => {
      // TODO: Replace with proper generator service integration
      // For now, delegate to legacy generateBoard method
      await legacyPanel.generateBoard();
    },
    [legacyPanel]
  );

  // Modern form management with React Hook Form
  const form = useGeneratorForm({
    _gameCategory: gameCategory,
    _gridSize: gridSize,
    onGenerate: handleGenerate,
  });

  // Memoized form options to prevent recreation on every render
  const difficultyOptions = useMemo(
    () =>
      Constants.public.Enums.difficulty_level.map(difficulty => ({
        value: difficulty,
        label: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      })),
    []
  );

  const poolSizeOptions = useMemo(
    () =>
      Object.keys(GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS).map(size => ({
        value: size,
        label: size,
      })),
    []
  );

  // Button state derived from form and legacy state
  const isButtonDisabled =
    form.isGenerating ||
    legacyPanel.isLoading ||
    !form.isFormValid ||
    (!form.formData.useAllCategories &&
      form.formData.categories.length === 0) ||
    (!form.formData.usePrivateCards && !form.formData.usePublicCards);

  // Error from either form validation or legacy generation
  const displayError = form.generationError || legacyPanel.error;
  const isLoading = form.isGenerating || legacyPanel.isLoading;

  const onSubmit = (_formData: GeneratorFormData) => {
    // console.log("Form submitted:", formData);
    // TODO: Implement board generation logic
  };

  return (
    <Card className={GENERATOR_STYLES.CARD}>
      <CardHeader>
        <CardTitle className={GENERATOR_STYLES.TITLE}>
          {GENERATOR_LABELS.CARD_CATEGORIES}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={SPACING.SECTION}
        >
          {/* Card Categories Section */}
          <div className="animate-fade">
            <CategorySelector
              control={form.control}
              formData={form.formData}
              errors={form.formState.errors}
              onCategoryToggle={form.handleCategoryToggle}
              selectedCategories={form.formData.categories}
            />
          </div>

          {/* Difficulty Selection */}
          <FormField
            name="difficulty"
            label={GENERATOR_LABELS.DIFFICULTY}
            control={form.control}
            type="select"
            options={difficultyOptions}
            placeholder={GENERATOR_LABELS.SELECT_DIFFICULTY}
            error={form.formState.errors.difficulty}
            helpText="Choose the complexity level for generated cards"
          />

          {/* Pool Size Selection */}
          <FormField
            name="poolSize"
            label={GENERATOR_LABELS.POOL_SIZE}
            control={form.control}
            type="select"
            options={poolSizeOptions}
            placeholder={GENERATOR_LABELS.SELECT_POOL_SIZE}
            error={form.formState.errors.poolSize}
            helpText="Number of cards to generate for the pool"
          />

          {/* Minimum Votes Input */}
          <FormField
            name="minVotes"
            label={GENERATOR_LABELS.MINIMUM_VOTES}
            control={form.control}
            type="input"
            inputType="number"
            min={GENERATOR_UI_CONFIG.MIN_VOTES_MIN}
            error={form.formState.errors.minVotes}
            helpText="Minimum community votes required for card inclusion"
          />

          {/* Card Sources Section */}
          <div className={SPACING.FORM_GROUP}>
            <div className={cn('mb-2', GENERATOR_STYLES.SUBTITLE)}>
              {GENERATOR_LABELS.CARD_SOURCES}
            </div>
            <div className={SPACING.FLEX_GAP}>
              <FormField
                name="usePrivateCards"
                label={GENERATOR_LABELS.USE_PRIVATE_CARDS}
                control={form.control}
                type="checkbox"
                error={form.formState.errors.usePrivateCards}
                helpText="Include your personal card collection"
              />
              <FormField
                name="usePublicCards"
                label={GENERATOR_LABELS.USE_PUBLIC_CARDS}
                control={form.control}
                type="checkbox"
                error={form.formState.errors.usePublicCards}
                helpText="Include community-submitted cards"
              />
            </div>
          </div>

          {/* Generate Button with Enhanced Styling */}
          <Button
            type="submit"
            disabled={isButtonDisabled}
            className={GENERATOR_STYLES.BUTTON_PRIMARY}
            variant="gradient"
            shadow="colored"
            glow="normal"
          >
            {isLoading ? (
              <div className={GENERATOR_STYLES.LOADING_OVERLAY}>
                <LoadingSpinner className={GENERATOR_STYLES.LOADING_SPINNER} />
                <span className="ml-2 text-shadow-sm">
                  {GENERATOR_LABELS.GENERATING}
                </span>
              </div>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                {GENERATOR_LABELS.GENERATE_BUTTON}
              </>
            )}
          </Button>

          {/* Enhanced Error Display */}
          {displayError && (
            <div className={GENERATOR_STYLES.ERROR_CONTAINER}>
              <ErrorFeedback error={displayError} />
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
