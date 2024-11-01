'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Grid, Zap, Trophy, Puzzle } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface Challenge {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  disabled?: boolean
}

interface ChallengesTabsProps {
  challenges: Challenge[]
  activeChallenge: string
  onChallengeChange: (challengeId: string) => void
}

export const ChallengesTabs: React.FC<ChallengesTabsProps> = ({
  challenges,
  activeChallenge,
  onChallengeChange,
}) => {
  return (
    <div className="relative mb-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {challenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="aspect-[4/3] w-full"
            >
              <Card
                onClick={() => !challenge.disabled && onChallengeChange(challenge.id)}
                className={cn(
                  "relative bg-gray-800 border cursor-pointer h-full",
                  "transition-all duration-300 ease-in-out group",
                  "overflow-hidden backdrop-blur-sm",
                  challenge.disabled 
                    ? "cursor-not-allowed opacity-50 border-gray-700"
                    : activeChallenge === challenge.id
                    ? "border-cyan-500 shadow-lg shadow-cyan-500/20"
                    : "border-pink-500/20 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20"
                )}
              >
                <motion.div 
                  className="flex flex-col items-center justify-center text-center h-full p-4"
                  whileHover={!challenge.disabled ? { scale: 1.02 } : undefined}
                  whileTap={!challenge.disabled ? { scale: 0.98 } : undefined}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                    "transition-all duration-300",
                    activeChallenge === challenge.id
                      ? "bg-cyan-500/20"
                      : "bg-gray-800 group-hover:bg-cyan-500/10"
                  )}>
                    {challenge.icon}
                  </div>
                  <h3 className={cn(
                    "font-medium text-sm mb-2",
                    activeChallenge === challenge.id 
                      ? "text-cyan-300" 
                      : "text-gray-300 group-hover:text-cyan-300"
                  )}>
                    {challenge.name}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 group-hover:text-gray-300 max-w-[90%]">
                    {challenge.description}
                  </p>
                  {challenge.disabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
                      <span className="text-xs font-medium text-gray-400">Coming Soon</span>
                    </div>
                  )}
                </motion.div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}