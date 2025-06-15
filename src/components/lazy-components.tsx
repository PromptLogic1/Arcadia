/**
 * Lazy-loaded components for code splitting optimization
 *
 * This file centralizes all dynamic imports to improve bundle splitting
 * and reduce initial bundle size.
 */

import dynamic from 'next/dynamic';
import type { ComponentType as _ComponentType } from 'react';

// Loading components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
  </div>
);

const PageSkeleton = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="h-4 w-3/4 rounded bg-gray-300"></div>
    <div className="h-4 w-1/2 rounded bg-gray-300"></div>
    <div className="h-32 rounded bg-gray-300"></div>
  </div>
);

// Feature-based lazy components
export const LazyBingoBoardsHub = dynamic(
  () => import('@/features/bingo-boards/components/BingoBoardsHub'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyBingoBoardEdit = dynamic(
  () =>
    import(
      '@/features/bingo-boards/components/bingo-boards-edit/BingoBoardEdit'
    ).then(mod => ({ default: mod.BingoBoardEdit })),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  }
);

export const LazyCommunityPage = dynamic(
  () => import('@/features/community/components/community'),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  }
);

export const LazyChallengeHub = dynamic(
  () =>
    import('@/features/challenge-hub/components/challenge-hub')
      .then(mod => ({ default: mod.default }))
      .catch(() => ({ default: () => <div>Challenge Hub not available</div> })),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  }
);

export const LazyPlayAreaHub = dynamic(
  () =>
    import('@/features/play-area/components/PlayAreaHub').then(mod => ({
      default: mod.PlayAreaHub,
    })),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  }
);

export const LazyGameSession = dynamic(
  () =>
    import('@/features/play-area/components/GameSession').then(mod => ({
      default: mod.GameSession,
    })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyUserPageEdit = dynamic(
  () => import('@/features/user/components/user-page-edit'),
  {
    loading: () => <PageSkeleton />,
    ssr: false,
  }
);

// Heavy UI components that can be lazy loaded
export const LazyCreateBoardForm = dynamic(
  () =>
    import('@/features/bingo-boards/components/CreateBoardForm').then(mod => ({
      default: mod.CreateBoardForm,
    })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyJoinSessionDialog = dynamic(
  () =>
    import('@/features/bingo-boards/components/JoinSessionDialog').then(
      mod => ({ default: mod.JoinSessionDialog })
    ),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazySessionHostingDialog = dynamic(
  () =>
    import('@/features/play-area/components/SessionHostingDialog').then(
      mod => ({ default: mod.SessionHostingDialog })
    ),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Error boundaries (can be lazy loaded on error)
export const LazyRouteErrorBoundary = dynamic(
  () =>
    import('@/components/error-boundaries/RouteErrorBoundary').then(mod => ({
      default: mod.RouteErrorBoundary,
    })),
  {
    loading: () => <div>Loading error handler...</div>,
    ssr: true, // Error boundaries should be SSR for better error handling
  }
);

// Settings and configuration components
// Temporarily disabled due to build issue
// export const LazySettingsPage = dynamic(
//   () => import('@/app/settings/page'),
//   {
//     loading: () => <PageSkeleton />,
//     ssr: false,
//   }
// );

// Admin components (only load when needed)
// export const LazyAdminDashboard = dynamic(
//   () => import('@/features/admin/components/AdminDashboard').catch(() => ({ default: () => null })),
//   {
//     loading: () => <LoadingSpinner />,
//     ssr: false,
//   }
// );

// Development tools (only in development)
// export const LazyDevTools = dynamic(
//   () => {
//     if (process.env.NODE_ENV === 'development') {
//       return import('@/components/dev/DevTools').catch(() => ({ default: () => null }));
//     }
//     return Promise.resolve({ default: () => null });
//   },
//   {
//     loading: () => null,
//     ssr: false,
//   }
// );

// Service Worker registration (client-side only)
export const LazyServiceWorkerRegistration = dynamic(
  () =>
    import('@/components/ServiceWorkerRegistration').then(mod => ({
      default: mod.ServiceWorkerRegistration,
    })),
  {
    loading: () => null,
    ssr: false,
  }
);

// Heavy chart/visualization components
// export const LazyStatsChart = dynamic(
//   () => import('@/components/charts/StatsChart').catch(() => ({ default: () => null })),
//   {
//     loading: () => <LoadingSpinner />,
//     ssr: false,
//   }
// );

// Third-party integrations that can be lazy loaded
// export const LazyAnalytics = dynamic(
//   () => import('@/components/analytics/AnalyticsProvider').catch(() => ({ default: () => null })),
//   {
//     loading: () => null,
//     ssr: false,
//   }
// );

// Helper function to create lazy component with custom loading
// export function createLazyComponent<T extends ComponentType<any>>(
//   importFn: () => Promise<{ default: T }>,
//   loadingComponent: ComponentType = LoadingSpinner,
//   ssrEnabled: boolean = false
// ): ComponentType {
//   return dynamic(importFn, {
//     loading: loadingComponent,
//     ssr: ssrEnabled,
//   });
// }

// Helper for route-level code splitting
// export function createLazyRoute<T extends ComponentType<any>>(
//   importFn: () => Promise<{ default: T }>
// ): ComponentType {
//   return dynamic(importFn, {
//     loading: () => <PageSkeleton />,
//     ssr: false,
//   });
// }
