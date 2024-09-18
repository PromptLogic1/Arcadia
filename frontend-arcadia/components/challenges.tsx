'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Grid, Zap, Trophy, Puzzle, Users, Clock, ArrowRight } from 'lucide-react'
import BingoBattles from '@/components/challenges/bingo-battles'

const challenges = [
  { 
    id: 'bingo-battles',
    name: "Bingo Battles", 
    icon: <Grid className="w-6 h-6" />, 
    description: "Create and play custom bingo boards",
    players: "2-4",
    duration: "15-30 min",
    difficulty: "Easy"
  },
  { 
    id: 'speed-runs',
    name: "Speed Runs", 
    icon: <Zap className="w-6 h-6" />, 
    description: "Race against the clock in timed challenges",
    players: "1-4",
    duration: "5-15 min",
    difficulty: "Medium"
  },
  { 
    id: 'achievement-hunt',
    name: "Achievement Hunt", 
    icon: <Trophy className="w-6 h-6" />, 
    description: "Compete to unlock the most achievements",
    players: "2-8",
    duration: "30-60 min",
    difficulty: "Hard"
  },
  { 
    id: 'puzzle-quests',
    name: "Puzzle Quests", 
    icon: <Puzzle className="w-6 h-6" />, 
    description: "Solve intricate puzzles and riddles",
    players: "1-2",
    duration: "10-20 min",
    difficulty: "Medium"
  },
]

export default function Challenges() {
  const [selectedChallenge, setSelectedChallenge] = useState('bingo-battles')

  return (
    <div className="container mx-auto px-4 py-8 bg-gradient-to-b from-gray-900 to-gray-800 min-h-screen text-white">
      <motion.div 
        className="mb-12"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 text-center tracking-tight">
          Arcadia Challenges
        </h1>
        <p className="text-xl text-cyan-200 text-center mb-8">
          Choose your challenge and compete with gamers worldwide!
        </p>
      </motion.div>

      <Tabs defaultValue={selectedChallenge} onValueChange={setSelectedChallenge} className="space-y-16">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-transparent">
          {challenges.map((challenge) => (
            <TabsTrigger
              key={challenge.id}
              value={challenge.id}
              className="flex flex-col items-center space-y-2 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-all duration-200 data-[state=active]:bg-gradient-to-r from-cyan-500/50 to-fuchsia-500/50 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              {challenge.icon}
              <span className="text-sm font-medium">{challenge.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-16 pt-8 border-t border-cyan-500/30">
          {challenges.map((challenge) => (
            <TabsContent key={challenge.id} value={challenge.id}>
              <Card className="bg-gray-800/50 border-2 border-cyan-500/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
                    {challenge.name}
                  </CardTitle>
                  <CardDescription className="text-lg text-cyan-200">
                    {challenge.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 mb-6">
                    <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-200 flex items-center gap-2 px-3 py-1">
                      <Users className="w-4 h-4" />
                      {challenge.players} players
                    </Badge>
                    <Badge variant="secondary" className="bg-fuchsia-500/20 text-fuchsia-200 flex items-center gap-2 px-3 py-1">
                      <Clock className="w-4 h-4" />
                      {challenge.duration}
                    </Badge>
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-200 px-3 py-1">
                      {challenge.difficulty}
                    </Badge>
                  </div>
                  {challenge.id === 'bingo-battles' ? (
                    <BingoBattles />
                  ) : (
                    <motion.div 
                      className="text-center py-12"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <p className="text-xl text-cyan-300 mb-4">Coming soon!</p>
                      <p className="text-lg text-cyan-200">We&apos;re working hard to bring you this exciting new challenge.</p>
                    </motion.div>
                  )}
                </CardContent>
                {challenge.id !== 'bingo-battles' && (
                  <CardFooter className="justify-center">
                    <Button className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white transition-all duration-300 transform hover:scale-105">
                      Get notified when available
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}

export function exportChallenges() {
  return challenges
}
