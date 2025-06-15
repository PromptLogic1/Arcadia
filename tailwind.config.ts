import type { Config } from 'tailwindcss';

const config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
        '3xl': '1800px',
      },
    },
    extend: {
      keyframes: {
        // Essential UI animations (keep these - they're for components)
        'collapse-down': {
          from: { height: '0', opacity: '0' },
          to: {
            height: 'var(--radix-collapsible-content-height)',
            opacity: '1',
          },
        },
        'collapse-up': {
          from: {
            height: 'var(--radix-collapsible-content-height)',
            opacity: '1',
          },
          to: { height: '0', opacity: '0' },
        },
        // Essential cyberpunk animations (reduced to 5 most important)
        'gentle-glow': {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.01)' },
        },
        'subtle-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'soft-pulse': {
          '0%, 100%': { boxShadow: '0 0 4px currentColor' },
          '50%': { boxShadow: '0 0 8px currentColor' },
        },
        'minimal-fade': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'cyberpunk-accent': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        // UI component animations
        'collapse-down': 'collapse-down 0.2s ease-out',
        'collapse-up': 'collapse-up 0.2s ease-out',
        // Essential cyberpunk animations with prefers-reduced-motion support
        'gentle-glow': 'gentle-glow 4s ease-in-out infinite',
        'subtle-float': 'subtle-float 6s ease-in-out infinite',
        'soft-pulse': 'soft-pulse 3s ease-in-out infinite',
        'minimal-fade': 'minimal-fade 0.3s ease-out',
        'cyberpunk-accent': 'cyberpunk-accent 8s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
