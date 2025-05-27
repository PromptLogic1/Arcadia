'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { ChevronRight, X } from 'lucide-react'
import NeonBorder from '@/components/ui/NeonBorder'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import NeonText from '@/components/ui/NeonText'

interface Challenge {
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  details: string
  keyFeatures: string[]
  difficulty: string
  estimatedTime: string
}

interface FeaturedChallengesProps {
  challenges: readonly Challenge[]
}

const FeaturedChallenges: React.FC<FeaturedChallengesProps> = ({ challenges }) => {
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null)

  const toggleSelectedChallenge = useCallback((index: number) => {
    setSelectedChallenge(prevIndex => prevIndex === index ? null : index)
  }, [])

  return (
    <section id="challenges" className="py-20 bg-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
          <NeonText>Featured Challenges</NeonText>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.name}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <NeonBorder color={index % 2 === 0 ? 'cyan' : 'pink'}>
                <Card
                  className={`bg-gray-800 border-none h-full cursor-pointer transition-transform duration-300 hover:scale-105 ${
                    selectedChallenge === index ? 'shadow-lg shadow-cyan-500/50' : ''
                  }`}
                  onClick={() => toggleSelectedChallenge(index)}
                >
                  <CardHeader className="flex flex-col items-center p-4">
                    <div
                      className={`w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 flex items-center justify-center mb-4 transition-transform duration-300 ${
                        selectedChallenge === index ? 'scale-110' : ''
                      }`}
                    >
                      <challenge.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-cyan-300">
                      {challenge.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-cyan-100 text-center">{challenge.description}</p>
                  </CardContent>
                </Card>
              </NeonBorder>
            </motion.div>
          ))}
        </div>
        <AnimatePresence>
          {selectedChallenge !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-12"
            >
              <NeonBorder color="yellow">
                <Card className="bg-gray-800 border-none">
                  <CardHeader className="flex flex-row items-start justify-between p-4">
                    <div>
                      <CardTitle className="text-3xl font-bold text-cyan-300">
                        {challenges[selectedChallenge]?.name}
                      </CardTitle>
                      <CardDescription className="text-lg text-cyan-100 mt-2">
                        {challenges[selectedChallenge]?.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedChallenge(null)}
                      className="text-cyan-400 hover:text-cyan-300 rounded-full border border-cyan-500/20"
                      aria-label="Close challenge details"
                    >
                      <X className="h-6 w-6" aria-hidden="true" />
                    </Button>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-8 p-4">
                    <div>
                      <h3 className="text-xl font-semibold text-cyan-300 mb-4">
                        Challenge Details
                      </h3>
                      <p className="text-cyan-100 mb-4 leading-relaxed">
                        {challenges[selectedChallenge]?.details}
                      </p>
                      <h4 className="text-lg font-semibold text-cyan-300 mb-2">
                        Key Features:
                      </h4>
                      <ul className="list-disc list-inside text-cyan-100 mb-4 space-y-2">
                        {challenges[selectedChallenge]?.keyFeatures.map((feature, idx) => (
                          <li key={`${challenges[selectedChallenge]?.name}-feature-${idx}`}>{feature}</li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-cyan-300">Difficulty</h4>
                          <p className="text-cyan-100">
                            {challenges[selectedChallenge]?.difficulty}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-cyan-300">Estimated Time</h4>
                          <p className="text-cyan-100">
                            {challenges[selectedChallenge]?.estimatedTime}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4 shadow-lg">
                        <Image
                          src={`/challenges/${challenges[selectedChallenge]?.name.toLowerCase().replace(/\s+/g, '-')}.jpg`}
                          alt={`${challenges[selectedChallenge]?.name} demo`}
                          width={640}
                          height={360}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          placeholder="blur"
                          blurDataURL="/placeholder-blur.jpg"
                        />
                      </div>
                      <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105">
                        Start Challenge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </NeonBorder>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-12 text-center">
          <Button
            variant="ghost"
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 border border-cyan-500/20"
          >
            Explore All Challenges
            <ChevronRight className="ml-2 h-5 w-5 inline-block" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  )
}

export default React.memo(FeaturedChallenges)