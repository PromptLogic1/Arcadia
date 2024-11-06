import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

// Dynamic imports with preload
const Header = dynamic(() => import("@/components/Header"), {
  loading: () => <LoadingSpinner />,
  ssr: true,
})

const Footer = dynamic(() => import("@/components/Footer"), {
  loading: () => <LoadingSpinner />,
  ssr: true,
})

// Font optimization
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
})

export const metadata: Metadata = {
  title: "Arcadia - Gaming Community Platform",
  description: "Join Arcadia, the ultimate gaming community platform for challenges, discussions, and events.",
  keywords: ["gaming", "community", "challenges", "esports", "events"],
  openGraph: {
    title: "Arcadia - Gaming Community Platform",
    description: "Join Arcadia, the ultimate gaming community platform for challenges, discussions, and events.",
    images: [{ url: "/og-image.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arcadia - Gaming Community Platform",
    description: "Join Arcadia, the ultimate gaming community platform for challenges, discussions, and events.",
    images: ["/twitter-image.jpg"],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
  childPropSegment?: string;
}

export default function RootLayout({
  children,
}: Readonly<RootLayoutProps>) {
  // Check if the current path is an auth route
  const isAuthPage = (children as { props?: { childPropSegment?: string } })?.props?.childPropSegment === 'auth'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ErrorBoundary>
            <ServiceWorkerRegistration />
            {isAuthPage ? (
              <main>
                <Suspense fallback={<LoadingSpinner />}>
                  {children}
                </Suspense>
              </main>
            ) : (
              <div className="flex flex-col min-h-screen">
                <Suspense fallback={<LoadingSpinner />}>
                  <Header />
                </Suspense>
                <main className="flex-grow">
                  <Suspense fallback={<LoadingSpinner />}>
                    {children}
                  </Suspense>
                </main>
                <Suspense fallback={<LoadingSpinner />}>
                  <Footer />
                </Suspense>
              </div>
            )}
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}