'use client';

import { ThemeProvider } from './ui/ThemeProvider';
import { AuthProvider } from './auth/AuthProvider';
import { Suspense } from 'react';
import AuthLoader from './auth/AuthLoader';

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
