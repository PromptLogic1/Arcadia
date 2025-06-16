'use client';

import React, { useState, useCallback } from 'react';
import { 
  ChevronRight, 
  X, 
  GaugeIcon, 
  PuzzleIcon, 
  UsersIcon 
} from '@/components/ui/Icons';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NeonText } from '@/components/ui/NeonText';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';
import { cn } from '@/lib/utils';

// Icon mapping to resolve icon names to components
const iconMap = {
  Gauge: GaugeIcon,
  Puzzle: PuzzleIcon,
  Users: UsersIcon,
} as const;

type IconName = keyof typeof iconMap;

interface Challenge {
  name: string;
  iconName: IconName;
  description: string;
  details: string;
  keyFeatures: string[];
  difficulty: string;
  estimatedTime: string;
}

interface FeaturedChallengesProps {
  challenges: readonly Challenge[];
}

const FeaturedChallenges: React.FC<FeaturedChallengesProps> = ({
  challenges,
}) => {
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(
    null
  );

  const toggleSelectedChallenge = useCallback((index: number) => {
    setSelectedChallenge(prevIndex => (prevIndex === index ? null : index));
  }, []);

  return (
    <CyberpunkBackground
      variant="grid"
      intensity="medium"
      id="challenges"
      className="relative bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90 py-24 contain-layout"
      animated={false}
    >
      <FloatingElements
        variant="particles"
        count={15}
        speed="fast"
        color="purple"
      />
      <div className="relative z-20 container mx-auto flex flex-col items-center px-4">
        <h2 className="mb-16 text-center">
          <NeonText
            variant="solid"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl"
          >
            Featured Challenges
          </NeonText>
        </h2>

        <div className="flex w-full justify-center">
          <div className="grid w-full max-w-7xl grid-cols-1 place-items-center gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge, index) => (
              <div
                key={challenge.name}
                className={cn(
                  'animate-in fade-in slide-in-from-bottom-10 fill-mode-both w-full max-w-md duration-700'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card
                  variant="primary"
                  className={`group flex h-[450px] w-full cursor-pointer flex-col transition-all duration-300 hover:scale-105 ${
                    selectedChallenge === index
                      ? 'cyber-card-selected'
                      : 'cyber-card-hover'
                  }`}
                  onClick={() => toggleSelectedChallenge(index)}
                >
                  <CardHeader className="flex flex-shrink-0 flex-col items-center p-8">
                    <div
                      className={`cyber-card mb-8 flex h-24 w-24 items-center justify-center rounded-full border-cyan-500/50 transition-transform duration-300 ${
                        selectedChallenge === index
                          ? 'scale-110 border-cyan-400'
                          : ''
                      }`}
                    >
                      {React.createElement(iconMap[challenge.iconName], {
                        className: "h-12 w-12 text-cyan-400 group-hover:text-cyan-300",
                        'aria-hidden': true
                      })}
                    </div>
                    <CardTitle className="neon-glow-cyan flex h-20 items-center justify-center text-center text-3xl font-bold">
                      {challenge.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 items-center p-6 pt-0">
                    <p className="w-full text-center leading-relaxed text-cyan-200/80">
                      {challenge.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {selectedChallenge !== null && (
          <div
            className={cn(
              'mt-16 flex w-full justify-center transition-all duration-300',
              selectedChallenge !== null
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-10 opacity-0'
            )}
          >
            <Card
              variant="primary"
              className="cyber-card-selected w-full max-w-4xl"
            >
              <CardHeader className="flex flex-row items-start justify-between p-8">
                <div className="flex-1">
                  <CardTitle className="neon-glow-cyan mb-3 text-2xl font-bold sm:text-3xl md:text-4xl">
                    {challenges[selectedChallenge]?.name}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed text-cyan-200/80 sm:text-lg md:text-xl">
                    {challenges[selectedChallenge]?.description}
                  </CardDescription>
                </div>
                <Button
                  variant="primary"
                  size="icon"
                  onClick={() => setSelectedChallenge(null)}
                  className="ml-4 flex-shrink-0 rounded-full"
                  aria-label="Close challenge details"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </Button>
              </CardHeader>
              <CardContent className="grid gap-8 p-4 pt-0 sm:p-6 md:grid-cols-2 md:p-8">
                <div>
                  <h3 className="neon-glow-cyan mb-6 text-2xl font-semibold">
                    Challenge Details
                  </h3>
                  <p className="mb-6 text-lg leading-relaxed text-cyan-200/90">
                    {challenges[selectedChallenge]?.details}
                  </p>
                  <h4 className="neon-glow-purple mb-4 text-xl font-semibold">
                    Key Features:
                  </h4>
                  <ul className="mb-6 space-y-3 text-cyan-200/90">
                    {challenges[selectedChallenge]?.keyFeatures.map(
                      (feature, idx) => (
                        <li
                          key={`${challenges[selectedChallenge]?.name}-feature-${idx}`}
                          className="flex items-center gap-3"
                        >
                          <div className="h-2 w-2 flex-shrink-0 rounded-full bg-cyan-400" />
                          <span>{feature}</span>
                        </li>
                      )
                    )}
                  </ul>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="cyber-card border-purple-500/30 p-4">
                      <h4 className="mb-2 text-lg font-semibold text-purple-300">
                        Difficulty
                      </h4>
                      <p className="text-lg text-cyan-100 capitalize">
                        {challenges[selectedChallenge]?.difficulty}
                      </p>
                    </div>
                    <div className="cyber-card border-emerald-500/30 p-4">
                      <h4 className="mb-2 text-lg font-semibold text-emerald-300">
                        Duration
                      </h4>
                      <p className="text-lg text-cyan-100">
                        {challenges[selectedChallenge]?.estimatedTime}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="cyber-card mb-8 border-cyan-500/50 p-8 text-center">
                    <div className="cyber-card mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-cyan-500/50">
                      {challenges[selectedChallenge]?.iconName &&
                        React.createElement(
                          iconMap[challenges[selectedChallenge].iconName],
                          {
                            className: 'h-10 w-10 text-cyan-400',
                          }
                        )}
                    </div>
                    <h4 className="neon-glow-cyan mb-3 text-xl font-semibold">
                      Ready to Start?
                    </h4>
                    <p className="mb-6 leading-relaxed text-cyan-200/80">
                      Join this challenge and compete with players worldwide in
                      real-time bingo games.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full max-w-sm"
                      onClick={e => {
                        e.stopPropagation();
                        window.location.href = '/challenge-hub';
                      }}
                      aria-label={`Start ${challenges[selectedChallenge]?.name} challenge`}
                    >
                      <ChevronRight className="mr-2 h-5 w-5" />
                      Start Challenge
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-16 flex w-full justify-center text-center">
          <Button
            variant="primary"
            size="lg"
            className="rounded-full px-8 py-4 text-lg"
            onClick={e => {
              e.stopPropagation();
              window.location.href = '/challenge-hub';
            }}
            aria-label="Explore all available challenges"
          >
            Explore All Challenges
            <ChevronRight
              className="ml-2 inline-block h-5 w-5"
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>
    </CyberpunkBackground>
  );
};

export default React.memo(FeaturedChallenges);
