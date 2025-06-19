import { cyberpunkStyles } from '../cyberpunk.styles';

describe('cyberpunkStyles', () => {
  describe('input styles', () => {
    test('should contain proper Tailwind classes for cyberpunk input styling', () => {
      const inputClasses = cyberpunkStyles.input;
      
      // Check for border and color classes
      expect(inputClasses).toContain('border-cyan-500/30');
      expect(inputClasses).toContain('bg-slate-800/50');
      expect(inputClasses).toContain('text-cyan-100');
      expect(inputClasses).toContain('placeholder-cyan-300/50');
      
      // Check for focus states
      expect(inputClasses).toContain('focus:border-cyan-400');
      expect(inputClasses).toContain('focus:ring-cyan-400/20');
      
      // Check for effects
      expect(inputClasses).toContain('backdrop-blur-sm');
      expect(inputClasses).toContain('transition-all');
      expect(inputClasses).toContain('duration-200');
    });
  });

  describe('tab styles', () => {
    test('should contain proper Tailwind classes for cyberpunk tab styling', () => {
      const tabClasses = cyberpunkStyles.tab;
      
      // Check for data-state active styling
      expect(tabClasses).toContain('data-[state=active]:bg-gradient-to-r');
      expect(tabClasses).toContain('data-[state=active]:from-cyan-500/20');
      expect(tabClasses).toContain('data-[state=active]:to-purple-500/20');
      expect(tabClasses).toContain('data-[state=active]:text-cyan-100');
      expect(tabClasses).toContain('data-[state=active]:border-cyan-400/50');
      
      // Check for inactive state
      expect(tabClasses).toContain('text-cyan-200/70');
      
      // Check for transition
      expect(tabClasses).toContain('transition-all');
      expect(tabClasses).toContain('duration-200');
    });
  });

  describe('scanlines styles', () => {
    test('should contain proper container classes', () => {
      const { container } = cyberpunkStyles.scanlines;
      
      expect(container).toContain('relative');
      expect(container).toContain('overflow-hidden');
    });

    test('should contain proper after pseudo-element classes for scanline effect', () => {
      const { after } = cyberpunkStyles.scanlines;
      
      // Check for pseudo-element setup
      expect(after).toContain('after:content-[""]');
      expect(after).toContain('after:absolute');
      expect(after).toContain('after:top-0');
      expect(after).toContain('after:left-0');
      expect(after).toContain('after:right-0');
      expect(after).toContain('after:h-[2px]');
      
      // Check for gradient and animation
      expect(after).toContain('after:bg-gradient-to-r');
      expect(after).toContain('after:from-transparent');
      expect(after).toContain('after:via-cyan-500/80');
      expect(after).toContain('after:to-transparent');
      expect(after).toContain('after:animate-cyberpunk-accent');
      
      // Check for accessibility and interaction
      expect(after).toContain('motion-reduce:after:animate-none');
      expect(after).toContain('after:pointer-events-none');
    });
  });

  describe('neonGlow styles', () => {
    test('should contain cyan glow styles', () => {
      const cyanGlow = cyberpunkStyles.neonGlow.cyan;
      
      expect(cyanGlow).toContain('text-cyan-300');
      expect(cyanGlow).toContain('[text-shadow:0_0_4px_theme(colors.cyan.400/70)]');
    });

    test('should contain purple glow styles', () => {
      const purpleGlow = cyberpunkStyles.neonGlow.purple;
      
      expect(purpleGlow).toContain('text-purple-300');
      expect(purpleGlow).toContain('[text-shadow:0_0_4px_theme(colors.purple.400/70)]');
    });

    test('should contain fuchsia glow styles', () => {
      const fuchsiaGlow = cyberpunkStyles.neonGlow.fuchsia;
      
      expect(fuchsiaGlow).toContain('text-fuchsia-300');
      expect(fuchsiaGlow).toContain('[text-shadow:0_0_4px_theme(colors.fuchsia.400/70)]');
    });

    test('should contain emerald glow styles', () => {
      const emeraldGlow = cyberpunkStyles.neonGlow.emerald;
      
      expect(emeraldGlow).toContain('text-emerald-300');
      expect(emeraldGlow).toContain('[text-shadow:0_0_4px_theme(colors.emerald.400/70)]');
    });

    test('all neon glow variants should follow consistent pattern', () => {
      const glowVariants = Object.values(cyberpunkStyles.neonGlow);
      
      glowVariants.forEach(glowStyle => {
        expect(glowStyle).toMatch(/text-\w+-300/);
        expect(glowStyle).toMatch(/\[text-shadow:0_0_4px_theme\(colors\.\w+\.400\/70\)\]/);
      });
    });
  });

  describe('type safety', () => {
    test('should be properly typed as const', () => {
      // This test ensures TypeScript maintains the const assertion
      const testInput: string = cyberpunkStyles.input;
      const testTab: string = cyberpunkStyles.tab;
      
      expect(typeof testInput).toBe('string');
      expect(typeof testTab).toBe('string');
    });

    test('scanlines object should have correct structure', () => {
      expect(cyberpunkStyles.scanlines).toHaveProperty('container');
      expect(cyberpunkStyles.scanlines).toHaveProperty('after');
      expect(typeof cyberpunkStyles.scanlines.container).toBe('string');
      expect(typeof cyberpunkStyles.scanlines.after).toBe('string');
    });

    test('neonGlow object should have all color variants', () => {
      const expectedColors = ['cyan', 'purple', 'fuchsia', 'emerald'];
      
      expectedColors.forEach(color => {
        expect(cyberpunkStyles.neonGlow).toHaveProperty(color);
        expect(typeof cyberpunkStyles.neonGlow[color as keyof typeof cyberpunkStyles.neonGlow]).toBe('string');
      });
    });
  });

  describe('consistency checks', () => {
    test('all styles should use consistent transition duration', () => {
      const stylesWithTransitions = [
        cyberpunkStyles.input,
        cyberpunkStyles.tab,
      ];
      
      stylesWithTransitions.forEach(style => {
        if (style.includes('transition')) {
          expect(style).toContain('duration-200');
        }
      });
    });

    test('should use consistent color palette', () => {
      const allStyles = [
        cyberpunkStyles.input,
        cyberpunkStyles.tab,
        cyberpunkStyles.scanlines.after,
        ...Object.values(cyberpunkStyles.neonGlow),
      ].join(' ');
      
      // Check that we're using the cyberpunk color palette consistently
      expect(allStyles).toMatch(/cyan-\d+/);
      expect(allStyles).toMatch(/(purple|fuchsia|emerald)-\d+/);
    });
  });
});