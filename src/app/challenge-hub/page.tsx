export const dynamic = 'force-dynamic';
export const revalidate = 60;

import Challenges from '@/src/features/challenge-hub/components/challenge-hub';
import { RouteErrorBoundary } from '@/components/error-boundaries';

export default function ChallengeHubPage() {
  return (
    <RouteErrorBoundary routeName="ChallengeHub">
      <Challenges />
    </RouteErrorBoundary>
  );
}
