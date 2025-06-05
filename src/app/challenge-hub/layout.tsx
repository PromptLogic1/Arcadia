import { BaseErrorBoundary } from '@/components/error-boundaries';

export default function ChallengeHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BaseErrorBoundary level="layout">{children}</BaseErrorBoundary>
    </>
  );
}
