'use client';

import React from 'react';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  // Suppress hydration warnings for theme-related changes
  // Since we're forcing dark theme, this should be consistent
  return <div suppressHydrationWarning data-testid="theme-wrapper">{children}</div>;
}
