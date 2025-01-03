'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import NeonBorder from '@/components/ui/NeonBorder'
import NeonText from '@/components/ui/NeonText'

interface Partner {
  id: string
  name: string
  logoUrl: string
  website: string
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
] as const

const PartnersSection: React.FC = () => {
  const renderPartners = useMemo(() => (
    partners.map((partner) => (
      <NeonBorder key={partner.id} color="cyan" className="p-0.5">
        <a
          href={partner.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-32 h-16 bg-gray-700 rounded-lg hover:scale-105 transition-transform duration-300"
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
    ))
  ), [])

  return (
    <section className="py-20 bg-gray-800 text-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
          <NeonText>Our Partners</NeonText>
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-8">
          {renderPartners}
        </div>
      </div>
    </section>
  )
}

export default React.memo(PartnersSection)