'use client';

import React, { useState, Suspense, useRef, lazy } from 'react';
import HeroSection from './heroSection';
// Icon imports removed - using iconName strings instead

// Dynamic imports for landing page sections to improve initial load time
const TryDemoGame = lazy(() => import('./TryDemoGame'));
const FeaturedChallenges = lazy(() => import('./FeaturedChallenges'));
const FeaturedGamesCarousel = lazy(() => import('./FeaturedGamesCarousel'));
const FAQSection = lazy(() => import('./FAQSection'));
const PartnersSection = lazy(() => import('./PartnersSection'));
const UpcomingEventsSection = lazy(() => import('./UpcomingEventsSection'));

// Loading component for Suspense boundaries
const SectionLoading = () => (
  <div className="flex min-h-[400px] items-center justify-center contain-paint">
    <div className="animate-pulse text-cyan-400">Loading...</div>
  </div>
);

// Example challenge data for HeroSection and FeaturedChallenges
const challenges = [
  {
    id: 'challenge-1',
    name: 'Speedrun Showdown',
    iconName: 'Gauge' as const,
    description: 'Complete the level as fast as possible!',
    details:
      'Race against the clock and other players to finish the level in record time.',
    keyFeatures: ['Time Trials', 'Leaderboards', 'Replay System'],
    difficulty: 'Medium',
    estimatedTime: '10-20 min',
  },
  {
    id: 'challenge-2',
    name: 'Puzzle Master',
    iconName: 'Puzzle' as const,
    description: 'Solve challenging puzzles to progress.',
    details: 'Test your wits and logic in a series of mind-bending puzzles.',
    keyFeatures: ['Hints', 'Progressive Difficulty', 'Achievements'],
    difficulty: 'Hard',
    estimatedTime: '20-40 min',
  },
  {
    id: 'challenge-3',
    name: 'Co-op Quest',
    iconName: 'Users' as const,
    description: 'Team up with friends to complete objectives.',
    details: 'Work together to overcome obstacles and achieve victory.',
    keyFeatures: ['Multiplayer', 'Teamwork', 'Shared Rewards'],
    difficulty: 'Easy',
    estimatedTime: '15-30 min',
  },
];

import { BaseErrorBoundary } from '@/components/error-boundaries';

export default function LandingPage() {
  // Track if component has mounted to prevent hydration issues
  const [isMounted, setIsMounted] = useState(false);

  // For HeroSection animation/demo
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [isHeroVisible, setIsHeroVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set mounted state after hydration
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cycle through challenges only when hero section is visible
  React.useEffect(() => {
    if (!isHeroVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const challengesCount = challenges.length;
    intervalRef.current = setInterval(() => {
      setCurrentChallenge(prev => (prev + 1) % challengesCount);
    }, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isHeroVisible]);

  // Intersection Observer for hero section visibility
  React.useEffect(() => {
    const heroElement = heroRef.current;
    if (!heroElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsHeroVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(heroElement);

    return () => {
      observer.unobserve(heroElement);
    };
  }, []);

  return (
    <BaseErrorBoundary level="page">
      <div
        className="text-foreground min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
        suppressHydrationWarning
      >
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-24 focus:left-4 focus:z-[10000] focus:rounded-md focus:border-2 focus:border-cyan-400 focus:bg-cyan-600 focus:px-6 focus:py-3 focus:text-white focus:shadow-xl"
          aria-label="Skip to main content"
        >
          Skip to main content
        </a>

        <main
          id="main-content"
          role="main"
          aria-label="Arcadia Gaming Platform"
        >
          <div ref={heroRef}>
            <BaseErrorBoundary level="component">
              <HeroSection
                currentChallenge={currentChallenge}
                challenges={challenges}
                isMounted={isMounted}
              />
            </BaseErrorBoundary>
          </div>

          {/* Demo Game Section - High Priority for User Engagement */}
          <section className="min-h-[400px] contain-layout">
            <Suspense fallback={<SectionLoading />}>
              <TryDemoGame />
            </Suspense>
          </section>

          <section className="min-h-[400px] contain-layout">
            <Suspense fallback={<SectionLoading />}>
              <FeaturedChallenges challenges={challenges} />
            </Suspense>
          </section>

          <section className="min-h-[400px] contain-layout">
            <Suspense fallback={<SectionLoading />}>
              <FeaturedGamesCarousel />
            </Suspense>
          </section>

          <section className="min-h-[400px] contain-layout">
            <Suspense fallback={<SectionLoading />}>
              <UpcomingEventsSection />
            </Suspense>
          </section>

          <section className="min-h-[400px] contain-layout">
            <Suspense fallback={<SectionLoading />}>
              <PartnersSection />
            </Suspense>
          </section>

          <section className="min-h-[400px] contain-layout">
            <Suspense fallback={<SectionLoading />}>
              <FAQSection />
            </Suspense>
          </section>
        </main>
      </div>
    </BaseErrorBoundary>
  );
}
