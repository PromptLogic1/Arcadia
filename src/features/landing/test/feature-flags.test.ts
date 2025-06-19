/**
 * Feature Flags Logic Tests
 * Tests the business logic for feature flag evaluation and management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  FeatureFlagManager,
  evaluateFlag,
  parseCondition,
  validateFlagConfig,
  type FeatureFlag,
  type FlagContext,
} from '../utils/feature-flags';

describe('Feature Flags Logic', () => {
  let flagManager: FeatureFlagManager;

  beforeEach(() => {
    flagManager = new FeatureFlagManager();
    jest.clearAllMocks();
  });

  describe('Flag Evaluation', () => {
    it('should return default value when flag does not exist', () => {
      const result = evaluateFlag('non-existent-flag', false, {});
      expect(result).toBe(false);
    });

    it('should evaluate simple enabled flag', () => {
      const flag: FeatureFlag = {
        key: 'simple-flag',
        name: 'Simple Flag',
        enabled: true,
        defaultValue: true, // Should be true for enabled flag
        type: 'boolean',
      };

      const result = evaluateFlag(flag.key, false, {}, flag);
      expect(result).toBe(true);
    });

    it('should evaluate disabled flag', () => {
      const flag: FeatureFlag = {
        key: 'disabled-flag',
        name: 'Disabled Flag',
        enabled: false,
        defaultValue: true,
        type: 'boolean',
      };

      const result = evaluateFlag(flag.key, false, {}, flag);
      expect(result).toBe(false); // Should return false when disabled
    });

    it('should evaluate percentage rollout', () => {
      const flag: FeatureFlag = {
        key: 'percentage-flag',
        name: 'Percentage Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
        rolloutPercentage: 50,
      };

      // Test that the same user always gets the same result
      const context: FlagContext = { userId: 'test-user-123' };
      const result1 = evaluateFlag(flag.key, false, context, flag);
      const result2 = evaluateFlag(flag.key, false, context, flag);
      expect(result1).toBe(result2);

      // Test that a flag with 0% rollout returns false
      const zeroFlag = { ...flag, rolloutPercentage: 0 };
      const zeroResult = evaluateFlag(zeroFlag.key, false, context, zeroFlag);
      expect(zeroResult).toBe(false);

      // Test that a flag with 100% rollout returns true (but we need to set defaultValue to true)
      const fullFlag = { ...flag, rolloutPercentage: 100, defaultValue: true };
      const fullResult = evaluateFlag(fullFlag.key, false, context, fullFlag);
      expect(fullResult).toBe(true);
    });

    it('should evaluate user targeting rules', () => {
      const flag: FeatureFlag = {
        key: 'targeted-flag',
        name: 'Targeted Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
        rules: [
          {
            id: 'beta-users',
            conditions: [
              {
                attribute: 'userType',
                operator: 'equals',
                value: 'beta',
              },
            ],
            value: true,
          },
        ],
      };

      // Beta user should get true
      const betaContext: FlagContext = { userType: 'beta' };
      const betaResult = evaluateFlag(flag.key, false, betaContext, flag);
      expect(betaResult).toBe(true);

      // Regular user should get default
      const regularContext: FlagContext = { userType: 'regular' };
      const regularResult = evaluateFlag(flag.key, false, regularContext, flag);
      expect(regularResult).toBe(false);
    });

    it('should evaluate string value flags', () => {
      const flag: FeatureFlag = {
        key: 'theme-flag',
        name: 'Theme Flag',
        enabled: true,
        defaultValue: 'light',
        type: 'string',
        rules: [
          {
            id: 'dark-theme-users',
            conditions: [
              {
                attribute: 'preference',
                operator: 'equals',
                value: 'dark',
              },
            ],
            value: 'dark',
          },
        ],
      };

      const darkContext: FlagContext = { preference: 'dark' };
      const result = evaluateFlag(flag.key, 'light', darkContext, flag);
      expect(result).toBe('dark');
    });

    it('should evaluate number value flags', () => {
      const flag: FeatureFlag = {
        key: 'limit-flag',
        name: 'Limit Flag',
        enabled: true,
        defaultValue: 10,
        type: 'number',
        rules: [
          {
            id: 'premium-users',
            conditions: [
              {
                attribute: 'plan',
                operator: 'equals',
                value: 'premium',
              },
            ],
            value: 100,
          },
        ],
      };

      const premiumContext: FlagContext = { plan: 'premium' };
      const result = evaluateFlag(flag.key, 10, premiumContext, flag);
      expect(result).toBe(100);
    });

    it('should evaluate complex conditions with AND logic', () => {
      const flag: FeatureFlag = {
        key: 'complex-flag',
        name: 'Complex Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
        rules: [
          {
            id: 'enterprise-beta',
            conditions: [
              {
                attribute: 'plan',
                operator: 'equals',
                value: 'enterprise',
              },
              {
                attribute: 'beta',
                operator: 'equals',
                value: true,
              },
            ],
            value: true,
          },
        ],
      };

      // Both conditions met
      const validContext: FlagContext = { plan: 'enterprise', beta: true };
      const validResult = evaluateFlag(flag.key, false, validContext, flag);
      expect(validResult).toBe(true);

      // Only one condition met
      const invalidContext: FlagContext = { plan: 'enterprise', beta: false };
      const invalidResult = evaluateFlag(flag.key, false, invalidContext, flag);
      expect(invalidResult).toBe(false);
    });

    it('should handle date-based targeting', () => {
      const flag: FeatureFlag = {
        key: 'time-flag',
        name: 'Time Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
        rules: [
          {
            id: 'future-feature',
            conditions: [
              {
                attribute: 'currentDate',
                operator: 'after',
                value: '2024-01-01',
              },
            ],
            value: true,
          },
        ],
      };

      // Before date
      const beforeContext: FlagContext = { currentDate: '2023-12-31' };
      const beforeResult = evaluateFlag(flag.key, false, beforeContext, flag);
      expect(beforeResult).toBe(false);

      // After date
      const afterContext: FlagContext = { currentDate: '2024-01-02' };
      const afterResult = evaluateFlag(flag.key, false, afterContext, flag);
      expect(afterResult).toBe(true);
    });
  });

  describe('Condition Parsing', () => {
    it('should parse equals condition', () => {
      const condition = {
        attribute: 'userType',
        operator: 'equals' as const,
        value: 'premium',
      };

      const context = { userType: 'premium' };
      const result = parseCondition(condition, context);
      expect(result).toBe(true);
    });

    it('should parse not_equals condition', () => {
      const condition = {
        attribute: 'userType',
        operator: 'not_equals' as const,
        value: 'basic',
      };

      const context = { userType: 'premium' };
      const result = parseCondition(condition, context);
      expect(result).toBe(true);
    });

    it('should parse contains condition', () => {
      const condition = {
        attribute: 'email',
        operator: 'contains' as const,
        value: '@company.com',
      };

      const context = { email: 'user@company.com' };
      const result = parseCondition(condition, context);
      expect(result).toBe(true);
    });

    it('should parse greater_than condition', () => {
      const condition = {
        attribute: 'age',
        operator: 'greater_than' as const,
        value: 18,
      };

      const context = { age: 25 };
      const result = parseCondition(condition, context);
      expect(result).toBe(true);
    });

    it('should parse in condition with arrays', () => {
      const condition = {
        attribute: 'country',
        operator: 'in' as const,
        value: ['US', 'CA', 'UK'],
      };

      const context = { country: 'CA' };
      const result = parseCondition(condition, context);
      expect(result).toBe(true);
    });

    it('should handle missing attributes', () => {
      const condition = {
        attribute: 'nonExistent',
        operator: 'equals' as const,
        value: 'test',
      };

      const context = { userType: 'premium' };
      const result = parseCondition(condition, context);
      expect(result).toBe(false);
    });

    it('should handle type coercion', () => {
      const condition = {
        attribute: 'age',
        operator: 'equals' as const,
        value: '25', // String value
      };

      const context = { age: 25 }; // Number in context
      const result = parseCondition(condition, context);
      expect(result).toBe(true);
    });
  });

  describe('Flag Configuration Validation', () => {
    it('should validate correct flag configuration', () => {
      const flag: FeatureFlag = {
        key: 'valid-flag',
        name: 'Valid Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
      };

      const validation = validateFlagConfig(flag);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const flag = {
        name: 'Invalid Flag',
        enabled: true,
      } as any;

      const validation = validateFlagConfig(flag);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'key',
          message: 'Flag key is required',
        })
      );
    });

    it('should validate flag key format', () => {
      const flag: FeatureFlag = {
        key: 'Invalid Flag Key!',
        name: 'Invalid Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
      };

      const validation = validateFlagConfig(flag);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'key',
          message: expect.stringContaining('kebab-case'),
        })
      );
    });

    it('should validate rollout percentage range', () => {
      const flag: FeatureFlag = {
        key: 'percentage-flag',
        name: 'Percentage Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
        rolloutPercentage: 150, // Invalid
      };

      const validation = validateFlagConfig(flag);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'rolloutPercentage',
          message: 'Rollout percentage must be between 0 and 100',
        })
      );
    });

    it('should validate rule conditions', () => {
      const flag: FeatureFlag = {
        key: 'rule-flag',
        name: 'Rule Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
        rules: [
          {
            id: 'invalid-rule',
            conditions: [
              {
                attribute: '', // Empty attribute
                operator: 'equals',
                value: 'test',
              },
            ],
            value: true,
          },
        ],
      };

      const validation = validateFlagConfig(flag);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'rules',
          message: expect.stringContaining('attribute is required'),
        })
      );
    });

    it('should validate value type consistency', () => {
      const flag: FeatureFlag = {
        key: 'type-flag',
        name: 'Type Flag',
        enabled: true,
        defaultValue: 'string-value', // String default
        type: 'number', // But type is number
      };

      const validation = validateFlagConfig(flag);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'defaultValue',
          message: expect.stringContaining('type mismatch'),
        })
      );
    });
  });

  describe('FeatureFlagManager', () => {
    it('should register and retrieve flags', () => {
      const flag: FeatureFlag = {
        key: 'test-flag',
        name: 'Test Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
      };

      flagManager.registerFlag(flag);

      const retrieved = flagManager.getFlag('test-flag');
      expect(retrieved?.key).toBe(flag.key);
      expect(retrieved?.name).toBe(flag.name);
      expect(retrieved?.enabled).toBe(flag.enabled);
      expect(retrieved?.defaultValue).toBe(flag.defaultValue);
      expect(retrieved?.type).toBe(flag.type);
    });

    it('should evaluate registered flags', () => {
      const flag: FeatureFlag = {
        key: 'eval-flag',
        name: 'Eval Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
        rules: [
          {
            id: 'admin-rule',
            conditions: [
              {
                attribute: 'role',
                operator: 'equals',
                value: 'admin',
              },
            ],
            value: true,
          },
        ],
      };

      flagManager.registerFlag(flag);

      const adminResult = flagManager.isEnabled('eval-flag', { role: 'admin' });
      expect(adminResult).toBe(true);

      const userResult = flagManager.isEnabled('eval-flag', { role: 'user' });
      expect(userResult).toBe(false);
    });

    it('should get flag values', () => {
      const stringFlag: FeatureFlag = {
        key: 'theme-flag',
        name: 'Theme Flag',
        enabled: true,
        defaultValue: 'light',
        type: 'string',
      };

      const numberFlag: FeatureFlag = {
        key: 'limit-flag',
        name: 'Limit Flag',
        enabled: true,
        defaultValue: 10,
        type: 'number',
      };

      flagManager.registerFlag(stringFlag);
      flagManager.registerFlag(numberFlag);

      expect(flagManager.getString('theme-flag', {})).toBe('light');
      expect(flagManager.getNumber('limit-flag', {})).toBe(10);
    });

    it('should list all flags', () => {
      const flags: FeatureFlag[] = [
        {
          key: 'flag-1',
          name: 'Flag 1',
          enabled: true,
          defaultValue: false,
          type: 'boolean',
        },
        {
          key: 'flag-2',
          name: 'Flag 2',
          enabled: false,
          defaultValue: true,
          type: 'boolean',
        },
      ];

      flags.forEach(flag => flagManager.registerFlag(flag));

      const allFlags = flagManager.getAllFlags();
      expect(allFlags).toHaveLength(2);
      expect(allFlags.map(f => f.key)).toContain('flag-1');
      expect(allFlags.map(f => f.key)).toContain('flag-2');
    });

    it('should get evaluation context for all flags', () => {
      const flags: FeatureFlag[] = [
        {
          key: 'flag-a',
          name: 'Flag A',
          enabled: true,
          defaultValue: false,
          type: 'boolean',
        },
        {
          key: 'flag-b',
          name: 'Flag B',
          enabled: true,
          defaultValue: 'default',
          type: 'string',
        },
      ];

      flags.forEach(flag => flagManager.registerFlag(flag));

      const context = flagManager.getEvaluationContext({});
      expect(context).toHaveProperty('flag-a');
      expect(context).toHaveProperty('flag-b');
      expect(context['flag-a']).toBe(false);
      expect(context['flag-b']).toBe('default');
    });

    it('should track flag usage', () => {
      const flag: FeatureFlag = {
        key: 'tracked-flag',
        name: 'Tracked Flag',
        enabled: true,
        defaultValue: false,
        type: 'boolean',
      };

      flagManager.registerFlag(flag);

      // Evaluate flag multiple times
      flagManager.isEnabled('tracked-flag', {});
      flagManager.isEnabled('tracked-flag', {});
      flagManager.isEnabled('tracked-flag', {});

      const usage = flagManager.getFlagUsage('tracked-flag');
      expect(usage?.evaluationCount).toBe(3);
      expect(usage?.lastEvaluated).toBeDefined();
      expect(usage?.lastEvaluated.getTime()).toEqual(expect.any(Number));
    });

    it('should handle remote flag updates', async () => {
      const initialFlag: FeatureFlag = {
        key: 'remote-flag',
        name: 'Remote Flag',
        enabled: false,
        defaultValue: false,
        type: 'boolean',
      };

      flagManager.registerFlag(initialFlag);
      expect(flagManager.isEnabled('remote-flag', {})).toBe(false);

      // Simulate remote update - need to change defaultValue too
      const updatedFlag: FeatureFlag = {
        ...initialFlag,
        enabled: true,
        defaultValue: true, // Set to true for enabled flag
      };

      flagManager.updateFlag(updatedFlag);
      expect(flagManager.isEnabled('remote-flag', {})).toBe(true);
    });

    it('should support feature flag experiments', () => {
      const experimentFlag: FeatureFlag = {
        key: 'experiment-flag',
        name: 'Experiment Flag',
        enabled: true,
        defaultValue: 'control',
        type: 'string',
        experiment: {
          id: 'hero-test',
          variants: [
            { value: 'control', weight: 50 },
            { value: 'variant-a', weight: 25 },
            { value: 'variant-b', weight: 25 },
          ],
        },
      };

      flagManager.registerFlag(experimentFlag);

      // Test distribution over multiple users
      const results: Record<string, number> = {};
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const result = flagManager.getString('experiment-flag', {
          userId: `user-${i}`,
        });
        results[result] = (results[result] || 0) + 1;
      }

      // Should have reasonable distribution
      expect(results['control']).toBeGreaterThan(300);
      expect(results['variant-a']).toBeGreaterThan(50);
      expect(results['variant-b']).toBeGreaterThan(50);

      // Check that all results add up to the total iterations
      const total = Object.values(results).reduce(
        (sum, count) => sum + count,
        0
      );
      expect(total).toBe(iterations);
    });
  });

  describe('Landing Page Feature Flags', () => {
    it('should manage hero section variants', () => {
      const heroFlag: FeatureFlag = {
        key: 'hero-variant',
        name: 'Hero Section Variant',
        enabled: true,
        defaultValue: 'default',
        type: 'string',
        rules: [
          {
            id: 'new-users',
            conditions: [
              {
                attribute: 'isNewUser',
                operator: 'equals',
                value: true,
              },
            ],
            value: 'onboarding-focused',
          },
          {
            id: 'returning-users',
            conditions: [
              {
                attribute: 'isNewUser',
                operator: 'equals',
                value: false,
              },
            ],
            value: 'feature-focused',
          },
        ],
      };

      flagManager.registerFlag(heroFlag);

      const newUserVariant = flagManager.getString('hero-variant', {
        isNewUser: true,
      });
      expect(newUserVariant).toBe('onboarding-focused');

      const returningUserVariant = flagManager.getString('hero-variant', {
        isNewUser: false,
      });
      expect(returningUserVariant).toBe('feature-focused');
    });

    it('should control demo game visibility', () => {
      const demoFlag: FeatureFlag = {
        key: 'show-demo-game',
        name: 'Show Demo Game',
        enabled: true,
        defaultValue: true, // Set to true for enabled flag
        type: 'boolean',
        rolloutPercentage: 100, // Show to all users for testing
      };

      flagManager.registerFlag(demoFlag);

      // Test that flag returns expected value
      const shouldShow = flagManager.isEnabled('show-demo-game', {
        userId: 'test-user',
      });
      expect(shouldShow).toBe(true);

      // Test with disabled flag
      const disabledFlag: FeatureFlag = {
        ...demoFlag,
        enabled: false,
        defaultValue: false, // Set to false for disabled flag
      };

      flagManager.updateFlag(disabledFlag);
      const shouldNotShow = flagManager.isEnabled('show-demo-game', {
        userId: 'test-user',
      });
      expect(shouldNotShow).toBe(false);
    });

    it('should handle pricing display flags', () => {
      const pricingFlag: FeatureFlag = {
        key: 'pricing-display',
        name: 'Pricing Display Mode',
        enabled: true,
        defaultValue: 'standard',
        type: 'string',
        rules: [
          {
            id: 'holiday-sale',
            conditions: [
              {
                attribute: 'currentDate',
                operator: 'between',
                value: ['2024-11-25', '2024-12-02'], // Black Friday week
              },
            ],
            value: 'sale',
          },
          {
            id: 'enterprise-visitors',
            conditions: [
              {
                attribute: 'companySize',
                operator: 'greater_than',
                value: 100,
              },
            ],
            value: 'enterprise',
          },
        ],
      };

      flagManager.registerFlag(pricingFlag);

      // Standard user
      const standardDisplay = flagManager.getString('pricing-display', {});
      expect(standardDisplay).toBe('standard');

      // Enterprise user
      const enterpriseDisplay = flagManager.getString('pricing-display', {
        companySize: 500,
      });
      expect(enterpriseDisplay).toBe('enterprise');

      // Holiday sale
      const saleDisplay = flagManager.getString('pricing-display', {
        currentDate: '2024-11-26',
      });
      expect(saleDisplay).toBe('sale');
    });
  });
});
