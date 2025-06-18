/**
 * Feature Flags Utilities
 * Handles feature flag evaluation, targeting rules, and management
 */

import { createHash } from 'crypto';

export type FlagValue = boolean | string | number;
export type FlagType = 'boolean' | 'string' | 'number';

export interface FlagCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 
           'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' |
           'in' | 'not_in' | 'starts_with' | 'ends_with' | 'matches' |
           'before' | 'after' | 'between';
  value: unknown;
}

export interface FlagRule {
  id: string;
  conditions: FlagCondition[];
  value: FlagValue;
  description?: string;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: FlagType;
  defaultValue: FlagValue;
  rolloutPercentage?: number; // 0-100
  rules?: FlagRule[];
  experiment?: {
    id: string;
    variants: Array<{
      value: FlagValue;
      weight: number;
    }>;
  };
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FlagContext {
  userId?: string;
  sessionId?: string;
  userType?: string;
  plan?: string;
  role?: string;
  email?: string;
  country?: string;
  region?: string;
  deviceType?: string;
  browser?: string;
  isNewUser?: boolean;
  registrationDate?: string;
  currentDate?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  [key: string]: unknown;
}

export interface FlagValidation {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings?: Array<{ field: string; message: string }>;
}

export interface FlagUsage {
  flagKey: string;
  evaluationCount: number;
  lastEvaluated: Date;
  uniqueUsers: Set<string>;
}

// Flag key validation (kebab-case)
const FLAG_KEY_REGEX = /^[a-z][a-z0-9-]*[a-z0-9]$/;

/**
 * Evaluate a feature flag based on context
 */
export function evaluateFlag<T extends FlagValue>(
  flagKey: string,
  defaultValue: T,
  context: FlagContext,
  flag?: FeatureFlag
): T {
  if (!flag) {
    return defaultValue;
  }

  // Check if flag is enabled
  if (!flag.enabled) {
    return defaultValue;
  }

  // Check rollout percentage first
  if (flag.rolloutPercentage !== undefined && context.userId) {
    const hash = generateUserHash(flagKey, context.userId);
    const bucket = hash % 100;
    if (bucket >= flag.rolloutPercentage) {
      return flag.defaultValue as T;
    }
  }

  // Check experiment variants
  if (flag.experiment && context.userId) {
    const variant = selectExperimentVariant(flag.experiment, context.userId);
    if (variant !== null) {
      return variant as T;
    }
  }

  // Evaluate rules
  if (flag.rules && flag.rules.length > 0) {
    for (const rule of flag.rules) {
      if (evaluateRule(rule, context)) {
        return rule.value as T;
      }
    }
  }

  // If flag is enabled but has no rollout percentage, rules, or experiments,
  // return the default value (which should be the "enabled" state)
  return flag.defaultValue as T;
}

/**
 * Evaluate a single rule against context
 */
function evaluateRule(rule: FlagRule, context: FlagContext): boolean {
  // All conditions must be true (AND logic)
  return rule.conditions.every(condition => parseCondition(condition, context));
}

/**
 * Parse and evaluate a single condition
 */
export function parseCondition(condition: FlagCondition, context: FlagContext): boolean {
  const contextValue = context[condition.attribute];
  const conditionValue = condition.value;

  // Handle missing attributes
  if (contextValue === undefined || contextValue === null) {
    return false;
  }

  switch (condition.operator) {
    case 'equals':
      return String(contextValue) === String(conditionValue);
    
    case 'not_equals':
      return String(contextValue) !== String(conditionValue);
    
    case 'contains':
      return String(contextValue).includes(String(conditionValue));
    
    case 'not_contains':
      return !String(contextValue).includes(String(conditionValue));
    
    case 'starts_with':
      return String(contextValue).startsWith(String(conditionValue));
    
    case 'ends_with':
      return String(contextValue).endsWith(String(conditionValue));
    
    case 'greater_than':
      return Number(contextValue) > Number(conditionValue);
    
    case 'less_than':
      return Number(contextValue) < Number(conditionValue);
    
    case 'greater_equal':
      return Number(contextValue) >= Number(conditionValue);
    
    case 'less_equal':
      return Number(contextValue) <= Number(conditionValue);
    
    case 'in':
      if (Array.isArray(conditionValue)) {
        return conditionValue.includes(contextValue);
      }
      return false;
    
    case 'not_in':
      if (Array.isArray(conditionValue)) {
        return !conditionValue.includes(contextValue);
      }
      return true;
    
    case 'matches':
      try {
        const regex = new RegExp(String(conditionValue));
        return regex.test(String(contextValue));
      } catch {
        return false;
      }
    
    case 'before':
      return new Date(String(contextValue)) < new Date(String(conditionValue));
    
    case 'after':
      return new Date(String(contextValue)) > new Date(String(conditionValue));
    
    case 'between':
      if (Array.isArray(conditionValue) && conditionValue.length === 2) {
        const date = new Date(String(contextValue));
        const start = new Date(String(conditionValue[0]));
        const end = new Date(String(conditionValue[1]));
        return date >= start && date <= end;
      }
      return false;
    
    default:
      return false;
  }
}

/**
 * Generate consistent hash for user and flag
 */
function generateUserHash(flagKey: string, userId: string): number {
  const input = `${flagKey}:${userId}`;
  const hash = createHash('md5').update(input).digest('hex');
  return parseInt(hash.substring(0, 8), 16) % 100;
}

/**
 * Select experiment variant based on weights
 */
function selectExperimentVariant(
  experiment: FeatureFlag['experiment'],
  userId: string
): FlagValue | null {
  if (!experiment || !experiment.variants.length) {
    return null;
  }

  const hash = generateUserHash(experiment.id, userId);
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  
  if (totalWeight === 0) {
    return experiment.variants[0].value;
  }

  const bucket = (hash % totalWeight);
  let accumulated = 0;

  for (const variant of experiment.variants) {
    accumulated += variant.weight;
    if (bucket < accumulated) {
      return variant.value;
    }
  }

  return experiment.variants[experiment.variants.length - 1].value;
}

/**
 * Validate feature flag configuration
 */
export function validateFlagConfig(flag: FeatureFlag): FlagValidation {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Required fields
  if (!flag.key) {
    errors.push({ field: 'key', message: 'Flag key is required' });
  } else if (!FLAG_KEY_REGEX.test(flag.key)) {
    errors.push({ 
      field: 'key', 
      message: 'Flag key must be in kebab-case format (lowercase, hyphens only)' 
    });
  }

  if (!flag.name) {
    errors.push({ field: 'name', message: 'Flag name is required' });
  }

  if (flag.enabled === undefined || flag.enabled === null) {
    errors.push({ field: 'enabled', message: 'Enabled flag is required' });
  }

  if (!flag.type) {
    errors.push({ field: 'type', message: 'Flag type is required' });
  }

  if (flag.defaultValue === undefined || flag.defaultValue === null) {
    errors.push({ field: 'defaultValue', message: 'Default value is required' });
  }

  // Type consistency
  if (flag.type && flag.defaultValue !== undefined) {
    const actualType = typeof flag.defaultValue;
    const expectedType = flag.type === 'number' ? 'number' : 
                        flag.type === 'boolean' ? 'boolean' : 'string';
    
    if (actualType !== expectedType) {
      errors.push({ 
        field: 'defaultValue', 
        message: `Default value type mismatch. Expected ${expectedType}, got ${actualType}` 
      });
    }
  }

  // Rollout percentage validation
  if (flag.rolloutPercentage !== undefined) {
    if (flag.rolloutPercentage < 0 || flag.rolloutPercentage > 100) {
      errors.push({ 
        field: 'rolloutPercentage', 
        message: 'Rollout percentage must be between 0 and 100' 
      });
    }
  }

  // Rules validation
  if (flag.rules && flag.rules.length > 0) {
    for (const rule of flag.rules) {
      if (!rule.id) {
        errors.push({ field: 'rules', message: 'Rule ID is required' });
      }

      if (!rule.conditions || rule.conditions.length === 0) {
        errors.push({ field: 'rules', message: 'Rule must have at least one condition' });
      } else {
        for (const condition of rule.conditions) {
          if (!condition.attribute) {
            errors.push({ field: 'rules', message: 'Condition attribute is required' });
          }
          if (!condition.operator) {
            errors.push({ field: 'rules', message: 'Condition operator is required' });
          }
        }
      }

      if (rule.value === undefined || rule.value === null) {
        errors.push({ field: 'rules', message: 'Rule value is required' });
      }
    }
  }

  // Experiment validation
  if (flag.experiment) {
    if (!flag.experiment.id) {
      errors.push({ field: 'experiment', message: 'Experiment ID is required' });
    }

    if (!flag.experiment.variants || flag.experiment.variants.length === 0) {
      errors.push({ field: 'experiment', message: 'Experiment must have variants' });
    } else {
      const totalWeight = flag.experiment.variants.reduce((sum, v) => sum + v.weight, 0);
      if (totalWeight === 0) {
        warnings?.push({ 
          field: 'experiment', 
          message: 'Experiment variants have zero total weight' 
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Feature Flag Manager
 */
export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private usage: Map<string, FlagUsage> = new Map();

  /**
   * Register a feature flag
   */
  registerFlag(flag: FeatureFlag): void {
    const validation = validateFlagConfig(flag);
    if (!validation.valid) {
      throw new Error(`Invalid flag configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.flags.set(flag.key, {
      ...flag,
      updatedAt: new Date(),
      createdAt: flag.createdAt || new Date(),
    });
  }

  /**
   * Update an existing flag
   */
  updateFlag(flag: FeatureFlag): void {
    const existing = this.flags.get(flag.key);
    if (!existing) {
      throw new Error(`Flag '${flag.key}' not found`);
    }

    this.registerFlag({
      ...flag,
      createdAt: existing.createdAt,
    });
  }

  /**
   * Get a flag by key
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Get all registered flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Check if a boolean flag is enabled
   */
  isEnabled(flagKey: string, context: FlagContext): boolean {
    this.trackUsage(flagKey, context);
    const flag = this.flags.get(flagKey);
    return evaluateFlag(flagKey, false, context, flag);
  }

  /**
   * Get string flag value
   */
  getString(flagKey: string, context: FlagContext, defaultValue = ''): string {
    this.trackUsage(flagKey, context);
    const flag = this.flags.get(flagKey);
    return evaluateFlag(flagKey, defaultValue, context, flag);
  }

  /**
   * Get number flag value
   */
  getNumber(flagKey: string, context: FlagContext, defaultValue = 0): number {
    this.trackUsage(flagKey, context);
    const flag = this.flags.get(flagKey);
    return evaluateFlag(flagKey, defaultValue, context, flag);
  }

  /**
   * Get evaluation context for all flags
   */
  getEvaluationContext(context: FlagContext): Record<string, FlagValue> {
    const result: Record<string, FlagValue> = {};
    
    for (const [key, flag] of this.flags.entries()) {
      result[key] = evaluateFlag(key, flag.defaultValue, context, flag);
    }

    return result;
  }

  /**
   * Track flag usage
   */
  private trackUsage(flagKey: string, context: FlagContext): void {
    let usage = this.usage.get(flagKey);
    
    if (!usage) {
      usage = {
        flagKey,
        evaluationCount: 0,
        lastEvaluated: new Date(),
        uniqueUsers: new Set(),
      };
      this.usage.set(flagKey, usage);
    }

    usage.evaluationCount++;
    usage.lastEvaluated = new Date();
    
    if (context.userId) {
      usage.uniqueUsers.add(context.userId);
    }
  }

  /**
   * Get flag usage statistics
   */
  getFlagUsage(flagKey: string): FlagUsage | undefined {
    return this.usage.get(flagKey);
  }

  /**
   * Get all flag usage statistics
   */
  getAllUsage(): FlagUsage[] {
    return Array.from(this.usage.values());
  }

  /**
   * Clear all flags and usage data
   */
  clear(): void {
    this.flags.clear();
    this.usage.clear();
  }

  /**
   * Export flags configuration
   */
  exportFlags(): FeatureFlag[] {
    return this.getAllFlags();
  }

  /**
   * Import flags configuration
   */
  importFlags(flags: FeatureFlag[]): void {
    for (const flag of flags) {
      this.registerFlag(flag);
    }
  }
}

/**
 * Default landing page feature flags
 */
export const LANDING_PAGE_FLAGS: FeatureFlag[] = [
  {
    key: 'hero-section-variant',
    name: 'Hero Section Variant',
    description: 'Controls which hero section variant to display',
    enabled: true,
    type: 'string',
    defaultValue: 'default',
    rules: [
      {
        id: 'new-user-onboarding',
        conditions: [
          { attribute: 'isNewUser', operator: 'equals', value: true },
        ],
        value: 'onboarding-focused',
        description: 'Show onboarding-focused hero for new users',
      },
      {
        id: 'mobile-optimized',
        conditions: [
          { attribute: 'deviceType', operator: 'equals', value: 'mobile' },
        ],
        value: 'mobile-optimized',
        description: 'Show mobile-optimized hero for mobile users',
      },
    ],
    tags: ['ui', 'conversion'],
  },
  {
    key: 'show-demo-game',
    name: 'Show Demo Game',
    description: 'Controls visibility of the demo game section',
    enabled: true,
    type: 'boolean',
    defaultValue: false,
    rolloutPercentage: 50,
    tags: ['engagement', 'demo'],
  },
  {
    key: 'pricing-display-mode',
    name: 'Pricing Display Mode',
    description: 'Controls how pricing is displayed',
    enabled: true,
    type: 'string',
    defaultValue: 'standard',
    rules: [
      {
        id: 'enterprise-focus',
        conditions: [
          { attribute: 'utm.campaign', operator: 'equals', value: 'enterprise' },
        ],
        value: 'enterprise',
        description: 'Show enterprise pricing for enterprise campaigns',
      },
      {
        id: 'holiday-sale',
        conditions: [
          { attribute: 'currentDate', operator: 'between', value: ['2024-11-25', '2024-12-02'] },
        ],
        value: 'sale',
        description: 'Show sale pricing during Black Friday week',
      },
    ],
    tags: ['pricing', 'conversion'],
  },
  {
    key: 'social-proof-type',
    name: 'Social Proof Type',
    description: 'Controls which type of social proof to display',
    enabled: true,
    type: 'string',
    defaultValue: 'testimonials',
    experiment: {
      id: 'social-proof-experiment',
      variants: [
        { value: 'testimonials', weight: 40 },
        { value: 'statistics', weight: 30 },
        { value: 'logos', weight: 20 },
        { value: 'none', weight: 10 },
      ],
    },
    tags: ['social-proof', 'conversion'],
  },
  {
    key: 'cta-button-style',
    name: 'CTA Button Style',
    description: 'Controls the style of call-to-action buttons',
    enabled: true,
    type: 'string',
    defaultValue: 'primary',
    rules: [
      {
        id: 'high-contrast-accessibility',
        conditions: [
          { attribute: 'accessibilityMode', operator: 'equals', value: 'high-contrast' },
        ],
        value: 'high-contrast',
        description: 'Use high contrast buttons for accessibility',
      },
    ],
    tags: ['ui', 'accessibility'],
  },
];