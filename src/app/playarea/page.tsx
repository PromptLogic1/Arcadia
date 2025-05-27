import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoadingSpinner from '@/src/components/ui/loading-spinner'

export const metadata: Metadata = {
  title: 'Play Area | Arcadia',
  description: 'Choose your gaming challenge and start playing in the Arcadia platform.',
}

// Components will be implemented using the existing play-area features

export default function PlayAreaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <Suspense fallback={<LoadingSpinner />}>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4">
              Play Area
            </h1>
            <p className="text-xl text-gray-300">
              Choose your challenge and start playing
            </p>
          </div>
          
          {/* Content will be loaded by feature components */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
              <h3 className="text-xl font-semibold text-cyan-400 mb-2">Bingo Boards</h3>
              <p className="text-gray-300 mb-4">Create and play custom bingo games with friends.</p>
              <a 
                href="/playarea/bingo" 
                className="inline-block bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                Play Now
              </a>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-6 border border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-colors">
              <h3 className="text-xl font-semibold text-fuchsia-400 mb-2">Quick Games</h3>
              <p className="text-gray-300 mb-4">Jump into fast-paced gaming challenges.</p>
              <a 
                href="/playarea/quick" 
                className="inline-block bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                Play Now
              </a>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-6 border border-green-500/20 hover:border-green-500/40 transition-colors">
              <h3 className="text-xl font-semibold text-green-400 mb-2">Tournaments</h3>
              <p className="text-gray-300 mb-4">Compete in organized gaming tournaments.</p>
              <a 
                href="/playarea/tournaments" 
                className="inline-block bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                Join Now
              </a>
            </div>
          </div>
        </div>
      </Suspense>
    </div>
  )
} 