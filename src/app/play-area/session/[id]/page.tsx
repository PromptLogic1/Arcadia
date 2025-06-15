import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import { sessionService } from '@/services/session.service';

// Types
interface SessionPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: SessionPageProps): Promise<Metadata> {
  try {
    const response = await sessionService.getSessionStats(params.id);

    if (!response.success || !response.data) {
      return {
        title: 'Session Not Found | Arcadia',
        description: 'The requested gaming session could not be found.',
      };
    }

    const session = response.data;

    return {
      title: `${session.board_title || 'Gaming Session'} | Arcadia Play Area`,
      description: `Join ${session.host_username || 'a host'} in an exciting ${session.board_title || 'gaming'} session. Current status: ${session.status || 'unknown'}.`,
    };
  } catch {
    return {
      title: 'Gaming Session | Arcadia',
      description: 'Join an exciting gaming session in the Arcadia Play Area.',
    };
  }
}

async function SessionData({ sessionId }: { sessionId: string }) {
  // Get session details with board and players using service layer
  const response = await sessionService.getSessionWithDetails(sessionId);

  if (!response.success || !response.data) {
    notFound();
  }

  // Import the client component dynamically
  const { GameSession } = await import(
    '@/features/play-area/components/GameSession'
  );

  return <GameSession sessionId={sessionId} />;
}

export default function SessionPage({ params }: SessionPageProps) {
  return (
    <RouteErrorBoundary routeName="GameSession">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <div className="space-y-4 text-center">
                <LoadingSpinner className="mx-auto h-8 w-8" />
                <p className="text-gray-300">Loading game session...</p>
              </div>
            </div>
          }
        >
          <SessionData sessionId={params.id} />
        </Suspense>
      </div>
    </RouteErrorBoundary>
  );
}
