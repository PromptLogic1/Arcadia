'use client';

import React, { useState } from 'react';
import HeroSection from './heroSection';
import FeaturedChallenges from './FeaturedChallenges';
import FeaturedGamesCarousel from './FeaturedGamesCarousel';
import FAQSection from './FAQSection';
import PartnersSection from './PartnersSection';
import UpcomingEventsSection from './UpcomingEventsSection';
import { GamepadIcon } from 'lucide-react';

// Example challenge data for HeroSection and FeaturedChallenges
const challenges = [
  {
    id: 'challenge-1',
    name: 'Speedrun Showdown',
    icon: GamepadIcon,
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
    icon: GamepadIcon,
    description: 'Solve challenging puzzles to progress.',
    details: 'Test your wits and logic in a series of mind-bending puzzles.',
    keyFeatures: ['Hints', 'Progressive Difficulty', 'Achievements'],
    difficulty: 'Hard',
    estimatedTime: '20-40 min',
  },
  {
    id: 'challenge-3',
    name: 'Co-op Quest',
    icon: GamepadIcon,
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
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection
        currentChallenge={currentChallenge}
        challenges={challenges}
      />
      <FeaturedChallenges challenges={challenges} />
      <FeaturedGamesCarousel />
      <UpcomingEventsSection />
      <PartnersSection />
      <FAQSection />
    </div>
  );
}
