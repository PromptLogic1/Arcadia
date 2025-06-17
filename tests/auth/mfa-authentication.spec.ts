import { test, expect } from '@playwright/test';
import {
  fillAuthForm,
  mockAuthResponse,
  waitForAuthRedirect,
  getAuthErrorMessage,
  getAuthStoreState,
  clearAuthStorage,
  measureAuthPerformance,
  waitForNetworkIdle
} from './utils/auth-test-helpers';
import { TOTPSimulator, TOTPTestFactory, MFAMockProvider } from './utils/totp-simulator';
import { TEST_FORM_DATA, AUTH_ROUTES, AUTH_SELECTORS } from '../helpers/test-data.enhanced';
import type { LoginResponse, AuthErrorResponse } from './types/test-types';

/**
 * Multi-Factor Authentication (MFA) Testing Suite
 * 
 * Tests for:
 * - TOTP (Time-based One-Time Password) setup and verification
 * - SMS-based MFA flows
 * - Backup codes generation and usage
 * - MFA bypass scenarios
 * - MFA enforcement policies
 * - Recovery flows when MFA device is lost
 */
test.describe('MFA Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
    await page.goto(AUTH_ROUTES.public.login);
  });

  test.describe('TOTP Setup and Verification', () => {
    let totpSimulator: TOTPSimulator;
    let mfaProvider: MFAMockProvider;

    test.beforeEach(() => {
      totpSimulator = TOTPTestFactory.createDefault();
      mfaProvider = new MFAMockProvider();
    });

    test('should allow user to set up TOTP authentication', async ({ page }) => {
      // Mock successful initial login
      await mockAuthResponse<LoginResponse>(page, AUTH_ROUTES.api.login, {
        status: 200,
        body: {
          user: {
            id: 'user-id',
            email: 'user@example.com',
            username: 'testuser',
            full_name: 'Test User',
            auth_id: 'auth-id',
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
            id: 'session-id',
            user_id: 'user-id',
            session_token: 'temp-session',
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            device_info: {},
            ip_address: '127.0.0.1',
          },
          access_token: 'temp-access-token',
          refresh_token: 'temp-refresh-token',
        },
      });

      // Mock MFA setup endpoint with real TOTP secret
      const totpSecret = TOTPSimulator.generateTestSecret();
      const setupSimulator = new TOTPSimulator({ secret: totpSecret });
      
      await page.route('/api/auth/mfa/setup', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            secret: totpSecret,
            qrCode: setupSimulator.getQRCodeData('test@example.com'),
            backupCodes: [
              '12345678',
              '87654321',
              '24681357',
              '13579246',
              '97531864'
            ]
          }),
        });
      });

      // Login first
      await fillAuthForm(page, TEST_FORM_DATA.login.valid);
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      
      // Expect redirect to MFA setup (since user doesn't have MFA enabled)
      await page.waitForURL('/auth/mfa/setup', { timeout: 10000 });

      // Verify MFA setup page elements
      await expect(page.getByText('Set up Two-Factor Authentication')).toBeVisible();
      await expect(page.getByText('Scan this QR code')).toBeVisible();
      
      // Verify QR code is displayed
      const qrCode = page.locator('[data-testid="mfa-qr-code"]');
      await expect(qrCode).toBeVisible();
      
      // Verify backup codes are shown
      const backupCodes = page.locator('[data-testid="backup-codes"]');
      await expect(backupCodes).toBeVisible();
      
      // Generate and enter a valid TOTP code
      const validCode = setupSimulator.generateCurrentCode();
      const totpInput = page.locator('[data-testid="totp-code-input"]');
      await totpInput.fill(validCode);
      
      // Mock verification with real TOTP validation
      await page.route('/api/auth/mfa/verify-setup', async (route) => {
        const body = await route.request().postDataJSON();
        const isValidCode = setupSimulator.verifyCode(body.code);
        
        if (isValidCode) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Invalid verification code',
              code: 'invalid_totp_code',
              statusCode: 400 
            }),
          });
        }
      });
      
      await page.locator('[data-testid="verify-totp-button"]').click();
      
      // Should redirect to dashboard after successful setup
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      
      // Verify MFA is now enabled
      await page.goto('/settings/security');
      await expect(page.getByText('Two-Factor Authentication: Enabled')).toBeVisible();
    });

    test('should validate TOTP codes with time tolerance', async ({ page }) => {
      const testSimulator = TOTPTestFactory.createRandom();
      
      // Navigate to MFA verification (simulating login flow)
      await page.goto('/auth/mfa/verify');
      
      // Mock MFA verification endpoint
      await page.route('/api/auth/mfa/verify', async (route) => {
        const body = await route.request().postDataJSON();
        const isValid = testSimulator.verifyCode(body.code, 1); // 1 step tolerance
        
        await route.fulfill({
          status: isValid ? 200 : 400,
          contentType: 'application/json',
          body: JSON.stringify(
            isValid 
              ? { success: true, user: { id: 'user-id', email: 'test@example.com' } }
              : { error: 'Invalid MFA code', code: 'invalid_mfa_code', statusCode: 400 }
          ),
        });
      });

      // Test current valid code
      const currentCode = testSimulator.generateCurrentCode();
      await page.locator('[data-testid="mfa-code-input"]').fill(currentCode);
      await page.locator('[data-testid="verify-mfa-button"]').click();
      
      await waitForNetworkIdle(page);
      
      // Should succeed
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toBeFalsy();
      
      // Test expired code (should fail)
      await page.goto('/auth/mfa/verify');
      const expiredCodes = testSimulator.generateExpiredCodes(1);
      await page.locator('[data-testid="mfa-code-input"]').fill(expiredCodes[0]);
      await page.locator('[data-testid="verify-mfa-button"]').click();
      
      await waitForNetworkIdle(page);
      
      // Should show error
      const expiredError = await getAuthErrorMessage(page);
      expect(expiredError).toContain('Invalid MFA code');
    });

    test('should handle TOTP code reuse prevention', async ({ page }) => {
      const testSimulator = TOTPTestFactory.createRandom();
      const validCode = testSimulator.generateCurrentCode();
      
      // Mock endpoint that tracks used codes
      const usedCodes = new Set<string>();
      
      await page.route('/api/auth/mfa/verify', async (route) => {
        const body = await route.request().postDataJSON();
        const code = body.code;
        
        if (usedCodes.has(code)) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Code already used',
              code: 'code_reused',
              statusCode: 400
            }),
          });
          return;
        }
        
        const isValid = testSimulator.verifyCode(code);
        if (isValid) {
          usedCodes.add(code);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid code',
              code: 'invalid_code',
              statusCode: 400
            }),
          });
        }
      });

      await page.goto('/auth/mfa/verify');
      
      // First use - should succeed
      await page.locator('[data-testid="mfa-code-input"]').fill(validCode);
      await page.locator('[data-testid="verify-mfa-button"]').click();
      await waitForNetworkIdle(page);
      
      // Verify success
      let errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toBeFalsy();
      
      // Second use of same code - should fail
      await page.goto('/auth/mfa/verify');
      await page.locator('[data-testid="mfa-code-input"]').fill(validCode);
      await page.locator('[data-testid="verify-mfa-button"]').click();
      await waitForNetworkIdle(page);
      
      // Should show reuse error
      errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toContain('already used');
    });

    test('should require TOTP code for login when MFA is enabled', async ({ page }) => {
      // Mock login response that requires MFA
      await page.route(AUTH_ROUTES.api.login, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            requiresMfa: true,
            tempToken: 'temp-mfa-token',
            user: {
              id: 'mfa-user-id',
              email: 'mfa@example.com',
            }
          }),
        });
      });

      // Initial login
      await fillAuthForm(page, {
        email: 'mfa@example.com',
        password: 'Password123!',
      });
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      
      // Should redirect to MFA verification page
      await page.waitForURL('/auth/mfa/verify', { timeout: 10000 });
      
      // Verify MFA verification page
      await expect(page.getByText('Enter your authentication code')).toBeVisible();
      const totpInput = page.locator('[data-testid="mfa-totp-input"]');
      await expect(totpInput).toBeVisible();
      
      // Mock successful MFA verification
      await page.route('/api/auth/mfa/verify', async (route) => {
        const body = await route.request().postDataJSON();
        if (body.code === '123456') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: {
                id: 'mfa-user-id',
                email: 'mfa@example.com',
                username: 'mfauser',
                full_name: 'MFA User',
                auth_id: 'mfa-auth-id',
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
                id: 'mfa-session-id',
                user_id: 'mfa-user-id',
                session_token: 'mfa-session-token',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                device_info: {},
                ip_address: '127.0.0.1',
              },
              access_token: 'mfa-access-token',
              refresh_token: 'mfa-refresh-token',
            } satisfies LoginResponse),
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid authentication code',
              code: 'invalid_mfa_code',
              statusCode: 400,
            } satisfies AuthErrorResponse),
          });
        }
      });
      
      // Enter correct TOTP code
      await totpInput.fill('123456');
      await page.locator('[data-testid="mfa-verify-button"]').click();
      
      // Should redirect to dashboard
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      
      // Verify successful authentication
      const userMenu = page.locator(AUTH_SELECTORS.ui.userMenu);
      await expect(userMenu).toBeVisible();
    });

    test('should handle invalid TOTP codes gracefully', async ({ page }) => {
      // Setup MFA verification page
      await page.goto('/auth/mfa/verify');
      
      // Mock invalid TOTP verification
      await mockAuthResponse<AuthErrorResponse>(page, '/api/auth/mfa/verify', {
        status: 400,
        body: {
          error: 'Invalid authentication code',
          code: 'invalid_mfa_code',
          statusCode: 400,
        },
      });
      
      const totpInput = page.locator('[data-testid="mfa-totp-input"]');
      await totpInput.fill('invalid');
      await page.locator('[data-testid="mfa-verify-button"]').click();
      
      // Should show error message
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toContain('Invalid authentication code');
      
      // Input should be cleared for retry
      await expect(totpInput).toHaveValue('');
    });
  });

  test.describe('Backup Codes', () => {
    test('should allow login with backup codes when TOTP is unavailable', async ({ page }) => {
      // Navigate to MFA verification
      await page.goto('/auth/mfa/verify');
      
      // Click "Use backup code" link
      await page.locator('[data-testid="use-backup-code-link"]').click();
      
      // Verify backup code input is shown
      const backupCodeInput = page.locator('[data-testid="backup-code-input"]');
      await expect(backupCodeInput).toBeVisible();
      
      // Mock successful backup code verification
      await page.route('/api/auth/mfa/verify-backup', async (route) => {
        const body = await route.request().postDataJSON();
        const validBackupCodes = ['12345678', '87654321', '24681357'];
        
        if (validBackupCodes.includes(body.backupCode)) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user: {
                id: 'backup-user-id',
                email: 'backup@example.com',
                username: 'backupuser',
                full_name: 'Backup User',
                auth_id: 'backup-auth-id',
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
                id: 'backup-session-id',
                user_id: 'backup-user-id',
                session_token: 'backup-session-token',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                device_info: {},
                ip_address: '127.0.0.1',
              },
              access_token: 'backup-access-token',
              refresh_token: 'backup-refresh-token',
              usedBackupCode: body.backupCode,
            } satisfies LoginResponse),
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid backup code',
              code: 'invalid_backup_code',
              statusCode: 400,
            } satisfies AuthErrorResponse),
          });
        }
      });
      
      // Enter valid backup code
      await backupCodeInput.fill('12345678');
      await page.locator('[data-testid="verify-backup-code-button"]').click();
      
      // Should redirect to dashboard
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      
      // Should show warning about backup code usage
      await expect(page.getByText(/backup code.*used.*generate new/i)).toBeVisible();
    });

    test('should invalidate used backup codes', async ({ page }) => {
      await page.goto('/auth/mfa/verify');
      await page.locator('[data-testid="use-backup-code-link"]').click();
      
      // Mock backup code that was already used
      await mockAuthResponse<AuthErrorResponse>(page, '/api/auth/mfa/verify-backup', {
        status: 400,
        body: {
          error: 'This backup code has already been used',
          code: 'backup_code_used',
          statusCode: 400,
        },
      });
      
      const backupCodeInput = page.locator('[data-testid="backup-code-input"]');
      await backupCodeInput.fill('12345678');
      await page.locator('[data-testid="verify-backup-code-button"]').click();
      
      const errorMessage = await getAuthErrorMessage(page);
      expect(errorMessage).toContain('already been used');
    });
  });

  test.describe('MFA Recovery', () => {
    test('should provide recovery options when MFA device is lost', async ({ page }) => {
      await page.goto('/auth/mfa/verify');
      
      // Click recovery link
      await page.locator('[data-testid="mfa-recovery-link"]').click();
      
      // Should redirect to recovery page
      await page.waitForURL('/auth/mfa/recovery', { timeout: 5000 });
      
      // Verify recovery options are available
      await expect(page.getByText('Lost access to your authenticator')).toBeVisible();
      await expect(page.getByText('Use backup code')).toBeVisible();
      await expect(page.getByText('Contact support')).toBeVisible();
      
      // Mock support contact form submission
      await page.route('/api/auth/mfa/recovery-request', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Recovery request submitted. Check your email for further instructions.',
          }),
        });
      });
      
      // Fill recovery form
      await page.locator('[data-testid="recovery-email-input"]').fill('user@example.com');
      await page.locator('[data-testid="recovery-reason-textarea"]').fill('Lost my phone');
      await page.locator('[data-testid="submit-recovery-request"]').click();
      
      // Should show success message
      await expect(page.getByText('Recovery request submitted')).toBeVisible();
    });
  });

  test.describe('MFA Bypass for Admins', () => {
    test('should allow admin bypass of MFA in emergency', async ({ page }) => {
      // Mock admin login requiring MFA
      await page.route(AUTH_ROUTES.api.login, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            requiresMfa: true,
            tempToken: 'admin-temp-token',
            user: {
              id: 'admin-user-id',
              email: 'admin@example.com',
              role: 'admin',
            },
            adminBypassAvailable: true,
          }),
        });
      });

      await fillAuthForm(page, {
        email: 'admin@example.com',
        password: 'AdminPassword123!',
      });
      await page.locator(AUTH_SELECTORS.buttons.submit).click();
      
      // Should show MFA page with bypass option
      await page.waitForURL('/auth/mfa/verify', { timeout: 10000 });
      
      // Verify admin bypass option is visible
      const bypassButton = page.locator('[data-testid="admin-mfa-bypass"]');
      await expect(bypassButton).toBeVisible();
      await expect(bypassButton).toContainText('Emergency Admin Bypass');
      
      // Mock bypass confirmation
      await page.route('/api/auth/mfa/admin-bypass', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'admin-user-id',
              email: 'admin@example.com',
              username: 'admin',
              full_name: 'Admin User',
              auth_id: 'admin-auth-id',
              role: 'admin',
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
              id: 'admin-bypass-session',
              user_id: 'admin-user-id',
              session_token: 'admin-bypass-token',
              expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // Shorter session for bypass
              created_at: new Date().toISOString(),
              last_activity: new Date().toISOString(),
              device_info: {},
              ip_address: '127.0.0.1',
            },
            access_token: 'admin-bypass-access',
            refresh_token: 'admin-bypass-refresh',
            bypassUsed: true,
          } satisfies LoginResponse),
        });
      });
      
      await bypassButton.click();
      
      // Should redirect to dashboard with warning
      await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      
      // Should show security warning about bypass usage
      await expect(page.getByText(/emergency bypass.*security risk/i)).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should complete MFA verification within acceptable time', async ({ page }) => {
      await page.goto('/auth/mfa/verify');
      
      const verificationTime = await measureAuthPerformance(page, async () => {
        await mockAuthResponse<LoginResponse>(page, '/api/auth/mfa/verify', {
          status: 200,
          body: {
            user: {
              id: 'perf-user-id',
              email: 'perf@example.com',
              username: 'perfuser',
              full_name: 'Performance User',
              auth_id: 'perf-auth-id',
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
              id: 'perf-session-id',
              user_id: 'perf-user-id',
              session_token: 'perf-session-token',
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              last_activity: new Date().toISOString(),
              device_info: {},
              ip_address: '127.0.0.1',
            },
            access_token: 'perf-access-token',
            refresh_token: 'perf-refresh-token',
          },
        });
        
        const totpInput = page.locator('[data-testid="mfa-totp-input"]');
        await totpInput.fill('123456');
        await page.locator('[data-testid="mfa-verify-button"]').click();
        await page.waitForURL(/(dashboard|home|\/)/, { timeout: 10000 });
      });
      
      // MFA verification should complete within 2 seconds
      expect(verificationTime).toBeLessThan(2000);
    });
  });
});