'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import NeonBorder from '@/components/ui/NeonBorder';
import { NeonText } from '@/components/ui/NeonText';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  website: string;
}

const partners: ReadonlyArray<Partner> = [
  {
    id: 'partner-one',
    name: 'Partner One',
    logoUrl: '/images/partners/partner1.png',
    website: '',
  },
  {
    id: 'partner-two',
    name: 'Partner Two',
    logoUrl: '/images/partners/partner2.png',
    website: '',
  },
  {
    id: 'partner-three',
    name: 'Partner Three',
    logoUrl: '/images/partners/partner3.png',
    website: '',
  },
  {
    id: 'partner-four',
    name: 'Partner Four',
    logoUrl: '/images/partners/partner4.png',
    website: '',
  },
] as const;

const PartnersSection: React.FC = () => {
  const renderPartners = useMemo(
    () =>
      partners.map(partner => (
        <NeonBorder
          key={partner.id}
          color="cyan"
          className="flex h-24 w-48 items-center justify-center cyber-card border-cyan-500/40 p-1 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-300"
        >
          <a
            href={partner.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full w-full items-center justify-center rounded-lg transition-transform duration-300 hover:scale-105 group"
            aria-label={`Visit ${partner.name}`}
          >
            <Image
              src={partner.logoUrl}
              alt={`${partner.name} Logo`}
              width={180}
              height={60}
              className="object-contain filter brightness-90 group-hover:brightness-110 transition-all duration-300"
              loading="lazy"
            />
          </a>
        </NeonBorder>
      )),
    []
  );

  return (
    <CyberpunkBackground 
      variant="circuit" 
      intensity="subtle" 
      className="bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 py-24"
    >
      <FloatingElements variant="lines" count={15} speed="medium" color="yellow" repositioning={true} />
      <section className="relative z-20" aria-labelledby="partners-heading">
        <div className="container mx-auto flex flex-col items-center px-4">
          <h2 id="partners-heading" className="mb-16 text-center">
            <NeonText variant="gradient" className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl">Our Partners</NeonText>
          </h2>
          <div className="flex w-full max-w-6xl flex-wrap items-center justify-center gap-12">
            {renderPartners}
          </div>
        </div>
      </section>
    </CyberpunkBackground>
  );
};

export default React.memo(PartnersSection);
