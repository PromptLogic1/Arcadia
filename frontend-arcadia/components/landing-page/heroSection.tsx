import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Play, Users } from 'lucide-react'
import NeonBorder from '@/components/ui/NeonBorder'
import ArcadeDecoration from '@/components/ui/ArcadeDecoration'
import NeonText from '@/components/ui/NeonText'
import { Button } from '@/components/ui/button'

interface Challenge {
  id: string
  name: string
}

interface HeroSectionProps {
  currentChallenge: number
  challenges: ReadonlyArray<Challenge>
}

const HeroSection: React.FC<HeroSectionProps> = React.memo(({
  currentChallenge,
  challenges,
}) => {
  const currentChallengeName = useMemo(() => challenges[currentChallenge]?.name || '', [currentChallenge, challenges])

  return (
    <section className="relative overflow-hidden py-20 md:py-32" id="home">
      <ArcadeDecoration className="top-10 left-10 opacity-10" />
      <ArcadeDecoration className="bottom-10 right-10 opacity-10" />
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <motion.div
            className="w-full md:w-1/2"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
              Welcome to <NeonText>Arcadia</NeonText>
            </h1>
            <motion.p
              className="text-xl md:text-2xl text-cyan-200 mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Experience the thrill of gaming with innovative challenges
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 text-white text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/50">
                <Play className="mr-2 h-5 w-5" aria-hidden="true" />
                Start Playing
              </Button>
              <Button
                variant="ghost"
                className="w-full sm:w-auto text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 border border-cyan-500/20"
              >
                <Users className="mr-2 h-5 w-5" aria-hidden="true" />
                Join Community
              </Button>
            </motion.div>
          </motion.div>
          <motion.div
            className="w-full md:w-1/2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <NeonBorder className="p-0.5">
              <div className="bg-gray-800 rounded-lg overflow-hidden relative">
                <Image
                  src="/placeholder.svg"
                  alt="Arcadia Gameplay"
                  width={600}
                  height={400}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentChallenge}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <NeonText>{currentChallengeName}</NeonText>
                      </motion.span>
                    </AnimatePresence>
                  </h2>
                  <p className="text-cyan-200 text-lg">
                    Challenge yourself and others
                  </p>
                </div>
              </div>
            </NeonBorder>
          </motion.div>
        </div>
      </div>
    </section>
  )
})

HeroSection.displayName = 'HeroSection'

export default HeroSection