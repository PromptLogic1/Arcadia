/**
 * Type-safe CSS custom properties
 *
 * This provides proper typing for CSS custom properties used in animations
 * and dynamic styling throughout the application.
 */

import type { CSSProperties } from 'react';

/**
 * Extend CSSProperties to include CSS custom properties
 */
declare module 'react' {
  interface CSSProperties {
    '--content-height'?: string;
    '--animation-delay'?: string;
    '--animation-duration'?: string;
    '--hover-scale'?: string;
    '--hover-opacity'?: string;
    '--gradient-angle'?: string;
    '--gradient-start'?: string;
    '--gradient-end'?: string;
    '--border-width'?: string;
    '--border-color'?: string;
    '--shadow-color'?: string;
    '--shadow-blur'?: string;
    '--transform-x'?: string;
    '--transform-y'?: string;
    '--transform-rotate'?: string;
    [key: `--${string}`]: string | number | undefined;
  }
}

/**
 * CSS custom properties for animations and dynamic styling
 */
export interface CSSCustomProperties extends CSSProperties {
  '--content-height'?: string;
  '--animation-delay'?: string;
  '--animation-duration'?: string;
  '--hover-scale'?: string;
  '--hover-opacity'?: string;
  '--gradient-angle'?: string;
  '--gradient-start'?: string;
  '--gradient-end'?: string;
  '--border-width'?: string;
  '--border-color'?: string;
  '--shadow-color'?: string;
  '--shadow-blur'?: string;
  '--transform-x'?: string;
  '--transform-y'?: string;
  '--transform-rotate'?: string;
}

/**
 * Type guard to check if a style object includes custom properties
 */
export function hasCustomProperties(
  style: CSSProperties | CSSCustomProperties
): style is CSSCustomProperties {
  return Object.keys(style).some(key => key.startsWith('--'));
}

/**
 * Helper to merge CSS properties with custom properties safely
 */
export function mergeStyles(
  base: CSSProperties,
  custom: Partial<CSSCustomProperties>
): CSSCustomProperties {
  return { ...base, ...custom };
}
