/**
 * Enhanced SEO testing with comprehensive structured data validation
 * and advanced meta tag checking following 2024 best practices
 */

import { test, expect, type Page } from '@playwright/test';
import type { 
  StructuredDataSchema, 
  SEOValidation 
} from './types';

// 2024 SEO validation configuration
const SEO_CONFIG: SEOValidation = {
  title: {
    minLength: 30,
    maxLength: 60,
    required: ['Arcadia', 'Gaming'],
  },
  description: {
    minLength: 120,
    maxLength: 160,
    required: ['gaming', 'community', 'platform'],
  },
  openGraph: [
    { property: 'og:title', content: /Arcadia/, required: true },
    { property: 'og:description', content: /.{120,160}/, required: true },
    { property: 'og:type', content: 'website', required: true },
    { property: 'og:url', content: /^https?:\/\//, required: true },
    { property: 'og:image', content: /\.(jpg|jpeg|png|webp)(\?|$)/i, required: true },
    { property: 'og:image:width', content: /^\d+$/, required: false },
    { property: 'og:image:height', content: /^\d+$/, required: false },
    { property: 'og:image:alt', content: /.+/, required: false },
    { property: 'og:site_name', content: 'Arcadia', required: true },
    { property: 'og:locale', content: /^[a-z]{2}_[A-Z]{2}$/, required: false },
  ],
  twitter: [
    { property: 'twitter:card', content: /^(summary|summary_large_image|app|player)$/, required: true },
    { property: 'twitter:title', content: /Arcadia/, required: true },
    { property: 'twitter:description', content: /.{120,200}/, required: true },
    { property: 'twitter:image', content: /\.(jpg|jpeg|png|webp)(\?|$)/i, required: true },
    { property: 'twitter:image:alt', content: /.+/, required: false },
    { property: 'twitter:site', content: /^@[a-zA-Z0-9_]+$/, required: false },
    { property: 'twitter:creator', content: /^@[a-zA-Z0-9_]+$/, required: false },
  ],
  structuredData: {
    types: ['Organization', 'WebSite', 'BreadcrumbList'],
    required: true,
  },
  jsonLD: {
    schemas: [
      {
        type: 'Organization',
        required: ['@context', '@type', 'name', 'url'],
        optional: ['logo', 'description', 'contactPoint', 'sameAs', 'foundingDate'],
        validation: {
          '@context': (value: unknown) => value === 'https://schema.org',
          name: (value: unknown) => typeof value === 'string' && (value as string).includes('Arcadia'),
          url: (value: unknown) => typeof value === 'string' && /^https?:\/\//.test(value as string),
        },
      },
      {
        type: 'WebSite',
        required: ['@context', '@type', 'name', 'url'],
        optional: ['potentialAction', 'description', 'inLanguage'],
        validation: {
          '@context': (value: unknown) => value === 'https://schema.org',
          name: (value: unknown) => typeof value === 'string' && (value as string).includes('Arcadia'),
          url: (value: unknown) => typeof value === 'string' && /^https?:\/\//.test(value as string),
        },
      },
    ],
    required: true,
  },
  socialMedia: {
    platforms: [],
    validationRules: [],
  },
};

// Structured data schemas for validation
const STRUCTURED_DATA_SCHEMAS: Record<string, StructuredDataSchema> = {
  Organization: {
    type: 'Organization',
    required: ['@context', '@type', 'name', 'url'],
    optional: ['logo', 'description', 'contactPoint', 'sameAs', 'foundingDate', 'address'],
    validation: {
      '@context': (value: unknown) => value === 'https://schema.org',
      '@type': (value: unknown) => value === 'Organization',
      name: (value: unknown) => typeof value === 'string' && (value as string).length > 0,
      url: (value: unknown) => typeof value === 'string' && /^https?:\/\//.test(value as string),
      logo: (value: unknown) => !value || (typeof value === 'string' && /\.(jpg|jpeg|png|svg|webp)(\?|$)/i.test(value as string)),
      sameAs: (value: unknown) => !value || (Array.isArray(value) && value.every((url: unknown) => typeof url === 'string' && /^https?:\/\//.test(url))),
    },
  },
  WebSite: {
    type: 'WebSite',
    required: ['@context', '@type', 'name', 'url'],
    optional: ['potentialAction', 'description', 'inLanguage', 'publisher'],
    validation: {
      '@context': (value: unknown) => value === 'https://schema.org',
      '@type': (value: unknown) => value === 'WebSite',
      name: (value: unknown) => typeof value === 'string' && (value as string).length > 0,
      url: (value: unknown) => typeof value === 'string' && /^https?:\/\//.test(value as string),
      potentialAction: (value: unknown): boolean => {
        if (!value || typeof value !== 'object') return true;
        const action = value as Record<string, unknown>;
        return action['@type'] === 'SearchAction' && action.target !== undefined && action['query-input'] !== undefined;
      },
    },
  },
  BreadcrumbList: {
    type: 'BreadcrumbList',
    required: ['@context', '@type', 'itemListElement'],
    optional: ['numberOfItems'],
    validation: {
      '@context': (value: unknown) => value === 'https://schema.org',
      '@type': (value: unknown) => value === 'BreadcrumbList',
      itemListElement: (value: unknown) => Array.isArray(value) && value.length > 0,
    },
  },
  WebPage: {
    type: 'WebPage',
    required: ['@context', '@type', 'name', 'url'],
    optional: ['description', 'inLanguage', 'isPartOf', 'primaryImageOfPage', 'breadcrumb'],
    validation: {
      '@context': (value: unknown) => value === 'https://schema.org',
      '@type': (value: unknown) => value === 'WebPage',
      name: (value: unknown) => typeof value === 'string' && (value as string).length > 0,
      url: (value: unknown) => typeof value === 'string' && /^https?:\/\//.test(value as string),
    },
  },
};

test.describe('Enhanced SEO & Structured Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have comprehensive meta tags validation @seo @critical', async ({ page }) => {
    // Title validation
    const title = await page.title();
    expect(title.length).toBeGreaterThanOrEqual(SEO_CONFIG.title.minLength);
    expect(title.length).toBeLessThanOrEqual(SEO_CONFIG.title.maxLength);
    
    SEO_CONFIG.title.required.forEach(keyword => {
      expect(title.toLowerCase()).toContain(keyword.toLowerCase());
    });

    // Meta description validation
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription!.length).toBeGreaterThanOrEqual(SEO_CONFIG.description.minLength);
    expect(metaDescription!.length).toBeLessThanOrEqual(SEO_CONFIG.description.maxLength);
    
    SEO_CONFIG.description.required.forEach(keyword => {
      expect(metaDescription!.toLowerCase()).toContain(keyword.toLowerCase());
    });

    // Canonical URL
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    if (canonical) {
      expect(canonical).toMatch(/^https?:\/\//);
      expect(canonical).not.toContain('localhost'); // Should be production URL in production
    }

    // Language and charset
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);

    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset?.toLowerCase()).toBe('utf-8');
  });

  test('should have valid Open Graph tags @seo @social', async ({ page }) => {
    for (const ogTag of SEO_CONFIG.openGraph) {
      const element = page.locator(`meta[property="${ogTag.property}"]`);
      const content = await element.getAttribute('content');
      
      if (ogTag.required) {
        expect(content, `Missing required Open Graph tag: ${ogTag.property}`).toBeTruthy();
      }
      
      if (content) {
        if (typeof ogTag.content === 'string') {
          expect(content).toBe(ogTag.content);
        } else if (ogTag.content instanceof RegExp) {
          expect(content).toMatch(ogTag.content);
        }
        
        // Additional validation for image tags
        if (ogTag.property === 'og:image') {
          expect(content).toMatch(/\.(jpg|jpeg|png|webp|svg)(\?|$)/i);
          
          // Check image dimensions if provided
          const width = await page.locator('meta[property="og:image:width"]').getAttribute('content');
          const height = await page.locator('meta[property="og:image:height"]').getAttribute('content');
          
          if (width && height) {
            expect(parseInt(width)).toBeGreaterThanOrEqual(1200); // Recommended minimum
            expect(parseInt(height)).toBeGreaterThanOrEqual(630); // Recommended minimum
            
            // Aspect ratio should be close to 1.91:1 (Facebook recommended)
            const aspectRatio = parseInt(width) / parseInt(height);
            expect(aspectRatio).toBeGreaterThan(1.8);
            expect(aspectRatio).toBeLessThan(2.0);
          }
        }
      }
    }
  });

  test('should have valid Twitter Card tags @seo @social', async ({ page }) => {
    for (const twitterTag of SEO_CONFIG.twitter) {
      const element = page.locator(`meta[name="${twitterTag.property}"]`);
      const content = await element.getAttribute('content');
      
      if (twitterTag.required) {
        expect(content, `Missing required Twitter tag: ${twitterTag.property}`).toBeTruthy();
      }
      
      if (content) {
        if (typeof twitterTag.content === 'string') {
          expect(content).toBe(twitterTag.content);
        } else if (twitterTag.content instanceof RegExp) {
          expect(content).toMatch(twitterTag.content);
        }
        
        // Additional validation for Twitter images
        if (twitterTag.property === 'twitter:image') {
          expect(content).toMatch(/\.(jpg|jpeg|png|webp)(\?|$)/i);
          
          // Twitter image should be less than 5MB (cannot check size here, but validate format)
          expect(content).not.toContain('.gif'); // GIFs not recommended for twitter:image
        }
        
        // Validate Twitter handles format
        if (twitterTag.property === 'twitter:site' || twitterTag.property === 'twitter:creator') {
          expect(content).toMatch(/^@[a-zA-Z0-9_]+$/);
          expect(content.length).toBeLessThanOrEqual(16); // Twitter handle max length + @
        }
      }
    }
  });

  test('should have comprehensive JSON-LD structured data @seo @structured-data', async ({ page }) => {
    const jsonLDScripts = await page.locator('script[type="application/ld+json"]').all();
    expect(jsonLDScripts.length).toBeGreaterThan(0);

    const foundSchemas = new Set<string>();
    const allStructuredData: unknown[] = [];

    for (const script of jsonLDScripts) {
      const content = await script.textContent();
      expect(content).toBeTruthy();

      let parsedData: unknown;
      expect(() => {
        parsedData = JSON.parse(content!);
      }, 'JSON-LD should be valid JSON').not.toThrow();

      allStructuredData.push(parsedData);

      // Handle both single objects and arrays
      const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];

      for (const data of dataArray) {
        expect(data['@context']).toBe('https://schema.org');
        expect(data['@type']).toBeTruthy();
        
        const schemaType = data['@type'];
        foundSchemas.add(schemaType);

        // Validate against our schema definitions
        if (STRUCTURED_DATA_SCHEMAS[schemaType]) {
          await validateStructuredDataSchema(data, STRUCTURED_DATA_SCHEMAS[schemaType]);
        }
      }
    }

    // Check that required schema types are present
    for (const requiredType of SEO_CONFIG.structuredData.types) {
      expect(foundSchemas.has(requiredType), 
        `Missing required structured data type: ${requiredType}`).toBe(true);
    }

    console.log('Found structured data schemas:', Array.from(foundSchemas));
  });

  test('should have valid Organization schema @seo @structured-data', async ({ page }) => {
    const organizationData = await getStructuredDataByType(page, 'Organization') as Record<string, unknown> | null;
    expect(organizationData, 'Organization schema should be present').toBeTruthy();

    if (organizationData) {
      // Required fields
      expect(organizationData.name).toContain('Arcadia');
      expect(organizationData.url).toMatch(/^https?:\/\//);
      
      // Optional but recommended fields
      if (organizationData.logo) {
        expect(organizationData.logo).toMatch(/\.(jpg|jpeg|png|svg|webp)(\?|$)/i);
      }
      
      if (organizationData.sameAs) {
        expect(Array.isArray(organizationData.sameAs)).toBe(true);
        (organizationData.sameAs as string[]).forEach((url: string) => {
          expect(url).toMatch(/^https?:\/\//);
        });
      }
      
      if (organizationData.contactPoint) {
        const contactPoint = organizationData.contactPoint as Record<string, unknown>;
        expect(contactPoint['@type']).toBe('ContactPoint');
        expect(contactPoint.contactType).toBeTruthy();
      }
    }
  });

  test('should have valid WebSite schema with search action @seo @structured-data', async ({ page }) => {
    const websiteData = await getStructuredDataByType(page, 'WebSite') as Record<string, unknown> | null;
    expect(websiteData, 'WebSite schema should be present').toBeTruthy();

    if (websiteData) {
      expect(websiteData.name).toContain('Arcadia');
      expect(websiteData.url).toMatch(/^https?:\/\//);
      
      // Check for search functionality
      if (websiteData.potentialAction) {
        const searchAction = Array.isArray(websiteData.potentialAction) 
          ? (websiteData.potentialAction as Array<Record<string, unknown>>).find((action) => action['@type'] === 'SearchAction')
          : websiteData.potentialAction as Record<string, unknown>;
          
        if (searchAction) {
          expect(searchAction['@type']).toBe('SearchAction');
          expect(searchAction.target).toBeTruthy();
          expect(searchAction['query-input']).toBeTruthy();
          expect(searchAction.target).toContain('{search_term_string}');
        }
      }
    }
  });

  test('should have proper mobile SEO optimization @seo @mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    // Viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
    expect(viewport).not.toContain('user-scalable=no'); // Accessibility requirement
    expect(viewport).not.toContain('maximum-scale=1'); // Accessibility requirement

    // Mobile-friendly test
    const hasHorizontalScroll = await page.evaluate(() => 
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);

    // Touch targets
    const buttons = page.locator('button, a[role="button"], [role="button"]');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // Test first few buttons for touch target size
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        
        if (box && await button.isVisible()) {
          expect(box.width).toBeGreaterThanOrEqual(44); // WCAG 2.1 AA requirement
          expect(box.height).toBeGreaterThanOrEqual(44); // WCAG 2.1 AA requirement
        }
      }
    }

    // Font size should be readable on mobile
    const bodyFontSize = await page.evaluate(() => {
      const body = document.body;
      return parseInt(window.getComputedStyle(body).fontSize);
    });
    expect(bodyFontSize).toBeGreaterThanOrEqual(14);
  });

  test('should have proper international SEO setup @seo @i18n', async ({ page }) => {
    // Language attributes
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);

    // Check for hreflang tags (if internationalization is implemented)
    const hreflangTags = await page.locator('link[rel="alternate"][hreflang]').all();
    
    if (hreflangTags.length > 0) {
      for (const tag of hreflangTags) {
        const hreflang = await tag.getAttribute('hreflang');
        const href = await tag.getAttribute('href');
        
        expect(hreflang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$|^x-default$/);
        expect(href).toMatch(/^https?:\/\//);
      }
      
      // Should have x-default for international sites
      const _hasXDefault = hreflangTags.some(async tag => 
        await tag.getAttribute('hreflang') === 'x-default'
      );
      // Note: This is optional for single-language sites
    }

    // Content language meta tag
    const contentLanguage = await page.locator('meta[http-equiv="content-language"]').getAttribute('content');
    if (contentLanguage) {
      expect(contentLanguage).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    }
  });

  test('should have valid schema.org breadcrumb navigation @seo @navigation', async ({ page }) => {
    // Navigate to a sub-page to test breadcrumbs
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    const breadcrumbData = await getStructuredDataByType(page, 'BreadcrumbList') as Record<string, unknown> | null;
    
    if (breadcrumbData && breadcrumbData.itemListElement) {
      expect(breadcrumbData.itemListElement).toBeTruthy();
      expect(Array.isArray(breadcrumbData.itemListElement)).toBe(true);
      const items = breadcrumbData.itemListElement as Array<Record<string, unknown>>;
      expect(items.length).toBeGreaterThan(0);

      items.forEach((item, index) => {
        expect((item as Record<string, unknown>)['@type']).toBe('ListItem');
        expect(item.position).toBe(index + 1);
        expect(item.name).toBeTruthy();
        expect(item.item).toBeTruthy();
      });
    }
  });

  test('should have optimized page loading for search engines @seo @performance', async ({ page, context }) => {
    // Simulate search engine crawler
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    });

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    // Should load quickly for crawlers
    expect(loadTime).toBeLessThan(3000);

    // Content should be accessible without JavaScript
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toBeTruthy();
    expect(h1Text!.length).toBeGreaterThan(0);

    const mainContent = await page.locator('main, [role="main"]').textContent();
    expect(mainContent).toBeTruthy();
    expect(mainContent!.length).toBeGreaterThan(100); // Substantial content
  });
});

// Helper functions
async function validateStructuredDataSchema(data: unknown, schema: StructuredDataSchema): Promise<void> {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data provided for validation');
  }
  
  const dataObj = data as Record<string, unknown>;
  
  // Check required fields
  for (const field of schema.required) {
    expect(dataObj[field], `Missing required field: ${field}`).toBeTruthy();
  }

  // Run custom validations
  if (schema.validation) {
    for (const [field, validator] of Object.entries(schema.validation)) {
      if (dataObj[field] !== undefined) {
        const isValid = validator(dataObj[field]);
        expect(isValid, `Validation failed for field: ${field} with value: ${dataObj[field]}`).toBe(true);
      }
    }
  }
}

async function getStructuredDataByType(page: Page, type: string): Promise<unknown> {
  const jsonLDScripts = await page.locator('script[type="application/ld+json"]').all();
  
  for (const script of jsonLDScripts) {
    const content = await script.textContent();
    if (content) {
      try {
        const parsedData = JSON.parse(content);
        const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];
        
        const found = dataArray.find((item: unknown) => (item as Record<string, unknown>)['@type'] === type);
        if (found) return found;
      } catch (_error) {
        // Skip invalid JSON
      }
    }
  }
  
  return null;
}