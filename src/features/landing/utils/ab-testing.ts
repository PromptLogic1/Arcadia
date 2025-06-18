/**
 * A/B Testing Utilities
 * Handles experiment configuration, variant selection, and tracking
 */

import { createHash } from 'crypto';

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // Percentage 0-100
}

export interface ABTestExperiment {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  variants: ABTestVariant[];
  startDate: Date;
  endDate: Date;
  metrics?: string[];
  isFeatureFlag?: boolean;
  targeting?: {
    audiences?: string[];
    percentage?: number; // What percentage of eligible users to include
  };
  campaignOverrides?: Record<string, string>; // campaign -> variant mapping
}

export interface ABTestImpression {
  experimentId: string;
  userId: string;
  variantId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ExperimentValidation {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

/**
 * Select a variant for a user based on experiment configuration
 */
export function selectVariant(
  experiment: ABTestExperiment,
  userId: string,
  context?: Record<string, unknown>
): ABTestVariant {
  // Check if experiment is active and within date range
  if (experiment.status !== 'active') {
    return experiment.variants.find(v => v.id === 'control') || experiment.variants[0];
  }

  const now = new Date();
  if (now < experiment.startDate || now > experiment.endDate) {
    return experiment.variants.find(v => v.id === 'control') || experiment.variants[0];
  }

  // Check for campaign overrides
  if (experiment.campaignOverrides && context?.campaign) {
    const override = experiment.campaignOverrides[context.campaign as string];
    if (override) {
      const variant = experiment.variants.find(v => v.id === override);
      if (variant) return variant;
    }
  }

  // Generate consistent hash for user + experiment
  const hash = generateHash(`${experiment.id}:${userId}`);
  const bucket = hash % 100;

  // Select variant based on weights
  let accumulated = 0;
  for (const variant of experiment.variants) {
    accumulated += variant.weight;
    if (bucket < accumulated) {
      return variant;
    }
  }

  // Fallback to last variant
  return experiment.variants[experiment.variants.length - 1];
}

/**
 * Calculate normalized variant weights
 */
export function calculateVariantWeights(variants: ABTestVariant[]): ABTestVariant[] {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  
  if (totalWeight === 0) {
    // Equal distribution if all weights are 0
    const equalWeight = 100 / variants.length;
    return variants.map(v => ({ ...v, weight: equalWeight }));
  }

  if (totalWeight === 100) {
    return variants;
  }

  // Normalize to 100
  return variants.map(v => ({
    ...v,
    weight: (v.weight / totalWeight) * 100,
  }));
}

/**
 * Validate experiment configuration
 */
export function validateExperiment(experiment: ABTestExperiment): ExperimentValidation {
  const errors: Array<{ field: string; message: string }> = [];

  // Required fields
  if (!experiment.id) {
    errors.push({ field: 'id', message: 'Experiment ID is required' });
  }

  if (!experiment.name) {
    errors.push({ field: 'name', message: 'Experiment name is required' });
  }

  // Variants validation
  if (!experiment.variants || experiment.variants.length === 0) {
    errors.push({ field: 'variants', message: 'At least one variant is required' });
  } else {
    // Check for A/B test requirements
    if (!experiment.isFeatureFlag && experiment.variants.length < 2) {
      errors.push({ field: 'variants', message: 'At least 2 variants required for A/B test' });
    }

    // Check for unique IDs
    const variantIds = experiment.variants.map(v => v.id);
    const uniqueIds = new Set(variantIds);
    if (uniqueIds.size !== variantIds.length) {
      errors.push({ field: 'variants', message: 'Variant IDs must be unique' });
    }

    // Validate weights
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01 && totalWeight !== 0) {
      errors.push({ field: 'variants', message: `Variant weights should sum to 100 (current: ${totalWeight})` });
    }
  }

  // Date validation
  if (!experiment.startDate) {
    errors.push({ field: 'startDate', message: 'Start date is required' });
  }

  if (!experiment.endDate) {
    errors.push({ field: 'endDate', message: 'End date is required' });
  }

  if (experiment.startDate && experiment.endDate && experiment.endDate <= experiment.startDate) {
    errors.push({ field: 'dates', message: 'End date must be after start date' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a consistent hash from a string
 */
function generateHash(input: string): number {
  const hash = createHash('md5').update(input).digest('hex');
  // Convert first 8 characters of hex to number
  const hashNum = parseInt(hash.substring(0, 8), 16);
  return hashNum % 100;
}

/**
 * A/B Test Manager for handling multiple experiments
 */
export class ABTestManager {
  private experiments: Map<string, ABTestExperiment> = new Map();
  private impressions: ABTestImpression[] = [];
  private userAssignments: Map<string, Record<string, string>> = new Map();

  /**
   * Add an experiment
   */
  addExperiment(experiment: ABTestExperiment): void {
    const validation = validateExperiment(experiment);
    if (!validation.valid) {
      throw new Error(`Invalid experiment: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    this.experiments.set(experiment.id, experiment);
  }

  /**
   * Get an experiment by ID
   */
  getExperiment(id: string): ABTestExperiment | undefined {
    return this.experiments.get(id);
  }

  /**
   * Get all active experiments
   */
  getActiveExperiments(): ABTestExperiment[] {
    const now = new Date();
    return Array.from(this.experiments.values()).filter(
      exp => exp.status === 'active' && now >= exp.startDate && now <= exp.endDate
    );
  }

  /**
   * Get variant for a user in a specific experiment
   */
  getVariantForUser(
    experimentId: string,
    userId: string,
    context?: Record<string, unknown>
  ): string | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    // Check targeting rules
    if (experiment.targeting) {
      // Check audience targeting
      if (experiment.targeting.audiences && context?.audience) {
        if (!experiment.targeting.audiences.includes(context.audience as string)) {
          return null; // User not in target audience
        }
      }

      // Check percentage targeting
      if (experiment.targeting.percentage) {
        const inPercentage = generateHash(`${experimentId}:${userId}:targeting`) < experiment.targeting.percentage;
        if (!inPercentage) return null;
      }
    }

    // Check if user already has an assignment
    const userRecord = this.userAssignments.get(userId);
    if (userRecord && userRecord[experimentId]) {
      return userRecord[experimentId];
    }

    // Select variant
    const variant = selectVariant(experiment, userId, context);
    
    // Store assignment
    if (!userRecord) {
      this.userAssignments.set(userId, { [experimentId]: variant.id });
    } else {
      userRecord[experimentId] = variant.id;
    }

    return variant.id;
  }

  /**
   * Get all variant assignments for a user
   */
  getUserVariants(userId: string, context?: Record<string, unknown>): Record<string, string> {
    const assignments: Record<string, string> = {};
    
    for (const experiment of this.getActiveExperiments()) {
      const variant = this.getVariantForUser(experiment.id, userId, context);
      if (variant) {
        assignments[experiment.id] = variant;
      }
    }

    return assignments;
  }

  /**
   * Track an impression
   */
  trackImpression(
    experimentId: string,
    userId: string,
    variantId: string,
    metadata?: Record<string, unknown>
  ): void {
    this.impressions.push({
      experimentId,
      userId,
      variantId,
      timestamp: new Date(),
      metadata,
    });
  }

  /**
   * Get impressions for an experiment
   */
  getImpressions(experimentId: string): ABTestImpression[] {
    return this.impressions.filter(imp => imp.experimentId === experimentId);
  }

  /**
   * Check if a feature flag is enabled for a user
   */
  isFeatureEnabled(featureFlagId: string, userId: string, context?: Record<string, unknown>): boolean {
    const variant = this.getVariantForUser(featureFlagId, userId, context);
    return variant === 'on' || variant === 'enabled' || variant === 'true';
  }

  /**
   * Get experiment results summary
   */
  getExperimentResults(experimentId: string): {
    variantCounts: Record<string, number>;
    totalImpressions: number;
    conversionRates?: Record<string, number>;
  } {
    const impressions = this.getImpressions(experimentId);
    const variantCounts: Record<string, number> = {};

    for (const impression of impressions) {
      variantCounts[impression.variantId] = (variantCounts[impression.variantId] || 0) + 1;
    }

    return {
      variantCounts,
      totalImpressions: impressions.length,
    };
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.experiments.clear();
    this.impressions = [];
    this.userAssignments.clear();
  }
}

/**
 * Default A/B test configurations for common landing page experiments
 */
export const DEFAULT_EXPERIMENTS: ABTestExperiment[] = [
  {
    id: 'hero-cta-color',
    name: 'Hero CTA Button Color',
    status: 'active',
    variants: [
      { id: 'control', name: 'Cyan (Control)', weight: 50 },
      { id: 'green', name: 'Green', weight: 25 },
      { id: 'purple', name: 'Purple', weight: 25 },
    ],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    metrics: ['click_through_rate', 'conversion_rate'],
  },
  {
    id: 'hero-headline',
    name: 'Hero Section Headline',
    status: 'active',
    variants: [
      { id: 'control', name: 'The Ultimate Gaming Community Platform', weight: 33 },
      { id: 'competitive', name: 'Compete. Connect. Conquer.', weight: 33 },
      { id: 'social', name: 'Where Gamers Unite and Legends Are Born', weight: 34 },
    ],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    metrics: ['bounce_rate', 'time_on_page', 'signup_rate'],
  },
  {
    id: 'social-proof',
    name: 'Social Proof Display',
    status: 'active',
    variants: [
      { id: 'control', name: 'No Social Proof', weight: 50 },
      { id: 'testimonials', name: 'User Testimonials', weight: 25 },
      { id: 'stats', name: 'Platform Statistics', weight: 25 },
    ],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    metrics: ['trust_score', 'conversion_rate'],
  },
];