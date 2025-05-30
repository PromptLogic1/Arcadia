'use client';

import { ThemeProvider } from './ui/theme-provider';
import { AuthProvider } from './auth/auth-provider';
import { Suspense } from 'react';
import AuthLoader from './auth/auth-loader';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Suspense fallback={<AuthLoader />}>
        <AuthProvider>{children}</AuthProvider>
      </Suspense>
    </ThemeProvider>
  );
}
