/**
 * @file crypto-utils.test.ts
 * @description Tests for client-safe cryptographic utilities
 */

import { generateSessionCode, hashString, hashPassword, verifyPassword } from '@/lib/crypto-utils';

// Mock Web Crypto API for testing
const mockCrypto = {
  getRandomValues: jest.fn(),
  subtle: {
    digest: jest.fn(),
  },
};

describe('generateSessionCode', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Remove any existing window.crypto mock
    delete (global as unknown as { window: unknown }).window;
  });

  it('should generate a session code with default length', () => {
    const code = generateSessionCode();
    expect(typeof code).toBe('string');
    expect(code.length).toBe(6);
  });

  it('should generate a session code with custom length', () => {
    const code = generateSessionCode(8);
    expect(code.length).toBe(8);
  });

  it('should only contain alphanumeric characters', () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^[0-9A-Z]+$/);
  });

  it('should use Web Crypto API when available', () => {
    // Mock window.crypto
    const mockGetRandomValues = jest.fn((array: Uint8Array) => {
      // Fill with predictable values for testing
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 36; // Within charset range
      }
      return array;
    });

    (global as unknown as { window: { crypto: typeof mockCrypto } }).window = {
      crypto: {
        ...mockCrypto,
        getRandomValues: mockGetRandomValues,
      },
    };

    const code = generateSessionCode(4);
    expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(code.length).toBe(4);
    expect(code).toMatch(/^[0-9A-Z]+$/);
  });

  it('should fall back to Math.random when Web Crypto is not available', () => {
    // Ensure no window.crypto
    delete (global as unknown as { window: unknown }).window;

    const code = generateSessionCode(6);
    expect(code.length).toBe(6);
    expect(code).toMatch(/^[0-9A-Z]+$/);
  });

  it('should generate different codes on subsequent calls', () => {
    const codes = new Set<string>();
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      codes.add(generateSessionCode());
    }

    // Should generate mostly unique codes (allowing for small collision rate)
    expect(codes.size).toBeGreaterThan(iterations * 0.9);
  });

  it('should handle zero length gracefully', () => {
    const code = generateSessionCode(0);
    expect(code).toBe('');
  });

  it('should handle large lengths', () => {
    const code = generateSessionCode(50);
    expect(code.length).toBe(50);
    expect(code).toMatch(/^[0-9A-Z]+$/);
  });

  it('should use charset consistently', () => {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const code = generateSessionCode(1000);
    
    for (const char of code) {
      expect(charset).toContain(char);
    }
  });
});

describe('hashString', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (global as unknown as { window: unknown }).window;
  });

  it('should hash strings using Web Crypto API when available', async () => {
    const mockDigest = jest.fn().mockResolvedValue(
      // Mock SHA-256 hash result
      new ArrayBuffer(32)
    );

    (global as unknown as { window: { crypto: typeof mockCrypto } }).window = {
      crypto: {
        ...mockCrypto,
        subtle: {
          digest: mockDigest,
        },
      },
    };

    // Mock TextEncoder
    (global as unknown as { TextEncoder: unknown }).TextEncoder = class {
      encode(input: string) {
        return new Uint8Array(Buffer.from(input, 'utf8'));
      }
    };

    const result = await hashString('test input');
    
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should use fallback hash when Web Crypto is not available', async () => {
    // Ensure no window.crypto
    delete (global as unknown as { window: unknown }).window;

    const result = await hashString('test input');
    
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/^[0-9a-f]+$/); // Hex string
  });

  it('should produce consistent results with fallback hash', async () => {
    const input = 'consistent test input';
    const result1 = await hashString(input);
    const result2 = await hashString(input);
    
    expect(result1).toBe(result2);
  });

  it('should produce different hashes for different inputs', async () => {
    const hash1 = await hashString('input1');
    const hash2 = await hashString('input2');
    
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty strings', async () => {
    const result = await hashString('');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle special characters', async () => {
    const result = await hashString('🚀 special chars! @#$%^&*()');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle long strings', async () => {
    const longString = 'a'.repeat(10000);
    const result = await hashString(longString);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should use Web Crypto API when subtle crypto is available', async () => {
    const mockHashBuffer = new ArrayBuffer(32);
    const mockDigest = jest.fn().mockResolvedValue(mockHashBuffer);

    (global as unknown as { window: { crypto: typeof mockCrypto } }).window = {
      crypto: {
        ...mockCrypto,
        subtle: {
          digest: mockDigest,
        },
      },
    };

    (global as unknown as { TextEncoder: unknown }).TextEncoder = class {
      encode(input: string) {
        return new Uint8Array(Buffer.from(input, 'utf8'));
      }
    };

    const result = await hashString('test input');
    expect(mockDigest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('hashPassword', () => {
  it('should throw error indicating server-side only usage', async () => {
    await expect(hashPassword('password123')).rejects.toThrow(
      'Password hashing must be done server-side. Use API routes for password operations.'
    );
  });

  it('should throw error for any password input', async () => {
    await expect(hashPassword('')).rejects.toThrow();
    await expect(hashPassword('simple')).rejects.toThrow();
    await expect(hashPassword('complex-password-123!')).rejects.toThrow();
  });
});

describe('verifyPassword', () => {
  it('should throw error indicating server-side only usage', async () => {
    await expect(verifyPassword('password123', 'hash')).rejects.toThrow(
      'Password verification must be done server-side. Use API routes for password operations.'
    );
  });

  it('should throw error for any input combination', async () => {
    await expect(verifyPassword('', '')).rejects.toThrow();
    await expect(verifyPassword('password', 'hash')).rejects.toThrow();
    await expect(verifyPassword('test', 'anyhash')).rejects.toThrow();
  });
});