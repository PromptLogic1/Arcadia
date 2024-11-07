// components/landing-page/FeaturedGamesCarousel.tsx

import React, { useState, useEffect, useCallback, memo } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { OptimizedImage } from '@/components/ui/image'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import NeonBorder from '@/components/ui/NeonBorder'
import { Card, CardContent } from '@/components/ui/card'
import NeonText from '@/components/ui/NeonText'
import { Button } from '@/components/ui/button'

// Define the FeaturedGame interface with proper image typing
interface FeaturedGame {
  title: string
  image: string
}

// Define the featured games data with image URL paths
const featuredGames: FeaturedGame[] = [
  {
    title: 'World of Warcraft',
    image: '/images/Featured_Games/wow.jpg',
  },
  {
    title: 'Elden Ring',
    image: '/images/Featured_Games/elden-ring.jpg',
  },
  {
    title: 'Cyberpunk 2077',
    image: '/images/Featured_Games/cyberpunk.jpg',
  },
  {
    title: 'Fortnite',
    image: '/images/Featured_Games/fortnite.jpg',
  },
  {
    title: 'The Witcher 3',
    image: '/images/Featured_Games/witcher.jpg',
  },
]

// Extract GameCard into a separate memoized component
interface GameCardProps {
  game: FeaturedGame
}

const GameCard: React.FC<GameCardProps> = memo(({ game }) => (
  <Card className="bg-gray-800 border-none transition-transform duration-300 hover:scale-105">
    <CardContent className="p-0">
      <div className="aspect-[16/9] overflow-hidden rounded-lg relative">
        <OptimizedImage
          src={game.image}
          alt={game.title}
          width={1920}
          height={1080}
          className="transition-transform duration-300 hover:scale-110"
          priority
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-4">
          <h3 className="text-2xl font-bold text-cyan-300">
            {game.title}
          </h3>
        </div>
      </div>
    </CardContent>
  </Card>
))

GameCard.displayName = 'GameCard'

const FeaturedGamesCarousel: React.FC = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState<number>(0)

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <section className="py-20 bg-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
          <NeonText>Featured Games</NeonText>
        </h2>
        <div className="relative">
          <NeonBorder className="overflow-hidden">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {featuredGames.map((game) => (
                  <div
                    className="flex-shrink-0 w-full sm:w-3/4 md:w-2/3 lg:w-1/2 p-2"
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
            className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-gray-800/50 text-cyan-400 hover:bg-cyan-500/20 rounded-full border border-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            onClick={scrollPrev}
            aria-label="Previous Game"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Button>
          {/* Next Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-gray-800/50 text-cyan-400 hover:bg-cyan-500/20 rounded-full border border-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            onClick={scrollNext}
            aria-label="Next Game"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>
        {/* Carousel Indicators */}
        <div className="flex justify-center mt-4 space-x-2">
          {featuredGames.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === selectedIndex
                  ? 'bg-cyan-400'
                  : 'bg-gray-500 hover:bg-gray-400'
              }`}
              onClick={() => emblaApi && emblaApi.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturedGamesCarousel