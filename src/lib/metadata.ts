/**
 * Centralized SEO metadata management for Arcadia
 */

import { type Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://arcadia.dev';

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: 'website' | 'article' | 'game';
  };
  twitter?: {
    title?: string;
    description?: string;
    image?: string;
  };
  structuredData?: Record<string, unknown>;
}

/**
 * Generate comprehensive metadata for Next.js pages
 */
export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonical,
    openGraph = {},
    twitter = {},
  } = config;

  const fullTitle = title.includes('Arcadia') ? title : `${title} | Arcadia`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

  return {
    title: fullTitle,
    description,
    keywords: [...keywords, 'gaming', 'platform', 'community', 'games'].join(
      ', '
    ),

    // Canonical URL
    alternates: {
      canonical: canonicalUrl,
    },

    // Basic meta tags
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Open Graph
    openGraph: {
      type: openGraph.type || 'website',
      title: openGraph.title || fullTitle,
      description: openGraph.description || description,
      url: canonicalUrl,
      siteName: 'Arcadia',
      images: [
        {
          url: openGraph.image || `${BASE_URL}/images/og-default.png`,
          width: 1200,
          height: 630,
          alt: openGraph.title || fullTitle,
        },
      ],
      locale: 'en_US',
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: twitter.title || fullTitle,
      description: twitter.description || description,
      images: [twitter.image || `${BASE_URL}/images/og-default.png`],
      creator: '@ArcadiaGaming',
      site: '@ArcadiaGaming',
    },

    // Additional meta tags
    other: {
      'theme-color': '#0891b2', // Cyan-500
      'color-scheme': 'dark light',
      'format-detection': 'telephone=no',
    },
  };
}

/**
 * Default metadata for the application
 */
export const defaultMetadata: Metadata = generateMetadata({
  title: 'Arcadia - Gaming Platform & Community',
  description:
    'Join Arcadia, the ultimate gaming platform where players connect, compete, and create unforgettable experiences. Discover games and tournaments.',
  keywords: [
    'gaming',
    'platform',
    'community',
    'tournaments',
    'multiplayer',
    'esports',
  ],
  canonical: '/',
});

/**
 * Homepage specific metadata
 */
export const homepageMetadata: Metadata = generateMetadata({
  title: 'Arcadia - Gaming Platform & Community',
  description:
    'Join Arcadia, the ultimate gaming platform where players connect, compete, and create unforgettable experiences. Discover games and tournaments.',
  keywords: [
    'gaming',
    'platform',
    'community',
    'tournaments',
    'multiplayer',
    'esports',
    'demo',
    'challenges',
  ],
  canonical: '/',
  openGraph: {
    type: 'website',
    image: `${BASE_URL}/images/og-homepage.png`,
  },
});

/**
 * About page metadata
 */
export const aboutMetadata: Metadata = generateMetadata({
  title: 'About Arcadia - Our Gaming Mission',
  description:
    "Learn about Arcadia's mission to revolutionize gaming through innovative technology, community building, and immersive experiences. Discover our story, values, and commitment to gamers worldwide.",
  keywords: ['about', 'mission', 'gaming company', 'innovation', 'community'],
  canonical: '/about',
  openGraph: {
    type: 'website',
    image: `${BASE_URL}/images/og-about.png`,
  },
});

/**
 * Generate JSON-LD structured data for the organization
 */
export function generateOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Arcadia',
    url: BASE_URL,
    logo: `${BASE_URL}/images/logo.png`,
    description:
      'The ultimate gaming platform where players connect, compete, and create unforgettable gaming experiences.',
    sameAs: [
      'https://twitter.com/ArcadiaGaming',
      'https://facebook.com/ArcadiaGaming',
      'https://linkedin.com/company/arcadia-gaming',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@arcadia.dev',
    },
    founder: {
      '@type': 'Person',
      name: 'Arcadia Team',
    },
    foundingDate: '2024',
    industryIdentifier: 'Gaming & Technology',
  };
}

/**
 * Generate JSON-LD structured data for the website
 */
export function generateWebsiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Arcadia',
    url: BASE_URL,
    description:
      'The ultimate gaming platform where players connect, compete, and create unforgettable gaming experiences.',
    publisher: {
      '@type': 'Organization',
      name: 'Arcadia',
      logo: `${BASE_URL}/images/logo.png`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate JSON-LD structured data for a gaming platform
 */
export function generateGamePlatformSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGameSeries',
    name: 'Arcadia Gaming Platform',
    url: BASE_URL,
    description:
      'A comprehensive gaming platform featuring multiple games, tournaments, and community features.',
    publisher: {
      '@type': 'Organization',
      name: 'Arcadia',
      url: BASE_URL,
    },
    genre: ['Action', 'Strategy', 'Puzzle', 'Multiplayer'],
    applicationCategory: 'Game',
    operatingSystem: ['Web Browser', 'Cross-platform'],
    contentRating: {
      '@type': 'Rating',
      ratingValue: 'T',
      bestRating: 'M',
      worstRating: 'E',
      author: {
        '@type': 'Organization',
        name: 'ESRB',
      },
    },
  };
}

/**
 * Generate breadcrumb schema for pages
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Combine multiple JSON-LD schemas into a single array
 */
export function combineSchemas(...schemas: Record<string, unknown>[]): string {
  return JSON.stringify(schemas);
}
