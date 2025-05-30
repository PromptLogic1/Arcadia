export const dynamic = 'force-dynamic';
export const revalidate = 60;

import React from 'react';
import Challenges from '@/src/features/challenge-hub/components/challenge-hub';

export default function ChallengeHubPage() {
  return <Challenges />;
}
