'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { OptimizedImage } from '@/components/ui/image';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import NeonBorder from '@/components/ui/NeonBorder';
import { Card, CardContent } from '@/components/ui/card';
import { NeonText } from '@/components/ui/NeonText';
import { Button } from '@/components/ui/button';

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
}

const GameCard: React.FC<GameCardProps> = memo(({ game }) => (
  <Card className="border-none bg-gray-800 transition-transform duration-300 hover:scale-105">
    <CardContent className="p-0">
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
        <OptimizedImage
          src={game.image}
          alt={game.title}
          width={1920}
          height={1080}
          className="transition-transform duration-300 hover:scale-110"
          priority
        />
        <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-gray-900 to-transparent p-4">
          <h3 className="text-2xl font-bold text-cyan-300">{game.title}</h3>
        </div>
      </div>
    </CardContent>
  </Card>
));

GameCard.displayName = 'GameCard';

const FeaturedGamesCarousel: React.FC = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="bg-gradient-to-b from-gray-800 via-gray-900 to-gray-950 py-24">
      <div className="container mx-auto flex flex-col items-center px-4">
        <h2 className="mb-14 text-center text-4xl font-bold md:text-5xl">
          <NeonText>Featured Games</NeonText>
        </h2>
        <div className="relative flex w-full justify-center">
          <NeonBorder className="w-full max-w-5xl overflow-hidden">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {featuredGames.map(game => (
                  <div
                    className="w-full flex-shrink-0 p-2 sm:w-3/4 md:w-2/3 lg:w-1/2"
                    key={game.title}
                  >
                    <GameCard game={game} />
                  </div>
                ))}
              </div>
            </div>
          </NeonBorder>
          {/* Previous Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 left-2 -translate-y-1/2 transform rounded-full border border-cyan-500/20 bg-gray-800/70 text-cyan-400 shadow-lg hover:bg-cyan-500/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            onClick={scrollPrev}
            aria-label="Previous Game"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden="true" />
          </Button>
          {/* Next Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-2 -translate-y-1/2 transform rounded-full border border-cyan-500/20 bg-gray-800/70 text-cyan-400 shadow-lg hover:bg-cyan-500/20 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            onClick={scrollNext}
            aria-label="Next Game"
          >
            <ChevronRight className="h-7 w-7" aria-hidden="true" />
          </Button>
        </div>
        {/* Carousel Indicators */}
        <div className="mt-6 flex justify-center space-x-3">
          {featuredGames.map((_, index) => (
            <button
              key={index}
              className={`h-5 w-5 rounded-full border-2 transition-all duration-200 focus:ring-2 focus:ring-cyan-400 focus:outline-none ${
                index === selectedIndex
                  ? 'scale-110 border-cyan-300 bg-cyan-400 shadow-lg'
                  : 'border-gray-400 bg-gray-600 hover:bg-cyan-300/60'
              }`}
              onClick={() => emblaApi && emblaApi.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedGamesCarousel;
