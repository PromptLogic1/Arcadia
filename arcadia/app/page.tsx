import { Suspense } from 'react'
import { lazy } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'

// Seiten-Konfiguration
export const runtime = 'edge'
export const preferredRegion = 'auto'
export const dynamic = 'force-dynamic'

// Lazy Loading der Landing Page
const LandingPage = lazy(() => import('../app/landing-page'))

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LandingPage />
    </Suspense>
  )
}