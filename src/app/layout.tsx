import { type Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ScrollToTop from '../components/ui/ScrollToTop';
import { Providers } from '../components/providers';
import { SafeRootWrapper } from '../components/error-boundaries/SafeRootWrapper';
import '../styles/globals.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Arcadia',
  description: 'Gaming Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SafeRootWrapper>
          <Providers>
            {/* Skip to main content link for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-cyan-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
            >
              Skip to main content
            </a>
            <Header />
            <main id="main-content" tabIndex={-1} className="pt-20">
              {children}
            </main>
            <Footer />
            <ScrollToTop />
            <Analytics />
            <SpeedInsights />
          </Providers>
        </SafeRootWrapper>
      </body>
    </html>
  );
}
