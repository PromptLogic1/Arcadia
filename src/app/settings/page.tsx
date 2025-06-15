import {
  RouteErrorBoundary,
  AsyncBoundary,
} from '@/components/error-boundaries';
import dynamic from 'next/dynamic';

// Dynamic import for SettingsComponent (heavy form with validation)
const SettingsComponent = dynamic(() => import('@/features/settings/components/settings'), {
  loading: () => null, // AsyncBoundary already provides loading state
});

export default function SettingsPage() {
  return (
    <RouteErrorBoundary routeName="Settings">
      <AsyncBoundary loadingMessage="Loading settings...">
        <SettingsComponent />
      </AsyncBoundary>
    </RouteErrorBoundary>
  );
}
