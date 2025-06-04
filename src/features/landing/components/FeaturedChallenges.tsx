'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NeonText } from '@/components/ui/NeonText';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';

interface Challenge {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  details: string;
  keyFeatures: string[];
  difficulty: string;
  estimatedTime: string;
}

interface FeaturedChallengesProps {
  challenges: readonly Challenge[];
}

const FeaturedChallenges: React.FC<FeaturedChallengesProps> = ({ challenges }) => {
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null);

  const toggleSelectedChallenge = useCallback((index: number) => {
    setSelectedChallenge(prevIndex => (prevIndex === index ? null : index));
  }, []);

  return (
    <CyberpunkBackground
      variant="circuit"
      intensity="medium"
      id="challenges"
      className="relative bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 py-24"
    >
      <FloatingElements variant="hexagons" count={15} speed="medium" color="purple" repositioning={true} />
      <div className="relative z-20 container mx-auto flex flex-col items-center px-4">
        <h2 className="mb-16 text-center">
          <NeonText variant="gradient" className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl">Featured Challenges</NeonText>
        </h2>
        
        <div className="flex w-full justify-center">
          <div className="grid w-full max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 place-items-center">
            {challenges.map((challenge, index) => (
              <motion.div
                key={challenge.name}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="w-full max-w-md"
              >
                <Card
                  variant="cyber"
                  glow="subtle"
                  className={`h-[450px] w-full cursor-pointer transition-all duration-300 hover:scale-105 group flex flex-col ${
                    selectedChallenge === index
                      ? 'cyber-card-selected'
                      : 'cyber-card-hover'
                  }`}
                  onClick={() => toggleSelectedChallenge(index)}
                >
                  <CardHeader className="flex flex-col items-center p-8 flex-shrink-0">
                    <div
                      className={`mb-8 flex h-24 w-24 items-center justify-center rounded-full cyber-card border-cyan-500/50 transition-transform duration-300 ${
                        selectedChallenge === index ? 'scale-110 border-cyan-400' : ''
                      }`}
                    >
                      <challenge.icon
                        className="h-12 w-12 text-cyan-400 group-hover:text-cyan-300"
                        aria-hidden="true"
                      />
                    </div>
                    <CardTitle className="text-center text-3xl font-bold neon-glow-cyan h-20 flex items-center justify-center">
                      {challenge.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 flex-1 flex items-center">
                    <p className="text-center text-cyan-200/80 leading-relaxed w-full">
                      {challenge.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {selectedChallenge !== null && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.3 }}
              className="mt-16 flex w-full justify-center"
            >
              <Card 
                variant="cyber" 
                glow="subtle" 
                className="w-full max-w-4xl cyber-card-selected"
              >
                <CardHeader className="flex flex-row items-start justify-between p-8">
                  <div className="flex-1">
                    <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold neon-glow-cyan mb-3">
                      {challenges[selectedChallenge]?.name}
                    </CardTitle>
                    <CardDescription className="text-base sm:text-lg md:text-xl text-cyan-200/80 leading-relaxed">
                      {challenges[selectedChallenge]?.description}
                    </CardDescription>
                  </div>
                  <Button
                    variant="cyber-ghost"
                    size="icon"
                    onClick={() => setSelectedChallenge(null)}
                    className="rounded-full ml-4 flex-shrink-0"
                    aria-label="Close challenge details"
                  >
                    <X className="h-6 w-6" aria-hidden="true" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-8 p-4 sm:p-6 md:p-8 pt-0 md:grid-cols-2">
                  <div>
                    <h3 className="mb-6 text-2xl font-semibold neon-glow-cyan">
                      Challenge Details
                    </h3>
                    <p className="mb-6 leading-relaxed text-cyan-200/90 text-lg">
                      {challenges[selectedChallenge]?.details}
                    </p>
                    <h4 className="mb-4 text-xl font-semibold neon-glow-purple">
                      Key Features:
                    </h4>
                    <ul className="mb-6 space-y-3 text-cyan-200/90">
                      {challenges[selectedChallenge]?.keyFeatures.map(
                        (feature, idx) => (
                          <li
                            key={`${challenges[selectedChallenge]?.name}-feature-${idx}`}
                            className="flex items-center gap-3"
                          >
                            <div className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        )
                      )}
                    </ul>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="cyber-card p-4 border-purple-500/30">
                        <h4 className="text-lg font-semibold text-purple-300 mb-2">
                          Difficulty
                        </h4>
                        <p className="text-cyan-100 text-lg capitalize">
                          {challenges[selectedChallenge]?.difficulty}
                        </p>
                      </div>
                      <div className="cyber-card p-4 border-emerald-500/30">
                        <h4 className="text-lg font-semibold text-emerald-300 mb-2">
                          Duration
                        </h4>
                        <p className="text-cyan-100 text-lg">
                          {challenges[selectedChallenge]?.estimatedTime}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-8 cyber-card p-8 border-cyan-500/50 text-center">
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full cyber-card border-cyan-500/50 mx-auto">
                        {challenges[selectedChallenge]?.icon && 
                          React.createElement(challenges[selectedChallenge].icon, {
                            className: "h-10 w-10 text-cyan-400"
                          })
                        }
                      </div>
                      <h4 className="text-xl font-semibold neon-glow-cyan mb-3">
                        Ready to Start?
                      </h4>
                      <p className="text-cyan-200/80 mb-6 leading-relaxed">
                        Join this challenge and compete with players worldwide in real-time bingo games.
                      </p>
                      <Button 
                        variant="cyber" 
                        size="lg"
                        className="w-full max-w-sm"
                        onClick={() => window.location.href = '/challenge-hub'}
                        aria-label={`Start ${challenges[selectedChallenge]?.name} challenge`}
                      >
                        <ChevronRight className="mr-2 h-5 w-5" />
                        Start Challenge
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16 flex w-full justify-center text-center">
          <Button
            variant="cyber-outline"
            size="lg"
            className="rounded-full px-8 py-4 text-lg"
            onClick={() => window.location.href = '/challenge-hub'}
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