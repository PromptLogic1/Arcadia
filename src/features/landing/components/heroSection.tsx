'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import NeonBorder from '@/components/ui/NeonBorder';
import { NeonText } from '@/components/ui/NeonText';
import { Button } from '@/components/ui/Button';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';
import { OptimizedImage } from '@/components/ui/Image';
import { cn } from '@/lib/utils';

interface Challenge {
  id: string;
  name: string;
}

interface HeroSectionProps {
  currentChallenge: number;
  challenges: ReadonlyArray<Challenge>;
  isMounted?: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = React.memo(
  ({ currentChallenge, challenges, isMounted = false }) => {
    const router = useRouter();

    // Memoize navigation callbacks to prevent recreating on every render
    const handlePlayClick = React.useCallback(() => {
      router.push('/play-area');
    }, [router]);

    const handleCommunityClick = React.useCallback(() => {
      router.push('/community');
    }, [router]);

    return (
      <CyberpunkBackground
        variant="circuit"
        intensity="subtle"
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900/95 to-cyan-950/30 py-24 contain-layout"
        id="home"
        animated={isMounted}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/20 via-transparent to-slate-950/50 will-change-transform" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent will-change-transform" />

        {/* Optimized floating elements with reduced count and CSS-only animations */}
        {isMounted && (
          <div className="pointer-events-none absolute inset-0 contain-layout motion-reduce:hidden">
            <FloatingElements
              variant="circuits"
              count={2}
              speed="slow"
              color="cyan"
              className="transform-gpu"
            />
            <FloatingElements
              variant="particles"
              count={3}
              speed="medium"
              color="fuchsia"
              className="transform-gpu"
            />
            <FloatingElements
              variant="orbs"
              count={2}
              speed="fast"
              color="emerald"
              className="transform-gpu"
            />
          </div>
        )}

        {/* CSS-only floating dots with hardware acceleration */}
        {isMounted && (
          <div className="pointer-events-none absolute inset-0 contain-layout motion-reduce:hidden">
            <div className="animate-float-smooth-slow absolute top-[10%] left-[5%] h-2 w-2 transform-gpu rounded-full bg-cyan-400/30 will-change-transform [animation-delay:2s]" />
            <div className="animate-float-smooth absolute right-[5%] bottom-[10%] h-1 w-1 transform-gpu rounded-full bg-purple-400/40 will-change-transform [animation-delay:3s]" />
            <div className="animate-float-smooth-fast absolute top-[25%] right-[10%] h-3 w-3 transform-gpu rounded-full bg-fuchsia-400/20 will-change-transform [animation-delay:1.5s]" />
            <div className="animate-float-smooth absolute bottom-[25%] left-[10%] h-2 w-2 transform-gpu rounded-full bg-emerald-400/25 will-change-transform [animation-delay:4s]" />
            <div className="animate-float-smooth-slow absolute top-[66%] left-[5%] h-1 w-1 transform-gpu rounded-full bg-yellow-400/35 will-change-transform [animation-delay:2.5s]" />
          </div>
        )}

        <div className="relative z-20 container mx-auto flex flex-col items-center justify-center px-4">
          <div className="animate-in fade-in slide-in-from-bottom-10 fill-mode-both w-full max-w-4xl text-center duration-700">
            <h1
              className="mb-12 min-h-[14rem] leading-tight font-extrabold tracking-tight"
              role="banner"
            >
              <span className="animate-in fade-in slide-in-from-bottom-5 fill-mode-both mb-4 block text-3xl text-cyan-200 duration-500 [animation-delay:100ms] sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
                Welcome to
              </span>
              <span className="animate-in fade-in slide-in-from-bottom-5 fill-mode-both block text-6xl duration-500 [animation-delay:200ms] sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[14rem]">
                <NeonText
                  variant="solid"
                  className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[14rem]"
                >
                  Arcadia
                </NeonText>
              </span>
            </h1>

            <p className="neon-glow-cyan animate-in fade-in slide-in-from-bottom-5 fill-mode-both mx-auto mb-12 max-w-4xl px-4 text-lg leading-relaxed duration-700 [animation-delay:400ms] sm:mb-16 sm:px-0 sm:text-xl md:text-2xl lg:text-3xl">
              Experience the thrill of gaming with innovative challenges,
              enhanced graphics, and modern interactions
            </p>

            <div className="animate-in fade-in zoom-in-95 fill-mode-both flex flex-col items-center justify-center gap-8 duration-700 [animation-delay:600ms] sm:flex-row">
              <Button
                variant="primary"
                className="touch-target group px-12 py-6 text-xl pointer-coarse:px-14 pointer-coarse:py-8"
                onClick={handlePlayClick}
                aria-label="Start playing Arcadia games"
              >
                <svg
                  className="mr-4 h-8 w-8 group-hover:animate-pulse"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M15.47 11.293L12 7.823l-3.47 3.47-.53-.53 4-4 4 4-.53.53zM6.5 4C8.48 4 10.34 4.5 12 5.32 13.66 4.5 15.52 4 17.5 4A8.5 8.5 0 0126 12.5c0 1.65-.53 3.25-1.52 4.61l.48.39c.28.22.53.47.73.78.33.5.49 1.09.47 1.67-.04 1.16-.77 2.13-1.85 2.44-.96.28-2.01.01-2.73-.73a2.44 2.44 0 01-.48-.61L12 13.5l-9.1 7.55c-.15.24-.29.45-.47.61-.72.74-1.77 1.01-2.73.73-1.08-.31-1.81-1.28-1.85-2.44-.02-.58.14-1.17.47-1.67.2-.31.45-.56.73-.78l.48-.39A8.478 8.478 0 01-2 12.5C-2 7.81 1.81 4 6.5 4z" />
                </svg>
                Start Playing
                <svg
                  className="ml-3 h-6 w-6 opacity-70 transition-opacity group-hover:opacity-100"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </Button>

              <Button
                variant="secondary"
                className="touch-target px-12 py-6 text-xl pointer-coarse:px-14 pointer-coarse:py-8"
                onClick={handleCommunityClick}
                aria-label="Join the Arcadia community"
              >
                <svg
                  className="mr-4 h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                Join Community
              </Button>
            </div>
          </div>

          <div className="animate-in fade-in zoom-in-95 fill-mode-both @container mt-20 w-full max-w-6xl duration-700 [animation-delay:800ms]">
            <NeonBorder className="hover-lift p-0.5">
              <div className="glass-intense relative flex aspect-video items-center justify-center overflow-hidden rounded-lg contain-layout">
                <OptimizedImage
                  src="/images/placeholder.svg"
                  alt="Arcadia Gameplay"
                  fill
                  priority
                  aspectRatio="video"
                  className="transform-gpu transition-transform duration-700 will-change-transform hover:scale-105"
                />

                <div className="mask-fade-bottom from-background/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />

                <div className="safe-center absolute right-8 bottom-8 left-8 text-center">
                  <h2
                    className="mb-6 text-5xl font-bold md:text-6xl lg:text-7xl @sm:text-8xl"
                    aria-live="polite"
                  >
                    <div className="relative h-[100px] md:h-[120px] lg:h-[140px]">
                      {challenges.map((challenge, index) => (
                        <span
                          key={challenge.id}
                          className={cn(
                            'glass hover-glow absolute inset-0 flex transform-gpu items-center justify-center rounded-lg p-4 transition-all duration-600 text-shadow-lg',
                            currentChallenge === index
                              ? 'translate-y-0 scale-100 opacity-100'
                              : 'pointer-events-none translate-y-5 scale-95 opacity-0'
                          )}
                          aria-label={`Featured challenge: ${challenge.name}`}
                          aria-hidden={currentChallenge !== index}
                        >
                          <NeonText variant="solid" glow="medium">
                            <span className="text-neon">{challenge.name}</span>
                          </NeonText>
                        </span>
                      ))}
                    </div>
                  </h2>
                  <p className="text-muted-foreground text-glow text-2xl lg:text-4xl @sm:text-3xl">
                    Challenge yourself and others
                  </p>
                </div>
              </div>
            </NeonBorder>
          </div>
        </div>
      </CyberpunkBackground>
    );
  }
);

HeroSection.displayName = 'HeroSection';

export default HeroSection;
