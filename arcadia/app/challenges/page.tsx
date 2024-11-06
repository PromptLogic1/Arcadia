export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidiere alle 60 Sekunden

import Challenges from '@/components/challenges'

export default function ChallengePage() {
  return <Challenges />
}