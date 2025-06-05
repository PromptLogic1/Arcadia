import SettingsComponent from '@/src/features/settings/components/settings';
import { RouteErrorBoundary, AsyncBoundary } from '@/components/error-boundaries';

export default function SettingsPage() {
  return (
    <RouteErrorBoundary routeName="Settings">
      <AsyncBoundary loadingMessage="Loading settings...">
        <SettingsComponent />
      </AsyncBoundary>
    </RouteErrorBoundary>
  );
}
