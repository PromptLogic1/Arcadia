'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const FloatingElements = dynamic(
  () => import('@/components/ui/FloatingElements'),
  { ssr: false }
);

interface ClientSectionWrapperProps {
  children: React.ReactNode;
  floatingElementsConfig?: {
    variant: 'particles' | 'circuits' | 'hexagons' | 'orbs' | 'lines';
    count: number;
    speed: 'slow' | 'medium' | 'fast';
    color: 'cyan' | 'purple' | 'fuchsia' | 'emerald' | 'yellow';
  };
}

export const ClientSectionWrapper: React.FC<ClientSectionWrapperProps> = ({
  children,
  floatingElementsConfig,
}) => {
  return (
    <div className="relative">
      {floatingElementsConfig && (
        <FloatingElements
          variant={floatingElementsConfig.variant}
          count={floatingElementsConfig.count}
          speed={floatingElementsConfig.speed}
          color={floatingElementsConfig.color}
        />
      )}
      {children}
    </div>
  );
};
