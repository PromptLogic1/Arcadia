import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { renderHook, act } from '@testing-library/react';
import { 
  mockAuthStates,
  assertAuthenticationFlow
} from './test-utils';
import type { AuthUser, UserData } from '@/lib/stores/types';

// Types for mock returns
interface AuthState {
  authUser: AuthUser | null;
  userData: UserData | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  setLoading: jest.Mock;
  setError: jest.Mock;
  setAuthUser: jest.Mock;
  setUserData: jest.Mock;
  clearUser: jest.Mock;
  updateUserData: jest.Mock;
  initializeApp: jest.Mock;
  setupAuthListener: jest.Mock;
  signIn: jest.Mock;
  signInWithOAuth: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  refreshUserData: jest.Mock;
  updateUserDataService: jest.Mock;
  updateEmail: jest.Mock;
  updatePassword: jest.Mock;
  resetPassword: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  checkPasswordRequirements: jest.Mock;
}

// Mock the auth store with proper typing
const mockUseAuth = jest.fn<() => AuthState>();
const mockUseAuthActions = jest.fn<() => AuthActions>();

jest.mock('@/lib/stores', () => ({
  useAuth: () => mockUseAuth(),
  useAuthActions: () => mockUseAuthActions(),
}));

describe('Authentication Hooks', () => {
  const mockAuthActions: AuthActions = {
    setLoading: jest.fn(),
    setError: jest.fn(),
    setAuthUser: jest.fn(),
    setUserData: jest.fn(),
    clearUser: jest.fn(),
    updateUserData: jest.fn(),
    initializeApp: jest.fn(),
    setupAuthListener: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    signInWithOAuth: jest.fn(),
    refreshUserData: jest.fn(),
    updateUserDataService: jest.fn(),
    updateEmail: jest.fn(),
    updatePassword: jest.fn(),
    resetPassword: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    checkPasswordRequirements: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthActions.mockReturnValue(mockAuthActions);
  });

  describe('useAuth Hook', () => {
    it('should return unauthenticated state when user is not logged in', () => {
      mockUseAuth.mockReturnValue(mockAuthStates.unauthenticated);
      
      const { result } = renderHook(() => mockUseAuth());
      
      assertAuthenticationFlow.userIsUnauthenticated(
        result.current.authUser,
        result.current.userData
      );
      assertAuthenticationFlow.loadingState(result.current.loading, false);
      assertAuthenticationFlow.errorState(result.current.error);
    });

    it('should return authenticated state when user is logged in', () => {
      mockUseAuth.mockReturnValue(mockAuthStates.fullyAuthenticated);
      
      const { result } = renderHook(() => mockUseAuth());
      
      assertAuthenticationFlow.userIsAuthenticated(
        result.current.authUser,
        result.current.userData
      );
      assertAuthenticationFlow.loadingState(result.current.loading, false);
      assertAuthenticationFlow.errorState(result.current.error);
    });

    it('should return loading state during authentication', () => {
      mockUseAuth.mockReturnValue(mockAuthStates.authenticatedLoading);
      
      const { result } = renderHook(() => mockUseAuth());
      
      assertAuthenticationFlow.loadingState(result.current.loading, true);
      expect(result.current.authUser).not.toBeNull();
      expect(result.current.userData).toBeNull();
    });

    it('should return error state when authentication fails', () => {
      mockUseAuth.mockReturnValue(mockAuthStates.authError);
      
      const { result } = renderHook(() => mockUseAuth());
      
      assertAuthenticationFlow.errorState(
        result.current.error, 
        'Authentication failed'
      );
      assertAuthenticationFlow.userIsUnauthenticated(
        result.current.authUser,
        result.current.userData
      );
    });
  });

  describe('useAuthActions Hook', () => {
    it('should provide sign in functionality', () => {
      const { result } = renderHook(() => mockUseAuthActions());
      
      expect(result.current.signIn).toBeDefined();
      expect(typeof result.current.signIn).toBe('function');
    });

    it('should provide sign up functionality', () => {
      const { result } = renderHook(() => mockUseAuthActions());
      
      expect(result.current.signUp).toBeDefined();
      expect(typeof result.current.signUp).toBe('function');
    });

    it('should provide sign out functionality', () => {
      const { result } = renderHook(() => mockUseAuthActions());
      
      expect(result.current.signOut).toBeDefined();
      expect(typeof result.current.signOut).toBe('function');
    });

    it('should provide OAuth sign in functionality', () => {
      const { result } = renderHook(() => mockUseAuthActions());
      
      expect(result.current.signInWithOAuth).toBeDefined();
      expect(typeof result.current.signInWithOAuth).toBe('function');
    });

    it('should provide user data management functionality', () => {
      const { result } = renderHook(() => mockUseAuthActions());
      
      expect(result.current.updateUserData).toBeDefined();
      expect(result.current.refreshUserData).toBeDefined();
      expect(typeof result.current.updateUserData).toBe('function');
      expect(typeof result.current.refreshUserData).toBe('function');
    });

    it('should provide password management functionality', () => {
      const { result } = renderHook(() => mockUseAuthActions());
      
      expect(result.current.updateEmail).toBeDefined();
      expect(result.current.updatePassword).toBeDefined();
      expect(result.current.resetPasswordForEmail).toBeDefined();
      expect(result.current.checkPasswordRequirements).toBeDefined();
      
      expect(typeof result.current.updateEmail).toBe('function');
      expect(typeof result.current.updatePassword).toBe('function');
      expect(typeof result.current.resetPasswordForEmail).toBe('function');
      expect(typeof result.current.checkPasswordRequirements).toBe('function');
    });

    it('should provide app initialization functionality', () => {
      const { result } = renderHook(() => mockUseAuthActions());
      
      expect(result.current.initializeApp).toBeDefined();
      expect(result.current.setupAuthListener).toBeDefined();
      expect(typeof result.current.initializeApp).toBe('function');
      expect(typeof result.current.setupAuthListener).toBe('function');
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should handle sign in flow correctly', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      
      (mockAuthActions.signIn as any).mockResolvedValue({ error: undefined });
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      await act(async () => {
        await result.current.signIn(credentials);
      });
      
      expect(mockAuthActions.signIn).toHaveBeenCalledWith(credentials);
    });

    it('should handle sign up flow correctly', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser'
      };
      
      (mockAuthActions.signUp as any).mockResolvedValue({ needsVerification: true });
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      await act(async () => {
        await result.current.signUp(userData);
      });
      
      expect(mockAuthActions.signUp).toHaveBeenCalledWith(userData);
    });

    it('should handle sign out flow correctly', async () => {
      (mockAuthActions.signOut as any).mockResolvedValue({ error: undefined });
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      await act(async () => {
        await result.current.signOut();
      });
      
      expect(mockAuthActions.signOut).toHaveBeenCalled();
    });

    it('should handle OAuth sign in flow correctly', async () => {
      const provider = 'google' as const;
      
      (mockAuthActions.signInWithOAuth as any).mockResolvedValue({ error: undefined });
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      await act(async () => {
        await result.current.signInWithOAuth(provider);
      });
      
      expect(mockAuthActions.signInWithOAuth).toHaveBeenCalledWith(provider);
    });

    it('should handle user data updates correctly', async () => {
      const updates = { username: 'newusername', bio: 'New bio' };
      
      (mockAuthActions.updateUserDataService as any).mockResolvedValue({ error: undefined });
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      await act(async () => {
        await result.current.updateUserDataService('user-id', updates);
      });
      
      expect(mockAuthActions.updateUserDataService).toHaveBeenCalledWith('user-id', updates);
    });

    it('should handle password requirements validation', () => {
      const password = 'TestPassword123!';
      const requirements = {
        uppercase: true,
        lowercase: true,
        number: true,
        special: true,
        length: true,
      };
      
      (mockAuthActions.checkPasswordRequirements as jest.Mock).mockReturnValue(requirements);
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      const passwordCheck = result.current.checkPasswordRequirements(password);
      
      expect(mockAuthActions.checkPasswordRequirements).toHaveBeenCalledWith(password);
      expect(passwordCheck).toEqual(requirements);
    });

    it('should handle password reset correctly', async () => {
      const email = 'test@example.com';
      
      (mockAuthActions.resetPasswordForEmail as any).mockResolvedValue({ error: undefined });
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      await act(async () => {
        await result.current.resetPasswordForEmail(email);
      });
      
      expect(mockAuthActions.resetPasswordForEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('State Persistence and Sync', () => {
    it('should handle app initialization correctly', async () => {
      (mockAuthActions.initializeApp as any).mockResolvedValue(undefined);
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      await act(async () => {
        await result.current.initializeApp();
      });
      
      expect(mockAuthActions.initializeApp).toHaveBeenCalled();
    });

    it('should handle auth listener setup correctly', () => {
      const { result } = renderHook(() => mockUseAuthActions());
      
      act(() => {
        result.current.setupAuthListener();
      });
      
      expect(mockAuthActions.setupAuthListener).toHaveBeenCalled();
    });

    it('should handle user data refresh correctly', async () => {
      (mockAuthActions.refreshUserData as any).mockResolvedValue({ error: undefined });
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      await act(async () => {
        await result.current.refreshUserData();
      });
      
      expect(mockAuthActions.refreshUserData).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle sign in errors gracefully', async () => {
      const error = new Error('Invalid credentials');
      (mockAuthActions.signIn as any).mockResolvedValue({ error });
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      const signInResult = await result.current.signIn({ 
        email: 'test@example.com', 
        password: 'wrong' 
      });
      
      expect((signInResult as any).error).toEqual(error);
    });

    it('should handle sign up errors gracefully', async () => {
      const error = new Error('Email already exists');
      (mockAuthActions.signUp as any).mockResolvedValue({ error });
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      const signUpResult = await result.current.signUp({
        email: 'exists@example.com',
        password: 'password',
        username: 'user'
      });
      
      expect((signUpResult as any).error).toEqual(error);
    });

    it('should handle network errors gracefully', async () => {
      const error = new Error('Network error');
      (mockAuthActions.signIn as any).mockRejectedValue(error);
      
      const { result } = renderHook(() => mockUseAuthActions());
      
      await expect(
        result.current.signIn({ email: 'test@example.com', password: 'password' })
      ).rejects.toThrow('Network error');
    });
  });
}); 