/**
 * Login Page Object
 * 
 * Encapsulates all login page interactions and selectors.
 * This follows the Page Object Model pattern for better test organization.
 */

import type { Page } from '@playwright/test';
import { BasePage } from '../base.page';

export class LoginPage extends BasePage {
  // Selectors
  private readonly selectors = {
    form: '[data-testid="login-form"]',
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    submitButton: '[data-testid="login-button"]',
    rememberMeCheckbox: '[data-testid="remember-me"]',
    forgotPasswordLink: '[data-testid="forgot-password-link"]',
    signupLink: '[data-testid="signup-link"]',
    googleOAuthButton: '[data-testid="google-oauth-button"]',
    errorMessage: '[role="alert"], [data-testid="error-message"]',
    userMenu: '[data-testid="user-menu"]',
  } as const;

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  /**
   * Fill login form
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.fillInput(this.selectors.emailInput, email);
    await this.fillInput(this.selectors.passwordInput, password);
  }

  /**
   * Submit login form
   */
  async submitLogin(): Promise<void> {
    await this.clickElement(this.selectors.submitButton);
  }

  /**
   * Login with credentials
   */
  async login(email: string, password: string, rememberMe = false): Promise<void> {
    await this.fillLoginForm(email, password);
    
    if (rememberMe) {
      await this.toggleRememberMe();
    }
    
    await this.submitLogin();
  }

  /**
   * Toggle remember me checkbox
   */
  async toggleRememberMe(): Promise<void> {
    await this.clickElement(this.selectors.rememberMeCheckbox);
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.clickElement(this.selectors.forgotPasswordLink);
  }

  /**
   * Click signup link
   */
  async clickSignupLink(): Promise<void> {
    await this.clickElement(this.selectors.signupLink);
  }

  /**
   * Click Google OAuth button
   */
  async clickGoogleOAuth(): Promise<void> {
    await this.clickElement(this.selectors.googleOAuthButton);
  }

  /**
   * Check if login was successful
   */
  async isLoggedIn(): Promise<boolean> {
    return this.isElementVisible(this.selectors.userMenu, 10000);
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.getLocator(this.selectors.errorMessage);
    
    try {
      await errorElement.waitFor({ state: 'visible', timeout: 5000 });
      return errorElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Check if login button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    const button = this.getLocator(this.selectors.submitButton);
    return button.isEnabled();
  }

  /**
   * Wait for redirect after successful login
   */
  async waitForSuccessfulLogin(): Promise<void> {
    await this.page.waitForURL(/(dashboard|home|\/$)/, { timeout: 10000 });
  }

  /**
   * Clear form inputs
   */
  async clearForm(): Promise<void> {
    await this.getLocator(this.selectors.emailInput).clear();
    await this.getLocator(this.selectors.passwordInput).clear();
  }

  /**
   * Get form values
   */
  async getFormValues(): Promise<{ email: string; password: string }> {
    const email = await this.getLocator(this.selectors.emailInput).inputValue();
    const password = await this.getLocator(this.selectors.passwordInput).inputValue();
    
    return { email, password };
  }

  /**
   * Check if specific form validation error is shown
   */
  async hasValidationError(fieldName: 'email' | 'password'): Promise<boolean> {
    const input = fieldName === 'email' ? this.selectors.emailInput : this.selectors.passwordInput;
    const fieldContainer = this.page.locator(input).locator('..').locator('[role="alert"]');
    
    return fieldContainer.isVisible();
  }

  /**
   * Get validation error message for a field
   */
  async getValidationError(fieldName: 'email' | 'password'): Promise<string | null> {
    const input = fieldName === 'email' ? this.selectors.emailInput : this.selectors.passwordInput;
    const fieldContainer = this.page.locator(input).locator('..').locator('[role="alert"]');
    
    try {
      await fieldContainer.waitFor({ state: 'visible', timeout: 2000 });
      return fieldContainer.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Focus on a form field
   */
  async focusField(fieldName: 'email' | 'password'): Promise<void> {
    const selector = fieldName === 'email' ? this.selectors.emailInput : this.selectors.passwordInput;
    await this.getLocator(selector).focus();
  }

  /**
   * Blur from a form field
   */
  async blurField(fieldName: 'email' | 'password'): Promise<void> {
    const selector = fieldName === 'email' ? this.selectors.emailInput : this.selectors.passwordInput;
    await this.getLocator(selector).blur();
  }

  /**
   * Check if OAuth button is visible
   */
  async isOAuthAvailable(provider: 'google'): Promise<boolean> {
    if (provider === 'google') {
      return this.isElementVisible(this.selectors.googleOAuthButton, 1000);
    }
    return false;
  }
}