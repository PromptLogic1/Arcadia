import type { Metadata } from 'next';
import { RouteErrorBoundary } from '@/components/error-boundaries';

export const metadata: Metadata = {
  title: 'Tournaments | Arcadia',
  description: 'Compete in organized gaming tournaments.',
};

export default function TournamentsPage() {
  return (
    <RouteErrorBoundary routeName="Tournaments">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-4xl font-bold text-transparent">
              Tournaments
            </h1>
            <p className="text-xl text-gray-300">
              Competitive gaming tournaments coming soon!
            </p>
          </div>

          <div className="text-center">
            <div className="rounded-lg border border-green-500/20 bg-gray-800/50 p-8">
              <h2 className="mb-4 text-2xl font-semibold text-green-400">
                Under Development
              </h2>
              <p className="text-gray-300">
                Tournament system is currently being developed. Get ready for
                competitive gaming challenges!
              </p>
            </div>
          </div>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
