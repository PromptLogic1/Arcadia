import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const metadata: Metadata = {
  title: 'Play Area | Arcadia',
  description:
    'Choose your gaming challenge and start playing in the Arcadia platform.',
};

// Components will be implemented using the existing play-area features

export default function PlayAreaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <Suspense fallback={<LoadingSpinner />}>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-4xl font-bold text-transparent">
              Play Area
            </h1>
            <p className="text-xl text-gray-300">
              Choose your challenge and start playing
            </p>
          </div>

          {/* Content will be loaded by feature components */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-cyan-500/20 bg-gray-800/50 p-6 transition-colors hover:border-cyan-500/40">
              <h3 className="mb-2 text-xl font-semibold text-cyan-400">
                Bingo Boards
              </h3>
              <p className="mb-4 text-gray-300">
                Create and play custom bingo games with friends.
              </p>
              <a
                href="/playarea/bingo"
                className="inline-block rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-white transition-opacity hover:opacity-90"
              >
                Play Now
              </a>
            </div>

            <div className="rounded-lg border border-fuchsia-500/20 bg-gray-800/50 p-6 transition-colors hover:border-fuchsia-500/40">
              <h3 className="mb-2 text-xl font-semibold text-fuchsia-400">
                Quick Games
              </h3>
              <p className="mb-4 text-gray-300">
                Jump into fast-paced gaming challenges.
              </p>
              <a
                href="/playarea/quick"
                className="inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-4 py-2 text-white transition-opacity hover:opacity-90"
              >
                Play Now
              </a>
            </div>

            <div className="rounded-lg border border-green-500/20 bg-gray-800/50 p-6 transition-colors hover:border-green-500/40">
              <h3 className="mb-2 text-xl font-semibold text-green-400">
                Tournaments
              </h3>
              <p className="mb-4 text-gray-300">
                Compete in organized gaming tournaments.
              </p>
              <a
                href="/playarea/tournaments"
                className="inline-block rounded-full bg-gradient-to-r from-green-500 to-blue-500 px-4 py-2 text-white transition-opacity hover:opacity-90"
              >
                Join Now
              </a>
            </div>
          </div>
        </div>
      </Suspense>
    </div>
  );
}
