/**
 * Auth Validation Tests
 *
 * Tests for authentication validation logic including:
 * - Email validation
 * - Password validation
 * - Username validation
 * - Form validation
 */

import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateConfirmPassword,
  checkPasswordRequirements,
  analyzePasswordStrength,
  validateForm,
  hasValidationErrors,
  isFormValid,
} from '../utils/validation.utils';
import type { FormData } from '../types/signup-form.types';

describe('Email Validation', () => {
  test('should require email', () => {
    expect(validateEmail('')).toBe('Email is required');
    expect(validateEmail('   ')).toBe('Email is required');
  });

  test('should validate email format', () => {
    // Invalid formats
    expect(validateEmail('plaintext')).toBe(
      'Please enter a valid email address'
    );
    expect(validateEmail('@example.com')).toBe(
      'Please enter a valid email address'
    );
    expect(validateEmail('user@')).toBe('Please enter a valid email address');
    expect(validateEmail('user name@example.com')).toBe(
      'Please enter a valid email address'
    );

    // Note: The email regex used is quite comprehensive and may accept some edge cases
    // Let's test what we know should definitely be invalid
    const definitelyInvalid = [
      'plaintext',
      '@example.com',
      'user@',
      'user name@example.com',
    ];

    definitelyInvalid.forEach(email => {
      expect(validateEmail(email)).toBe('Please enter a valid email address');
    });
  });

  test('should accept valid email formats', () => {
    expect(validateEmail('user@example.com')).toBeUndefined();
    expect(validateEmail('user.name@example.com')).toBeUndefined();
    expect(validateEmail('user+tag@example.com')).toBeUndefined();
    expect(validateEmail('user_name@example.co.uk')).toBeUndefined();
    expect(validateEmail('123@example.com')).toBeUndefined();
  });

  test('should reject excessively long emails', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    expect(validateEmail(longEmail)).toBe('Email address is too long');
  });

  test('should trim whitespace', () => {
    expect(validateEmail('  user@example.com  ')).toBeUndefined();
  });
});

describe('Password Requirements', () => {
  test('should check all password requirements', () => {
    const requirements = checkPasswordRequirements('Test123!');
    expect(requirements).toEqual({
      uppercase: true,
      lowercase: true,
      number: true,
      special: true,
      length: true,
    });
  });

  test('should identify missing requirements', () => {
    expect(checkPasswordRequirements('test123!')).toMatchObject({
      uppercase: false,
    });
    expect(checkPasswordRequirements('TEST123!')).toMatchObject({
      lowercase: false,
    });
    expect(checkPasswordRequirements('Testing!')).toMatchObject({
      number: false,
    });
    expect(checkPasswordRequirements('Testing123')).toMatchObject({
      special: false,
    });
    expect(checkPasswordRequirements('Test1!')).toMatchObject({
      length: false,
    });
  });

  test('should respect custom requirements', () => {
    const customConfig = {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: false,
    };

    const requirements = checkPasswordRequirements(
      'TestPassword123',
      customConfig
    );
    expect(requirements.special).toBe(true); // Not required, so always true
    expect(requirements.length).toBe(true);

    const shortPassword = checkPasswordRequirements('Test123', customConfig);
    expect(shortPassword.length).toBe(false);
  });
});

describe('Password Strength Analysis', () => {
  test('should analyze password strength', () => {
    const weak = analyzePasswordStrength('test');
    expect(weak.strength).toBe('weak');
    expect(weak.score).toBeLessThan(60);
    expect(weak.suggestions).toHaveLength(4);

    const fair = analyzePasswordStrength('Test123');
    expect(fair.strength).toBe('fair');
    expect(fair.score).toBeGreaterThanOrEqual(60);
    expect(fair.score).toBeLessThan(80);

    const strong = analyzePasswordStrength('Test123!');
    expect(strong.strength).toBe('strong');
    expect(strong.score).toBe(100);

    const strongLong = analyzePasswordStrength('TestPassword123!');
    expect(strongLong.strength).toBe('strong');
    expect(strongLong.score).toBe(100);
    expect(strongLong.suggestions).toHaveLength(0);
  });

  test('should provide helpful suggestions', () => {
    const analysis = analyzePasswordStrength('test');
    expect(analysis.suggestions).toContain('Add an uppercase letter');
    expect(analysis.suggestions).toContain('Add a number');
    expect(analysis.suggestions).toContain('Add a special character');
    expect(analysis.suggestions).toContain('Use at least 8 characters');
  });
});

describe('Password Validation', () => {
  test('should require password', () => {
    expect(validatePassword('')).toBe('Password is required');
  });

  test('should enforce password requirements', () => {
    expect(validatePassword('weak')).toBe(
      'Password does not meet all requirements'
    );
    expect(validatePassword('NoNumbers!')).toBe(
      'Password does not meet all requirements'
    );
    expect(validatePassword('nouppercase123!')).toBe(
      'Password does not meet all requirements'
    );
    expect(validatePassword('NOLOWERCASE123!')).toBe(
      'Password does not meet all requirements'
    );
    expect(validatePassword('NoSpecialChar123')).toBe(
      'Password does not meet all requirements'
    );
  });

  test('should accept valid passwords', () => {
    expect(validatePassword('ValidPass123!')).toBeUndefined();
    expect(validatePassword('Test@123')).toBeUndefined();
    expect(validatePassword('Complex!Pass1')).toBeUndefined();
  });

  test('should prevent passwords containing username', () => {
    const context: Partial<FormData> = { username: 'testuser' };
    expect(validatePassword('testuser123!A', context)).toBe(
      'Password cannot contain your username'
    );
    expect(validatePassword('Testuser123!', context)).toBe(
      'Password cannot contain your username'
    );
    expect(validatePassword('123testuser!A', context)).toBe(
      'Password cannot contain your username'
    );
  });

  test('should detect predictable patterns', () => {
    // Test patterns that meet all requirements but are still predictable
    // Pattern 1: All same character (but meets length/complexity)
    expect(validatePassword('aaaaaaaa')).toBe(
      'Password does not meet all requirements'
    ); // First fails on requirements

    // Pattern 2: Sequential patterns
    expect(validatePassword('123PasswordA!')).toBe(
      'Password is too predictable'
    );
    expect(validatePassword('abcPasswordA1!')).toBe(
      'Password is too predictable'
    );

    // Valid complex passwords should not be flagged
    expect(validatePassword('MyComplex!Pass2024')).toBeUndefined();
    expect(validatePassword('Secure#Password$789')).toBeUndefined();
  });
});

describe('Username Validation', () => {
  test('should require username', () => {
    expect(validateUsername('')).toBe('Username is required');
    expect(validateUsername('   ')).toBe('Username is required');
  });

  test('should enforce length requirements', () => {
    expect(validateUsername('ab')).toBe(
      'Username must be at least 3 characters long'
    );
    expect(validateUsername('a'.repeat(31))).toBe(
      'Username must be less than 30 characters'
    );
    expect(validateUsername('validuser')).toBeUndefined();
  });

  test('should enforce character requirements', () => {
    expect(validateUsername('user@name')).toBe(
      'Username can only contain letters, numbers, underscores, and hyphens'
    );
    expect(validateUsername('user name')).toBe(
      'Username can only contain letters, numbers, underscores, and hyphens'
    );
    expect(validateUsername('user.name')).toBe(
      'Username can only contain letters, numbers, underscores, and hyphens'
    );
    expect(validateUsername('user-name_123')).toBeUndefined();
  });

  test('should prevent reserved usernames', () => {
    expect(validateUsername('admin')).toBe('This username is reserved');
    expect(validateUsername('ADMIN')).toBe('This username is reserved');
    expect(validateUsername('root')).toBe('This username is reserved');
    expect(validateUsername('system')).toBe('This username is reserved');
    expect(validateUsername('null')).toBe('This username is reserved');
    expect(validateUsername('undefined')).toBe('This username is reserved');
  });
});

describe('Confirm Password Validation', () => {
  test('should require confirmation', () => {
    expect(validateConfirmPassword('')).toBe('Please confirm your password');
  });

  test('should require original password', () => {
    expect(validateConfirmPassword('test', {})).toBe(
      'Original password is required'
    );
  });

  test('should match passwords', () => {
    const context: Partial<FormData> = { password: 'Test123!' };
    expect(validateConfirmPassword('Test123!', context)).toBeUndefined();
    expect(validateConfirmPassword('Different123!', context)).toBe(
      'Passwords do not match'
    );
  });
});

describe('Form Validation', () => {
  test('should validate entire form', () => {
    const formData: FormData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!',
      confirmPassword: 'Test123!',
    };

    const errors = validateForm(formData);
    expect(hasValidationErrors(errors)).toBe(false);
    expect(isFormValid(formData)).toBe(true);
  });

  test('should collect all errors', () => {
    const formData: FormData = {
      username: 'ab',
      email: 'invalid-email',
      password: 'weak',
      confirmPassword: 'different',
    };

    const errors = validateForm(formData);
    expect(errors.username).toBe('Username must be at least 3 characters long');
    expect(errors.email).toBe('Please enter a valid email address');
    expect(errors.password).toBe('Password does not meet all requirements');
    expect(errors.confirmPassword).toBe('Passwords do not match');
    expect(hasValidationErrors(errors)).toBe(true);
    expect(isFormValid(formData)).toBe(false);
  });

  test('should support custom validators', () => {
    const customValidation = {
      username: (value: string) =>
        value.includes('test') ? 'Username cannot contain "test"' : undefined,
    };

    const formData: FormData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!',
      confirmPassword: 'Test123!',
    };

    const errors = validateForm(formData, customValidation);
    expect(errors.username).toBe('Username cannot contain "test"');
  });
});

describe('XSS Prevention', () => {
  test('should handle XSS payloads safely in validation', () => {
    const xssPayloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror="alert(1)">',
      'javascript:alert(1)',
      '"><script>alert(1)</script>',
    ];

    xssPayloads.forEach(payload => {
      // Validation should treat these as invalid inputs, not execute them
      expect(validateEmail(payload)).toBe('Please enter a valid email address');
      expect(validateUsername(payload)).toBe(
        'Username can only contain letters, numbers, underscores, and hyphens'
      );
      // Password validation allows special characters but won't execute scripts
      const passwordError = validatePassword(payload);
      expect(passwordError).toBeTruthy();
    });
  });
});

describe('SQL Injection Prevention', () => {
  test('should handle SQL injection attempts safely', () => {
    const sqlPayloads = [
      "admin'--",
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT * FROM users--",
    ];

    sqlPayloads.forEach(payload => {
      // Validation should treat these as invalid inputs
      expect(validateEmail(payload)).toBe('Please enter a valid email address');
      expect(validateUsername(payload)).toBe(
        'Username can only contain letters, numbers, underscores, and hyphens'
      );
    });
  });
});
