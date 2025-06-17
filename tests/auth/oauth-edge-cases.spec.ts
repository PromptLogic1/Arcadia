import { test, expect } from '@playwright/test';
import {
  mockAuthResponse,
  waitForAuthRedirect,
  getAuthErrorMessage,
  clearAuthStorage,
  measureAuthPerformance,
  getAuthCookies
} from './utils/auth-test-helpers';
import { AUTH_ROUTES, AUTH_SELECTORS } from '../helpers/test-data.enhanced';
import type { LoginResponse, AuthErrorResponse, OAuthProvider } from './types/test-types';

/**
 * OAuth Edge Cases and Error Scenarios Testing Suite
 * 
 * Tests for:
 * - OAuth provider failures and timeouts
 * - Account linking/unlinking scenarios
 * - OAuth scope permission variations
 * - Cross-domain OAuth flows
 * - OAuth state parameter validation
 * - Provider-specific error handling
 * - Account merging conflicts
 */
test.describe('OAuth Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
    await page.goto(AUTH_ROUTES.public.login);
  });

  test.describe('OAuth Provider Failures', () => {
    test('should handle Google OAuth service unavailable', async ({ page, context }) => {
      // Mock Google OAuth service failure
      await context.route('**/auth/google**', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service temporarily unavailable',
            error_description: 'Google OAuth service is currently experiencing issues',
            provider: 'google',
          }),
        });
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        // Should show provider-specific error
        await expect(page.getByText(/google.*service.*unavailable/i)).toBeVisible();
        
        // Should suggest alternative login methods
        await expect(page.getByText(/try.*email.*password/i)).toBeVisible();
        
        // Should allow retry
        const retryButton = page.locator('[data-testid="oauth-retry-button"]');
        if (await retryButton.isVisible()) {
          await expect(retryButton).toBeEnabled();
        }
      }
    });

    test('should handle OAuth timeout scenarios', async ({ page, context }) => {
      // Mock slow OAuth response (timeout)
      await context.route('**/auth/google**', route => {
        // Delay response to simulate timeout
        setTimeout(() => {
          route.abort();
        }, 30000); // 30 second timeout
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        // Should show timeout error within reasonable time
        await expect(page.getByText(/timeout|taking.*longer.*expected/i))
          .toBeVisible({ timeout: 15000 });
        
        // Should provide action options
        await expect(page.getByText(/try again|refresh/i)).toBeVisible();
      }
    });

    test('should handle OAuth popup blocked scenarios', async ({ page }) => {
      // Mock popup blocker behavior
      await page.evaluate(() => {
        // Override window.open to simulate popup blocker
        const originalOpen = window.open;
        window.open = () => {
          return null; // Popup blocked
        };
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        // Should detect popup was blocked
        await expect(page.getByText(/popup.*blocked/i)).toBeVisible();
        
        // Should show instructions to enable popups
        await expect(page.getByText(/enable.*popups|allow.*popups/i)).toBeVisible();
        
        // Should offer alternative flow
        const redirectButton = page.locator('[data-testid="oauth-redirect-flow"]');
        if (await redirectButton.isVisible()) {
          await expect(redirectButton).toContainText('Use redirect instead');
        }
      }
    });
  });

  test.describe('OAuth Account Linking', () => {
    test('should handle linking OAuth account to existing email', async ({ page, context }) => {
      const existingEmail = 'existing@example.com';
      
      // Mock OAuth response with email that already exists
      await context.route('**/auth/google/callback**', route => {
        route.fulfill({
          status: 409, // Conflict
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'account_exists',
            error_description: 'An account with this email already exists',
            email: existingEmail,
            provider: 'google',
            suggestedAction: 'link_account',
            existingProviders: ['email'],
          }),
        });
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        // Should show account linking option
        await expect(page.getByText(/account.*already exists/i)).toBeVisible();
        await expect(page.getByText(existingEmail)).toBeVisible();
        
        // Should offer to link accounts
        const linkButton = page.locator('[data-testid="link-oauth-account"]');
        await expect(linkButton).toBeVisible();
        await expect(linkButton).toContainText('Link accounts');
        
        // Should show existing login methods
        await expect(page.getByText(/sign in.*existing.*account/i)).toBeVisible();
      }
    });

    test('should handle OAuth account unlinking', async ({ page }) => {
      // Navigate to account settings (assuming user is logged in)
      await page.goto('/settings/account');
      
      // Mock current user with linked OAuth accounts
      await page.route('/api/user/oauth-accounts', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            linkedAccounts: [
              {
                provider: 'google',
                email: 'user@gmail.com',
                linkedAt: new Date().toISOString(),
                canUnlink: true,
              },
              {
                provider: 'github',
                username: 'github_user',
                linkedAt: new Date().toISOString(),
                canUnlink: true,
              },
            ],
            hasPasswordAuth: true, // User can unlink OAuth since they have password
          }),
        });
      });

      // Should show linked accounts
      await expect(page.getByText('Google: user@gmail.com')).toBeVisible();
      await expect(page.getByText('GitHub: github_user')).toBeVisible();
      
      // Mock unlinking process
      await page.route('/api/user/unlink-oauth', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'OAuth account unlinked successfully',
          }),
        });
      });
      
      // Unlink Google account
      const unlinkGoogle = page.locator('[data-testid="unlink-google"]');
      await unlinkGoogle.click();
      
      // Should show confirmation dialog
      await expect(page.getByText(/confirm.*unlink/i)).toBeVisible();
      await page.locator('[data-testid="confirm-unlink"]').click();
      
      // Should show success message
      await expect(page.getByText('OAuth account unlinked successfully')).toBeVisible();
    });

    test('should prevent unlinking last authentication method', async ({ page }) => {
      await page.goto('/settings/account');
      
      // Mock user with only OAuth, no password
      await page.route('/api/user/oauth-accounts', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            linkedAccounts: [
              {
                provider: 'google',
                email: 'user@gmail.com',
                linkedAt: new Date().toISOString(),
                canUnlink: false, // Cannot unlink - only auth method
              },
            ],
            hasPasswordAuth: false, // No password set
          }),
        });
      });
      
      // Unlink button should be disabled or hidden
      const unlinkButton = page.locator('[data-testid="unlink-google"]');
      if (await unlinkButton.isVisible()) {
        await expect(unlinkButton).toBeDisabled();
      }
      
      // Should show warning about setting password first
      await expect(page.getByText(/set.*password.*before.*unlinking/i)).toBeVisible();
    });
  });

  test.describe('OAuth State Validation', () => {
    test('should validate OAuth state parameter', async ({ page, context }) => {
      // Mock OAuth callback with invalid state
      await context.route('**/auth/google/callback**', route => {
        const url = new URL(route.request().url());
        const state = url.searchParams.get('state');
        
        // Simulate state mismatch
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_state',
            error_description: 'OAuth state parameter is invalid or expired',
            code: 'oauth_state_mismatch',
          } satisfies AuthErrorResponse),
        });
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        // Should show security error
        await expect(page.getByText(/security.*error|invalid.*state/i)).toBeVisible();
        
        // Should suggest starting over
        await expect(page.getByText(/try.*again|start.*over/i)).toBeVisible();
        
        // Should clear any existing auth state
        const { sessionCookie } = await getAuthCookies(context);
        expect(sessionCookie).toBeUndefined();
      }
    });

    test('should handle CSRF token mismatch in OAuth flow', async ({ page, context }) => {
      await context.route('**/auth/google/callback**', route => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'csrf_token_mismatch',
            error_description: 'CSRF token validation failed',
            code: 'oauth_csrf_error',
          } satisfies AuthErrorResponse),
        });
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        await expect(page.getByText(/security.*error|csrf/i)).toBeVisible();
        await expect(page.getByText(/refresh.*page|try.*again/i)).toBeVisible();
      }
    });
  });

  test.describe('Provider-Specific Errors', () => {
    test('should handle Google OAuth specific errors', async ({ page, context }) => {
      const googleErrors = [
        {
          error: 'access_denied',
          description: 'User denied permission',
          expectedMessage: /permission.*denied|cancelled/i,
        },
        {
          error: 'invalid_scope',
          description: 'Requested scope is invalid',
          expectedMessage: /permission.*scope.*invalid/i,
        },
        {
          error: 'temporarily_unavailable',
          description: 'Google service temporarily unavailable',
          expectedMessage: /google.*temporarily.*unavailable/i,
        },
      ];

      for (const { error, description, expectedMessage } of googleErrors) {
        await page.reload();
        
        await context.route('**/auth/google**', route => {
          const url = new URL(route.request().url());
          url.searchParams.set('error', error);
          url.searchParams.set('error_description', description);
          
          route.fulfill({
            status: 302,
            headers: {
              'Location': `/auth/login?${url.searchParams.toString()}`,
            },
          });
        });

        const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
        
        if (await googleButton.isVisible()) {
          await googleButton.click();
          
          // Should show appropriate error message
          await expect(page.getByText(expectedMessage)).toBeVisible();
        }
      }
    });

    test('should handle GitHub OAuth specific errors', async ({ page, context }) => {
      const githubButton = page.locator(AUTH_SELECTORS.buttons.githubOAuth);
      
      if (await githubButton.isVisible()) {
        await context.route('**/auth/github**', route => {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'unauthorized_client',
              error_description: 'GitHub application is not authorized',
              provider: 'github',
            }),
          });
        });

        await githubButton.click();
        
        await expect(page.getByText(/github.*application.*not.*authorized/i)).toBeVisible();
      }
    });
  });

  test.describe('OAuth Scope and Permissions', () => {
    test('should handle insufficient OAuth permissions', async ({ page, context }) => {
      await context.route('**/auth/google/callback**', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'insufficient_permissions',
            error_description: 'Required permissions were not granted',
            requiredScopes: ['email', 'profile'],
            grantedScopes: ['profile'],
            missingScopes: ['email'],
          }),
        });
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        await expect(page.getByText(/email.*permission.*required/i)).toBeVisible();
        
        // Should show option to retry with correct permissions
        const retryButton = page.locator('[data-testid="oauth-retry-permissions"]');
        if (await retryButton.isVisible()) {
          await expect(retryButton).toContainText('Grant required permissions');
        }
      }
    });

    test('should handle OAuth permission revocation', async ({ page }) => {
      // Simulate user revoking permissions after initial auth
      await page.goto('/settings/account');
      
      await page.route('/api/user/oauth-status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            google: {
              connected: true,
              permissionsRevoked: true,
              lastChecked: new Date().toISOString(),
            },
          }),
        });
      });
      
      // Should show warning about revoked permissions
      await expect(page.getByText(/google.*permissions.*revoked/i)).toBeVisible();
      
      // Should offer to re-authorize
      const reauthorizeButton = page.locator('[data-testid="reauthorize-google"]');
      await expect(reauthorizeButton).toBeVisible();
    });
  });

  test.describe('Account Merging Conflicts', () => {
    test('should handle conflicting user data during OAuth merge', async ({ page, context }) => {
      await context.route('**/auth/google/callback**', route => {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'profile_conflict',
            error_description: 'OAuth profile conflicts with existing account data',
            conflicts: {
              username: {
                existing: 'john_doe',
                oauth: 'johndoe',
              },
              fullName: {
                existing: 'John Doe',
                oauth: 'John D.',
              },
            },
            resolutionRequired: true,
          }),
        });
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        // Should show conflict resolution interface
        await expect(page.getByText(/profile.*conflicts/i)).toBeVisible();
        await expect(page.getByText('john_doe')).toBeVisible();
        await expect(page.getByText('johndoe')).toBeVisible();
        
        // Should allow user to choose which data to keep
        const keepExistingButton = page.locator('[data-testid="keep-existing-data"]');
        const useOAuthButton = page.locator('[data-testid="use-oauth-data"]');
        
        await expect(keepExistingButton).toBeVisible();
        await expect(useOAuthButton).toBeVisible();
      }
    });

    test('should handle email conflicts during OAuth signup', async ({ page, context }) => {
      await context.route('**/auth/google/callback**', route => {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'email_conflict',
            error_description: 'Email address is already associated with a different account',
            conflictingEmail: 'user@example.com',
            existingProviders: ['email_password'],
            suggestedActions: ['link_accounts', 'use_different_email'],
          }),
        });
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        await expect(page.getByText(/email.*already.*associated/i)).toBeVisible();
        await expect(page.getByText('user@example.com')).toBeVisible();
        
        // Should show resolution options
        const linkAccountsButton = page.locator('[data-testid="link-accounts-option"]');
        const signInButton = page.locator('[data-testid="sign-in-existing"]');
        
        await expect(linkAccountsButton).toBeVisible();
        await expect(signInButton).toBeVisible();
      }
    });
  });

  test.describe('Cross-Domain OAuth Flows', () => {
    test('should handle OAuth callbacks from different domains', async ({ page, context }) => {
      // Mock OAuth callback coming from oauth provider domain
      await context.route('https://accounts.google.com/oauth/**', route => {
        // Simulate cross-domain callback
        route.fulfill({
          status: 302,
          headers: {
            'Location': `${page.url()}/auth/google/callback?code=test_code&state=test_state`,
          },
        });
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        // Should handle cross-domain navigation properly
        await googleButton.click();
        
        // Should return to original domain after OAuth flow
        await page.waitForURL(/localhost|127\.0\.0\.1/, { timeout: 10000 });
      }
    });

    test('should handle OAuth in iframe/popup scenarios', async ({ page }) => {
      // Test OAuth in popup window
      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        // Mock popup OAuth flow
        await page.evaluate(() => {
          // Override button click to open popup
          const button = document.querySelector('[data-testid="auth-google-button"]');
          if (button) {
            button.addEventListener('click', (e) => {
              e.preventDefault();
              const popup = window.open('/auth/google/popup', 'oauth', 'width=500,height=600');
              
              // Simulate successful popup OAuth
              setTimeout(() => {
                if (popup) {
                  popup.postMessage({
                    type: 'oauth_success',
                    data: {
                      access_token: 'popup_access_token',
                      user: { id: 'popup_user', email: 'popup@example.com' },
                    },
                  }, window.location.origin);
                  popup.close();
                }
              }, 1000);
            });
          }
        });

        await googleButton.click();
        
        // Should handle popup message and authenticate
        await page.waitForFunction(() => {
          return window.localStorage.getItem('auth_token') !== null;
        });
      }
    });
  });

  test.describe('Performance and Monitoring', () => {
    test('should complete OAuth flow within acceptable time', async ({ page, context }) => {
      const oauthTime = await measureAuthPerformance(page, async () => {
        // Mock fast OAuth response
        await mockAuthResponse<LoginResponse>(page, '**/auth/google/callback**', {
          status: 200,
          body: {
            user: {
              id: 'oauth-perf-user',
              email: 'perf@example.com',
              username: 'perfuser',
              full_name: 'Performance User',
              auth_id: 'oauth-perf-auth',
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: null,
              bio: null,
              city: null,
              land: null,
              region: null,
              experience_points: 0,
              last_login_at: new Date().toISOString(),
              profile_visibility: 'public',
              achievements_visibility: 'public',
              submissions_visibility: 'public',
            },
            session: {
              id: 'oauth-perf-session',
              user_id: 'oauth-perf-user',
              session_token: 'oauth-perf-token',
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              last_activity: new Date().toISOString(),
              device_info: {},
              ip_address: '127.0.0.1',
            },
            access_token: 'oauth-perf-access',
            refresh_token: 'oauth-perf-refresh',
          },
        });

        const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
        
        if (await googleButton.isVisible()) {
          await googleButton.click();
          await waitForAuthRedirect(page, /(dashboard|home|\/)/, { timeout: 10000 });
        }
      });
      
      // OAuth flow should complete within 5 seconds
      expect(oauthTime).toBeLessThan(5000);
    });

    test('should track OAuth conversion funnel', async ({ page, context }) => {
      let funnelEvents: string[] = [];
      
      // Mock analytics tracking
      await page.route('/api/analytics/track', route => {
        const body = route.request().postDataJSON();
        funnelEvents.push(body.event);
        route.fulfill({ status: 200, body: '{}' });
      });

      const googleButton = page.locator(AUTH_SELECTORS.buttons.googleOAuth);
      
      if (await googleButton.isVisible()) {
        await googleButton.click();
        
        // Mock successful OAuth
        await mockAuthResponse<LoginResponse>(page, '**/auth/google/callback**', {
          status: 200,
          body: {
            user: {
              id: 'funnel-user',
              email: 'funnel@example.com',
              username: 'funneluser',
              full_name: 'Funnel User',
              auth_id: 'funnel-auth',
              role: 'user',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: null,
              bio: null,
              city: null,
              land: null,
              region: null,
              experience_points: 0,
              last_login_at: new Date().toISOString(),
              profile_visibility: 'public',
              achievements_visibility: 'public',
              submissions_visibility: 'public',
            },
            session: {
              id: 'funnel-session',
              user_id: 'funnel-user',
              session_token: 'funnel-token',
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              last_activity: new Date().toISOString(),
              device_info: {},
              ip_address: '127.0.0.1',
            },
            access_token: 'funnel-access',
            refresh_token: 'funnel-refresh',
          },
        });
        
        await waitForAuthRedirect(page, /(dashboard|home|\/)/, { timeout: 10000 });
        
        // Should track conversion events
        expect(funnelEvents).toContain('oauth_started');
        expect(funnelEvents).toContain('oauth_completed');
      }
    });
  });
});