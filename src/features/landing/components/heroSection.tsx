'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Play, Users, Sparkles } from 'lucide-react';
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
        className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden py-24"
        id="home"
      >
        <div className="from-background via-background/95 to-accent/5 absolute inset-0 bg-linear-to-br/oklch" />
        <div className="gradient-radial-glow absolute inset-0" />

        <ArcadeDecoration className="animate-float top-10 left-10 opacity-10" />
        <ArcadeDecoration
          className="animate-float right-10 bottom-10 opacity-10"
          style={{ animationDelay: '1s' }}
        />

        <div className="relative z-10 container mx-auto flex flex-col items-center justify-center px-4">
          <motion.div
            className="w-full max-w-4xl text-center"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-8 text-6xl leading-tight font-extrabold tracking-tight md:text-7xl lg:text-8xl">
              Welcome to{' '}
              <span className="mt-2 block">
                <NeonText intensity="high">
                  <span className="text-hero animate-glow gradient-primary bg-clip-text text-transparent">
                    Arcadia
                  </span>
                </NeonText>
              </span>
            </h1>

            <motion.p
              className="text-muted-foreground text-glow mx-auto mb-12 max-w-3xl text-xl leading-relaxed md:text-2xl"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Experience the thrill of gaming with innovative challenges,
              enhanced graphics, and modern interactions
            </motion.p>

            <motion.div
              className="flex flex-col items-center justify-center gap-6 sm:flex-row"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button
                variant="gradient"
                size="lg"
                className="touch-target hover-glow animate-glow group"
                shadow="colored"
                glow="normal"
              >
                <Play
                  className="mr-3 h-6 w-6 group-hover:animate-pulse"
                  aria-hidden="true"
                />
                Start Playing
                <Sparkles className="ml-2 h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
              </Button>

              <Button
                variant="glass"
                size="lg"
                className="touch-target hover-lift border-primary/30"
                glow="subtle"
              >
                <Users className="mr-3 h-6 w-6" aria-hidden="true" />
                Join Community
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            className="@container mt-16 w-full max-w-4xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <NeonBorder className="hover-lift p-0.5">
              <div className="glass-intense relative flex aspect-video items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src="/placeholder.svg"
                  alt="Arcadia Gameplay"
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-105"
                  priority
                />

                <div className="mask-fade-bottom from-background/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

                <div className="safe-center absolute right-8 bottom-8 left-8 text-center">
                  <h2 className="mb-4 text-4xl font-bold md:text-5xl @sm:text-6xl">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentChallenge}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="glass hover-glow inline-block rounded-lg p-4 text-shadow-lg"
                      >
                        <NeonText intensity="high">
                          <span className="text-neon">
                            {currentChallengeName}
                          </span>
                        </NeonText>
                      </motion.span>
                    </AnimatePresence>
                  </h2>
                  <p className="text-muted-foreground text-glow text-xl @sm:text-2xl">
                    Challenge yourself and others
                  </p>
                </div>
              </div>
            </NeonBorder>
          </motion.div>

          <motion.div
            className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-6 @sm:grid-cols-3"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            {[
              {
                icon: '🎮',
                title: 'Interactive Gaming',
                desc: 'Touch-optimized controls',
              },
              {
                icon: '🌟',
                title: 'Modern Effects',
                desc: 'Enhanced visual feedback',
              },
              {
                icon: '📱',
                title: 'Cross-Device',
                desc: 'Adaptive to your device',
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="glass touch-target hover-lift rounded-lg p-6 text-center"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className="animate-float mb-3 text-4xl"
                  style={{ animationDelay: `${index * 0.5}s` }}
                >
                  {feature.icon}
                </div>
                <h3 className="text-glow mb-2 text-lg font-semibold">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    );
  }
);

HeroSection.displayName = 'HeroSection';

export default HeroSection;
