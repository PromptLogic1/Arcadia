import type { Metadata } from 'next';
import { RouteErrorBoundary } from '@/components/error-boundaries';

export const metadata: Metadata = {
  title: 'Quick Games | Arcadia',
  description: 'Jump into fast-paced gaming challenges.',
};

export default function QuickGamesPage() {
  return (
    <RouteErrorBoundary routeName="QuickPlay">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-fuchsia-400 to-cyan-500 bg-clip-text text-4xl font-bold text-transparent">
              Quick Games
            </h1>
            <p className="text-xl text-gray-300">
              Fast-paced gaming challenges coming soon!
            </p>
          </div>

          <div className="text-center">
            <div className="rounded-lg border border-fuchsia-500/20 bg-gray-800/50 p-8">
              <h2 className="mb-4 text-2xl font-semibold text-fuchsia-400">
                Under Development
              </h2>
              <p className="text-gray-300">
                Quick games feature is currently being developed. Check back soon
                for exciting gaming challenges!
              </p>
            </div>
          </div>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
