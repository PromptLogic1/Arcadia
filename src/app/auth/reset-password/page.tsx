import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { RouteErrorBoundary } from '@/components/error-boundaries';

export default function ResetPasswordPage() {
  return (
    <RouteErrorBoundary routeName="ResetPassword">
      <ResetPasswordForm />
    </RouteErrorBoundary>
  );
}
