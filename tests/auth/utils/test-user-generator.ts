import type { TestUser, TestUserRole, AuthSession } from '../types/test-types';
import { randomBytes } from 'crypto';

/**
 * Generate a fully typed test user with all required fields
 */
export function generateTestUser(overrides?: Partial<TestUser>): TestUser {
  const timestamp = Date.now();
  const uniqueId = randomBytes(4).toString('hex');
  
  return {
    // Required fields from users table
    id: crypto.randomUUID(),
    username: `testuser_${timestamp}_${uniqueId}`,
    email: `test_${timestamp}_${uniqueId}@example.com`,
    password: 'TestPassword123!@#', // Strong default password
    
    // Profile fields
    full_name: 'Test User',
    avatar_url: null,
    bio: null,
    
    // Location fields
    city: null,
    land: null,
    region: null,
    
    // System fields
    auth_id: crypto.randomUUID(),
    role: 'user' as TestUserRole,
    experience_points: 0,
    
    // Timestamps
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: null,
    
    // Visibility settings
    profile_visibility: 'public',
    achievements_visibility: 'public',
    submissions_visibility: 'public',
    
    // Apply overrides
    ...overrides,
  };
}

/**
 * Generate test user with specific role
 */
export function generateAdminUser(overrides?: Partial<TestUser>): TestUser {
  return generateTestUser({
    role: 'admin' as TestUserRole,
    username: `admin_${Date.now()}`,
    ...overrides,
  });
}

export function generateModeratorUser(overrides?: Partial<TestUser>): TestUser {
  return generateTestUser({
    role: 'moderator' as TestUserRole,
    username: `mod_${Date.now()}`,
    ...overrides,
  });
}

/**
 * Generate multiple test users
 */
export function generateTestUsers(count: number, roleDistribution?: {
  user?: number;
  moderator?: number;
  admin?: number;
}): TestUser[] {
  const users: TestUser[] = [];
  
  if (roleDistribution) {
    const { user = 0, moderator = 0, admin = 0 } = roleDistribution;
    
    for (let i = 0; i < user; i++) {
      users.push(generateTestUser());
    }
    
    for (let i = 0; i < moderator; i++) {
      users.push(generateModeratorUser());
    }
    
    for (let i = 0; i < admin; i++) {
      users.push(generateAdminUser());
    }
  } else {
    for (let i = 0; i < count; i++) {
      users.push(generateTestUser());
    }
  }
  
  return users;
}

/**
 * Generate test user with invalid data for validation testing
 */
export function generateInvalidTestUsers(): Array<{
  user: Partial<TestUser>;
  expectedError: string;
}> {
  return [
    {
      user: { email: 'invalid-email' },
      expectedError: 'Invalid email format',
    },
    {
      user: { email: '' },
      expectedError: 'Email is required',
    },
    {
      user: { username: 'a' }, // Too short
      expectedError: 'Username must be at least 3 characters',
    },
    {
      user: { username: 'a'.repeat(50) }, // Too long
      expectedError: 'Username must be less than 30 characters',
    },
    {
      user: { password: '123' }, // Too weak
      expectedError: 'Password must be at least 8 characters',
    },
    {
      user: { password: 'password' }, // Common password
      expectedError: 'Password is too common',
    },
  ];
}

/**
 * Generate auth session for test user
 */
export function generateAuthSession(userId: string, overrides?: Partial<AuthSession>): AuthSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    session_token: randomBytes(32).toString('hex'),
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    last_activity: now.toISOString(),
    device_info: {
      userAgent: 'Playwright Test Browser',
      platform: 'test',
      browser: 'chromium',
    },
    ip_address: '127.0.0.1',
    ...overrides,
  };
}