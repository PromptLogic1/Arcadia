import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Community from '@/src/features/community/components/community';

// Konfiguration für dynamisches Rendering
export const dynamic = 'force-dynamic';
export const revalidate = 30; // Häufigere Revalidierung für Community-Inhalte

export default function CommunityPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Community />
    </Suspense>
  );
}
