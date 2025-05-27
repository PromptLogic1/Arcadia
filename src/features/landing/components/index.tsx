'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { GamepadIcon } from 'lucide-react'
import NeonText from '@/src/components/ui/NeonText'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <GamepadIcon className="h-16 w-16 mx-auto text-cyan-400 mb-6" />
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                <NeonText>Welcome to Arcadia</NeonText>
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Your ultimate gaming community platform
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
} 