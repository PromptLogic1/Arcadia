import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Play Area | Arcadia',
  description:
    'Host your own challenges or join active gaming sessions in the Arcadia Play Area.',
};

export default function PlayAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
