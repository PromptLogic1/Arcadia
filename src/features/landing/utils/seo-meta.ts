/**
 * SEO Meta Tag Generation and Validation Utilities
 * Handles the business logic for generating and validating SEO meta tags
 */

export interface MetaTagConfig {
  title: string;
  description: string;
  keywords?: string[];
  author?: string;
  url: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  locale?: string;
  alternateLocales?: Array<{ locale: string; url: string }>;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  viewport?: string;
  structuredData?: Record<string, unknown>;
}

export interface GeneratedMetaTags {
  title: string;
  description?: string;
  keywords?: string;
  author?: string;
  viewport?: string;
  mobileWebApp?: string;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  jsonLD?: Record<string, unknown>;
  alternateLinks?: Array<{ hreflang: string; href: string }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

// SEO constraints
const SEO_LIMITS = {
  TITLE_MAX: 60,
  TITLE_MIN: 10,
  DESCRIPTION_MAX: 160,
  DESCRIPTION_MIN: 50,
  KEYWORDS_MAX: 10,
} as const;

// Required Open Graph tags
const REQUIRED_OG_TAGS = ['og:title', 'og:type', 'og:url'] as const;
const RECOMMENDED_OG_TAGS = ['og:description', 'og:image', 'og:site_name'] as const;

// Valid Twitter card types
const VALID_TWITTER_CARDS = ['summary', 'summary_large_image', 'app', 'player'] as const;

/**
 * Generate meta tags from configuration
 */
export function generateMetaTags(config: MetaTagConfig): GeneratedMetaTags {
  const metaTags: GeneratedMetaTags = {
    title: truncateText(config.title, SEO_LIMITS.TITLE_MAX),
    openGraph: {},
    twitter: {},
  };

  // Basic meta tags
  if (config.description) {
    metaTags.description = truncateText(config.description, SEO_LIMITS.DESCRIPTION_MAX);
  }

  if (config.keywords && config.keywords.length > 0) {
    metaTags.keywords = config.keywords.slice(0, SEO_LIMITS.KEYWORDS_MAX).join(', ');
  }

  if (config.author) {
    metaTags.author = config.author;
  }

  if (config.viewport) {
    metaTags.viewport = config.viewport;
    metaTags.mobileWebApp = 'yes';
  }

  // Open Graph tags
  metaTags.openGraph['og:title'] = metaTags.title;
  if (metaTags.description) {
    metaTags.openGraph['og:description'] = metaTags.description;
  }
  metaTags.openGraph['og:type'] = config.type || 'website';
  metaTags.openGraph['og:url'] = config.url;
  
  if (config.image) {
    metaTags.openGraph['og:image'] = config.image;
  }

  // Extract site name from title or URL
  const siteName = extractSiteName(config.title, config.url);
  if (siteName) {
    metaTags.openGraph['og:site_name'] = siteName;
  }

  // Article-specific Open Graph tags
  if (config.type === 'article') {
    if (config.publishedTime) {
      metaTags.openGraph['article:published_time'] = config.publishedTime;
    }
    if (config.modifiedTime) {
      metaTags.openGraph['article:modified_time'] = config.modifiedTime;
    }
    if (config.author) {
      metaTags.openGraph['article:author'] = config.author;
    }
    if (config.section) {
      metaTags.openGraph['article:section'] = config.section;
    }
  }

  // Locale
  if (config.locale) {
    metaTags.openGraph['og:locale'] = config.locale;
  }

  // Twitter Card tags
  metaTags.twitter['twitter:card'] = config.image ? 'summary_large_image' : 'summary';
  metaTags.twitter['twitter:title'] = metaTags.title;
  if (metaTags.description) {
    metaTags.twitter['twitter:description'] = metaTags.description;
  }
  if (config.image) {
    metaTags.twitter['twitter:image'] = config.image;
  }

  // Structured data (JSON-LD)
  if (config.structuredData) {
    metaTags.jsonLD = {
      '@context': 'https://schema.org',
      ...config.structuredData,
    };
  }

  // Alternate language links
  if (config.alternateLocales && config.alternateLocales.length > 0) {
    metaTags.alternateLinks = config.alternateLocales.map(alt => ({
      hreflang: alt.locale.split('_')[0], // Convert ja_JP to ja
      href: alt.url,
    }));
  }

  return metaTags;
}

/**
 * Validate meta tags for SEO best practices
 */
export function validateMetaTags(metaTags: Partial<GeneratedMetaTags>): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  // Title validation
  if (!metaTags.title) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else {
    if (metaTags.title.length > SEO_LIMITS.TITLE_MAX) {
      errors.push({
        field: 'title',
        message: `Title exceeds maximum length of ${SEO_LIMITS.TITLE_MAX} characters`,
      });
    }
    if (metaTags.title.length < SEO_LIMITS.TITLE_MIN) {
      warnings.push({
        field: 'title',
        message: `Title is shorter than recommended ${SEO_LIMITS.TITLE_MIN} characters`,
      });
    }
  }

  // Description validation
  if (!metaTags.description) {
    warnings.push({ field: 'description', message: 'Description is recommended for SEO' });
  } else {
    if (metaTags.description.length > SEO_LIMITS.DESCRIPTION_MAX) {
      errors.push({
        field: 'description',
        message: `Description exceeds maximum length of ${SEO_LIMITS.DESCRIPTION_MAX} characters`,
      });
    }
    if (metaTags.description.length < SEO_LIMITS.DESCRIPTION_MIN) {
      warnings.push({
        field: 'description',
        message: `Description is shorter than recommended ${SEO_LIMITS.DESCRIPTION_MIN} characters`,
      });
    }
  }

  // Keywords validation
  if (metaTags.keywords) {
    const keywords = metaTags.keywords.split(',').map(k => k.trim());
    if (keywords.length > SEO_LIMITS.KEYWORDS_MAX) {
      warnings.push({
        field: 'keywords',
        message: `Too many keywords (${keywords.length}). Recommended maximum is ${SEO_LIMITS.KEYWORDS_MAX}`,
      });
    }

    // Check for keyword stuffing
    const keywordCounts = keywords.reduce((acc, keyword) => {
      const normalized = keyword.toLowerCase();
      acc[normalized] = (acc[normalized] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duplicates = Object.entries(keywordCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      warnings.push({
        field: 'keywords',
        message: `Potential keyword stuffing detected. Avoid repeating keywords`,
      });
    }
  }

  // Open Graph validation
  if (metaTags.openGraph) {
    // Check required OG tags
    for (const requiredTag of REQUIRED_OG_TAGS) {
      if (!metaTags.openGraph[requiredTag]) {
        errors.push({
          field: requiredTag,
          message: `Required Open Graph tag missing`,
        });
      }
    }

    // Check recommended OG tags
    for (const recommendedTag of RECOMMENDED_OG_TAGS) {
      if (!metaTags.openGraph[recommendedTag]) {
        warnings.push({
          field: recommendedTag,
          message: `Recommended Open Graph tag missing`,
        });
      }
    }

    // Validate URL format
    if (metaTags.openGraph['og:url'] && !isValidUrl(metaTags.openGraph['og:url'])) {
      errors.push({
        field: 'og:url',
        message: 'Invalid URL format',
      });
    }

    // Validate image URL
    if (metaTags.openGraph['og:image'] && !isValidUrl(metaTags.openGraph['og:image'])) {
      errors.push({
        field: 'og:image',
        message: 'Invalid image URL format',
      });
    }
  }

  // Twitter Card validation
  if (metaTags.twitter) {
    const cardType = metaTags.twitter['twitter:card'];
    if (cardType && !VALID_TWITTER_CARDS.includes(cardType as any)) {
      errors.push({
        field: 'twitter:card',
        message: `Invalid Twitter card type. Must be one of: ${VALID_TWITTER_CARDS.join(', ')}`,
      });
    }

    // Warn if Twitter tags are missing when OG tags exist
    if (metaTags.openGraph && !metaTags.twitter['twitter:title']) {
      warnings.push({
        field: 'twitter:title',
        message: 'Twitter title missing. Twitter may fall back to Open Graph tags',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Truncate text to maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Extract site name from title or URL
 */
function extractSiteName(title: string, url: string): string {
  // Try to extract from title (e.g., "Page Title - Site Name")
  const titleParts = title.split(/\s*[-|]\s*/);
  if (titleParts.length > 1) {
    const lastPart = titleParts[titleParts.length - 1].trim();
    // If the last part is significantly shorter than the title, it's likely the site name
    if (lastPart.length < title.length * 0.5) {
      return lastPart;
    }
  }

  // Try to extract from URL
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const domainParts = hostname.split('.');
    if (domainParts.length > 0) {
      return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
    }
  } catch {
    // Invalid URL
  }

  return 'Arcadia'; // Default fallback
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generate dynamic meta tags based on route
 */
export function generateDynamicMetaTags(
  route: string,
  params?: Record<string, string>
): MetaTagConfig {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arcadia.game';
  
  // Default configuration
  const defaultConfig: MetaTagConfig = {
    title: 'Arcadia - The Ultimate Gaming Community Platform',
    description: 'Join Arcadia to compete in gaming challenges, connect with players worldwide, and track your achievements across multiple games.',
    keywords: ['gaming', 'community', 'platform', 'challenges', 'tournaments', 'achievements'],
    url: baseUrl,
    type: 'website',
    image: `${baseUrl}/images/og-image.png`,
  };

  // Route-specific configurations
  const routeConfigs: Record<string, (params?: Record<string, string>) => Partial<MetaTagConfig>> = {
    '/': () => defaultConfig,
    '/about': () => ({
      title: 'About Arcadia - Gaming Community Platform',
      description: 'Learn about Arcadia, our mission, and the team behind the gaming community platform.',
      url: `${baseUrl}/about`,
    }),
    '/pricing': () => ({
      title: 'Pricing - Arcadia Gaming Platform',
      description: 'Choose the perfect plan for your gaming journey. Free tier available with premium features for serious gamers.',
      url: `${baseUrl}/pricing`,
    }),
    '/blog': () => ({
      title: 'Gaming Blog - Tips, News & Strategies | Arcadia',
      description: 'Stay updated with the latest gaming news, tips, and strategies from the Arcadia community.',
      url: `${baseUrl}/blog`,
      type: 'website',
    }),
    '/blog/[slug]': (params) => ({
      title: params?.title || 'Blog Post - Arcadia',
      description: params?.excerpt || 'Read the latest gaming insights on Arcadia blog.',
      url: `${baseUrl}/blog/${params?.slug}`,
      type: 'article',
      publishedTime: params?.publishedTime,
      modifiedTime: params?.modifiedTime,
      author: params?.author,
    }),
  };

  const routeConfig = routeConfigs[route];
  if (routeConfig) {
    return { ...defaultConfig, ...routeConfig(params) };
  }

  return defaultConfig;
}