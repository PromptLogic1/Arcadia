import { RouteErrorBoundary } from '@/components/error-boundaries';
import UserProfile from '@/features/user/components/user-profile-wrapper';

export default function UserProfilePage() {
  return (
    <RouteErrorBoundary routeName="UserProfile">
      <UserProfile />
    </RouteErrorBoundary>
  );
}
