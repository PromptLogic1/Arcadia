'use client'

import React from 'react'

export function PlayArea() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Play Area
        </h1>
        <p className="mt-4 text-gray-300">
          This is where users will play their bingo games with active sessions and real-time updates.
        </p>
      </main>
    </div>
  )
} 