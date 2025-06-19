/**
 * @jest-environment jsdom
 */

import type { CSSProperties } from 'react';
import type { CSSCustomProperties } from '../css-properties';
import { hasCustomProperties, mergeStyles } from '../css-properties';

describe('CSS Custom Properties Types', () => {
  describe('CSSCustomProperties interface', () => {
    test('extends CSSProperties with custom properties', () => {
      const styles: CSSCustomProperties = {
        color: 'red',
        '--content-height': '100px',
        '--animation-delay': '0.5s',
        '--gradient-angle': '45deg',
      };

      expect(styles.color).toBe('red');
      expect(styles['--content-height']).toBe('100px');
      expect(styles['--animation-delay']).toBe('0.5s');
      expect(styles['--gradient-angle']).toBe('45deg');
    });

    test('allows all predefined custom properties', () => {
      const styles: CSSCustomProperties = {
        '--content-height': '200px',
        '--animation-delay': '1s',
        '--animation-duration': '2s',
        '--hover-scale': '1.1',
        '--hover-opacity': '0.8',
        '--gradient-angle': '90deg',
        '--gradient-start': '#ff0000',
        '--gradient-end': '#0000ff',
        '--border-width': '2px',
        '--border-color': '#333',
        '--shadow-color': 'rgba(0,0,0,0.2)',
        '--shadow-blur': '10px',
        '--transform-x': '10px',
        '--transform-y': '-5px',
        '--transform-rotate': '45deg',
      };

      expect(styles['--content-height']).toBe('200px');
      expect(styles['--animation-delay']).toBe('1s');
      expect(styles['--animation-duration']).toBe('2s');
      expect(styles['--hover-scale']).toBe('1.1');
      expect(styles['--hover-opacity']).toBe('0.8');
      expect(styles['--gradient-angle']).toBe('90deg');
      expect(styles['--gradient-start']).toBe('#ff0000');
      expect(styles['--gradient-end']).toBe('#0000ff');
      expect(styles['--border-width']).toBe('2px');
      expect(styles['--border-color']).toBe('#333');
      expect(styles['--shadow-color']).toBe('rgba(0,0,0,0.2)');
      expect(styles['--shadow-blur']).toBe('10px');
      expect(styles['--transform-x']).toBe('10px');
      expect(styles['--transform-y']).toBe('-5px');
      expect(styles['--transform-rotate']).toBe('45deg');
    });

    test('allows dynamic custom properties with template literal type', () => {
      const styles: CSSCustomProperties = {
        '--custom-property': 'value',
        '--my-color': '#ff0000',
        '--dynamic-width': '50%',
      };

      expect(styles['--custom-property']).toBe('value');
      expect(styles['--my-color']).toBe('#ff0000');
      expect(styles['--dynamic-width']).toBe('50%');
    });

    test('accepts number values for custom properties', () => {
      const styles: CSSCustomProperties = {
        '--opacity': 0.5,
        '--z-index': 100,
        '--scale': 1.2,
      };

      expect(styles['--opacity']).toBe(0.5);
      expect(styles['--z-index']).toBe(100);
      expect(styles['--scale']).toBe(1.2);
    });

    test('accepts undefined values for optional properties', () => {
      const styles: CSSCustomProperties = {
        '--content-height': undefined,
        '--animation-delay': '1s',
      };

      expect(styles['--content-height']).toBeUndefined();
      expect(styles['--animation-delay']).toBe('1s');
    });
  });

  describe('React CSSProperties module augmentation', () => {
    test('standard React CSSProperties includes custom properties', () => {
      const styles: CSSProperties = {
        color: 'blue',
        '--content-height': '150px',
        '--hover-scale': '1.05',
      };

      expect(styles.color).toBe('blue');
      expect(styles['--content-height']).toBe('150px');
      expect(styles['--hover-scale']).toBe('1.05');
    });

    test('module augmentation allows any custom property with -- prefix', () => {
      const styles: CSSProperties = {
        '--my-custom-var': 'custom-value',
        '--another-var': 42,
      };

      expect(styles['--my-custom-var']).toBe('custom-value');
      expect(styles['--another-var']).toBe(42);
    });
  });
});

describe('hasCustomProperties type guard', () => {
  test('returns true when style object contains custom properties', () => {
    const styleWithCustom: CSSProperties = {
      color: 'red',
      '--content-height': '100px',
    };

    const result = hasCustomProperties(styleWithCustom);

    expect(result).toBe(true);
  });

  test('returns false when style object contains no custom properties', () => {
    const styleWithoutCustom: CSSProperties = {
      color: 'red',
      fontSize: '16px',
      margin: '10px',
    };

    const result = hasCustomProperties(styleWithoutCustom);

    expect(result).toBe(false);
  });

  test('returns true when style object contains only custom properties', () => {
    const customOnlyStyle: CSSProperties = {
      '--animation-delay': '0.5s',
      '--hover-scale': '1.1',
    };

    const result = hasCustomProperties(customOnlyStyle);

    expect(result).toBe(true);
  });

  test('returns false for empty style object', () => {
    const emptyStyle: CSSProperties = {};

    const result = hasCustomProperties(emptyStyle);

    expect(result).toBe(false);
  });

  test('returns true when custom property key starts with --', () => {
    const styleWithDashes: CSSProperties = {
      '--my-var': 'value',
      color: 'blue',
    };

    const result = hasCustomProperties(styleWithDashes);

    expect(result).toBe(true);
  });

  test('returns false when no keys start with --', () => {
    const styleWithoutDashes: CSSProperties = {
      color: 'blue',
      fontSize: '14px',
      backgroundColor: 'white',
    };

    const result = hasCustomProperties(styleWithoutDashes);

    expect(result).toBe(false);
  });

  test('correctly narrows type when used as type guard', () => {
    const style: CSSProperties | CSSCustomProperties = {
      '--content-height': '200px',
      color: 'green',
    };

    if (hasCustomProperties(style)) {
      // TypeScript should now know this is CSSCustomProperties
      expect(style['--content-height']).toBe('200px');
    }
  });
});

describe('mergeStyles helper', () => {
  test('merges base CSS properties with custom properties', () => {
    const baseStyles: CSSProperties = {
      color: 'red',
      fontSize: '16px',
      margin: '10px',
    };

    const customStyles: Partial<CSSCustomProperties> = {
      '--content-height': '100px',
      '--animation-delay': '0.5s',
    };

    const result = mergeStyles(baseStyles, customStyles);

    expect(result.color).toBe('red');
    expect(result.fontSize).toBe('16px');
    expect(result.margin).toBe('10px');
    expect(result['--content-height']).toBe('100px');
    expect(result['--animation-delay']).toBe('0.5s');
  });

  test('custom properties override base properties with same keys', () => {
    const baseStyles: CSSProperties = {
      color: 'red',
      '--content-height': '50px',
    };

    const customStyles: Partial<CSSCustomProperties> = {
      '--content-height': '200px',
      '--animation-delay': '1s',
    };

    const result = mergeStyles(baseStyles, customStyles);

    expect(result.color).toBe('red');
    expect(result['--content-height']).toBe('200px');
    expect(result['--animation-delay']).toBe('1s');
  });

  test('handles empty custom styles object', () => {
    const baseStyles: CSSProperties = {
      color: 'blue',
      fontSize: '14px',
    };

    const customStyles: Partial<CSSCustomProperties> = {};

    const result = mergeStyles(baseStyles, customStyles);

    expect(result.color).toBe('blue');
    expect(result.fontSize).toBe('14px');
    expect(Object.keys(result)).toHaveLength(2);
  });

  test('handles empty base styles object', () => {
    const baseStyles: CSSProperties = {};

    const customStyles: Partial<CSSCustomProperties> = {
      '--animation-duration': '2s',
      '--hover-opacity': '0.7',
    };

    const result = mergeStyles(baseStyles, customStyles);

    expect(result['--animation-duration']).toBe('2s');
    expect(result['--hover-opacity']).toBe('0.7');
    expect(Object.keys(result)).toHaveLength(2);
  });

  test('preserves both standard and custom properties from base', () => {
    const baseStyles: CSSProperties = {
      color: 'green',
      '--base-var': 'base-value',
    };

    const customStyles: Partial<CSSCustomProperties> = {
      '--custom-var': 'custom-value',
    };

    const result = mergeStyles(baseStyles, customStyles);

    expect(result.color).toBe('green');
    expect(result['--base-var']).toBe('base-value');
    expect(result['--custom-var']).toBe('custom-value');
  });

  test('returns CSSCustomProperties type', () => {
    const baseStyles: CSSProperties = { color: 'red' };
    const customStyles: Partial<CSSCustomProperties> = {
      '--content-height': '100px',
    };

    const result = mergeStyles(baseStyles, customStyles);

    // This should be typed as CSSCustomProperties
    expect(result['--content-height']).toBe('100px');
    expect(result.color).toBe('red');
  });

  test('handles undefined values in custom properties', () => {
    const baseStyles: CSSProperties = {
      color: 'red',
    };

    const customStyles: Partial<CSSCustomProperties> = {
      '--content-height': undefined,
      '--animation-delay': '0.5s',
    };

    const result = mergeStyles(baseStyles, customStyles);

    expect(result.color).toBe('red');
    expect(result['--content-height']).toBeUndefined();
    expect(result['--animation-delay']).toBe('0.5s');
  });

  test('handles numeric values in custom properties', () => {
    const baseStyles: CSSProperties = {
      opacity: 1,
    };

    const customStyles: Partial<CSSCustomProperties> = {
      '--z-index': 100,
      '--scale': 1.5,
    };

    const result = mergeStyles(baseStyles, customStyles);

    expect(result.opacity).toBe(1);
    expect(result['--z-index']).toBe(100);
    expect(result['--scale']).toBe(1.5);
  });
});
