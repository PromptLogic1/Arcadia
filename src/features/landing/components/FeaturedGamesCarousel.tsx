'use client';

import React, { useRef, useState, useCallback, memo, useEffect } from 'react';
import { OptimizedImage } from '@/components/ui/Image';
import { ChevronRight, ChevronLeft } from '@/components/ui/Icons';
import NeonBorder from '@/components/ui/NeonBorder';
import { Card, CardContent } from '@/components/ui/Card';
import { NeonText } from '@/components/ui/NeonText';
import { Button } from '@/components/ui/Button';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';
import { cn } from '@/lib/utils';
import { getBlurDataUrl } from '@/lib/image-utils';

// Define the FeaturedGame interface with proper image typing
interface FeaturedGame {
  title: string;
  image: string;
}

// Define the featured games data with image URL paths
const featuredGames: FeaturedGame[] = [
  {
    title: 'World of Warcraft',
    image: '/images/featured-games/wow.jpg',
  },
  {
    title: 'Elden Ring',
    image: '/images/featured-games/elden-ring.jpg',
  },
  {
    title: 'Cyberpunk 2077',
    image: '/images/featured-games/cyberpunk.jpg',
  },
  {
    title: 'Fortnite',
    image: '/images/featured-games/fortnite.jpg',
  },
  {
    title: 'The Witcher 3',
    image: '/images/featured-games/witcher.jpg',
  },
];

// Extract GameCard into a separate memoized component
interface GameCardProps {
  game: FeaturedGame;
  priority?: boolean;
}

const GameCard: React.FC<GameCardProps> = memo(({ game, priority = false }) => (
  <Card
    variant="primary"
    className="group transform-gpu transition-transform duration-300 will-change-transform hover:scale-105"
  >
    <CardContent className="p-0">
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
        <OptimizedImage
          src={game.image}
          alt={game.title}
          width={1920}
          height={1080}
          className="transform-gpu object-cover transition-transform duration-300 hover:scale-110"
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          placeholder="blur"
          blurDataURL={getBlurDataUrl(game.image)}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
        />
        <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-slate-950/90 to-transparent p-4">
          <h3 className="neon-glow-cyan text-2xl font-bold">{game.title}</h3>
        </div>
      </div>
    </CardContent>
  </Card>
));

GameCard.displayName = 'GameCard';

const FeaturedGamesCarousel: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const cardWidth = container.scrollWidth / featuredGames.length;
    container.scrollTo({
      left: cardWidth * index,
      behavior: 'smooth',
    });
    setSelectedIndex(index);
  }, []);

  const scrollPrev = useCallback(() => {
    const newIndex =
      selectedIndex === 0 ? featuredGames.length - 1 : selectedIndex - 1;
    scrollToIndex(newIndex);
  }, [selectedIndex, scrollToIndex]);

  const scrollNext = useCallback(() => {
    const newIndex =
      selectedIndex === featuredGames.length - 1 ? 0 : selectedIndex + 1;
    scrollToIndex(newIndex);
  }, [selectedIndex, scrollToIndex]);

  const handleScroll = useCallback(() => {
    // Cancel any pending animation frame
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Schedule update in the next animation frame
    rafIdRef.current = requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const scrollPosition = container.scrollLeft;
      const cardWidth = container.scrollWidth / featuredGames.length;
      const index = Math.round(scrollPosition / cardWidth);
      setSelectedIndex(index);
    });
  }, []);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <CyberpunkBackground
      variant="circuit"
      intensity="medium"
      className="bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 py-24 contain-layout"
      animated={false}
    >
      <div className="pointer-events-none absolute inset-0 contain-layout motion-reduce:hidden">
        <FloatingElements
          variant="circuits"
          count={8}
          speed="medium"
          color="cyan"
          className="transform-gpu"
        />
      </div>
      <div className="container mx-auto flex flex-col items-center px-4">
        <h2 className="animate-in fade-in slide-in-from-bottom-5 fill-mode-both mb-16 text-center duration-700">
          <NeonText
            variant="solid"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl"
          >
            Featured Games
          </NeonText>
        </h2>
        <div className="animate-in fade-in slide-in-from-bottom-10 fill-mode-both relative flex w-full max-w-7xl justify-center duration-700 [animation-delay:200ms]">
          <NeonBorder className="w-full overflow-hidden">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {featuredGames.map((game, index) => (
                <div
                  className="w-full flex-shrink-0 snap-center p-2 sm:w-3/4 md:w-2/3 lg:w-1/2"
                  key={game.title}
                >
                  <GameCard game={game} priority={index === 0} />
                </div>
              ))}
            </div>
          </NeonBorder>
          {/* Previous Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 left-2 z-10 -translate-y-1/2 transform rounded-full pointer-coarse:scale-125"
            onClick={scrollPrev}
            aria-label="Previous Game"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden="true" />
          </Button>
          {/* Next Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-2 z-10 -translate-y-1/2 transform rounded-full pointer-coarse:scale-125"
            onClick={scrollNext}
            aria-label="Next Game"
          >
            <ChevronRight className="h-7 w-7" aria-hidden="true" />
          </Button>
        </div>
        {/* Carousel Indicators */}
        <div className="animate-in fade-in fill-mode-both mt-6 flex justify-center space-x-3 duration-700 [animation-delay:400ms]">
          {React.useMemo(
            () =>
              featuredGames.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 transition-all duration-200 focus:ring-2 focus:ring-cyan-400 focus:outline-none pointer-coarse:h-6 pointer-coarse:w-6',
                    index === selectedIndex
                      ? 'scale-110 border-cyan-300 bg-cyan-400 shadow-lg'
                      : 'border-gray-400 bg-gray-600 hover:bg-cyan-300/60'
                  )}
                  onClick={() => scrollToIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              )),
            [selectedIndex, scrollToIndex]
          )}
        </div>
      </div>

    </CyberpunkBackground>
  );
};

export default FeaturedGamesCarousel;
