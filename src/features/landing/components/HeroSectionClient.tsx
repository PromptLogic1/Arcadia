'use client';

import React, { useState, useRef } from 'react';
import HeroSection from './heroSection';

// Example challenge data with icon names instead of components
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

const HeroSectionClient: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
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
    <div ref={heroRef}>
      <HeroSection
        currentChallenge={currentChallenge}
        challenges={challenges}
        isMounted={isMounted}
      />
    </div>
  );
};

export default HeroSectionClient;
