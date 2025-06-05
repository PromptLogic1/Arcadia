'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { GiGamepad, GiTeamIdea, GiSparkles } from 'react-icons/gi';
import NeonBorder from '@/components/ui/NeonBorder';
import { NeonText } from '@/components/ui/NeonText';
import { Button } from '@/components/ui/button';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';

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
      <CyberpunkBackground
        variant="circuit"
        intensity="subtle"
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900/95 to-cyan-950/30 py-24"
        id="home"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/20 via-transparent to-slate-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />

        <FloatingElements
          variant="circuits"
          count={15}
          speed="slow"
          color="cyan"
          repositioning={true}
        />
        <FloatingElements
          variant="particles"
          count={15}
          speed="medium"
          color="fuchsia"
          repositioning={true}
        />
        <FloatingElements
          variant="orbs"
          count={15}
          speed="fast"
          color="emerald"
          repositioning={true}
        />

        {/* Additional floating elements for enhanced movement - positioned at edges */}
        <div
          className="animate-float-smooth-slow absolute top-10 left-5 h-2 w-2 rounded-full bg-cyan-400/30"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="animate-float-smooth absolute right-5 bottom-10 h-1 w-1 rounded-full bg-purple-400/40"
          style={{ animationDelay: '3s' }}
        />
        <div
          className="animate-float-smooth-fast absolute top-1/4 right-10 h-3 w-3 rounded-full bg-fuchsia-400/20"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="animate-float-smooth absolute bottom-1/4 left-10 h-2 w-2 rounded-full bg-emerald-400/25"
          style={{ animationDelay: '4s' }}
        />
        <div
          className="animate-float-smooth-slow absolute top-2/3 left-5 h-1 w-1 rounded-full bg-yellow-400/35"
          style={{ animationDelay: '2.5s' }}
        />

        <div className="relative z-20 container mx-auto flex flex-col items-center justify-center px-4">
          <motion.div
            className="w-full max-w-4xl text-center"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1
              className="mb-12 leading-tight font-extrabold tracking-tight"
              role="banner"
            >
              <span className="mb-4 block text-3xl text-cyan-200 sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
                Welcome to
              </span>
              <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[14rem]">
                <NeonText
                  variant="gradient"
                  className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[14rem]"
                >
                  Arcadia
                </NeonText>
              </span>
            </h1>

            <motion.p
              className="neon-glow-cyan mx-auto mb-12 max-w-4xl px-4 text-lg leading-relaxed sm:mb-16 sm:px-0 sm:text-xl md:text-2xl lg:text-3xl"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Experience the thrill of gaming with innovative challenges,
              enhanced graphics, and modern interactions
            </motion.p>

            <motion.div
              className="flex flex-col items-center justify-center gap-8 sm:flex-row"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Button
                variant="cyber"
                className="touch-target group px-12 py-6 text-xl"
                onClick={() => (window.location.href = '/play-area')}
                aria-label="Start playing Arcadia games"
              >
                <GiGamepad
                  className="mr-4 h-8 w-8 group-hover:animate-pulse"
                  aria-hidden="true"
                />
                Start Playing
                <GiSparkles className="ml-3 h-6 w-6 opacity-70 transition-opacity group-hover:opacity-100" />
              </Button>

              <Button
                variant="cyber-outline"
                className="touch-target px-12 py-6 text-xl"
                onClick={() => (window.location.href = '/community')}
                aria-label="Join the Arcadia community"
              >
                <GiTeamIdea className="mr-4 h-8 w-8" aria-hidden="true" />
                Join Community
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            className="@container mt-20 w-full max-w-6xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <NeonBorder className="hover-lift p-0.5">
              <div className="glass-intense relative flex aspect-video items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src="/placeholder.svg"
                  alt="Arcadia Gameplay"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />

                <div className="mask-fade-bottom from-background/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

                <div className="safe-center absolute right-8 bottom-8 left-8 text-center">
                  <h2
                    className="mb-6 text-5xl font-bold md:text-6xl lg:text-7xl @sm:text-8xl"
                    aria-live="polite"
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentChallenge}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.6 }}
                        className="glass hover-glow inline-block rounded-lg p-4 text-shadow-lg"
                        aria-label={`Featured challenge: ${currentChallengeName}`}
                      >
                        <NeonText intensity="high">
                          <span className="text-neon">
                            {currentChallengeName}
                          </span>
                        </NeonText>
                      </motion.span>
                    </AnimatePresence>
                  </h2>
                  <p className="text-muted-foreground text-glow text-2xl lg:text-4xl @sm:text-3xl">
                    Challenge yourself and others
                  </p>
                </div>
              </div>
            </NeonBorder>
          </motion.div>
        </div>
      </CyberpunkBackground>
    );
  }
);

HeroSection.displayName = 'HeroSection';

export default HeroSection;
