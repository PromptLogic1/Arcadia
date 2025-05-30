import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createMockUser,
  createMockAuthUser,
  createMockUserData,
  mockSupabaseResponse,
  setupIntegrationTest,
  authFlowScenarios,
  passwordTestCases,
  assertAuthenticationFlow,
  mockAuthStates,
} from './test-utils';

// Set up global mock for integration tests
beforeEach(() => {
  setupIntegrationTest.resetMocks();
  jest.clearAllMocks();
});

describe('Authentication Store - Data Contracts', () => {
  describe('Mock Data Factories', () => {
    it('should create valid mock User following Supabase User contract', () => {
      const user = createMockUser();

      // Verify required Supabase User fields
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('aud');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');
      expect(user).toHaveProperty('app_metadata');
      expect(user).toHaveProperty('user_metadata');

      // Verify data types match contract
      expect(typeof user.id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.aud).toBe('string');
      expect(typeof user.role).toBe('string');
      expect(user.app_metadata).toHaveProperty('provider');
      expect(user.user_metadata).toHaveProperty('username');
    });

    it('should create valid mock AuthUser following internal contract', () => {
      const authUser = createMockAuthUser();

      // Verify required AuthUser fields
      expect(authUser).toHaveProperty('id');
      expect(authUser).toHaveProperty('email');
      expect(authUser).toHaveProperty('auth_username');
      expect(authUser).toHaveProperty('provider');
      expect(authUser).toHaveProperty('userRole');

      // Verify data types
      expect(typeof authUser.id).toBe('string');
      expect(typeof authUser.email).toBe('string');
      expect(typeof authUser.auth_username).toBe('string');
      expect(typeof authUser.provider).toBe('string');
      expect(typeof authUser.userRole).toBe('string');
    });

    it('should create valid mock UserData following database contract', () => {
      const userData = createMockUserData();

      // Verify required UserData fields from database schema
      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('auth_id');
      expect(userData).toHaveProperty('username');
      expect(userData).toHaveProperty('role');
      expect(userData).toHaveProperty('experience_points');
      expect(userData).toHaveProperty('created_at');
      expect(userData).toHaveProperty('updated_at');

      // Verify visibility settings
      expect(userData).toHaveProperty('achievements_visibility');
      expect(userData).toHaveProperty('profile_visibility');
      expect(userData).toHaveProperty('submissions_visibility');

      // Verify data types
      expect(typeof userData.id).toBe('string');
      expect(typeof userData.auth_id).toBe('string');
      expect(typeof userData.username).toBe('string');
      expect(typeof userData.experience_points).toBe('number');
    });

    it('should allow partial overrides while maintaining contract', () => {
      const customUser = createMockUser({
        email: 'custom@test.com',
        user_metadata: { username: 'custom_user' },
      });

      expect(customUser.email).toBe('custom@test.com');
      expect(customUser.user_metadata.username).toBe('custom_user');
      // Other fields should remain from default
      expect(customUser.id).toBe('test-user-id');
      expect(customUser.aud).toBe('authenticated');
    });
  });

  describe('Authentication State Validation', () => {
    it('should validate unauthenticated state contract', () => {
      const state = mockAuthStates.unauthenticated;

      assertAuthenticationFlow.userIsUnauthenticated(
        state.authUser,
        state.userData
      );
      assertAuthenticationFlow.loadingState(state.loading, false);
      assertAuthenticationFlow.errorState(state.error);
    });

    it('should validate authenticated state contract', () => {
      const state = mockAuthStates.fullyAuthenticated;

      assertAuthenticationFlow.userIsAuthenticated(
        state.authUser,
        state.userData
      );
      assertAuthenticationFlow.loadingState(state.loading, false);
      assertAuthenticationFlow.errorState(state.error);
    });

    it('should validate loading state contract', () => {
      const state = mockAuthStates.authenticatedLoading;

      assertAuthenticationFlow.loadingState(state.loading, true);
      expect(state.userData).toBeNull();
      expect(state.authUser).not.toBeNull();
    });

    it('should validate error state contract', () => {
      const state = mockAuthStates.authError;

      assertAuthenticationFlow.errorState(state.error, 'Authentication failed');
      assertAuthenticationFlow.userIsUnauthenticated(
        state.authUser,
        state.userData
      );
    });
  });
});

describe('Authentication Flow - Pure Logic Tests', () => {
  describe('Password Validation Requirements', () => {
    it('should define weak password validation criteria', () => {
      const { password, expected } = passwordTestCases.weak;

      expect(password).toBe('weak');
      expect(expected.uppercase).toBe(false);
      expect(expected.lowercase).toBe(true);
      expect(expected.number).toBe(false);
      expect(expected.special).toBe(false);
      expect(expected.length).toBe(false);
    });

    it('should define strong password validation criteria', () => {
      const { password, expected } = passwordTestCases.strong;

      expect(password).toBe('StrongPass123!');
      expect(expected.uppercase).toBe(true);
      expect(expected.lowercase).toBe(true);
      expect(expected.number).toBe(true);
      expect(expected.special).toBe(true);
      expect(expected.length).toBe(true);
    });

    it('should define partially strong password validation criteria', () => {
      const { password, expected } = passwordTestCases.noSpecial;

      expect(password).toBe('StrongPass123');
      expect(expected.uppercase).toBe(true);
      expect(expected.lowercase).toBe(true);
      expect(expected.number).toBe(true);
      expect(expected.special).toBe(false); // Missing special character
      expect(expected.length).toBe(true);
    });
  });

  describe('Authentication Flow Scenarios', () => {
    it('should define sign in success scenario', () => {
      const scenario = authFlowScenarios.signIn.success;

      expect(scenario.input.email).toBe('test@example.com');
      expect(scenario.input.password).toBe('password123');
      expect(scenario.expectedCalls).toContain('signIn');
      expect(scenario.expectedCalls).toContain('initializeApp');
      expect(scenario.expectedResult.error).toBeUndefined();
    });

    it('should define sign in failure scenarios', () => {
      const invalidCredentials = authFlowScenarios.signIn.invalidCredentials;
      const networkError = authFlowScenarios.signIn.networkError;

      expect(invalidCredentials.expectedResult.error).toEqual(
        new Error('Invalid login credentials')
      );
      expect(networkError.expectedResult.error).toEqual(
        new Error('Network error')
      );
    });

    it('should define sign up scenarios', () => {
      const success = authFlowScenarios.signUp.success;
      const emailExists = authFlowScenarios.signUp.emailExists;

      expect(success.input.username).toBe('newuser');
      expect(success.expectedResult.needsVerification).toBe(true);
      expect(emailExists.expectedResult.error).toEqual(
        new Error('Account with this email already exists')
      );
    });

    it('should define sign out scenario', () => {
      const scenario = authFlowScenarios.signOut.success;

      expect(scenario.expectedCalls).toContain('signOut');
      expect(scenario.expectedCalls).toContain('clearUser');
      expect(scenario.expectedResult.error).toBeUndefined();
    });
  });
});

describe('Supabase Response Utilities', () => {
  describe('Response Builders', () => {
    it('should create success response with data', () => {
      const testData = { id: '123', name: 'test' };
      const response = mockSupabaseResponse.success(testData);

      expect(response.data).toEqual(testData);
      expect(response.error).toBeNull();
    });

    it('should create error response with message', () => {
      const errorMessage = 'Test error';
      const response = mockSupabaseResponse.error(errorMessage);

      expect(response.data).toBeNull();
      expect(response.error.message).toBe(errorMessage);
    });

    it('should create auth success response', () => {
      const user = createMockUser();
      const response = mockSupabaseResponse.authSuccess(user);

      expect(response.data.user).toEqual(user);
      expect(response.data.session.user).toEqual(user);
      expect(response.data.session.access_token).toBe('test-token');
      expect(response.error).toBeNull();
    });

    it('should create auth error response', () => {
      const errorMessage = 'Authentication failed';
      const response = mockSupabaseResponse.authError(errorMessage);

      expect(response.data.user).toBeNull();
      expect(response.data.session).toBeNull();
      expect(response.error.message).toBe(errorMessage);
    });
  });
});

describe('Integration Test Setup Utilities', () => {
  describe('Setup Helpers', () => {
    it('should provide setup for successful auth', () => {
      expect(setupIntegrationTest.mockSuccessfulAuth).toBeDefined();
      expect(typeof setupIntegrationTest.mockSuccessfulAuth).toBe('function');
    });

    it('should provide setup for failed auth', () => {
      expect(setupIntegrationTest.mockFailedAuth).toBeDefined();
      expect(typeof setupIntegrationTest.mockFailedAuth).toBe('function');
    });

    it('should provide reset functionality', () => {
      expect(setupIntegrationTest.resetMocks).toBeDefined();
      expect(typeof setupIntegrationTest.resetMocks).toBe('function');
    });
  });
});

describe('Authentication Assertion Helpers', () => {
  describe('Flow Assertions', () => {
    it('should assert authenticated user correctly', () => {
      const authUser = createMockAuthUser();
      const userData = createMockUserData();

      expect(() => {
        assertAuthenticationFlow.userIsAuthenticated(authUser, userData);
      }).not.toThrow();
    });

    it('should assert unauthenticated user correctly', () => {
      expect(() => {
        assertAuthenticationFlow.userIsUnauthenticated(null, null);
      }).not.toThrow();
    });

    it('should assert loading state correctly', () => {
      expect(() => {
        assertAuthenticationFlow.loadingState(true, true);
      }).not.toThrow();

      expect(() => {
        assertAuthenticationFlow.loadingState(false, false);
      }).not.toThrow();
    });

    it('should assert error state correctly', () => {
      expect(() => {
        assertAuthenticationFlow.errorState(null);
      }).not.toThrow();

      expect(() => {
        assertAuthenticationFlow.errorState('error', 'error');
      }).not.toThrow();
    });
  });
});
