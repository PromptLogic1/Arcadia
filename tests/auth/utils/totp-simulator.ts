import { createHmac } from 'crypto';

/**
 * TOTP (Time-based One-Time Password) Simulator for Testing
 * 
 * Simulates TOTP generation for authentication testing without requiring
 * real authenticator apps. Based on RFC 6238.
 */

export interface TOTPConfig {
  secret: string;
  window?: number; // Time window in seconds (default: 30)
  digits?: number; // Code length (default: 6)
  algorithm?: 'sha1' | 'sha256' | 'sha512'; // Hash algorithm (default: sha1)
}

export class TOTPSimulator {
  private config: Required<TOTPConfig>;

  constructor(config: TOTPConfig) {
    this.config = {
      secret: config.secret,
      window: config.window ?? 30,
      digits: config.digits ?? 6,
      algorithm: config.algorithm ?? 'sha1',
    };
  }

  /**
   * Generate TOTP code for current time
   */
  generateCurrentCode(): string {
    const timeStep = Math.floor(Date.now() / 1000 / this.config.window);
    return this.generateCodeForStep(timeStep);
  }

  /**
   * Generate TOTP code for specific time step
   */
  generateCodeForStep(timeStep: number): string {
    // Convert time step to 8-byte buffer (big-endian)
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(Math.floor(timeStep / 0x100000000), 0);
    timeBuffer.writeUInt32BE(timeStep & 0xffffffff, 4);

    // Create HMAC hash
    const hmac = createHmac(this.config.algorithm, Buffer.from(this.config.secret, 'ascii'));
    const hash = hmac.update(timeBuffer).digest();

    // Dynamic truncation
    const lastByte = hash[hash.length - 1];
    if (lastByte === undefined) {
      throw new Error('Invalid hash generated');
    }
    const offset = lastByte & 0x0f;
    const truncatedHash = hash.slice(offset, offset + 4);
    
    // Convert to integer with null checks
    const byte0 = truncatedHash[0];
    const byte1 = truncatedHash[1];
    const byte2 = truncatedHash[2];
    const byte3 = truncatedHash[3];
    
    if (byte0 === undefined || byte1 === undefined || byte2 === undefined || byte3 === undefined) {
      throw new Error('Invalid truncated hash');
    }
    
    const code = (
      ((byte0 & 0x7f) << 24) |
      ((byte1 & 0xff) << 16) |
      ((byte2 & 0xff) << 8) |
      (byte3 & 0xff)
    ) % Math.pow(10, this.config.digits);

    return code.toString().padStart(this.config.digits, '0');
  }

  /**
   * Verify TOTP code (with time tolerance)
   */
  verifyCode(code: string, tolerance = 1): boolean {
    const currentStep = Math.floor(Date.now() / 1000 / this.config.window);
    
    // Check current step and adjacent steps for clock drift tolerance
    for (let i = -tolerance; i <= tolerance; i++) {
      const expectedCode = this.generateCodeForStep(currentStep + i);
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate multiple valid codes for testing scenarios
   */
  generateValidCodes(count = 3): string[] {
    const currentStep = Math.floor(Date.now() / 1000 / this.config.window);
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      codes.push(this.generateCodeForStep(currentStep + i));
    }
    
    return codes;
  }

  /**
   * Generate expired/invalid codes for negative testing
   */
  generateExpiredCodes(count = 3): string[] {
    const currentStep = Math.floor(Date.now() / 1000 / this.config.window);
    const codes: string[] = [];
    
    // Generate codes from past time steps
    for (let i = count; i > 0; i--) {
      codes.push(this.generateCodeForStep(currentStep - i - 5)); // -5 for sufficient gap
    }
    
    return codes;
  }

  /**
   * Get QR code data URL for TOTP setup
   */
  getQRCodeData(accountName: string, issuer = 'Arcadia'): string {
    const params = new URLSearchParams({
      secret: this.config.secret,
      issuer,
      algorithm: this.config.algorithm.toUpperCase(),
      digits: this.config.digits.toString(),
      period: this.config.window.toString(),
    });
    
    const otpauthURL = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params}`;
    return otpauthURL;
  }

  /**
   * Static method to generate a random secret for testing
   */
  static generateTestSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 alphabet
    let secret = '';
    
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    
    return secret;
  }
}

/**
 * Factory for creating pre-configured TOTP simulators for common test scenarios
 */
export class TOTPTestFactory {
  /**
   * Create TOTP simulator with default test configuration
   */
  static createDefault(): TOTPSimulator {
    return new TOTPSimulator({
      secret: 'JBSWY3DPEHPK3PXP', // Base32: "Hello world!"
      window: 30,
      digits: 6,
      algorithm: 'sha1',
    });
  }

  /**
   * Create TOTP simulator with random secret for isolation
   */
  static createRandom(): TOTPSimulator {
    return new TOTPSimulator({
      secret: TOTPSimulator.generateTestSecret(),
      window: 30,
      digits: 6,
      algorithm: 'sha1',
    });
  }

  /**
   * Create TOTP simulator with custom configuration for specific tests
   */
  static createCustom(overrides: Partial<TOTPConfig>): TOTPSimulator {
    return new TOTPSimulator({
      secret: 'JBSWY3DPEHPK3PXP',
      window: 30,
      digits: 6,
      algorithm: 'sha1',
      ...overrides,
    });
  }

  /**
   * Create multiple TOTP simulators for concurrent testing
   */
  static createMultiple(count: number): TOTPSimulator[] {
    return Array.from({ length: count }, () => this.createRandom());
  }
}

/**
 * Mock MFA provider for testing different MFA scenarios
 */
export interface MFATestScenario {
  type: 'totp' | 'sms' | 'email' | 'backup';
  code?: string;
  isValid?: boolean;
  delay?: number; // Simulation delay in ms
  error?: string;
}

export class MFAMockProvider {
  private scenarios: Map<string, MFATestScenario> = new Map();

  /**
   * Set up a test scenario for specific user
   */
  setupScenario(userId: string, scenario: MFATestScenario): void {
    this.scenarios.set(userId, scenario);
  }

  /**
   * Simulate MFA challenge for user
   */
  async simulateChallenge(userId: string, code: string): Promise<{
    success: boolean;
    error?: string;
    remainingAttempts?: number;
  }> {
    const scenario = this.scenarios.get(userId);
    
    if (!scenario) {
      return { success: false, error: 'No MFA configured' };
    }

    // Simulate network delay
    if (scenario.delay) {
      await new Promise(resolve => setTimeout(resolve, scenario.delay));
    }

    // Return configured result
    if (scenario.error) {
      return { success: false, error: scenario.error };
    }

    const isValid = scenario.code ? code === scenario.code : scenario.isValid ?? true;
    return { 
      success: isValid,
      error: isValid ? undefined : 'Invalid code',
      remainingAttempts: isValid ? undefined : 2,
    };
  }

  /**
   * Clear all scenarios
   */
  clearScenarios(): void {
    this.scenarios.clear();
  }
}