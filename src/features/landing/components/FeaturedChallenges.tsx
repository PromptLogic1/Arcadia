'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ChevronRight, X } from 'lucide-react';
import NeonBorder from '@/components/ui/NeonBorder';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NeonText } from '@/components/ui/NeonText';

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
    <section
      id="challenges"
      className="relative bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900 py-24"
    >
      <div className="container mx-auto flex flex-col items-center px-4">
        <h2 className="mb-14 text-center text-4xl font-bold md:text-5xl">
          <NeonText>Featured Challenges</NeonText>
        </h2>
        <div className="flex w-full justify-center">
          <div className="grid w-full max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {challenges.map((challenge, index) => (
              <motion.div
                key={challenge.name}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex justify-center"
              >
                <NeonBorder
                  color={index % 2 === 0 ? 'cyan' : 'pink'}
                  className="h-full w-full"
                >
                  <Card
                    className={`h-full cursor-pointer border-none bg-gray-800 transition-transform duration-300 hover:scale-105 ${
                      selectedChallenge === index
                        ? 'shadow-lg shadow-cyan-500/50'
                        : ''
                    }`}
                    onClick={() => toggleSelectedChallenge(index)}
                  >
                    <CardHeader className="flex flex-col items-center p-4">
                      <div
                        className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 transition-transform duration-300 ${
                          selectedChallenge === index ? 'scale-110' : ''
                        }`}
                      >
                        <challenge.icon
                          className="h-8 w-8 text-white"
                          aria-hidden="true"
                        />
                      </div>
                      <CardTitle className="text-center text-2xl font-bold text-cyan-300">
                        {challenge.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="flex min-h-[48px] items-center justify-center text-center text-cyan-100">
                        {challenge.description}
                      </p>
                    </CardContent>
                  </Card>
                </NeonBorder>
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
              <NeonBorder color="yellow" className="w-full max-w-4xl">
                <Card className="border-none bg-gray-800">
                  <CardHeader className="flex flex-row items-start justify-between p-4">
                    <div>
                      <CardTitle className="text-3xl font-bold text-cyan-300">
                        {challenges[selectedChallenge]?.name}
                      </CardTitle>
                      <CardDescription className="mt-2 text-lg text-cyan-100">
                        {challenges[selectedChallenge]?.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedChallenge(null)}
                      className="rounded-full border border-cyan-500/20 text-cyan-400 hover:text-cyan-300"
                      aria-label="Close challenge details"
                    >
                      <X className="h-6 w-6" aria-hidden="true" />
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-8 p-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-4 text-xl font-semibold text-cyan-300">
                        Challenge Details
                      </h3>
                      <p className="mb-4 leading-relaxed text-cyan-100">
                        {challenges[selectedChallenge]?.details}
                      </p>
                      <h4 className="mb-2 text-lg font-semibold text-cyan-300">
                        Key Features:
                      </h4>
                      <ul className="mb-4 list-inside list-disc space-y-2 text-cyan-100">
                        {challenges[selectedChallenge]?.keyFeatures.map(
                          (feature, idx) => (
                            <li
                              key={`${challenges[selectedChallenge]?.name}-feature-${idx}`}
                            >
                              {feature}
                            </li>
                          )
                        )}
                      </ul>
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-cyan-300">
                            Difficulty
                          </h4>
                          <p className="text-cyan-100">
                            {challenges[selectedChallenge]?.difficulty}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-cyan-300">
                            Estimated Time
                          </h4>
                          <p className="text-cyan-100">
                            {challenges[selectedChallenge]?.estimatedTime}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="mb-4 aspect-video w-full max-w-md overflow-hidden rounded-lg bg-gray-800 shadow-lg">
                        <Image
                          src={`/challenges/${challenges[selectedChallenge]?.name.toLowerCase().replace(/\s+/g, '-')}.jpg`}
                          alt={`${challenges[selectedChallenge]?.name} demo`}
                          width={640}
                          height={360}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          placeholder="blur"
                          blurDataURL="/images/placeholder-blur.jpg"
                        />
                      </div>
                      <Button className="w-full max-w-md transform bg-cyan-500 text-white shadow-lg shadow-cyan-500/50 transition-all duration-300 hover:scale-105 hover:bg-cyan-600">
                        Start Challenge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </NeonBorder>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-16 flex w-full justify-center text-center">
          <Button
            variant="ghost"
            className="transform rounded-full border border-cyan-500/20 px-8 py-3 text-lg text-cyan-400 transition-all duration-300 hover:scale-105 hover:bg-cyan-500/20 hover:text-cyan-300"
          >
            Explore All Challenges
            <ChevronRight
              className="ml-2 inline-block h-5 w-5"
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default React.memo(FeaturedChallenges);
