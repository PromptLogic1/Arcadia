'use client'

import React, { Suspense, lazy } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'

// Page Configuration
export const runtime = 'edge'
export const preferredRegion = 'auto'
export const dynamic = 'force-dynamic'

// Lazy Loading of Landing Page
const LandingPage = lazy(() => import('./_components/landing-page'))

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LandingPage />
    </Suspense>
  )
} 