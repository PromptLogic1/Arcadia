// Remove unused import
// import type { TestUser } from '../types/test-types';

/**
 * Email Testing Service Interface
 * 
 * Provides real email testing capabilities for verification flows.
 * Supports multiple email testing providers like MailHog, Testmail.app, etc.
 */

export interface EmailTestService {
  // Setup and teardown
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  
  // Email management
  createTestEmailAddress(prefix?: string): Promise<string>;
  deleteTestEmailAddress(email: string): Promise<void>;
  
  // Email retrieval and verification
  waitForEmail(email: string, options?: EmailWaitOptions): Promise<TestEmail>;
  getEmails(email: string, options?: EmailFilterOptions): Promise<TestEmail[]>;
  deleteAllEmails(email: string): Promise<void>;
  
  // Email content parsing
  extractVerificationLink(email: TestEmail): string | null;
  extractResetLink(email: TestEmail): string | null;
  extractCode(email: TestEmail, type: 'verification' | 'reset' | 'mfa'): string | null;
}

export interface EmailWaitOptions {
  timeout?: number; // milliseconds
  subject?: string | RegExp;
  from?: string | RegExp;
  retryInterval?: number;
}

export interface EmailFilterOptions {
  limit?: number;
  subject?: string | RegExp;
  from?: string | RegExp;
  since?: Date;
  unreadOnly?: boolean;
}

export interface TestEmail {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  receivedAt: Date;
  isRead: boolean;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

// MailHog API response types
interface MailHogMessage {
  ID: string;
  From: {
    Mailbox: string;
    Domain: string;
    Params: string;
  };
  To: Array<{
    Mailbox: string;
    Domain: string;
    Params: string;
  }>;
  Content: {
    Headers: {
      Subject?: string[];
      [key: string]: string[] | undefined;
    };
    Body: string;
  };
  Created: string;
  MIME?: {
    Parts?: Array<{
      Headers?: {
        'Content-Type'?: string[];
        [key: string]: string[] | undefined;
      };
      Body?: string;
    }>;
  };
}

interface MailHogResponse {
  messages: MailHogMessage[];
  count: number;
  start: number;
  total: number;
}

/**
 * MailHog Email Testing Service Implementation
 * 
 * MailHog is a popular local SMTP testing tool
 */
export class MailHogEmailService implements EmailTestService {
  private baseUrl: string;
  private createdEmails: Set<string> = new Set();

  constructor(baseUrl = 'http://localhost:8025') {
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    try {
      // Check if MailHog is running
      const response = await fetch(`${this.baseUrl}/api/v1/messages`);
      if (!response.ok) {
        throw new Error(`MailHog not accessible at ${this.baseUrl}`);
      }
    } catch (error) {
      console.warn('MailHog not available, falling back to mock email service');
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Clean up all created test emails
    for (const email of this.createdEmails) {
      await this.deleteAllEmails(email);
    }
    this.createdEmails.clear();
  }

  async createTestEmailAddress(prefix = 'test'): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const email = `${prefix}_${timestamp}_${randomId}@example.com`;
    
    this.createdEmails.add(email);
    return email;
  }

  async deleteTestEmailAddress(email: string): Promise<void> {
    await this.deleteAllEmails(email);
    this.createdEmails.delete(email);
  }

  async waitForEmail(email: string, options: EmailWaitOptions = {}): Promise<TestEmail> {
    const {
      timeout = 30000,
      subject,
      from,
      retryInterval = 1000,
    } = options;

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const emails = await this.getEmails(email, {
        limit: 10,
        subject,
        from,
        unreadOnly: true,
      });
      
      if (emails.length > 0) {
        return emails[0]; // Return most recent
      }
      
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    
    throw new Error(`No email received for ${email} within ${timeout}ms`);
  }

  async getEmails(email: string, options: EmailFilterOptions = {}): Promise<TestEmail[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/messages`);
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.statusText}`);
      }
      
      const data = await response.json() as MailHogResponse;
      const messages = data.messages || [];
      
      // Filter by recipient
      let filtered = messages.filter((msg: MailHogMessage) => 
        msg.To && msg.To.some((to) => to.Mailbox && 
          `${to.Mailbox}@${to.Domain}`.toLowerCase() === email.toLowerCase())
      );
      
      // Apply additional filters
      if (options.subject) {
        const subjectPattern = typeof options.subject === 'string' 
          ? new RegExp(options.subject, 'i')
          : options.subject;
        filtered = filtered.filter((msg: MailHogMessage) => 
          msg.Content?.Headers?.Subject?.[0]?.match(subjectPattern)
        );
      }
      
      if (options.from) {
        const fromPattern = typeof options.from === 'string'
          ? new RegExp(options.from, 'i')
          : options.from;
        filtered = filtered.filter((msg: MailHogMessage) =>
          msg.From?.Mailbox && `${msg.From.Mailbox}@${msg.From.Domain}`.match(fromPattern)
        );
      }
      
      if (options.since) {
        filtered = filtered.filter((msg: MailHogMessage) => 
          new Date(msg.Created) >= options.since!
        );
      }
      
      // Convert to TestEmail format
      const testEmails: TestEmail[] = filtered.map((msg: MailHogMessage) => ({
        id: msg.ID,
        to: email,
        from: msg.From ? `${msg.From.Mailbox}@${msg.From.Domain}` : '',
        subject: msg.Content?.Headers?.Subject?.[0] || '',
        body: msg.Content?.Body || '',
        html: msg.MIME?.Parts?.find((part) => part.Headers?.['Content-Type']?.[0]?.includes('text/html'))?.Body,
        receivedAt: new Date(msg.Created),
        isRead: false, // MailHog doesn't track read status
      }));
      
      // Sort by received date (newest first)
      testEmails.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
      
      // Apply limit
      if (options.limit) {
        return testEmails.slice(0, options.limit);
      }
      
      return testEmails;
    } catch (error) {
      console.error('Failed to get emails from MailHog:', error);
      return [];
    }
  }

  async deleteAllEmails(_email: string): Promise<void> {
    try {
      // MailHog API to delete all messages
      const response = await fetch(`${this.baseUrl}/api/v1/messages`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        console.warn(`Failed to delete emails: ${response.statusText}`);
      }
    } catch (_error) {
      console.error('Failed to delete emails:', _error);
    }
  }

  extractVerificationLink(email: TestEmail): string | null {
    const content = email.html || email.body;
    
    // Common patterns for verification links
    const patterns = [
      /href="([^"]*verify[^"]*)"/, // href="...verify..."
      /href="([^"]*confirmation[^"]*)"/, // href="...confirmation..."
      /(https?:\/\/[^\s]+verify[^\s]*)/g, // https://...verify...
      /(https?:\/\/[^\s]+confirmation[^\s]*)/g, // https://...confirmation...
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  extractResetLink(email: TestEmail): string | null {
    const content = email.html || email.body;
    
    const patterns = [
      /href="([^"]*reset[^"]*)"/, 
      /href="([^"]*password[^"]*)"/, 
      /(https?:\/\/[^\s]+reset[^\s]*)/g,
      /(https?:\/\/[^\s]+password[^\s]*)/g,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  extractCode(email: TestEmail, type: 'verification' | 'reset' | 'mfa'): string | null {
    const content = email.html || email.body;
    
    // Pattern for common verification codes
    const patterns = {
      verification: [
        /verification code[:\s]*([A-Z0-9]{6,8})/i,
        /confirm.*code[:\s]*([A-Z0-9]{6,8})/i,
        /code[:\s]*([A-Z0-9]{6,8})/i,
      ],
      reset: [
        /reset code[:\s]*([A-Z0-9]{6,8})/i,
        /password.*code[:\s]*([A-Z0-9]{6,8})/i,
      ],
      mfa: [
        /authentication code[:\s]*([0-9]{6})/i,
        /2fa.*code[:\s]*([0-9]{6})/i,
        /totp[:\s]*([0-9]{6})/i,
      ],
    };
    
    const typePatterns = patterns[type] || patterns.verification;
    
    for (const pattern of typePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
}

/**
 * Mock Email Service for environments without real email testing
 */
export class MockEmailService implements EmailTestService {
  private emails: Map<string, TestEmail[]> = new Map();
  private createdEmails: Set<string> = new Set();

  async initialize(): Promise<void> {
    // No setup needed for mock service
  }

  async cleanup(): Promise<void> {
    this.emails.clear();
    this.createdEmails.clear();
  }

  async createTestEmailAddress(prefix = 'test'): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const email = `${prefix}_${timestamp}_${randomId}@example.com`;
    
    this.createdEmails.add(email);
    this.emails.set(email, []);
    return email;
  }

  async deleteTestEmailAddress(email: string): Promise<void> {
    this.emails.delete(email);
    this.createdEmails.delete(email);
  }

  async waitForEmail(email: string, options: EmailWaitOptions = {}): Promise<TestEmail> {
    // Mock immediate email delivery
    const mockEmail: TestEmail = {
      id: `mock-${Date.now()}`,
      to: email,
      from: 'noreply@arcadia.com',
      subject: options.subject?.toString() || 'Test Email',
      body: this.generateMockEmailBody(),
      receivedAt: new Date(),
      isRead: false,
    };
    
    const emailList = this.emails.get(email) || [];
    emailList.unshift(mockEmail);
    this.emails.set(email, emailList);
    
    return mockEmail;
  }

  async getEmails(email: string, options: EmailFilterOptions = {}): Promise<TestEmail[]> {
    const emailList = this.emails.get(email) || [];
    
    let filtered = [...emailList];
    
    if (options.subject) {
      const subjectPattern = typeof options.subject === 'string'
        ? new RegExp(options.subject, 'i')
        : options.subject;
      filtered = filtered.filter(e => e.subject.match(subjectPattern));
    }
    
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }

  async deleteAllEmails(email: string): Promise<void> {
    this.emails.set(email, []);
  }

  extractVerificationLink(_email: TestEmail): string | null {
    // Return mock verification link
    return `http://localhost:3000/auth/verify-email?token=mock_verification_token_${Date.now()}`;
  }

  extractResetLink(_email: TestEmail): string | null {
    // Return mock reset link
    return `http://localhost:3000/auth/reset-password?token=mock_reset_token_${Date.now()}`;
  }

  extractCode(_email: TestEmail, type: 'verification' | 'reset' | 'mfa'): string | null {
    // Return mock codes based on type
    const codes = {
      verification: '123456',
      reset: 'ABC123',
      mfa: '654321',
    };
    
    return codes[type] || '123456';
  }

  private generateMockEmailBody(): string {
    return `
      Welcome to Arcadia!
      
      Please verify your email address by clicking the link below:
      http://localhost:3000/auth/verify-email?token=mock_verification_token_${Date.now()}
      
      Or enter this verification code: 123456
      
      If you didn't create an account, you can safely ignore this email.
      
      Best regards,
      The Arcadia Team
    `;
  }
}

/**
 * Email Service Factory
 */
export class EmailServiceFactory {
  static async create(): Promise<EmailTestService> {
    const useRealEmail = process.env.USE_REAL_EMAIL_TESTING === 'true';
    const mailhogUrl = process.env.MAILHOG_URL || 'http://localhost:8025';
    
    if (useRealEmail) {
      const mailhogService = new MailHogEmailService(mailhogUrl);
      try {
        await mailhogService.initialize();
        console.log('Using MailHog email service for testing');
        return mailhogService;
      } catch (error) {
        console.warn('MailHog not available, falling back to mock email service');
      }
    }
    
    const mockService = new MockEmailService();
    await mockService.initialize();
    console.log('Using mock email service for testing');
    return mockService;
  }
}

/**
 * Helper utilities for email testing
 */
export class EmailTestHelpers {
  static async waitForVerificationEmail(
    emailService: EmailTestService,
    email: string,
    timeout = 30000
  ): Promise<{ email: TestEmail; verificationLink: string | null }> {
    const testEmail = await emailService.waitForEmail(email, {
      timeout,
      subject: /verify|confirmation/i,
    });
    
    const verificationLink = emailService.extractVerificationLink(testEmail);
    
    return { email: testEmail, verificationLink };
  }

  static async waitForPasswordResetEmail(
    emailService: EmailTestService,
    email: string,
    timeout = 30000
  ): Promise<{ email: TestEmail; resetLink: string | null }> {
    const testEmail = await emailService.waitForEmail(email, {
      timeout,
      subject: /reset|password/i,
    });
    
    const resetLink = emailService.extractResetLink(testEmail);
    
    return { email: testEmail, resetLink };
  }

  static async waitForMFAEmail(
    emailService: EmailTestService,
    email: string,
    timeout = 30000
  ): Promise<{ email: TestEmail; code: string | null }> {
    const testEmail = await emailService.waitForEmail(email, {
      timeout,
      subject: /authentication|2fa|mfa/i,
    });
    
    const code = emailService.extractCode(testEmail, 'mfa');
    
    return { email: testEmail, code };
  }
}