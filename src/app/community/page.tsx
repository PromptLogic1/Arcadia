// Suspense and LoadingSpinner removed - not currently used
import Community from '@/features/community/components/community';
import {
  RouteErrorBoundary,
  AsyncBoundary,
} from '@/components/error-boundaries';

// Konfiguration für dynamisches Rendering
export const dynamic = 'force-dynamic';
export const revalidate = 30; // Häufigere Revalidierung für Community-Inhalte

export default function CommunityPage() {
  return (
    <RouteErrorBoundary routeName="Community">
      <AsyncBoundary loadingMessage="Loading community...">
        <Community />
      </AsyncBoundary>
    </RouteErrorBoundary>
  );
}
