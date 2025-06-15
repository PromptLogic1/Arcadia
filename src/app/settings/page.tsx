import {
  RouteErrorBoundary,
  AsyncBoundary,
} from '@/components/error-boundaries';
import SettingsComponent from '@/features/settings/components/settings';

export default function SettingsPage() {
  return (
    <RouteErrorBoundary routeName="Settings">
      <AsyncBoundary loadingMessage="Loading settings...">
        <SettingsComponent />
      </AsyncBoundary>
    </RouteErrorBoundary>
  );
}
