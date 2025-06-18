/**
 * Home/Landing Page Object
 * 
 * Encapsulates all landing page interactions and selectors.
 */

import type { Page } from '@playwright/test';
import { BasePage } from '../base.page';

export class HomePage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Hero section
    heroTitle: '[data-testid="hero-title"]',
    heroSubtitle: '[data-testid="hero-subtitle"]',
    ctaButton: '[data-testid="cta-button"]',
    
    // Navigation
    navBar: '[data-testid="nav-bar"]',
    navLinks: '[data-testid="nav-link"]',
    mobileMenuButton: '[data-testid="mobile-menu-button"]',
    mobileMenu: '[data-testid="mobile-menu"]',
    
    // Features section
    featuresSection: '[data-testid="features-section"]',
    featureCard: '[data-testid="feature-card"]',
    
    // Footer
    footer: '[data-testid="footer"]',
    footerLinks: '[data-testid="footer-link"]',
    socialLinks: '[data-testid="social-link"]',
    
    // Auth buttons
    loginButton: '[data-testid="login-button"]',
    signupButton: '[data-testid="signup-button"]',
    
    // Cookie banner
    cookieBanner: '[data-testid="cookie-banner"]',
    acceptCookiesButton: '[data-testid="accept-cookies"]',
  } as const;

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Click main CTA button
   */
  async clickCTA(): Promise<void> {
    await this.clickElement(this.selectors.ctaButton);
  }

  /**
   * Navigate to a specific page via nav
   */
  async navigateTo(linkText: string): Promise<void> {
    const link = this.getLocator(this.selectors.navLinks, { hasText: linkText });
    await link.click();
  }

  /**
   * Open mobile menu
   */
  async openMobileMenu(): Promise<void> {
    const menuButton = this.getLocator(this.selectors.mobileMenuButton);
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await this.page.waitForSelector(this.selectors.mobileMenu, { state: 'visible' });
    }
  }

  /**
   * Get all feature cards
   */
  async getFeatures(): Promise<Array<{ title: string | null; description: string | null }>> {
    const cards = await this.page.locator(this.selectors.featureCard).all();
    const features = [];
    
    for (const card of cards) {
      const title = await card.locator('[data-testid="feature-title"]').textContent();
      const description = await card.locator('[data-testid="feature-description"]').textContent();
      features.push({ title, description });
    }
    
    return features;
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    await this.clickElement(this.selectors.loginButton);
  }

  /**
   * Click signup button
   */
  async clickSignup(): Promise<void> {
    await this.clickElement(this.selectors.signupButton);
  }

  /**
   * Accept cookies if banner is shown
   */
  async acceptCookies(): Promise<void> {
    const banner = this.getLocator(this.selectors.cookieBanner);
    if (await banner.isVisible()) {
      await this.clickElement(this.selectors.acceptCookiesButton);
      await banner.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Get hero text
   */
  async getHeroText(): Promise<{ title: string | null; subtitle: string | null }> {
    const title = await this.getElementText(this.selectors.heroTitle);
    const subtitle = await this.getElementText(this.selectors.heroSubtitle);
    return { title, subtitle };
  }

  /**
   * Check if user is logged in (nav shows user menu)
   */
  async isUserLoggedIn(): Promise<boolean> {
    return this.isElementVisible('[data-testid="user-menu"]', 1000);
  }

  /**
   * Get footer links
   */
  async getFooterLinks(): Promise<string[]> {
    const links = await this.page.locator(this.selectors.footerLinks).all();
    const linkTexts = [];
    
    for (const link of links) {
      const text = await link.textContent();
      if (text) linkTexts.push(text);
    }
    
    return linkTexts;
  }

  /**
   * Check if page is responsive
   */
  async checkResponsive(viewport: { width: number; height: number }): Promise<{
    isMobileMenuVisible: boolean;
    isDesktopNavVisible: boolean;
    layoutIntact: boolean;
  }> {
    await this.page.setViewportSize(viewport);
    await this.page.waitForTimeout(500); // Wait for responsive changes
    
    const isMobileMenuVisible = await this.isElementVisible(this.selectors.mobileMenuButton);
    const isDesktopNavVisible = await this.isElementVisible(this.selectors.navLinks);
    
    // Check if layout is intact (no overlapping elements)
    const layoutIntact = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width > window.innerWidth || rect.height > window.innerHeight) {
          return false;
        }
      }
      return true;
    });
    
    return {
      isMobileMenuVisible,
      isDesktopNavVisible,
      layoutIntact
    };
  }

  /**
   * Scroll to section
   */
  async scrollToSection(sectionId: string): Promise<void> {
    await this.page.evaluate((id) => {
      const element = document.getElementById(id) || document.querySelector(`[data-section="${id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, sectionId);
    
    await this.page.waitForTimeout(1000); // Wait for smooth scroll
  }

  /**
   * Get page meta tags for SEO
   */
  async getSEOMetaTags(): Promise<{
    title: string | null;
    description: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    canonical: string | null;
  }> {
    return this.page.evaluate(() => {
      const getMetaContent = (name: string): string | null => {
        const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return meta?.getAttribute('content') || null;
      };
      
      return {
        title: document.title,
        description: getMetaContent('description'),
        ogTitle: getMetaContent('og:title'),
        ogDescription: getMetaContent('og:description'),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
      };
    });
  }
}