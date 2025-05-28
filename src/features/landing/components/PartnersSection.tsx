'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import NeonBorder from '@/components/ui/NeonBorder';
import { NeonText } from '@/components/ui/NeonText';

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
          className="flex h-20 w-40 items-center justify-center bg-gray-800/80 p-0.5 shadow-lg"
        >
          <a
            href={partner.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full w-full items-center justify-center rounded-lg transition-transform duration-300 hover:scale-105"
            aria-label={`Visit ${partner.name}`}
          >
            <Image
              src={partner.logoUrl}
              alt={`${partner.name} Logo`}
              width={150}
              height={50}
              className="object-contain"
            />
          </a>
        </NeonBorder>
      )),
    []
  );

  return (
    <section className="bg-gradient-to-b from-gray-800 via-gray-900 to-gray-950 py-24 text-gray-100">
      <div className="container mx-auto flex flex-col items-center px-4">
        <h2 className="mb-14 text-center text-4xl font-bold md:text-5xl">
          <NeonText>Our Partners</NeonText>
        </h2>
        <div className="flex w-full max-w-5xl flex-wrap items-center justify-center gap-10">
          {renderPartners}
        </div>
      </div>
    </section>
  );
};

export default React.memo(PartnersSection);
