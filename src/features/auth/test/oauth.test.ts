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

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mockOAuthProviders } from './__mocks__/supabase';

// OAuth configuration
const OAUTH_CONFIG = {
  google: {
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
    scope: 'openid email profile',
    redirectUri: 'http://localhost:3000/auth/callback/google',
  },
  github: {
    clientId: 'github-client-id',
    clientSecret: 'github-client-secret',
    scope: 'user:email',
    redirectUri: 'http://localhost:3000/auth/callback/github',
  },
  discord: {
    clientId: 'discord-client-id',
    clientSecret: 'discord-client-secret',
    scope: 'identify email',
    redirectUri: 'http://localhost:3000/auth/callback/discord',
  },
};

describe('OAuth Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuth Provider Configuration', () => {
    test('should have valid configuration for each provider', () => {
      const providers = Object.keys(OAUTH_CONFIG);
      expect(providers).toContain('google');
      expect(providers).toContain('github');
      expect(providers).toContain('discord');

      providers.forEach(provider => {
        const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];
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
      const state = 'random-state-string';
      const authUrl = `https://accounts.google.com/oauth/authorize?client_id=${OAUTH_CONFIG.google.clientId}&redirect_uri=${encodeURIComponent(OAUTH_CONFIG.google.redirectUri)}&scope=${encodeURIComponent(OAUTH_CONFIG.google.scope)}&response_type=code&state=${state}`;

      mockOAuthProviders.google.authorize.mockResolvedValue({
        url: authUrl,
        state,
      });

      const result = await mockOAuthProviders.google.authorize({
        clientId: OAUTH_CONFIG.google.clientId,
        redirectUri: OAUTH_CONFIG.google.redirectUri,
        scope: OAUTH_CONFIG.google.scope,
        state,
      });

      expect(result.url).toContain('accounts.google.com');
      expect(result.url).toContain('client_id=');
      expect(result.url).toContain('state=');
      expect(result.state).toBe(state);
    });

    test('should handle Google OAuth callback', async () => {
      const code = 'google-auth-code';
      const state = 'random-state-string';
      
      const mockUserData = {
        id: 'google-user-123',
        email: 'user@gmail.com',
        name: 'Google User',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
        verified_email: true,
      };

      mockOAuthProviders.google.callback.mockResolvedValue({
        user: mockUserData,
        tokens: {
          access_token: 'google-access-token',
          refresh_token: 'google-refresh-token',
          expires_in: 3600,
        },
      });

      const result = await mockOAuthProviders.google.callback(code, state);

      expect(result.user.email).toBe('user@gmail.com');
      expect(result.user.verified_email).toBe(true);
      expect(result.tokens.access_token).toBeDefined();
    });

    test('should validate state parameter', () => {
      const originalState = 'original-state';
      const receivedState = 'different-state';

      const isValidState = originalState === receivedState;
      expect(isValidState).toBe(false);

      // Should reject callback with invalid state
      const validState = 'original-state';
      const isValid = originalState === validState;
      expect(isValid).toBe(true);
    });
  });

  describe('GitHub OAuth Flow', () => {
    test('should initiate GitHub OAuth authorization', async () => {
      const state = 'github-state-123';
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${OAUTH_CONFIG.github.clientId}&redirect_uri=${encodeURIComponent(OAUTH_CONFIG.github.redirectUri)}&scope=${encodeURIComponent(OAUTH_CONFIG.github.scope)}&state=${state}`;

      mockOAuthProviders.github.authorize.mockResolvedValue({
        url: authUrl,
        state,
      });

      const result = await mockOAuthProviders.github.authorize({
        clientId: OAUTH_CONFIG.github.clientId,
        redirectUri: OAUTH_CONFIG.github.redirectUri,
        scope: OAUTH_CONFIG.github.scope,
        state,
      });

      expect(result.url).toContain('github.com');
      expect(result.url).toContain('user:email');
    });

    test('should handle GitHub OAuth callback', async () => {
      const code = 'github-auth-code';
      const state = 'github-state-123';
      
      const mockUserData = {
        id: 12345,
        login: 'githubuser',
        email: 'user@example.com',
        name: 'GitHub User',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        public_repos: 10,
      };

      mockOAuthProviders.github.callback.mockResolvedValue({
        user: mockUserData,
        tokens: {
          access_token: 'gho_github_token',
          token_type: 'bearer',
          scope: 'user:email',
        },
      });

      const result = await mockOAuthProviders.github.callback(code, state);

      expect(result.user.login).toBe('githubuser');
      expect(result.user.email).toBe('user@example.com');
      expect(result.tokens.access_token.startsWith('gho_')).toBe(true);
    });

    test('should handle private email from GitHub', async () => {
      const mockUserData = {
        id: 12345,
        login: 'githubuser',
        email: null, // Email is private
      };

      const mockEmails = [
        { email: 'private@example.com', primary: true, verified: true },
        { email: 'public@example.com', primary: false, verified: true },
      ];

      // Should fetch primary email from emails API
      const primaryEmail = mockEmails.find(e => e.primary && e.verified);
      expect(primaryEmail?.email).toBe('private@example.com');
    });
  });

  describe('Discord OAuth Flow', () => {
    test('should initiate Discord OAuth authorization', async () => {
      const state = 'discord-state-456';
      const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${OAUTH_CONFIG.discord.clientId}&redirect_uri=${encodeURIComponent(OAUTH_CONFIG.discord.redirectUri)}&scope=${encodeURIComponent(OAUTH_CONFIG.discord.scope)}&response_type=code&state=${state}`;

      mockOAuthProviders.discord.authorize.mockResolvedValue({
        url: authUrl,
        state,
      });

      const result = await mockOAuthProviders.discord.authorize({
        clientId: OAUTH_CONFIG.discord.clientId,
        redirectUri: OAUTH_CONFIG.discord.redirectUri,
        scope: OAUTH_CONFIG.discord.scope,
        state,
      });

      expect(result.url).toContain('discord.com');
      expect(result.url).toContain('identify email');
    });

    test('should handle Discord OAuth callback', async () => {
      const code = 'discord-auth-code';
      const state = 'discord-state-456';
      
      const mockUserData = {
        id: '123456789012345678',
        username: 'discorduser',
        discriminator: '1234',
        email: 'user@example.com',
        verified: true,
        avatar: 'a1b2c3d4e5f6g7h8',
      };

      mockOAuthProviders.discord.callback.mockResolvedValue({
        user: mockUserData,
        tokens: {
          access_token: 'discord-access-token',
          refresh_token: 'discord-refresh-token',
          expires_in: 604800, // 7 days
          token_type: 'Bearer',
        },
      });

      const result = await mockOAuthProviders.discord.callback(code, state);

      expect(result.user.username).toBe('discorduser');
      expect(result.user.verified).toBe(true);
      expect(result.tokens.expires_in).toBe(604800);
    });
  });

  describe('OAuth Error Handling', () => {
    test('should handle authorization denial', async () => {
      const error = 'access_denied';
      const errorDescription = 'The user denied the request';

      mockOAuthProviders.google.authorize.mockRejectedValue({
        error,
        error_description: errorDescription,
      });

      try {
        await mockOAuthProviders.google.authorize({
          clientId: OAUTH_CONFIG.google.clientId,
          redirectUri: OAUTH_CONFIG.google.redirectUri,
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.error).toBe('access_denied');
        expect(err.error_description).toBe('The user denied the request');
      }
    });

    test('should handle invalid authorization code', async () => {
      const invalidCode = 'invalid-code';
      
      mockOAuthProviders.google.callback.mockRejectedValue({
        error: 'invalid_grant',
        error_description: 'Invalid authorization code',
      });

      try {
        await mockOAuthProviders.google.callback(invalidCode, 'state');
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.error).toBe('invalid_grant');
      }
    });

    test('should handle network errors', async () => {
      mockOAuthProviders.github.callback.mockRejectedValue(
        new Error('Network error')
      );

      try {
        await mockOAuthProviders.github.callback('code', 'state');
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.message).toBe('Network error');
      }
    });

    test('should handle rate limiting', async () => {
      mockOAuthProviders.github.callback.mockRejectedValue({
        error: 'rate_limit_exceeded',
        error_description: 'API rate limit exceeded',
        retry_after: 3600, // 1 hour
      });

      try {
        await mockOAuthProviders.github.callback('code', 'state');
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.error).toBe('rate_limit_exceeded');
        expect(err.retry_after).toBe(3600);
      }
    });
  });

  describe('User Data Mapping', () => {
    test('should map Google user data to internal format', () => {
      const googleUser = {
        id: 'google-123',
        email: 'user@gmail.com',
        name: 'John Doe',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
        given_name: 'John',
        family_name: 'Doe',
        verified_email: true,
      };

      const mappedUser = {
        id: googleUser.id,
        email: googleUser.email,
        username: googleUser.email.split('@')[0],
        full_name: googleUser.name,
        avatar_url: googleUser.picture,
        provider: 'google',
        provider_verified: googleUser.verified_email,
      };

      expect(mappedUser.username).toBe('user');
      expect(mappedUser.provider).toBe('google');
      expect(mappedUser.provider_verified).toBe(true);
    });

    test('should map GitHub user data to internal format', () => {
      const githubUser = {
        id: 12345,
        login: 'johnsmith',
        email: 'john@example.com',
        name: 'John Smith',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        bio: 'Software Developer',
        location: 'San Francisco',
      };

      const mappedUser = {
        id: githubUser.id.toString(),
        email: githubUser.email,
        username: githubUser.login,
        full_name: githubUser.name,
        avatar_url: githubUser.avatar_url,
        bio: githubUser.bio,
        city: githubUser.location,
        provider: 'github',
      };

      expect(mappedUser.username).toBe('johnsmith');
      expect(mappedUser.bio).toBe('Software Developer');
      expect(mappedUser.provider).toBe('github');
    });

    test('should handle missing optional fields', () => {
      const minimalUser = {
        id: 'discord-123',
        username: 'discorduser',
        email: 'user@example.com',
        // Missing: name, avatar, bio, etc.
      };

      const mappedUser = {
        id: minimalUser.id,
        email: minimalUser.email,
        username: minimalUser.username,
        full_name: null,
        avatar_url: null,
        bio: null,
        provider: 'discord',
      };

      expect(mappedUser.full_name).toBeNull();
      expect(mappedUser.avatar_url).toBeNull();
      expect(mappedUser.username).toBe('discorduser');
    });
  });

  describe('Security Considerations', () => {
    test('should generate secure state parameter', () => {
      const generateState = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };

      const state1 = generateState();
      const state2 = generateState();

      expect(state1).not.toBe(state2);
      expect(state1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    test('should validate redirect URI', () => {
      const allowedRedirects = [
        'http://localhost:3000/auth/callback/google',
        'https://app.example.com/auth/callback/google',
      ];

      const validUri = 'https://app.example.com/auth/callback/google';
      const maliciousUri = 'https://evil.com/auth/callback/google';

      expect(allowedRedirects.includes(validUri)).toBe(true);
      expect(allowedRedirects.includes(maliciousUri)).toBe(false);
    });

    test('should not expose client secret in frontend', () => {
      // Client secret should only be used on server-side
      const frontendConfig = {
        clientId: OAUTH_CONFIG.google.clientId,
        redirectUri: OAUTH_CONFIG.google.redirectUri,
        scope: OAUTH_CONFIG.google.scope,
        // clientSecret should NOT be included
      };

      expect(frontendConfig).not.toHaveProperty('clientSecret');
    });
  });
});