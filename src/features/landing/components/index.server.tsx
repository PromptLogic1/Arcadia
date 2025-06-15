import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { BaseErrorBoundary } from '@/components/error-boundaries';
import { ClientSectionWrapper } from './ClientSectionWrapper';
import { GaugeIcon, PuzzleIcon, UsersIcon } from '@/components/ui/Icons';

// Import server components directly
import FAQSectionServer from './FAQSection.server';
import PartnersSectionServer from './PartnersSection.server';
import UpcomingEventsSectionServer from './UpcomingEventsSection.server';

// Dynamic imports for client components
const HeroSectionClient = dynamic(() => import('./HeroSectionClient'), {
  loading: () => <SectionLoading />,
});

const TryDemoGame = dynamic(() => import('./TryDemoGame'), {
  loading: () => <SectionLoading />,
});

const FeaturedChallenges = dynamic(() => import('./FeaturedChallenges'), {
  loading: () => <SectionLoading />,
});

// Type-safe icon mapping
const iconMap = {
  Gauge: GaugeIcon,
  Puzzle: PuzzleIcon,
  Users: UsersIcon,
} as const;

// Challenge data for featured challenges with proper typing
const challengeData = [
  {
    id: 'challenge-1',
    name: 'Speedrun Showdown',
    iconKey: 'Gauge' as const,
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
    iconKey: 'Puzzle' as const,
    description: 'Solve challenging puzzles to progress.',
    details: 'Test your wits and logic in a series of mind-bending puzzles.',
    keyFeatures: ['Hints', 'Progressive Difficulty', 'Achievements'],
    difficulty: 'Hard',
    estimatedTime: '20-40 min',
  },
  {
    id: 'challenge-3',
    name: 'Co-op Quest',
    iconKey: 'Users' as const,
    description: 'Team up with friends to complete objectives.',
    details: 'Work together to overcome obstacles and achieve victory.',
    keyFeatures: ['Multiplayer', 'Teamwork', 'Shared Rewards'],
    difficulty: 'Easy',
    estimatedTime: '15-30 min',
  },
];

const FeaturedGamesCarousel = dynamic(() => import('./FeaturedGamesCarousel'), {
  loading: () => <SectionLoading />,
});

// Loading component for Suspense boundaries
const SectionLoading = () => (
  <div className="flex min-h-[400px] items-center justify-center contain-paint">
    <div className="animate-pulse text-cyan-400">Loading...</div>
  </div>
);

// Server Component - renders on server, reducing client bundle
export default function LandingPageServer() {
  return (
    <BaseErrorBoundary level="page">
      <div className="text-foreground min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
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
          {/* Hero Section - requires client-side interactivity */}
          <BaseErrorBoundary level="component">
            <HeroSectionClient />
          </BaseErrorBoundary>

          {/* Demo Game Section - requires client-side interactivity */}
          <section className="min-h-[400px] contain-layout">
            <Suspense fallback={<SectionLoading />}>
              <TryDemoGame />
            </Suspense>
          </section>

          {/* Featured Challenges - requires client-side interactivity */}
          <section className="min-h-[400px] contain-layout">
            <Suspense fallback={<SectionLoading />}>
              <FeaturedChallenges
                challenges={challengeData.map(challenge => ({
                  name: challenge.name,
                  icon: iconMap[challenge.iconKey],
                  description: challenge.description,
                  details: challenge.details,
                  keyFeatures: challenge.keyFeatures,
                  difficulty: challenge.difficulty,
                  estimatedTime: challenge.estimatedTime,
                }))}
              />
            </Suspense>
          </section>

          {/* Featured Games Carousel - requires client-side interactivity */}
          <section className="min-h-[400px] contain-layout">
            <Suspense fallback={<SectionLoading />}>
              <FeaturedGamesCarousel />
            </Suspense>
          </section>

          {/* Upcoming Events - Server Component with client wrapper for animations */}
          <section className="min-h-[400px] contain-layout">
            <ClientSectionWrapper
              floatingElementsConfig={{
                variant: 'hexagons',
                count: 15,
                speed: 'fast',
                color: 'emerald',
              }}
            >
              <UpcomingEventsSectionServer />
            </ClientSectionWrapper>
          </section>

          {/* Partners Section - Server Component with client wrapper for animations */}
          <section className="min-h-[400px] contain-layout">
            <ClientSectionWrapper
              floatingElementsConfig={{
                variant: 'lines',
                count: 15,
                speed: 'medium',
                color: 'yellow',
              }}
            >
              <PartnersSectionServer />
            </ClientSectionWrapper>
          </section>

          {/* FAQ Section - Server Component with client wrapper for animations */}
          <section className="min-h-[400px] contain-layout">
            <ClientSectionWrapper
              floatingElementsConfig={{
                variant: 'circuits',
                count: 15,
                speed: 'slow',
                color: 'purple',
              }}
            >
              <FAQSectionServer />
            </ClientSectionWrapper>
          </section>
        </main>
      </div>
    </BaseErrorBoundary>
  );
}
