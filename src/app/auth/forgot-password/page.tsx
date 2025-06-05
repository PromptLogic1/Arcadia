import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { RouteErrorBoundary } from '@/components/error-boundaries';

export default function ForgotPasswordPage() {
  return (
    <RouteErrorBoundary routeName="ForgotPassword">
      <ForgotPasswordForm />
    </RouteErrorBoundary>
  );
}
