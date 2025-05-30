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
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background py-24"
        id="home"
      >
        <div className="absolute inset-0 bg-linear-to-br/oklch from-background via-background/95 to-accent/5" />
        <div className="absolute inset-0 gradient-radial-glow" />
        
        <ArcadeDecoration className="left-10 top-10 opacity-10 animate-float" />
        <ArcadeDecoration className="bottom-10 right-10 opacity-10 animate-float" style={{ animationDelay: '1s' }} />
        
        <div className="container mx-auto flex flex-col items-center justify-center px-4 relative z-10">
          <motion.div
            className="w-full max-w-4xl text-center"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-8 text-6xl font-extrabold leading-tight tracking-tight md:text-7xl lg:text-8xl">
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
              className="mb-12 text-xl leading-relaxed text-muted-foreground md:text-2xl text-glow max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Experience the thrill of gaming with innovative challenges, enhanced graphics, and modern interactions
            </motion.p>
            
            <motion.div
              className="flex flex-col justify-center gap-6 sm:flex-row items-center"
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
                <Play className="mr-3 h-6 w-6 group-hover:animate-pulse" aria-hidden="true" />
                Start Playing
                <Sparkles className="ml-2 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
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
            className="mt-16 w-full max-w-4xl @container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <NeonBorder className="p-0.5 hover-lift">
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg glass-intense">
                <Image
                  src="/placeholder.svg"
                  alt="Arcadia Gameplay"
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-105"
                  priority
                />
                
                <div className="absolute inset-0 mask-fade-bottom bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-8 left-8 right-8 text-center safe-center">
                  <h2 className="mb-4 text-4xl font-bold md:text-5xl @sm:text-6xl">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentChallenge}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="inline-block rounded-lg glass p-4 text-shadow-lg hover-glow"
                      >
                        <NeonText intensity="high">
                          <span className="text-neon">
                            {currentChallengeName}
                          </span>
                        </NeonText>
                      </motion.span>
                    </AnimatePresence>
                  </h2>
                  <p className="text-xl text-muted-foreground text-glow @sm:text-2xl">
                    Challenge yourself and others
                  </p>
                </div>
              </div>
            </NeonBorder>
          </motion.div>
          
          <motion.div
            className="mt-16 grid gap-6 grid-cols-1 @sm:grid-cols-3 w-full max-w-4xl"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            {[
              { icon: '🎮', title: 'Interactive Gaming', desc: 'Touch-optimized controls' },
              { icon: '🌟', title: 'Modern Effects', desc: 'Enhanced visual feedback' },
              { icon: '📱', title: 'Cross-Device', desc: 'Adaptive to your device' }
            ].map((feature, index) => (
              <div 
                key={feature.title}
                className="glass touch-target hover-lift text-center p-6 rounded-lg"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-4xl mb-3 animate-float" style={{ animationDelay: `${index * 0.5}s` }}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-glow">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
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
