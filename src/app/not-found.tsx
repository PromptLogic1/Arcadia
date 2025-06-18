'use client';

import { RouteErrorBoundary } from '@/components/error-boundaries';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { NeonText } from '@/components/ui/NeonText';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Home,
  Search,
  ArrowLeft,
  MapPin,
} from '@/components/ui/Icons';

export default function NotFound() {
  return (
    <RouteErrorBoundary routeName="NotFound">
      <CyberpunkBackground
        variant="grid"
        intensity="subtle"
        className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30"
      >
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            {/* 404 Hero Section */}
            <div className="mb-8">
              <h1 className="mb-4">
                <NeonText
                  variant="solid"
                  className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl"
                >
                  404
                </NeonText>
              </h1>
              <h2 className="mb-6 text-2xl font-bold text-cyan-200 sm:text-3xl">
                Page Not Found
              </h2>
              <p className="text-lg leading-relaxed text-cyan-200/80">
                Looks like this page got lost in the digital void. The page you're looking for 
                might have been moved, deleted, or never existed in the first place.
              </p>
            </div>

            {/* Helpful Content Card */}
            <Card variant="primary" className="mb-8">
              <CardHeader>
                <CardTitle className="neon-glow-cyan flex items-center justify-center gap-2 text-xl">
                  <MapPin className="h-6 w-6" />
                  What can you do?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-left text-cyan-200/90">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400"></span>
                    Check the URL for typing errors
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400"></span>
                    Use the navigation to find what you're looking for
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400"></span>
                    Try searching for content from the home page
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400"></span>
                    Go back to the previous page using your browser
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Navigation Options */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/">
                <Button
                  variant="primary"
                  size="lg"
                  className="px-6 py-3 text-lg"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Back to Home
                </Button>
              </Link>
              
              <Link href="/play-area">
                <Button
                  variant="secondary"
                  size="lg"
                  className="px-6 py-3 text-lg"
                >
                  <Search className="mr-2 h-5 w-5" />
                  Browse Games
                </Button>
              </Link>
              
              <Button
                variant="secondary"
                size="lg"
                className="px-6 py-3 text-lg"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Go Back
              </Button>
            </div>

            {/* Additional Help */}
            <div className="mt-12 text-sm text-cyan-200/60">
              <p>
                If you believe this is an error, please contact support or try again later.
              </p>
            </div>
          </div>
        </div>
      </CyberpunkBackground>
    </RouteErrorBoundary>
  );
}