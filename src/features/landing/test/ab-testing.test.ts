/**
 * A/B Testing Logic Tests
 * Tests the business logic for A/B test variant selection and management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  ABTestManager,
  selectVariant,
  calculateVariantWeights,
  validateExperiment,
  type ABTestExperiment,
  type ABTestVariant,
} from '../utils/ab-testing';

describe('A/B Testing Logic', () => {
  let testManager: ABTestManager;

  beforeEach(() => {
    // Clear any stored data
    testManager = new ABTestManager();
    jest.clearAllMocks();
  });

  describe('Variant Selection', () => {
    it('should select a variant based on weights', () => {
      const experiment: ABTestExperiment = {
        id: 'hero-cta-test',
        name: 'Hero CTA Button Test',
        status: 'active',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant-a', name: 'Variant A', weight: 30 },
          { id: 'variant-b', name: 'Variant B', weight: 20 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
      };

      // Test that variants are selected consistently for the same user
      const user1Variant = selectVariant(experiment, 'user-1');
      const user1Variant2 = selectVariant(experiment, 'user-1');
      expect(user1Variant.id).toBe(user1Variant2.id);

      // Test that all variants are valid
      const testUsers = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      const selections = testUsers.map(userId => selectVariant(experiment, userId));
      
      selections.forEach(variant => {
        expect(['control', 'variant-a', 'variant-b']).toContain(variant.id);
      });
    });

    it('should consistently return same variant for same user', () => {
      const experiment: ABTestExperiment = {
        id: 'consistent-test',
        name: 'Consistency Test',
        status: 'active',
        variants: [
          { id: 'a', name: 'A', weight: 50 },
          { id: 'b', name: 'B', weight: 50 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
      };

      const userId = 'test-user-123';
      const firstSelection = selectVariant(experiment, userId);

      // Select 100 times for the same user
      for (let i = 0; i < 100; i++) {
        const selection = selectVariant(experiment, userId);
        expect(selection.id).toBe(firstSelection.id);
      }
    });

    it('should handle single variant (100% rollout)', () => {
      const experiment: ABTestExperiment = {
        id: 'full-rollout',
        name: 'Full Rollout',
        status: 'active',
        variants: [{ id: 'new-feature', name: 'New Feature', weight: 100 }],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
      };

      const variant = selectVariant(experiment, 'any-user');
      expect(variant.id).toBe('new-feature');
    });

    it('should return control for inactive experiments', () => {
      const experiment: ABTestExperiment = {
        id: 'inactive-test',
        name: 'Inactive Test',
        status: 'paused',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant', name: 'Variant', weight: 50 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
      };

      const variant = selectVariant(experiment, 'user-123');
      expect(variant.id).toBe('control');
    });

    it('should return control for expired experiments', () => {
      const experiment: ABTestExperiment = {
        id: 'expired-test',
        name: 'Expired Test',
        status: 'active',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant', name: 'Variant', weight: 50 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'), // Expired
      };

      const variant = selectVariant(experiment, 'user-123');
      expect(variant.id).toBe('control');
    });
  });

  describe('Weight Calculation', () => {
    it('should normalize weights to sum to 100', () => {
      const variants: ABTestVariant[] = [
        { id: 'a', name: 'A', weight: 25 },
        { id: 'b', name: 'B', weight: 25 },
        { id: 'c', name: 'C', weight: 25 },
        { id: 'd', name: 'D', weight: 25 },
      ];

      const normalized = calculateVariantWeights(variants);
      const sum = normalized.reduce((acc, v) => acc + v.weight, 0);
      
      expect(sum).toBe(100);
      normalized.forEach(v => {
        expect(v.weight).toBe(25);
      });
    });

    it('should handle non-100 sum weights', () => {
      const variants: ABTestVariant[] = [
        { id: 'a', name: 'A', weight: 30 },
        { id: 'b', name: 'B', weight: 20 },
        { id: 'c', name: 'C', weight: 10 },
      ];

      const normalized = calculateVariantWeights(variants);
      const sum = normalized.reduce((acc, v) => acc + v.weight, 0);
      
      expect(sum).toBe(100);
      expect(normalized[0].weight).toBeCloseTo(50); // 30/60 * 100
      expect(normalized[1].weight).toBeCloseTo(33.33); // 20/60 * 100
      expect(normalized[2].weight).toBeCloseTo(16.67); // 10/60 * 100
    });

    it('should handle zero weights', () => {
      const variants: ABTestVariant[] = [
        { id: 'a', name: 'A', weight: 50 },
        { id: 'b', name: 'B', weight: 0 },
        { id: 'c', name: 'C', weight: 50 },
      ];

      const normalized = calculateVariantWeights(variants);
      
      expect(normalized[0].weight).toBe(50);
      expect(normalized[1].weight).toBe(0);
      expect(normalized[2].weight).toBe(50);
    });
  });

  describe('Experiment Validation', () => {
    it('should validate correct experiment configuration', () => {
      const experiment: ABTestExperiment = {
        id: 'valid-test',
        name: 'Valid Test',
        status: 'active',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant', name: 'Variant', weight: 50 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
        metrics: ['conversion_rate', 'click_through_rate'],
      };

      const validation = validateExperiment(experiment);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const experiment = {
        name: 'Invalid Test',
        variants: [],
      } as any;

      const validation = validateExperiment(experiment);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'id',
          message: 'Experiment ID is required',
        })
      );
    });

    it('should require at least two variants', () => {
      const experiment: ABTestExperiment = {
        id: 'single-variant',
        name: 'Single Variant',
        status: 'active',
        variants: [{ id: 'only', name: 'Only', weight: 100 }],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
      };

      const validation = validateExperiment(experiment);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'variants',
          message: 'At least 2 variants required for A/B test',
        })
      );
    });

    it('should validate date ranges', () => {
      const experiment: ABTestExperiment = {
        id: 'invalid-dates',
        name: 'Invalid Dates',
        status: 'active',
        variants: [
          { id: 'a', name: 'A', weight: 50 },
          { id: 'b', name: 'B', weight: 50 },
        ],
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'), // End before start
      };

      const validation = validateExperiment(experiment);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'dates',
          message: 'End date must be after start date',
        })
      );
    });

    it('should validate variant IDs are unique', () => {
      const experiment: ABTestExperiment = {
        id: 'duplicate-variants',
        name: 'Duplicate Variants',
        status: 'active',
        variants: [
          { id: 'same', name: 'First', weight: 50 },
          { id: 'same', name: 'Second', weight: 50 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
      };

      const validation = validateExperiment(experiment);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'variants',
          message: 'Variant IDs must be unique',
        })
      );
    });
  });

  describe('ABTestManager', () => {
    it('should manage multiple experiments', () => {
      const experiment1: ABTestExperiment = {
        id: 'test-1',
        name: 'Test 1',
        status: 'active',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant', name: 'Variant', weight: 50 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
      };

      const experiment2: ABTestExperiment = {
        id: 'test-2',
        name: 'Test 2',
        status: 'active',
        variants: [
          { id: 'control', name: 'Control', weight: 60 },
          { id: 'variant', name: 'Variant', weight: 40 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
      };

      testManager.addExperiment(experiment1);
      testManager.addExperiment(experiment2);

      expect(testManager.getActiveExperiments()).toHaveLength(2);
      expect(testManager.getExperiment('test-1')).toEqual(experiment1);
      expect(testManager.getExperiment('test-2')).toEqual(experiment2);
    });

    it('should assign user to variants across experiments', () => {
      const experiments: ABTestExperiment[] = [
        {
          id: 'hero-test',
          name: 'Hero Test',
          status: 'active',
          variants: [
            { id: 'control', name: 'Control', weight: 50 },
            { id: 'new-hero', name: 'New Hero', weight: 50 },
          ],
          startDate: new Date('2023-01-01'),
          endDate: new Date('2025-12-31'),
        },
        {
          id: 'cta-test',
          name: 'CTA Test',
          status: 'active',
          variants: [
            { id: 'control', name: 'Control', weight: 50 },
            { id: 'new-cta', name: 'New CTA', weight: 50 },
          ],
          startDate: new Date('2023-01-01'),
          endDate: new Date('2025-12-31'),
        },
      ];

      experiments.forEach(exp => testManager.addExperiment(exp));

      const userId = 'test-user-456';
      const assignments = testManager.getUserVariants(userId);

      expect(assignments).toHaveProperty('hero-test');
      expect(assignments).toHaveProperty('cta-test');
      expect(['control', 'new-hero']).toContain(assignments['hero-test']);
      expect(['control', 'new-cta']).toContain(assignments['cta-test']);

      // Verify consistency
      const secondAssignment = testManager.getUserVariants(userId);
      expect(secondAssignment).toEqual(assignments);
    });

    it('should track experiment impressions', () => {
      const experiment: ABTestExperiment = {
        id: 'impression-test',
        name: 'Impression Test',
        status: 'active',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant', name: 'Variant', weight: 50 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
      };

      testManager.addExperiment(experiment);
      
      const userId = 'impression-user';
      const variant = testManager.getVariantForUser(experiment.id, userId);
      
      testManager.trackImpression(experiment.id, userId, variant!);
      
      const impressions = testManager.getImpressions(experiment.id);
      expect(impressions).toHaveLength(1);
      expect(impressions[0]).toMatchObject({
        experimentId: experiment.id,
        userId,
        variantId: variant,
      });
    });

    it('should handle feature flags', () => {
      const featureFlag: ABTestExperiment = {
        id: 'new-feature-flag',
        name: 'New Feature Flag',
        status: 'active',
        variants: [
          { id: 'off', name: 'Off', weight: 70 },
          { id: 'on', name: 'On', weight: 30 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
        isFeatureFlag: true,
      };

      testManager.addExperiment(featureFlag);
      
      const userId = 'feature-user';
      const isEnabled = testManager.isFeatureEnabled('new-feature-flag', userId);
      
      expect(typeof isEnabled).toBe('boolean');
      
      // Should be consistent
      for (let i = 0; i < 10; i++) {
        expect(testManager.isFeatureEnabled('new-feature-flag', userId)).toBe(isEnabled);
      }
    });

    it('should respect targeting rules', () => {
      const targetedExperiment: ABTestExperiment = {
        id: 'targeted-test',
        name: 'Targeted Test',
        status: 'active',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant', name: 'Variant', weight: 50 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
        targeting: {
          audiences: ['new_users'],
          percentage: 50, // Only 50% of eligible users
        },
      };

      testManager.addExperiment(targetedExperiment);
      
      // Test with different user attributes
      const newUserInTest = testManager.getVariantForUser(
        'targeted-test',
        'new-user-1',
        { audience: 'new_users' }
      );
      
      const returningUser = testManager.getVariantForUser(
        'targeted-test',
        'returning-user-1',
        { audience: 'returning_users' }
      );
      
      expect(['control', 'variant', null]).toContain(newUserInTest);
      expect(returningUser).toBeNull(); // Not in target audience
    });
  });

  describe('Marketing Campaign Integration', () => {
    it('should override variants for specific campaigns', () => {
      const experiment: ABTestExperiment = {
        id: 'campaign-test',
        name: 'Campaign Test',
        status: 'active',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant-a', name: 'Variant A', weight: 25 },
          { id: 'variant-b', name: 'Variant B', weight: 25 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
        campaignOverrides: {
          'summer-sale': 'variant-b',
          'black-friday': 'variant-a',
        },
      };

      testManager.addExperiment(experiment);
      
      // Normal user gets assigned randomly
      const normalUser = testManager.getVariantForUser('campaign-test', 'user-1');
      expect(['control', 'variant-a', 'variant-b']).toContain(normalUser);
      
      // Campaign users get specific variants
      const summerUser = testManager.getVariantForUser(
        'campaign-test',
        'user-2',
        { campaign: 'summer-sale' }
      );
      expect(summerUser).toBe('variant-b');
      
      const blackFridayUser = testManager.getVariantForUser(
        'campaign-test',
        'user-3',
        { campaign: 'black-friday' }
      );
      expect(blackFridayUser).toBe('variant-a');
    });
  });
});