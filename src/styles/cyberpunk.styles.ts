// Cyberpunk theme styles
export const cyberpunkStyles = {
  input:
    'border-cyan-500/30 bg-slate-800/50 text-cyan-100 placeholder-cyan-300/50 focus:border-cyan-400 focus:ring-cyan-400/20 backdrop-blur-sm transition-all duration-200',

  tab: 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-cyan-100 data-[state=active]:border-cyan-400/50 text-cyan-200/70 transition-all duration-200',

  scanlines: {
    container: 'relative overflow-hidden',
    after:
      'after:content-[""] after:absolute after:top-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-transparent after:via-cyan-500/80 after:to-transparent after:animate-cyberpunk-accent motion-reduce:after:animate-none after:pointer-events-none',
  },

  neonGlow: {
    cyan: 'text-cyan-300 [text-shadow:0_0_4px_theme(colors.cyan.400/70)]',
    purple: 'text-purple-300 [text-shadow:0_0_4px_theme(colors.purple.400/70)]',
    fuchsia:
      'text-fuchsia-300 [text-shadow:0_0_4px_theme(colors.fuchsia.400/70)]',
    emerald:
      'text-emerald-300 [text-shadow:0_0_4px_theme(colors.emerald.400/70)]',
  },
} as const;
