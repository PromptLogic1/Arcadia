"use client"

import { useState, useCallback, useEffect } from "react"
import type { Challenge } from "@/components/hero-section"

interface UseHeroSectionProps {
  challenges: ReadonlyArray<Challenge>
  autoRotate?: boolean
  rotationInterval?: number
}

interface UseHeroSectionReturn {
  currentChallenge: number
  setCurrentChallenge: (index: number) => void
  nextChallenge: () => void
  previousChallenge: () => void
  isAutoRotating: boolean
  toggleAutoRotate: () => void
}

export function useHeroSection({
  challenges,
  autoRotate = true,
  rotationInterval = 5000,
}: UseHeroSectionProps): UseHeroSectionReturn {
  const [currentChallenge, setCurrentChallenge] = useState(0)
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate)

  const nextChallenge = useCallback(() => {
    setCurrentChallenge((prev) => (prev >= challenges.length - 1 ? 0 : prev + 1))
  }, [challenges.length])

  const previousChallenge = useCallback(() => {
    setCurrentChallenge((prev) => (prev <= 0 ? challenges.length - 1 : prev - 1))
  }, [challenges.length])

  const toggleAutoRotate = useCallback(() => {
    setIsAutoRotating((prev) => !prev)
  }, [])

  // Auto-rotation effect
  useEffect(() => {
    if (!isAutoRotating || challenges.length <= 1) return

    const interval = setInterval(nextChallenge, rotationInterval)
    return () => clearInterval(interval)
  }, [isAutoRotating, nextChallenge, rotationInterval, challenges.length])

  // Reset challenge index if it's out of bounds
  useEffect(() => {
    if (currentChallenge >= challenges.length) {
      setCurrentChallenge(0)
    }
  }, [currentChallenge, challenges.length])

  return {
    currentChallenge,
    setCurrentChallenge,
    nextChallenge,
    previousChallenge,
    isAutoRotating,
    toggleAutoRotate,
  }
}
