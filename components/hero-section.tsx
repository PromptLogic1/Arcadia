"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Play, Users, Sparkles } from "lucide-react"
import NeonBorder from "@/components/ui/neon-border"
import ArcadeDecoration from "@/components/ui/arcade-decoration"
import { NeonText } from "@/components/ui/neon-text"
import { Button } from "@/components/ui/button"

export interface Challenge {
  id: string
  name: string
}

interface HeroSectionProps {
  currentChallenge?: number
  challenges?: ReadonlyArray<Challenge>
}

// Provide default props to avoid undefined errors
const defaultChallenges: ReadonlyArray<Challenge> = [
  { id: "1", name: "Pixel Adventure" },
  { id: "2", name: "Neon Racer" },
  { id: "3", name: "Cosmic Quest" },
]

export default function HeroSection({ currentChallenge = 0, challenges = defaultChallenges }: HeroSectionProps) {
  const currentChallengeName = useMemo(
    () => challenges[currentChallenge]?.name || "Adventure Awaits",
    [currentChallenge, challenges],
  )

  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background py-24"
      id="home"
    >
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />

      {/* Decorative elements */}
      <ArcadeDecoration className="left-10 top-10 opacity-10 animate-pulse" />
      <ArcadeDecoration className="bottom-10 right-10 opacity-10 animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="container mx-auto flex flex-col items-center justify-center px-4 relative z-10">
        {/* Main heading */}
        <motion.div
          className="w-full max-w-4xl text-center"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-8 text-6xl font-extrabold leading-tight tracking-tight md:text-7xl lg:text-8xl">
            Welcome to{" "}
            <span className="mt-2 block">
              <NeonText intensity="high">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse">
                  Arcadia
                </span>
              </NeonText>
            </span>
          </h1>

          <motion.p
            className="mb-12 text-xl leading-relaxed text-muted-foreground md:text-2xl max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Experience the thrill of gaming with innovative challenges, enhanced graphics, and modern interactions
          </motion.p>

          {/* Action buttons */}
          <motion.div
            className="flex flex-col justify-center gap-6 sm:flex-row items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              size="lg"
              className="group bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Play className="mr-3 h-6 w-6 group-hover:animate-pulse" aria-hidden="true" />
              Start Playing
              <Sparkles className="ml-2 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="border-primary/30 bg-background/50 backdrop-blur-sm hover:bg-primary/10 transition-all duration-300"
            >
              <Users className="mr-3 h-6 w-6" aria-hidden="true" />
              Join Community
            </Button>
          </motion.div>
        </motion.div>

        {/* Featured challenge showcase */}
        <motion.div
          className="mt-16 w-full max-w-4xl"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <NeonBorder className="p-0.5 hover:shadow-2xl transition-shadow duration-300">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm">
              <Image
                src="/placeholder.svg?height=720&width=1280"
                alt="Arcadia Gameplay Preview"
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                priority
              />

              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

              <div className="absolute bottom-8 left-8 right-8 text-center">
                <h2 className="mb-4 text-4xl font-bold md:text-5xl">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentChallenge}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                      className="inline-block rounded-lg bg-background/20 backdrop-blur-sm p-4 border border-primary/20"
                    >
                      <NeonText intensity="high">
                        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {currentChallengeName}
                        </span>
                      </NeonText>
                    </motion.span>
                  </AnimatePresence>
                </h2>
                <p className="text-xl text-muted-foreground">Challenge yourself and others</p>
              </div>
            </div>
          </NeonBorder>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          className="mt-16 grid gap-6 grid-cols-1 sm:grid-cols-3 w-full max-w-4xl"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {[
            { icon: "🎮", title: "Interactive Gaming", desc: "Touch-optimized controls" },
            { icon: "🌟", title: "Modern Effects", desc: "Enhanced visual feedback" },
            { icon: "📱", title: "Cross-Device", desc: "Adaptive to your device" },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="bg-background/50 backdrop-blur-sm border border-primary/20 hover:border-primary/40 text-center p-6 rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
            >
              <div
                className="text-4xl mb-3 animate-bounce"
                style={{
                  animationDelay: `${index * 0.5}s`,
                  animationDuration: "2s",
                }}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
