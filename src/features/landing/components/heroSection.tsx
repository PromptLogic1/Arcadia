'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Play, Users } from 'lucide-react';
import NeonBorder from '@/components/ui/NeonBorder';
import ArcadeDecoration from '@/components/ui/ArcadeDecoration';
import { NeonText } from '@/components/ui/NeonText';
import { Button } from '@/components/ui/button';

interface Challenge {
  id: string;
  name: string;
}

interface HeroSectionProps {
  currentChallenge: number;
  challenges: ReadonlyArray<Challenge>;
}

const HeroSection: React.FC<HeroSectionProps> = React.memo(
  ({ currentChallenge, challenges }) => {
    const currentChallengeName = useMemo(
      () => challenges[currentChallenge]?.name || '',
      [currentChallenge, challenges]
    );

    return (
      <section
        className="animate-gradient-x relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 py-24"
        id="home"
      >
        <ArcadeDecoration className="left-10 top-10 opacity-10" />
        <ArcadeDecoration className="bottom-10 right-10 opacity-10" />
        <div className="container mx-auto flex flex-col items-center justify-center px-4">
          <motion.div
            className="w-full max-w-3xl text-center"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-8 text-6xl font-extrabold leading-tight tracking-tight md:text-7xl">
              Welcome to{' '}
              <span className="mt-2 block">
                <NeonText intensity="high">Arcadia</NeonText>
              </span>
            </h1>
            <motion.p
              className="mb-12 text-xl leading-relaxed text-cyan-200 md:text-2xl"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Experience the thrill of gaming with innovative challenges
            </motion.p>
            <motion.div
              className="flex flex-col justify-center gap-6 sm:flex-row"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button className="w-full transform rounded-full bg-cyan-500 px-10 py-6 text-lg text-white shadow-lg shadow-cyan-500/50 transition-all duration-300 hover:scale-105 hover:bg-cyan-600 sm:w-auto">
                <Play className="mr-3 h-6 w-6" aria-hidden="true" />
                Start Playing
              </Button>
              <Button
                variant="ghost"
                className="w-full transform rounded-full border-2 border-cyan-500/20 px-10 py-6 text-lg text-cyan-400 transition-all duration-300 hover:scale-105 hover:bg-cyan-500/20 hover:text-cyan-300 sm:w-auto"
              >
                <Users className="mr-3 h-6 w-6" aria-hidden="true" />
                Join Community
              </Button>
            </motion.div>
          </motion.div>
          <motion.div
            className="mt-16 w-full max-w-3xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <NeonBorder className="p-0.5">
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gray-800/80 backdrop-blur-sm">
                <Image
                  src="/placeholder.svg"
                  alt="Arcadia Gameplay"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8 text-center">
                  <h2 className="mb-4 text-4xl font-bold md:text-5xl">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentChallenge}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="inline-block rounded-lg bg-gray-900/60 px-4 py-2 shadow-lg"
                      >
                        <NeonText intensity="high">
                          {currentChallengeName}
                        </NeonText>
                      </motion.span>
                    </AnimatePresence>
                  </h2>
                  <p className="text-xl text-cyan-200">
                    Challenge yourself and others
                  </p>
                </div>
              </div>
            </NeonBorder>
          </motion.div>
        </div>
      </section>
    );
  }
);

HeroSection.displayName = 'HeroSection';

export default HeroSection;
