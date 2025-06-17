import { test, expect } from '@playwright/test';
import { waitForNetworkIdle } from '../helpers/test-utils';

test.describe('SEO & Meta Tags - Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);
  });

  test('should have proper page title', async ({ page }) => {
    // Check title exists and contains key terms
    await expect(page).toHaveTitle(/Arcadia/);
    
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThan(60); // SEO best practice
    
    // Should contain relevant keywords
    const lowerTitle = title.toLowerCase();
    expect(
      lowerTitle.includes('gaming') ||
      lowerTitle.includes('game') ||
      lowerTitle.includes('community') ||
      lowerTitle.includes('platform')
    ).toBe(true);
  });

  test('should have meta description', async ({ page }) => {
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    
    expect(metaDescription).toBeTruthy();
    expect(metaDescription!.length).toBeGreaterThan(50);
    expect(metaDescription!.length).toBeLessThan(160); // SEO best practice
    
    // Should contain relevant keywords
    const lowerDescription = metaDescription!.toLowerCase();
    expect(
      lowerDescription.includes('gaming') ||
      lowerDescription.includes('game') ||
      lowerDescription.includes('community') ||
      lowerDescription.includes('platform')
    ).toBe(true);
  });

  test('should have proper Open Graph tags', async ({ page }) => {
    // OG Title
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle).toContain('Arcadia');
    
    // OG Description
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogDescription).toBeTruthy();
    expect(ogDescription!.length).toBeGreaterThan(20);
    
    // OG Type
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogType).toBe('website');
    
    // OG URL
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(ogUrl).toBeTruthy();
    expect(ogUrl).toMatch(/^https?:\/\//);
    
    // OG Image
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    if (ogImage) {
      expect(ogImage).toMatch(/\.(jpg|jpeg|png|webp)(\?|$)/i);
      
      // Check image dimensions if specified
      const ogImageWidth = await page.locator('meta[property="og:image:width"]').getAttribute('content');
      const ogImageHeight = await page.locator('meta[property="og:image:height"]').getAttribute('content');
      
      if (ogImageWidth && ogImageHeight) {
        expect(parseInt(ogImageWidth)).toBeGreaterThanOrEqual(400);
        expect(parseInt(ogImageHeight)).toBeGreaterThanOrEqual(300);
      }
    }
    
    // OG Site Name
    const ogSiteName = await page.locator('meta[property="og:site_name"]').getAttribute('content');
    if (ogSiteName) {
      expect(ogSiteName).toContain('Arcadia');
    }
  });

  test('should have Twitter Card tags', async ({ page }) => {
    // Twitter Card Type
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    if (twitterCard) {
      expect(['summary', 'summary_large_image', 'app', 'player']).toContain(twitterCard);
    }
    
    // Twitter Title
    const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    if (twitterTitle) {
      expect(twitterTitle).toBeTruthy();
      expect(twitterTitle).toContain('Arcadia');
    }
    
    // Twitter Description
    const twitterDescription = await page.locator('meta[name="twitter:description"]').getAttribute('content');
    if (twitterDescription) {
      expect(twitterDescription.length).toBeGreaterThan(20);
      expect(twitterDescription.length).toBeLessThan(200);
    }
    
    // Twitter Image
    const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute('content');
    if (twitterImage) {
      expect(twitterImage).toMatch(/\.(jpg|jpeg|png|webp)(\?|$)/i);
    }
    
    // Twitter Site
    const twitterSite = await page.locator('meta[name="twitter:site"]').getAttribute('content');
    if (twitterSite) {
      expect(twitterSite).toMatch(/^@[a-zA-Z0-9_]+$/);
    }
  });

  test('should have proper viewport meta tag', async ({ page }) => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    
    expect(viewport).toBeTruthy();
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
    
    // Should not disable zoom for accessibility
    expect(viewport).not.toContain('user-scalable=no');
    expect(viewport).not.toContain('maximum-scale=1');
  });

  test('should have proper charset and language', async ({ page }) => {
    // Charset
    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset).toBe('utf-8');
    
    // Language
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'
  });

  test('should have favicon and app icons', async ({ page }) => {
    // Standard favicon
    const favicon = page.locator('link[rel="icon"], link[rel="shortcut icon"]');
    const faviconCount = await favicon.count();
    expect(faviconCount).toBeGreaterThan(0);
    
    if (faviconCount > 0) {
      const faviconHref = await favicon.first().getAttribute('href');
      expect(faviconHref).toBeTruthy();
      expect(faviconHref).toMatch(/\.(ico|png|svg)(\?|$)/i);
    }
    
    // Apple touch icon
    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    const appleTouchIconCount = await appleTouchIcon.count();
    
    if (appleTouchIconCount > 0) {
      const appleTouchIconHref = await appleTouchIcon.first().getAttribute('href');
      expect(appleTouchIconHref).toMatch(/\.(png|jpg)(\?|$)/i);
      
      const sizes = await appleTouchIcon.first().getAttribute('sizes');
      if (sizes) {
        expect(sizes).toMatch(/\d+x\d+/);
      }
    }
    
    // Manifest file
    const manifest = page.locator('link[rel="manifest"]');
    if (await manifest.count() > 0) {
      const manifestHref = await manifest.getAttribute('href');
      expect(manifestHref).toMatch(/\.json(\?|$)/);
    }
  });

  test('should have proper robots meta tag', async ({ page }) => {
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    
    if (robots) {
      // Should allow indexing for public pages
      expect(robots).not.toContain('noindex');
      expect(robots).not.toContain('nofollow');
      
      // Common valid values
      const validRobots = ['index,follow', 'all', 'index', 'follow'];
      const isValid = validRobots.some(valid => robots.includes(valid));
      expect(isValid).toBe(true);
    }
  });

  test('should have canonical URL', async ({ page }) => {
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    
    if (canonical) {
      expect(canonical).toMatch(/^https?:\/\//);
      expect(canonical).not.toContain('localhost'); // Should be production URL in production
    }
  });

  test('should have theme color meta tag', async ({ page }) => {
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    
    if (themeColor) {
      // Should be a valid color value
      expect(themeColor).toMatch(/^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{3}$|^rgb\(|^rgba\(/);
    }
  });

  test('should have proper JSON-LD structured data', async ({ page }) => {
    const jsonLD = page.locator('script[type="application/ld+json"]');
    const jsonLDCount = await jsonLD.count();
    
    if (jsonLDCount > 0) {
      for (let i = 0; i < jsonLDCount; i++) {
        const scriptContent = await jsonLD.nth(i).textContent();
        expect(scriptContent).toBeTruthy();
        
        // Should be valid JSON
        let parsedData;
        expect(() => {
          parsedData = JSON.parse(scriptContent!);
        }).not.toThrow();
        
        // Should have required schema.org properties
        expect(parsedData['@context']).toBe('https://schema.org');
        expect(parsedData['@type']).toBeTruthy();
        
        // For organization schema
        if (parsedData['@type'] === 'Organization') {
          expect(parsedData.name).toBeTruthy();
          expect(parsedData.url).toBeTruthy();
          
          if (parsedData.logo) {
            expect(parsedData.logo).toMatch(/\.(png|jpg|jpeg|svg)(\?|$)/i);
          }
        }
        
        // For website schema
        if (parsedData['@type'] === 'WebSite') {
          expect(parsedData.name).toBeTruthy();
          expect(parsedData.url).toBeTruthy();
          
          if (parsedData.potentialAction) {
            expect(parsedData.potentialAction['@type']).toBe('SearchAction');
          }
        }
      }
    }
  });
});

test.describe('SEO & Meta Tags - About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
    await waitForNetworkIdle(page);
  });

  test('should have unique title for about page', async ({ page }) => {
    const title = await page.title();
    
    expect(title).toBeTruthy();
    expect(title.toLowerCase()).toContain('about');
    expect(title).toContain('Arcadia');
    expect(title.length).toBeLessThan(60);
  });

  test('should have unique meta description for about page', async ({ page }) => {
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    
    expect(metaDescription).toBeTruthy();
    expect(metaDescription!.length).toBeGreaterThan(50);
    expect(metaDescription!.length).toBeLessThan(160);
    
    // Should be different from homepage description
    const homepageDescription = await page.evaluate(async () => {
      const response = await fetch('/');
      const html = await response.text();
      const match = html.match(/<meta name="description" content="([^"]+)"/);
      return match ? match[1] : null;
    });
    
    if (homepageDescription) {
      expect(metaDescription).not.toBe(homepageDescription);
    }
  });

  test('should have proper Open Graph tags for about page', async ({ page }) => {
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    
    if (ogTitle) {
      expect(ogTitle.toLowerCase()).toContain('about');
    }
    
    if (ogUrl) {
      expect(ogUrl).toContain('/about');
    }
  });

  test('should have structured data for organization', async ({ page }) => {
    const jsonLD = page.locator('script[type="application/ld+json"]');
    const jsonLDCount = await jsonLD.count();
    
    if (jsonLDCount > 0) {
      let foundOrganization = false;
      
      for (let i = 0; i < jsonLDCount; i++) {
        const scriptContent = await jsonLD.nth(i).textContent();
        const parsedData = JSON.parse(scriptContent!);
        
        if (parsedData['@type'] === 'Organization') {
          foundOrganization = true;
          
          expect(parsedData.name).toBe('Arcadia');
          expect(parsedData.url).toBeTruthy();
          
          if (parsedData.description) {
            expect(parsedData.description.length).toBeGreaterThan(20);
          }
          
          if (parsedData.foundingDate) {
            expect(parsedData.foundingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          }
          
          if (parsedData.sameAs) {
            expect(Array.isArray(parsedData.sameAs)).toBe(true);
            parsedData.sameAs.forEach((url: string) => {
              expect(url).toMatch(/^https?:\/\//);
            });
          }
        }
      }
      
      // About page should have organization structured data
      expect(foundOrganization).toBe(true);
    }
  });
});

test.describe('SEO - Technical Requirements', () => {
  test('should have clean URLs', async ({ page }) => {
    await page.goto('/');
    
    const currentUrl = page.url();
    
    // Should not have query parameters for main pages
    expect(currentUrl).not.toContain('?');
    expect(currentUrl).not.toContain('#');
    
    // Should end with / or proper file extension
    expect(currentUrl.endsWith('/') || currentUrl.match(/\.[a-z]+$/)).toBe(true);
  });

  test('should handle trailing slashes consistently', async ({ page }) => {
    // Test both with and without trailing slash
    await page.goto('/about');
    const urlWithoutSlash = page.url();
    
    await page.goto('/about/');
    const urlWithSlash = page.url();
    
    // Should redirect to consistent format
    expect(urlWithoutSlash).toBe(urlWithSlash);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    
    // Should have h1 content
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text?.trim().length).toBeGreaterThan(0);
    
    // Check heading order (h1 → h2 → h3, etc.)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(1);
    
    // First heading should be h1
    const firstHeading = await page.locator('h1, h2, h3, h4, h5, h6').first();
    const firstHeadingTag = await firstHeading.evaluate(el => el.tagName);
    expect(firstHeadingTag).toBe('H1');
  });

  test('should have proper internal linking', async ({ page }) => {
    await page.goto('/');
    
    // Find internal links
    const internalLinks = page.locator('a[href^="/"], a[href^="./"], a[href^="../"]');
    const internalLinkCount = await internalLinks.count();
    
    expect(internalLinkCount).toBeGreaterThan(0);
    
    // Test a few internal links
    for (let i = 0; i < Math.min(internalLinkCount, 3); i++) {
      const link = internalLinks.nth(i);
      const href = await link.getAttribute('href');
      
      if (href && !href.includes('#') && !href.includes('?')) {
        // Link should have descriptive text
        const linkText = await link.textContent();
        expect(linkText?.trim().length).toBeGreaterThan(0);
        expect(linkText?.trim().toLowerCase()).not.toBe('click here');
        expect(linkText?.trim().toLowerCase()).not.toBe('read more');
      }
    }
  });

  test('should have accessible images with alt text', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');
      const role = await image.getAttribute('role');
      
      // Decorative images should have empty alt or role="presentation"
      // Content images should have descriptive alt text
      if (role === 'presentation' || role === 'none') {
        expect(alt === '' || alt === null).toBe(true);
      } else {
        expect(alt).toBeTruthy();
        if (alt) {
          expect(alt.length).toBeGreaterThan(2);
          expect(alt.length).toBeLessThan(125); // Screen reader best practice
        }
      }
    }
  });

  test('should load quickly for search engines', async ({ page, context }) => {
    // Simulate search engine crawler
    await context.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    });
    
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;
    
    // Should load quickly for crawlers
    expect(loadTime).toBeLessThan(3000); // 3s
    
    // Content should be accessible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('should have proper sitemap reference', async ({ page }) => {
    // Check for sitemap in robots.txt
    try {
      const robotsResponse = await page.request.get('/robots.txt');
      if (robotsResponse.ok()) {
        const robotsContent = await robotsResponse.text();
        
        if (robotsContent.includes('Sitemap:')) {
          const sitemapMatch = robotsContent.match(/Sitemap:\s*(https?:\/\/[^\s]+)/);
          if (sitemapMatch) {
            const sitemapUrl = sitemapMatch[1];
            
            // Check if sitemap is accessible
            const sitemapResponse = await page.request.get(sitemapUrl);
            expect(sitemapResponse.ok()).toBe(true);
          }
        }
      }
    } catch (error) {
      // robots.txt might not exist, which is acceptable
      console.log('robots.txt not found or accessible');
    }
  });

  test('should have proper SSL and security headers', async ({ page }) => {
    const response = await page.goto('/');
    
    // Should use HTTPS in production
    const url = page.url();
    if (!url.includes('localhost')) {
      expect(url.startsWith('https://')).toBe(true);
    }
    
    // Check security headers
    const headers = response?.headers();
    if (headers) {
      // Content-Type should be set
      expect(headers['content-type']).toContain('text/html');
      
      // Security headers (if implemented)
      if (headers['x-frame-options']) {
        expect(['DENY', 'SAMEORIGIN']).toContain(headers['x-frame-options']);
      }
      
      if (headers['x-content-type-options']) {
        expect(headers['x-content-type-options']).toBe('nosniff');
      }
    }
  });

  test('should be mobile-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    
    // Content should fit in viewport
    const hasHorizontalScroll = await page.evaluate(() => 
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
    
    // Text should be readable
    const bodyFontSize = await page.evaluate(() => {
      const body = document.body;
      return parseInt(window.getComputedStyle(body).fontSize);
    });
    expect(bodyFontSize).toBeGreaterThanOrEqual(14);
    
    // Touch targets should be large enough
    const buttons = page.locator('button, a[role="button"]');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const box = await firstButton.boundingBox();
      
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});