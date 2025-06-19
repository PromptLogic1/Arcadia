/**
 * SEO Meta Tag Generation and Validation Tests
 * Tests the business logic for generating and validating SEO meta tags
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateMetaTags,
  validateMetaTags,
  type MetaTagConfig,
} from '../utils/seo-meta';

describe('SEO Meta Tag Generation', () => {
  describe('generateMetaTags', () => {
    it('should generate complete meta tags for home page', () => {
      const config: MetaTagConfig = {
        title: 'Arcadia - The Ultimate Gaming Community Platform',
        description:
          'Join Arcadia to compete in gaming challenges, connect with players worldwide, and track your achievements across multiple games.',
        keywords: [
          'gaming',
          'community',
          'platform',
          'challenges',
          'tournaments',
        ],
        author: 'Arcadia Team',
        url: 'https://arcadia.game',
        image: 'https://arcadia.game/images/og-image.png',
        type: 'website',
      };

      const metaTags = generateMetaTags(config);

      // Basic meta tags
      expect(metaTags.title).toBe(
        'Arcadia - The Ultimate Gaming Community Platform'
      );
      expect(metaTags.description).toBe(config.description);
      expect(metaTags.keywords).toBe(
        'gaming, community, platform, challenges, tournaments'
      );
      expect(metaTags.author).toBe('Arcadia Team');

      // Open Graph tags
      expect(metaTags.openGraph['og:title']).toBe(config.title);
      expect(metaTags.openGraph['og:description']).toBe(config.description);
      expect(metaTags.openGraph['og:type']).toBe('website');
      expect(metaTags.openGraph['og:url']).toBe('https://arcadia.game');
      expect(metaTags.openGraph['og:image']).toBe(
        'https://arcadia.game/images/og-image.png'
      );
      expect(metaTags.openGraph['og:site_name']).toBe('Arcadia');

      // Twitter Card tags
      expect(metaTags.twitter).toMatchObject({
        'twitter:card': 'summary_large_image',
        'twitter:title': config.title,
        'twitter:description': config.description,
        'twitter:image': config.image,
      });
    });

    it('should generate article-specific meta tags', () => {
      const config: MetaTagConfig = {
        title: 'Top 10 Gaming Strategies for 2024',
        description:
          'Discover the most effective gaming strategies to improve your performance in 2024.',
        url: 'https://arcadia.game/blog/top-10-gaming-strategies',
        type: 'article',
        publishedTime: '2024-01-15T08:00:00Z',
        modifiedTime: '2024-01-20T10:30:00Z',
        author: 'John Doe',
        section: 'Gaming Tips',
      };

      const metaTags = generateMetaTags(config);

      expect(metaTags.openGraph).toMatchObject({
        'og:type': 'article',
        'article:published_time': '2024-01-15T08:00:00Z',
        'article:modified_time': '2024-01-20T10:30:00Z',
        'article:author': 'John Doe',
        'article:section': 'Gaming Tips',
      });
    });

    it('should handle missing optional fields gracefully', () => {
      const config: MetaTagConfig = {
        title: 'Arcadia',
        description: 'Gaming platform',
        url: 'https://arcadia.game',
      };

      const metaTags = generateMetaTags(config);

      expect(metaTags.title).toBe('Arcadia');
      expect(metaTags.keywords).toBeUndefined();
      expect(metaTags.twitter['twitter:card']).toBe('summary');
      expect(metaTags.openGraph['og:image']).toBeUndefined();
    });

    it('should truncate long titles and descriptions', () => {
      const config: MetaTagConfig = {
        title: 'A'.repeat(100), // 100 characters
        description: 'B'.repeat(200), // 200 characters
        url: 'https://arcadia.game',
      };

      const metaTags = generateMetaTags(config);

      // Title should be truncated to 60 characters
      expect(metaTags.title.length).toBeLessThanOrEqual(60);
      expect(metaTags.title.endsWith('...')).toBe(true);

      // Description should be truncated to 160 characters
      expect(metaTags.description!.length).toBeLessThanOrEqual(160);
      expect(metaTags.description!.endsWith('...')).toBe(true);
    });

    it('should generate proper structured data', () => {
      const config: MetaTagConfig = {
        title: 'Arcadia Gaming Platform',
        description: 'Join the ultimate gaming community',
        url: 'https://arcadia.game',
        type: 'website',
        structuredData: {
          '@type': 'Organization',
          name: 'Arcadia',
          url: 'https://arcadia.game',
          logo: 'https://arcadia.game/logo.png',
          sameAs: [
            'https://twitter.com/arcadiagaming',
            'https://facebook.com/arcadiagaming',
          ],
        },
      };

      const metaTags = generateMetaTags(config);

      expect(metaTags.jsonLD).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Arcadia',
        url: 'https://arcadia.game',
        logo: 'https://arcadia.game/logo.png',
        sameAs: [
          'https://twitter.com/arcadiagaming',
          'https://facebook.com/arcadiagaming',
        ],
      });
    });
  });

  describe('validateMetaTags', () => {
    it('should validate correct meta tags', () => {
      const metaTags = {
        title: 'Arcadia - Gaming Platform',
        description: 'Join Arcadia to compete in gaming challenges worldwide.',
        keywords: 'gaming, community, platform',
        openGraph: {
          'og:title': 'Arcadia - Gaming Platform',
          'og:description':
            'Join Arcadia to compete in gaming challenges worldwide.',
          'og:type': 'website',
          'og:url': 'https://arcadia.game',
          'og:image': 'https://arcadia.game/og-image.png',
          'og:site_name': 'Arcadia',
        },
        twitter: {
          'twitter:card': 'summary_large_image',
          'twitter:title': 'Arcadia - Gaming Platform',
        },
      };

      const validation = validateMetaTags(metaTags);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect title length issues', () => {
      const metaTags = {
        title: 'A'.repeat(100), // Too long
        description: 'Valid description',
      };

      const validation = validateMetaTags(metaTags);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'title',
          message: expect.stringContaining('exceeds maximum length'),
        })
      );
    });

    it('should detect missing required Open Graph tags', () => {
      const metaTags = {
        title: 'Arcadia',
        description: 'Gaming platform',
        openGraph: {
          'og:title': 'Arcadia',
          // Missing og:type, og:url
        },
      };

      const validation = validateMetaTags(metaTags);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'og:type',
          message: 'Required Open Graph tag missing',
        })
      );
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'og:url',
          message: 'Required Open Graph tag missing',
        })
      );
    });

    it('should warn about missing recommended tags', () => {
      const metaTags = {
        title: 'Arcadia',
        description: 'Gaming platform',
        openGraph: {
          'og:title': 'Arcadia',
          'og:type': 'website',
          'og:url': 'https://arcadia.game',
          // Missing og:image (recommended)
        },
      };

      const validation = validateMetaTags(metaTags);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContainEqual(
        expect.objectContaining({
          field: 'og:image',
          message: 'Recommended Open Graph tag missing',
        })
      );
    });

    it('should validate Twitter card types', () => {
      const metaTags = {
        title: 'Arcadia',
        twitter: {
          'twitter:card': 'invalid_card_type' as any,
        },
      };

      const validation = validateMetaTags(metaTags);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'twitter:card',
          message: expect.stringContaining('Invalid Twitter card type'),
        })
      );
    });

    it('should validate URL formats', () => {
      const metaTags = {
        title: 'Arcadia',
        openGraph: {
          'og:type': 'website',
          'og:url': 'not-a-valid-url',
        },
      };

      const validation = validateMetaTags(metaTags);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          field: 'og:url',
          message: expect.stringContaining('Invalid URL format'),
        })
      );
    });

    it('should check for keyword stuffing', () => {
      const metaTags = {
        title: 'Gaming gaming gaming gaming platform',
        description: 'Gaming gaming gaming gaming gaming gaming platform',
        keywords: 'gaming, gaming, gaming, gaming, gaming',
      };

      const validation = validateMetaTags(metaTags);

      expect(validation.warnings).toContainEqual(
        expect.objectContaining({
          field: 'keywords',
          message: expect.stringContaining('keyword stuffing'),
        })
      );
    });
  });

  describe('SEO Best Practices', () => {
    it('should include relevant keywords in title and description', () => {
      const config: MetaTagConfig = {
        title: 'Arcadia - Gaming Community Platform',
        description:
          'Join Arcadia to compete in gaming challenges and connect with players.',
        keywords: ['gaming', 'community', 'challenges'],
        url: 'https://arcadia.game',
      };

      const metaTags = generateMetaTags(config);
      const validation = validateMetaTags(metaTags);

      // Check that keywords appear in title and description
      const titleLower = metaTags.title.toLowerCase();
      const descLower = metaTags.description!.toLowerCase();

      expect(titleLower).toContain('gaming');
      expect(descLower).toContain('gaming');
      expect(validation.valid).toBe(true);
    });

    it('should generate mobile-friendly meta tags', () => {
      const config: MetaTagConfig = {
        title: 'Arcadia Mobile',
        description: 'Gaming on the go',
        url: 'https://arcadia.game',
        viewport: 'width=device-width, initial-scale=1',
      };

      const metaTags = generateMetaTags(config);

      expect(metaTags.viewport).toBe('width=device-width, initial-scale=1');
      expect(metaTags.mobileWebApp).toBe('yes');
    });

    it('should handle internationalization', () => {
      const config: MetaTagConfig = {
        title: 'Arcadia - プラットフォーム',
        description: 'ゲーミングコミュニティ',
        url: 'https://arcadia.game/ja',
        locale: 'ja_JP',
        alternateLocales: [
          { locale: 'en_US', url: 'https://arcadia.game/en' },
          { locale: 'es_ES', url: 'https://arcadia.game/es' },
        ],
      };

      const metaTags = generateMetaTags(config);

      expect(metaTags.openGraph['og:locale']).toBe('ja_JP');
      expect(metaTags.alternateLinks).toHaveLength(2);
      expect(metaTags.alternateLinks).toContainEqual({
        hreflang: 'en',
        href: 'https://arcadia.game/en',
      });
    });
  });
});
