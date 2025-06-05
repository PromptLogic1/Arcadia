import UserProfile from '@/src/features/user/components/user-profile-wrapper';
import { RouteErrorBoundary } from '@/components/error-boundaries';

export default function UserProfilePage() {
  return (
    <RouteErrorBoundary routeName="UserProfile">
      <UserProfile />
    </RouteErrorBoundary>
  );
}
