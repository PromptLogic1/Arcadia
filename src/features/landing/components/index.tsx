'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import HeroSection from './heroSection';
import { GiSpeedometer, GiPuzzle, GiTeamUpgrade } from 'react-icons/gi';

// Lazy load heavy components
const TryDemoGame = dynamic(() => import('./TryDemoGame').then(mod => ({ default: mod.TryDemoGame })), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-pulse text-cyan-400">Loading...</div></div>,
  ssr: true
});

const FeaturedChallenges = dynamic(() => import('./FeaturedChallenges'), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-pulse text-cyan-400">Loading...</div></div>,
  ssr: true
});

const FeaturedGamesCarousel = dynamic(() => import('./FeaturedGamesCarousel'), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-pulse text-cyan-400">Loading...</div></div>,
  ssr: true
});

const FAQSection = dynamic(() => import('./FAQSection'), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-pulse text-cyan-400">Loading...</div></div>,
  ssr: true
});

const PartnersSection = dynamic(() => import('./PartnersSection'), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-pulse text-cyan-400">Loading...</div></div>,
  ssr: true
});

const UpcomingEventsSection = dynamic(() => import('./UpcomingEventsSection'), {
  loading: () => <div className="h-96 flex items-center justify-center"><div className="animate-pulse text-cyan-400">Loading...</div></div>,
  ssr: true
});

// Example challenge data for HeroSection and FeaturedChallenges
const challenges = [
  {
    id: 'challenge-1',
    name: 'Speedrun Showdown',
    icon: GiSpeedometer,
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
    icon: GiPuzzle,
    description: 'Solve challenging puzzles to progress.',
    details: 'Test your wits and logic in a series of mind-bending puzzles.',
    keyFeatures: ['Hints', 'Progressive Difficulty', 'Achievements'],
    difficulty: 'Hard',
    estimatedTime: '20-40 min',
  },
  {
    id: 'challenge-3',
    name: 'Co-op Quest',
    icon: GiTeamUpgrade,
    description: 'Team up with friends to complete objectives.',
    details: 'Work together to overcome obstacles and achieve victory.',
    keyFeatures: ['Multiplayer', 'Teamwork', 'Shared Rewards'],
    difficulty: 'Easy',
    estimatedTime: '15-30 min',
  },
];

export default function LandingPage() {
  // For HeroSection animation/demo
  const [currentChallenge, setCurrentChallenge] = useState(0);

  // Cycle through challenges for HeroSection
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentChallenge(prev => (prev + 1) % challenges.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-foreground">
      {/* Skip to main content for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-24 focus:left-4 focus:z-[10000] focus:bg-cyan-600 focus:text-white focus:px-6 focus:py-3 focus:rounded-md focus:shadow-xl focus:border-2 focus:border-cyan-400"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>

      <main id="main-content" role="main" aria-label="Arcadia Gaming Platform">
        <HeroSection
          currentChallenge={currentChallenge}
          challenges={challenges}
        />

        {/* Demo Game Section - High Priority for User Engagement */}
        <TryDemoGame />

        <FeaturedChallenges challenges={challenges} />
        <FeaturedGamesCarousel />
        <UpcomingEventsSection />
        <PartnersSection />
        <FAQSection />
      </main>
    </div>
  );
}
