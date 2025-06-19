/**
 * Type-safe route definitions for landing page tests
 */

/**
 * Landing page routes
 */
export const LANDING_ROUTES = {
  home: '/',
  about: '/about',
  features: '/features',
  pricing: '/pricing',
  contact: '/contact',
  blog: '/blog',
  careers: '/careers',
  terms: '/terms',
  privacy: '/privacy',
  sitemap: '/sitemap',
} as const;

/**
 * Marketing campaign routes with UTM parameters
 */
export const CAMPAIGN_ROUTES = {
  emailCampaign: (campaign: string) =>
    `/?utm_source=email&utm_medium=newsletter&utm_campaign=${campaign}`,
  socialCampaign: (platform: string, campaign: string) =>
    `/?utm_source=${platform}&utm_medium=social&utm_campaign=${campaign}`,
  paidSearch: (keyword: string) =>
    `/?utm_source=google&utm_medium=cpc&utm_campaign=search&utm_term=${keyword}`,
  affiliate: (partner: string) =>
    `/?utm_source=affiliate&utm_medium=referral&utm_campaign=${partner}`,
} as const;

/**
 * Landing page route type
 */
export type LandingRoute = (typeof LANDING_ROUTES)[keyof typeof LANDING_ROUTES];

/**
 * Route metadata for testing
 */
export interface RouteMetadata {
  path: string;
  title: string;
  description: string;
  requiresAuth: boolean;
  expectedStatusCode: number;
  seoPriority: number;
  expectedLoadTime: number;
  criticalResources: string[];
}

/**
 * Route configuration map
 */
export const ROUTE_CONFIG: Record<keyof typeof LANDING_ROUTES, RouteMetadata> =
  {
    home: {
      path: '/',
      title: 'Arcadia - Premier Gaming Platform',
      description:
        'Experience the ultimate gaming community platform with challenges, competitions, and more.',
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 1.0,
      expectedLoadTime: 2500,
      criticalResources: ['hero-image', 'main-css', 'core-js'],
    },
    about: {
      path: '/about',
      title: 'About Arcadia - Our Mission & Team',
      description:
        "Learn about Arcadia's mission to create the best gaming community platform.",
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 0.8,
      expectedLoadTime: 2000,
      criticalResources: ['main-css', 'core-js'],
    },
    features: {
      path: '/features',
      title: 'Features - Discover What Arcadia Offers',
      description:
        'Explore all the features that make Arcadia the ultimate gaming platform.',
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 0.9,
      expectedLoadTime: 2200,
      criticalResources: ['main-css', 'core-js', 'features-data'],
    },
    pricing: {
      path: '/pricing',
      title: 'Pricing Plans - Choose Your Arcadia Experience',
      description:
        'Find the perfect plan for your gaming needs with transparent pricing.',
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 0.9,
      expectedLoadTime: 2000,
      criticalResources: ['main-css', 'core-js', 'pricing-table'],
    },
    contact: {
      path: '/contact',
      title: 'Contact Us - Get in Touch with Arcadia',
      description: 'Have questions? Contact our support team for assistance.',
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 0.7,
      expectedLoadTime: 1800,
      criticalResources: ['main-css', 'core-js', 'contact-form'],
    },
    blog: {
      path: '/blog',
      title: 'Blog - Gaming News & Updates',
      description:
        'Stay updated with the latest gaming news, tips, and community highlights.',
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 0.7,
      expectedLoadTime: 2500,
      criticalResources: ['main-css', 'core-js', 'blog-feed'],
    },
    careers: {
      path: '/careers',
      title: 'Careers at Arcadia - Join Our Team',
      description: 'Join the Arcadia team and help build the future of gaming.',
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 0.6,
      expectedLoadTime: 2000,
      criticalResources: ['main-css', 'core-js'],
    },
    terms: {
      path: '/terms',
      title: 'Terms of Service - Arcadia',
      description:
        'Read our terms of service and understand your rights and responsibilities.',
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 0.3,
      expectedLoadTime: 1500,
      criticalResources: ['main-css', 'core-js'],
    },
    privacy: {
      path: '/privacy',
      title: 'Privacy Policy - Arcadia',
      description: 'Learn how we protect your privacy and handle your data.',
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 0.3,
      expectedLoadTime: 1500,
      criticalResources: ['main-css', 'core-js'],
    },
    sitemap: {
      path: '/sitemap',
      title: 'Sitemap - Arcadia',
      description: 'Navigate through all pages and content on Arcadia.',
      requiresAuth: false,
      expectedStatusCode: 200,
      seoPriority: 0.5,
      expectedLoadTime: 1800,
      criticalResources: ['main-css', 'core-js'],
    },
  } as const;

/**
 * Navigation menu structure
 */
export interface NavigationItem {
  label: string;
  path: LandingRoute;
  icon?: string;
  children?: NavigationItem[];
  showInHeader: boolean;
  showInFooter: boolean;
  requiresAuth: boolean;
}

/**
 * Main navigation configuration
 */
export const NAVIGATION_CONFIG: NavigationItem[] = [
  {
    label: 'Home',
    path: LANDING_ROUTES.home,
    showInHeader: true,
    showInFooter: true,
    requiresAuth: false,
  },
  {
    label: 'About',
    path: LANDING_ROUTES.about,
    showInHeader: true,
    showInFooter: true,
    requiresAuth: false,
  },
  {
    label: 'Features',
    path: LANDING_ROUTES.features,
    showInHeader: true,
    showInFooter: true,
    requiresAuth: false,
  },
  {
    label: 'Pricing',
    path: LANDING_ROUTES.pricing,
    showInHeader: true,
    showInFooter: true,
    requiresAuth: false,
  },
  {
    label: 'Blog',
    path: LANDING_ROUTES.blog,
    showInHeader: true,
    showInFooter: true,
    requiresAuth: false,
  },
  {
    label: 'Contact',
    path: LANDING_ROUTES.contact,
    showInHeader: true,
    showInFooter: true,
    requiresAuth: false,
  },
];

/**
 * Footer-only navigation items
 */
export const FOOTER_NAVIGATION_CONFIG: NavigationItem[] = [
  {
    label: 'Careers',
    path: LANDING_ROUTES.careers,
    showInHeader: false,
    showInFooter: true,
    requiresAuth: false,
  },
  {
    label: 'Terms of Service',
    path: LANDING_ROUTES.terms,
    showInHeader: false,
    showInFooter: true,
    requiresAuth: false,
  },
  {
    label: 'Privacy Policy',
    path: LANDING_ROUTES.privacy,
    showInHeader: false,
    showInFooter: true,
    requiresAuth: false,
  },
  {
    label: 'Sitemap',
    path: LANDING_ROUTES.sitemap,
    showInHeader: false,
    showInFooter: true,
    requiresAuth: false,
  },
];

/**
 * Route parameter extraction
 */
export function extractUTMParams(url: string): Record<string, string> {
  const urlObj = new URL(url);
  const params: Record<string, string> = {};

  [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ].forEach(param => {
    const value = urlObj.searchParams.get(param);
    if (value) {
      params[param] = value;
    }
  });

  return params;
}

/**
 * Build URL with query parameters
 */
export function buildUrlWithParams(
  route: LandingRoute,
  params: Record<string, string>
): string {
  const url = new URL(route, 'http://localhost:3000');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.pathname + url.search;
}
