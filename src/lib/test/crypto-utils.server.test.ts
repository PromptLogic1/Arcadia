/**
 * Tests for server-side cryptographic utilities
 * Tests password hashing, verification, session codes, and general hashing
 * 
 * @jest-environment node
 */

import { randomBytes } from 'crypto';
import {
  hashPassword,
  verifyPassword,
  generateSessionCode,
  hashString,
} from '@/lib/crypto-utils.server';
import { log } from '@/lib/logger';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
  },
}));

// Mock crypto functions for controlled testing
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(),
}));

const mockRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>;

describe('crypto-utils.server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset randomBytes to default implementation
    mockRandomBytes.mockImplementation((size: number) => {
      return Buffer.from(Array(size).fill(0).map((_, i) => i));
    });
  });

  describe('hashPassword', () => {
    it('hashes a valid password successfully', async () => {
      const password = 'MySecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).toContain(':');
      expect(hash.split(':')).toHaveLength(2);
    });

    it('generates different hashes for the same password', async () => {
      const password = 'TestPassword456';
      
      // Mock different random values for each call
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from(Array(16).fill(1)))
        .mockReturnValueOnce(Buffer.from(Array(16).fill(2)));

      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('throws error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password cannot be empty');
    });

    it('throws error for whitespace-only password', async () => {
      await expect(hashPassword('   ')).rejects.toThrow('Password cannot be empty');
    });

    it('creates hash with base64 encoded salt and key', async () => {
      const password = 'TestPassword';
      const hash = await hashPassword(password);
      
      const [salt, key] = hash.split(':');
      
      // Test base64 encoding validity
      expect(() => Buffer.from(salt, 'base64')).not.toThrow();
      expect(() => Buffer.from(key, 'base64')).not.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('verifies correct password successfully', async () => {
      const password = 'CorrectPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const password = 'CorrectPassword123';
      const wrongPassword = 'WrongPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('returns false for empty password', async () => {
      const hash = await hashPassword('ValidPassword');
      const isValid = await verifyPassword('', hash);
      expect(isValid).toBe(false);
    });

    it('returns false for empty hash', async () => {
      const isValid = await verifyPassword('Password', '');
      expect(isValid).toBe(false);
    });

    it('returns false for malformed hash without colon', async () => {
      const isValid = await verifyPassword('Password', 'invalidhashformat');
      expect(isValid).toBe(false);
    });

    it('returns false for malformed hash with invalid base64', async () => {
      const isValid = await verifyPassword('Password', 'invalid!@#:invalid!@#');
      expect(isValid).toBe(false);
      expect(log.error).toHaveBeenCalled();
    });

    it('handles case-sensitive password verification', async () => {
      const password = 'CaseSensitive';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('casesensitive', hash);
      expect(isValid).toBe(false);
    });

    it('logs error for verification failures', async () => {
      const isValid = await verifyPassword('Password', 'malformed:hash:extra');
      expect(isValid).toBe(false);
      expect(log.error).toHaveBeenCalled();
      expect(log.error).toHaveBeenCalledWith(
        'Password verification failed',
        expect.anything(),
        {
          metadata: { service: 'crypto-utils', operation: 'verifyPassword' },
        }
      );
    });
  });

  describe('generateSessionCode', () => {
    it('generates session code with default length', () => {
      mockRandomBytes.mockReturnValueOnce(Buffer.from([10, 20, 30, 40, 50, 60]));
      
      const code = generateSessionCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[0-9A-Z]{6}$/);
    });

    it('generates session code with custom length', () => {
      mockRandomBytes.mockReturnValueOnce(Buffer.from([10, 20, 30, 40]));
      
      const code = generateSessionCode(4);
      expect(code).toHaveLength(4);
      expect(code).toMatch(/^[0-9A-Z]{4}$/);
    });

    it('generates different codes on subsequent calls', () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from([10, 20, 30, 40, 50, 60]))
        .mockReturnValueOnce(Buffer.from([70, 80, 90, 100, 110, 120]));
      
      const code1 = generateSessionCode();
      const code2 = generateSessionCode();
      
      expect(code1).not.toBe(code2);
    });

    it('uses all characters from the charset', () => {
      // Mock bytes that will map to different charset indices
      const charsetLength = 36; // 0-9 + A-Z
      const mockBytes = Array(charsetLength).fill(0).map((_, i) => i);
      mockRandomBytes.mockReturnValueOnce(Buffer.from(mockBytes));
      
      const code = generateSessionCode(charsetLength);
      const uniqueChars = new Set(code.split(''));
      
      expect(uniqueChars.size).toBe(charsetLength);
    });

    it('handles zero length', () => {
      mockRandomBytes.mockReturnValueOnce(Buffer.from([]));
      
      const code = generateSessionCode(0);
      expect(code).toBe('');
    });
  });

  describe('hashString', () => {
    it('hashes a string consistently', () => {
      const input = 'test-string';
      const hash1 = hashString(input);
      const hash2 = hashString(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 produces 64 hex chars
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = hashString('input1');
      const hash2 = hashString('input2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('handles empty string', () => {
      const hash = hashString('');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('handles special characters and unicode', () => {
      const specialInput = 'Test@#$%😀🎉';
      const hash = hashString(specialInput);
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is case sensitive', () => {
      const hash1 = hashString('Test');
      const hash2 = hashString('test');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Security Edge Cases', () => {
    it('resists timing attacks with equal-length incorrect passwords', async () => {
      const correctPassword = 'CorrectPassword123';
      const hash = await hashPassword(correctPassword);
      
      // Passwords with same length but different content
      const attempts = [
        'WrongPassword12345',
        'AnotherWrong12345',
        'YetAnotherWrong12',
      ];
      
      for (const attempt of attempts) {
        const isValid = await verifyPassword(attempt, hash);
        expect(isValid).toBe(false);
      }
    });

    it('handles very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hash = await hashPassword(longPassword);
      
      const isValid = await verifyPassword(longPassword, hash);
      expect(isValid).toBe(true);
    });

    it('handles passwords with null bytes', async () => {
      const passwordWithNull = 'password\0with\0null';
      const hash = await hashPassword(passwordWithNull);
      
      const isValid = await verifyPassword(passwordWithNull, hash);
      expect(isValid).toBe(true);
    });

    it('rejects tampered hash data', async () => {
      const password = 'TestPassword';
      const hash = await hashPassword(password);
      
      // Tamper with the hash by changing a character
      const [salt, key] = hash.split(':');
      const tamperedKey = key.slice(0, -1) + 'X';
      const tamperedHash = `${salt}:${tamperedKey}`;
      
      const isValid = await verifyPassword(password, tamperedHash);
      expect(isValid).toBe(false);
    });

    it('handles concurrent password operations', async () => {
      const passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5'];
      
      // Mock different random values for each hash
      passwords.forEach((_, i) => {
        mockRandomBytes.mockReturnValueOnce(Buffer.from(Array(16).fill(i)));
      });
      
      // Hash all passwords concurrently
      const hashPromises = passwords.map(p => hashPassword(p));
      const hashes = await Promise.all(hashPromises);
      
      // Verify all passwords concurrently
      const verifyPromises = passwords.map((p, i) => verifyPassword(p, hashes[i]));
      const results = await Promise.all(verifyPromises);
      
      expect(results).toEqual([true, true, true, true, true]);
    });
  });
});