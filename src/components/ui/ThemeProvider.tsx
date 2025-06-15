'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

type ThemeProviderProps = Parameters<typeof NextThemesProvider>[0] & {
  suppressHydrationWarning?: boolean;
};

export function ThemeProvider({
  children,
  suppressHydrationWarning,
  ...props
}: ThemeProviderProps) {
  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </div>
  );
}
