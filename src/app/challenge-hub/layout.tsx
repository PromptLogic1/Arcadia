export default function ChallengeHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <><BaseErrorBoundary level="layout">{children}</BaseErrorBoundary></>;
}
