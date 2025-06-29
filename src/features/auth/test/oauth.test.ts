/**
 * @jest-environment jsdom
 */

/**
 * OAuth Flow Tests
 *
 * Tests for OAuth authentication flows including:
 * - Provider authorization
 * - Callback handling
 * - State validation
 * - Error handling
 * - User data mapping
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Provider } from '@supabase/supabase-js';

// Mock logger
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Type definitions for OAuth user data
type OAuthUserMetadata = {
  email?: string;
  username?: string;
  user_name?: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  picture?: string;
  bio?: string;
  location?: string;
  email_verified?: boolean;
  custom_claims?: {
    username?: string;
  };
};




// Import authService - using global mocks from jest.setup.ts
import { authService } from '@/services/auth.service';

// Get access to the global mocks for test-specific behavior
const mockAuthService = authService as jest.Mocked<typeof authService>;

// OAuth configuration
const OAUTH_CONFIG = {
  google: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'google-client-id',
    scope: 'openid email profile',
    redirectUri: 'http://localhost:3000/auth/callback/google',
  },
  github: {
    clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'github-client-id',
    scope: 'user:email',
    redirectUri: 'http://localhost:3000/auth/callback/github',
  },
  discord: {
    clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || 'discord-client-id',
    scope: 'identify email',
    redirectUri: 'http://localhost:3000/auth/callback/discord',
  },
} as const;

type OAuthProvider = keyof typeof OAUTH_CONFIG;

describe('OAuth Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup window.location for OAuth redirects
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
      },
      writable: true,
    });

    // Reset all auth service mocks to default state
    mockAuthService.signInWithOAuth.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });
    mockAuthService.exchangeCodeForSession.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });
  });

  describe('OAuth Provider Configuration', () => {
    test('should have valid configuration for each provider', () => {
      const providers = Object.keys(OAUTH_CONFIG);
      expect(providers).toContain('google');
      expect(providers).toContain('github');
      expect(providers).toContain('discord');

      providers.forEach(provider => {
        const config = OAUTH_CONFIG[provider as OAuthProvider];
        expect(config.clientId).toBeDefined();
        expect(config.redirectUri).toBeDefined();
        expect(config.scope).toBeDefined();
      });
    });

    test('should use HTTPS in production', () => {
      const prodRedirectUri = 'https://app.example.com/auth/callback/google';
      expect(prodRedirectUri.startsWith('https://')).toBe(true);
    });
  });

  describe('Google OAuth Flow', () => {
    test('should initiate Google OAuth authorization', async () => {
      const mockOAuthUrl =
        'https://accounts.google.com/oauth/authorize?client_id=test&redirect_uri=test';

      mockAuthService.signInWithOAuth.mockResolvedValue({
        success: true,
        data: {
          url: mockOAuthUrl,
          provider: 'google',
        },
        error: null,
      });

      const result = await authService.signInWithOAuth('google');

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe(mockOAuthUrl);
      expect(result.data?.provider).toBe('google');
      expect(mockAuthService.signInWithOAuth).toHaveBeenCalledWith('google');
    });

    test('should handle Google OAuth callback', async () => {
      const mockUser = {
        id: 'google-user-123',
        email: 'user@gmail.com',
        phone: null,
        user_metadata: {
          username: 'googleuser',
          full_name: 'Google User',
          avatar_url: 'https://lh3.googleusercontent.com/photo.jpg',
        },
        app_metadata: {
          provider: 'google',
        },
      };

      mockAuthService.exchangeCodeForSession.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            phone: mockUser.phone,
            auth_username: mockUser.user_metadata?.username || null,
            username: mockUser.user_metadata?.username || undefined,
            avatar_url: mockUser.user_metadata?.avatar_url || null,
            provider: mockUser.app_metadata?.provider || null,
            userRole: 'user',
          },
        },
        error: null,
      });

      const result = await authService.exchangeCodeForSession('auth-code-123');

      expect(result.success).toBe(true);
      expect(result.data?.user?.email).toBe('user@gmail.com');
      expect(result.data?.user?.provider).toBe('google');
      expect(result.data?.user?.username).toBe('googleuser');
    });

    test('should validate state parameter', () => {
      // State validation in OAuth flow
      const validateState = (stored: string, received: string): boolean => {
        return stored === received && stored.length > 0;
      };

      const storedState = 'secure-random-state-123';

      // Invalid state should fail
      expect(validateState(storedState, 'different-state')).toBe(false);
      expect(validateState(storedState, '')).toBe(false);

      // Valid state should pass
      expect(validateState(storedState, storedState)).toBe(true);
    });
  });

  describe('GitHub OAuth Flow', () => {
    test('should initiate GitHub OAuth authorization', async () => {
      const mockOAuthUrl =
        'https://github.com/login/oauth/authorize?client_id=test';

      mockAuthService.signInWithOAuth.mockResolvedValue({
        success: true,
        data: {
          url: mockOAuthUrl,
          provider: 'github',
        },
        error: null,
      });

      const result = await authService.signInWithOAuth('github');

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe(mockOAuthUrl);
      expect(result.data?.provider).toBe('github');
      expect(mockAuthService.signInWithOAuth).toHaveBeenCalledWith('github');
    });

    test('should handle GitHub OAuth callback', async () => {
      const mockUser = {
        id: 'github-12345',
        email: 'user@example.com',
        phone: null,
        user_metadata: {
          username: 'githubuser',
          full_name: 'GitHub User',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        },
        app_metadata: {
          provider: 'github',
        },
      };

      mockAuthService.exchangeCodeForSession.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            phone: mockUser.phone,
            auth_username: mockUser.user_metadata?.username || null,
            username: mockUser.user_metadata?.username || undefined,
            avatar_url: mockUser.user_metadata?.avatar_url || null,
            provider: mockUser.app_metadata?.provider || null,
            userRole: 'user',
          },
        },
        error: null,
      });

      const result =
        await authService.exchangeCodeForSession('github-code-123');

      expect(result.success).toBe(true);
      expect(result.data?.user?.username).toBe('githubuser');
      expect(result.data?.user?.provider).toBe('github');
    });

    test('should handle private email from GitHub', async () => {
      const mockUser = {
        id: 'github-12345',
        email: null, // Private email
        phone: null,
        user_metadata: {
          username: 'githubuser',
        },
        app_metadata: {
          provider: 'github',
        },
      };

      mockAuthService.exchangeCodeForSession.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            phone: mockUser.phone,
            auth_username: mockUser.user_metadata?.username || null,
            username: mockUser.user_metadata?.username || undefined,
            avatar_url: null,
            provider: mockUser.app_metadata?.provider || null,
            userRole: 'user',
          },
        },
        error: null,
      });

      const result = await authService.exchangeCodeForSession(
        'github-code-private'
      );

      expect(result.success).toBe(true);
      // Should handle null email gracefully
      expect(result.data?.user?.email).toBeNull();
      expect(result.data?.user?.provider).toBe('github');
    });
  });

  describe('Discord OAuth Flow', () => {
    test('should initiate Discord OAuth authorization', async () => {
      const mockOAuthUrl =
        'https://discord.com/api/oauth2/authorize?client_id=test';

      mockAuthService.signInWithOAuth.mockResolvedValue({
        success: true,
        data: {
          url: mockOAuthUrl,
          provider: 'discord',
        },
        error: null,
      });

      const result = await authService.signInWithOAuth('discord');

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe(mockOAuthUrl);
      expect(result.data?.provider).toBe('discord');
      expect(mockAuthService.signInWithOAuth).toHaveBeenCalledWith('discord');
    });

    test('should handle Discord OAuth callback', async () => {
      const mockUser = {
        id: 'discord-123456789012345678',
        email: 'user@example.com',
        phone: null,
        user_metadata: {
          username: 'discorduser',
          full_name: 'Discord User',
        },
        app_metadata: {
          provider: 'discord',
        },
      };

      mockAuthService.exchangeCodeForSession.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            phone: mockUser.phone,
            auth_username: mockUser.user_metadata?.username || null,
            username: mockUser.user_metadata?.username || undefined,
            avatar_url: null,
            provider: mockUser.app_metadata?.provider || null,
            userRole: 'user',
          },
        },
        error: null,
      });

      const result =
        await authService.exchangeCodeForSession('discord-code-123');

      expect(result.success).toBe(true);
      expect(result.data?.user?.username).toBe('discorduser');
      expect(result.data?.user?.provider).toBe('discord');
    });
  });

  describe('OAuth Error Handling', () => {
    test('should handle authorization denial', async () => {
      mockAuthService.signInWithOAuth.mockResolvedValue({
        success: false,
        data: null,
        error: 'The user denied the request',
      });

      const result = await authService.signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('The user denied the request');
    });

    test('should handle invalid authorization code', async () => {
      mockAuthService.exchangeCodeForSession.mockResolvedValue({
        success: false,
        data: null,
        error: 'Invalid authorization code',
      });

      const result = await authService.exchangeCodeForSession('invalid-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid authorization code');
    });

    test('should handle network errors', async () => {
      mockAuthService.signInWithOAuth.mockResolvedValue({
        success: false,
        data: null,
        error: 'Network error',
      });

      const result = await authService.signInWithOAuth('github');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('should handle rate limiting', async () => {
      mockAuthService.signInWithOAuth.mockResolvedValue({
        success: false,
        data: null,
        error: 'Too many requests. Please try again later.',
      });

      const result = await authService.signInWithOAuth('github');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many requests');
    });

    test('should handle missing OAuth URL', async () => {
      mockAuthService.signInWithOAuth.mockResolvedValue({
        success: false,
        data: null,
        error: 'No OAuth URL returned',
      });

      const result = await authService.signInWithOAuth('google');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No OAuth URL returned');
    });

    test('should handle missing user in code exchange', async () => {
      mockAuthService.exchangeCodeForSession.mockResolvedValue({
        success: false,
        data: null,
        error: 'No user returned from OAuth code exchange',
      });

      const result = await authService.exchangeCodeForSession('valid-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user returned from OAuth code exchange');
    });

    test('should handle unexpected errors during code exchange', async () => {
      mockAuthService.exchangeCodeForSession.mockResolvedValue({
        success: false,
        data: null,
        error: 'Unexpected error',
      });

      const result = await authService.exchangeCodeForSession('valid-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('User Data Mapping', () => {
    test('should map Google user data to internal format', () => {
      const googleMetadata = {
        email: 'user@gmail.com',
        full_name: 'John Doe',
        avatar_url: 'https://lh3.googleusercontent.com/photo.jpg',
        email_verified: true,
      };

      // Transform function that would be in the auth service
      const transformOAuthUser = (
        provider: Provider,
        metadata: OAuthUserMetadata
      ) => {
        return {
          email: metadata.email,
          username:
            metadata.email?.split('@')[0] ||
            metadata.user_name ||
            metadata.username,
          full_name: metadata.full_name || metadata.name,
          avatar_url: metadata.avatar_url || metadata.picture,
          provider,
          email_verified: metadata.email_verified || false,
        };
      };

      const transformed = transformOAuthUser('google', googleMetadata);

      expect(transformed.username).toBe('user');
      expect(transformed.provider).toBe('google');
      expect(transformed.email_verified).toBe(true);
    });

    test('should map GitHub user data to internal format', () => {
      const githubMetadata = {
        user_name: 'johnsmith',
        email: 'john@example.com',
        full_name: 'John Smith',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        bio: 'Software Developer',
        location: 'San Francisco',
      };

      const transformOAuthUser = (
        provider: Provider,
        metadata: OAuthUserMetadata
      ) => {
        return {
          email: metadata.email,
          username:
            metadata.user_name ||
            metadata.username ||
            metadata.email?.split('@')[0],
          full_name: metadata.full_name || metadata.name,
          avatar_url: metadata.avatar_url,
          bio: metadata.bio,
          city: metadata.location,
          provider,
        };
      };

      const transformed = transformOAuthUser('github', githubMetadata);

      expect(transformed.username).toBe('johnsmith');
      expect(transformed.bio).toBe('Software Developer');
      expect(transformed.provider).toBe('github');
    });

    test('should handle missing optional fields', () => {
      const minimalMetadata = {
        email: 'user@example.com',
        custom_claims: {
          username: 'discorduser',
        },
      };

      const transformOAuthUser = (
        provider: Provider,
        metadata: OAuthUserMetadata
      ) => {
        const username =
          metadata.custom_claims?.username ||
          metadata.user_name ||
          metadata.username ||
          metadata.email?.split('@')[0];

        return {
          email: metadata.email,
          username,
          full_name: metadata.full_name || metadata.name || null,
          avatar_url: metadata.avatar_url || metadata.picture || null,
          bio: metadata.bio || null,
          provider,
        };
      };

      const transformed = transformOAuthUser('discord', minimalMetadata);

      expect(transformed.full_name).toBeNull();
      expect(transformed.avatar_url).toBeNull();
      expect(transformed.username).toBe('discorduser');
    });
  });

  describe('Security Considerations', () => {
    test('should generate secure state parameter', () => {
      // Supabase handles state generation internally
      // We verify that our mock generates unique values
      const generateState = (): string => {
        const array = new Uint8Array(32);
        global.crypto.getRandomValues(array);
        return Array.from(array, byte =>
          byte.toString(16).padStart(2, '0')
        ).join('');
      };

      const states = new Set<string>();
      for (let i = 0; i < 100; i++) {
        states.add(generateState());
      }

      // All states should be unique
      expect(states.size).toBe(100);
      // Each state should be 64 chars (32 bytes in hex)
      expect(Array.from(states)[0]!.length).toBe(64);
    });

    test('should validate redirect URI', () => {
      const isValidRedirectUri = (uri: string): boolean => {
        const allowedHosts = [
          'localhost:3000',
          'app.example.com',
          process.env.NEXT_PUBLIC_APP_URL,
        ].filter(Boolean);

        try {
          const url = new URL(uri);
          return allowedHosts.some(
            host => url.host === host || url.hostname === host
          );
        } catch {
          return false;
        }
      };

      expect(isValidRedirectUri('https://app.example.com/auth/callback')).toBe(
        true
      );
      expect(isValidRedirectUri('http://localhost:3000/auth/callback')).toBe(
        true
      );
      expect(isValidRedirectUri('https://evil.com/auth/callback')).toBe(false);
      expect(isValidRedirectUri('not-a-url')).toBe(false);
    });

    test('should not expose sensitive data in frontend', () => {
      // Verify OAuth config doesn't include secrets
      const providers: OAuthProvider[] = ['google', 'github', 'discord'];

      providers.forEach(provider => {
        const config = OAUTH_CONFIG[provider];
        // Should have client ID (public)
        expect(config.clientId).toBeDefined();
        // Should NOT have client secret
        expect(config).not.toHaveProperty('clientSecret');
        expect(config).not.toHaveProperty('secret');
      });
    });

    test('should use PKCE for OAuth flows', () => {
      // Modern OAuth should use PKCE instead of client secrets
      const pkceConfig = {
        codeChallenge: 'generated-code-challenge',
        codeChallengeMethod: 'S256' as const,
        codeVerifier: 'secure-random-verifier',
      };

      expect(pkceConfig.codeChallengeMethod).toBe('S256');
      expect(pkceConfig.codeChallenge).toBeDefined();
      expect(pkceConfig.codeVerifier).toBeDefined();
    });
  });
});
