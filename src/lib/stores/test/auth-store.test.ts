import { renderHook, act } from '@testing-library/react';
import { 
  useAuthStore,
  useAuth,
  useAuthActions,
  useAuthLoading,
  useAuthUser,
  useIsAuthenticated,
  useAuthError,
  useUserData,
  useAuthStatus,
  useAuthUserInfo
} from '@/lib/stores/auth-store';
import { authService } from '@/services/auth.service';
import { createClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';
import type { AuthUser, UserData } from '../types';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock dependencies
jest.mock('@/services/auth.service');
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');
jest.mock('@/lib/notifications');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockNotifications = notifications as jest.Mocked<typeof notifications>;

describe('AuthStore', () => {
  const mockAuthUser: AuthUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    phone: null,
    auth_username: 'testuser',
    provider: 'email',
    userRole: 'user',
  };

  const mockUserData: UserData = {
    id: 'test-user-id',
    username: 'testuser',
    full_name: 'Test User',
    avatar_url: null,
    experience_points: 100,
    land: null,
    region: null,
    city: null,
    bio: null,
    role: 'user',
    last_login_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    achievements_visibility: 'public',
    auth_id: 'test-auth-id',
    profile_visibility: 'public',
    submissions_visibility: 'public',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      signInWithOAuth: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
    })),
  };

  beforeEach(() => {
    // Clear sessionStorage
    sessionStorageMock.clear();
    
    // Reset store state
    useAuthStore.setState({
      authUser: null,
      userData: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });

    // Clear all mocks
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockCreateClient.mockReturnValue(mockSupabaseClient as any);
    mockLogger.error.mockImplementation(() => {});
    mockLogger.info.mockImplementation(() => {});
    mockNotifications.success.mockImplementation(() => {});
    mockNotifications.error.mockImplementation(() => {});
  });

  describe('actions', () => {
    describe('basic state mutations', () => {
      it('should set loading state', () => {
        const { result } = renderHook(() => useAuthStore());
        
        act(() => {
          result.current.setLoading(true);
        });

        expect(result.current.loading).toBe(true);

        act(() => {
          result.current.setLoading(false);
        });

        expect(result.current.loading).toBe(false);
      });

      it('should set error state', () => {
        const { result } = renderHook(() => useAuthStore());
        
        act(() => {
          result.current.setError('Test error');
        });

        expect(result.current.error).toBe('Test error');

        act(() => {
          result.current.setError(null);
        });

        expect(result.current.error).toBe(null);
      });

      it('should set auth user and update authentication state', () => {
        const { result } = renderHook(() => useAuthStore());
        
        act(() => {
          result.current.setAuthUser(mockAuthUser);
        });

        expect(result.current.authUser).toEqual(mockAuthUser);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.error).toBe(null);
      });

      it('should set user data', () => {
        const { result } = renderHook(() => useAuthStore());
        
        act(() => {
          result.current.setUserData(mockUserData);
        });

        expect(result.current.userData).toEqual(mockUserData);
        expect(result.current.error).toBe(null);
      });

      it('should clear user data', () => {
        const { result } = renderHook(() => useAuthStore());
        
        // Set data first
        act(() => {
          result.current.setAuthUser(mockAuthUser);
          result.current.setUserData(mockUserData);
          result.current.setError('Some error');
        });

        // Clear data
        act(() => {
          result.current.clearUser();
        });

        expect(result.current.authUser).toBe(null);
        expect(result.current.userData).toBe(null);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.error).toBe(null);
      });

      it('should update user data when userData exists', () => {
        const { result } = renderHook(() => useAuthStore());
        
        // Set initial user data
        act(() => {
          result.current.setUserData(mockUserData);
        });

        // Update user data
        act(() => {
          result.current.updateUserData({
            full_name: 'Updated Name',
            bio: 'Updated bio',
          });
        });

        expect(result.current.userData).toEqual({
          ...mockUserData,
          full_name: 'Updated Name',
          bio: 'Updated bio',
        });
      });

      it('should not update user data when userData is null', () => {
        const { result } = renderHook(() => useAuthStore());
        
        // Ensure userData is null
        expect(result.current.userData).toBe(null);

        // Try to update user data
        act(() => {
          result.current.updateUserData({
            full_name: 'Updated Name',
          });
        });

        expect(result.current.userData).toBe(null);
      });
    });

    describe('initializeApp', () => {
      it('should initialize app with authenticated user', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.getCurrentUser.mockResolvedValue({
          success: true,
          data: mockAuthUser,
          error: null,
        });

        mockAuthService.getUserData.mockResolvedValue({
          success: true,
          data: mockUserData,
          error: null,
        });

        await act(async () => {
          await result.current.initializeApp();
        });

        expect(result.current.authUser).toEqual(mockAuthUser);
        expect(result.current.userData).toEqual(mockUserData);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.loading).toBe(false);
      });

      it('should clear user when no authenticated user found', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.getCurrentUser.mockResolvedValue({
          success: false,
          data: null,
          error: 'No user found',
        });

        await act(async () => {
          await result.current.initializeApp();
        });

        expect(result.current.authUser).toBe(null);
        expect(result.current.userData).toBe(null);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.loading).toBe(false);
      });

      it('should handle errors during initialization', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.getCurrentUser.mockRejectedValue(new Error('Network error'));

        await act(async () => {
          await result.current.initializeApp();
        });

        expect(result.current.authUser).toBe(null);
        expect(result.current.userData).toBe(null);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.loading).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Auth initialization failed',
          expect.any(Error),
          expect.any(Object)
        );
      });

      it('should handle user data fetch failure gracefully', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.getCurrentUser.mockResolvedValue({
          success: true,
          data: mockAuthUser,
          error: null,
        });

        mockAuthService.getUserData.mockResolvedValue({
          success: false,
          data: null,
          error: 'Failed to fetch user data',
        });

        await act(async () => {
          await result.current.initializeApp();
        });

        expect(result.current.authUser).toEqual(mockAuthUser);
        expect(result.current.userData).toBe(null);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.loading).toBe(false);
      });
    });

    describe('setupAuthListener', () => {
      it('should set up auth state change listener', () => {
        const { result } = renderHook(() => useAuthStore());
        const mockUnsubscribe = jest.fn();
        
        mockAuthService.onAuthStateChange.mockReturnValue({
          unsubscribe: mockUnsubscribe,
        });

        act(() => {
          const cleanup = result.current.setupAuthListener();
          expect(cleanup).toEqual({ unsubscribe: mockUnsubscribe });
        });

        expect(mockAuthService.onAuthStateChange).toHaveBeenCalled();
      });

      it('should handle auth listener setup errors', () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.onAuthStateChange.mockImplementation(() => {
          throw new Error('Setup failed');
        });

        act(() => {
          const cleanup = result.current.setupAuthListener();
          expect(cleanup).toEqual({ unsubscribe: expect.any(Function) });
        });

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to setup auth listener',
          expect.any(Error),
          expect.any(Object)
        );
      });
    });

    describe('signIn', () => {
      const credentials = { email: 'test@example.com', password: 'password123' };

      it('should sign in successfully', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.signIn.mockResolvedValue({
          success: true,
          data: { user: mockAuthUser },
          error: null,
        });

        mockAuthService.getUserData.mockResolvedValue({
          success: true,
          data: mockUserData,
          error: null,
        });

        let response: any;
        await act(async () => {
          response = await result.current.signIn(credentials);
        });

        expect(response).toEqual({ success: true, data: { user: mockAuthUser } });
        expect(result.current.authUser).toEqual(mockAuthUser);
        expect(result.current.userData).toEqual(mockUserData);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
      });

      it('should handle sign in failure', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.signIn.mockResolvedValue({
          success: false,
          data: null,
          error: 'Invalid credentials',
        });

        let response: any;
        await act(async () => {
          response = await result.current.signIn(credentials);
        });

        expect(response).toEqual({ success: false, error: 'Invalid credentials' });
        expect(result.current.authUser).toBe(null);
        expect(result.current.userData).toBe(null);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Invalid credentials');
      });

      it('should handle sign in exceptions', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.signIn.mockRejectedValue(new Error('Network error'));

        let response: any;
        await act(async () => {
          response = await result.current.signIn(credentials);
        });

        expect(response).toEqual({ success: false, error: 'Network error' });
        expect(result.current.error).toBe('Network error');
        expect(result.current.loading).toBe(false);
      });
    });

    describe('signInWithOAuth', () => {
      it('should sign in with OAuth successfully', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
          error: null,
        });

        let response: any;
        await act(async () => {
          response = await result.current.signInWithOAuth('google');
        });

        expect(response).toEqual({});
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/oauth-success`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
      });

      it('should handle OAuth sign in error', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
          error: { message: 'OAuth error' },
        });

        let response: any;
        await act(async () => {
          response = await result.current.signInWithOAuth('google');
        });

        expect(response).toEqual({ error: 'OAuth error' });
      });

      it('should handle OAuth sign in exception', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockSupabaseClient.auth.signInWithOAuth.mockRejectedValue(new Error('Network error'));

        let response: any;
        await act(async () => {
          response = await result.current.signInWithOAuth('google');
        });

        expect(response).toEqual({ error: 'Network error' });
      });
    });

    describe('signUp', () => {
      const signUpData = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
      };

      it('should sign up successfully without verification', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.signUp.mockResolvedValue({
          success: true,
          data: { user: mockAuthUser, needsVerification: false },
          error: null,
        });

        mockAuthService.getUserData.mockResolvedValue({
          success: true,
          data: mockUserData,
          error: null,
        });

        let response: any;
        await act(async () => {
          response = await result.current.signUp(signUpData);
        });

        expect(response).toEqual({
          success: true,
          data: { user: mockAuthUser, needsVerification: false },
        });
        expect(result.current.authUser).toEqual(mockAuthUser);
        expect(result.current.userData).toEqual(mockUserData);
        expect(result.current.isAuthenticated).toBe(true);
      });

      it('should handle sign up with verification needed', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.signUp.mockResolvedValue({
          success: true,
          data: { needsVerification: true },
          error: null,
        });

        let response: any;
        await act(async () => {
          response = await result.current.signUp(signUpData);
        });

        expect(response).toEqual({
          success: true,
          needsVerification: true,
          data: { needsVerification: true },
        });
        expect(result.current.authUser).toBe(null);
        expect(result.current.userData).toBe(null);
      });

      it('should handle sign up failure', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.signUp.mockResolvedValue({
          success: false,
          data: null,
          error: 'Email already exists',
        });

        let response: any;
        await act(async () => {
          response = await result.current.signUp(signUpData);
        });

        expect(response).toEqual({ success: false, error: 'Email already exists' });
        expect(result.current.error).toBe('Email already exists');
      });
    });

    describe('signOut', () => {
      it('should sign out successfully', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        // Set authenticated state first
        act(() => {
          result.current.setAuthUser(mockAuthUser);
          result.current.setUserData(mockUserData);
        });

        mockAuthService.signOut.mockResolvedValue({
          success: true,
          data: null,
          error: null,
        });

        let response: any;
        await act(async () => {
          response = await result.current.signOut();
        });

        expect(response).toEqual({ success: true });
        expect(result.current.authUser).toBe(null);
        expect(result.current.userData).toBe(null);
        expect(result.current.isAuthenticated).toBe(false);
      });

      it('should clear user data even on sign out failure', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        // Set authenticated state first
        act(() => {
          result.current.setAuthUser(mockAuthUser);
          result.current.setUserData(mockUserData);
        });

        mockAuthService.signOut.mockResolvedValue({
          success: false,
          data: null,
          error: 'Sign out failed',
        });

        let response: any;
        await act(async () => {
          response = await result.current.signOut();
        });

        expect(response).toEqual({ success: false, error: 'Sign out failed' });
        expect(result.current.authUser).toBe(null);
        expect(result.current.userData).toBe(null);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.error).toBe('Sign out failed');
      });

      it('should handle sign out exception', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.signOut.mockRejectedValue(new Error('Network error'));

        let response: any;
        await act(async () => {
          response = await result.current.signOut();
        });

        expect(response).toEqual({ error: 'Network error' });
        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockNotifications.error).toHaveBeenCalled();
      });
    });

    describe('updatePassword', () => {
      it('should update password successfully', async () => {
        const { result } = renderHook(() => useAuthStore());
        const newPassword = 'NewPassword123!';
        
        mockAuthService.updatePassword.mockResolvedValue({
          success: true,
          data: null,
          error: null,
        });

        let response: any;
        await act(async () => {
          response = await result.current.updatePassword(newPassword);
        });

        expect(response).toEqual({ success: true });
        expect(result.current.error).toBe(null);
      });

      it('should reject weak passwords', async () => {
        const { result } = renderHook(() => useAuthStore());
        const weakPassword = 'weak';
        
        let response: any;
        await act(async () => {
          response = await result.current.updatePassword(weakPassword);
        });

        expect(response).toEqual({ success: false, error: 'Password is too weak' });
        expect(result.current.error).toBe('Password is too weak');
        expect(mockAuthService.updatePassword).not.toHaveBeenCalled();
      });

      it('should handle update password failure', async () => {
        const { result } = renderHook(() => useAuthStore());
        const newPassword = 'NewPassword123!';
        
        mockAuthService.updatePassword.mockResolvedValue({
          success: false,
          data: null,
          error: 'Update failed',
        });

        let response: any;
        await act(async () => {
          response = await result.current.updatePassword(newPassword);
        });

        expect(response).toEqual({ success: false, error: 'Update failed' });
        expect(result.current.error).toBe('Update failed');
      });
    });

    describe('refreshUserData', () => {
      it('should refresh user data successfully', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        const mockFromValue = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: mockAuthUser.id } },
          error: null,
        });
        
        mockSupabaseClient.from.mockReturnValue(mockFromValue);

        await act(async () => {
          await result.current.refreshUserData();
        });

        expect(result.current.userData).toBeDefined();
      });

      it('should handle refresh user data errors', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'No user found' },
        });

        await expect(async () => {
          await act(async () => {
            await result.current.refreshUserData();
          });
        }).rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('updateUserDataService', () => {
      it('should update user data successfully', async () => {
        const { result } = renderHook(() => useAuthStore());
        const updates = { bio: 'New bio', city: 'New City' };
        
        const mockFromValue = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockUserData, ...updates },
            error: null,
          }),
        };
        
        mockSupabaseClient.from.mockReturnValue(mockFromValue);

        await act(async () => {
          await result.current.updateUserDataService('test-user-id', updates);
        });

        expect(result.current.userData).toBeDefined();
        expect(mockNotifications.success).toHaveBeenCalled();
      });

      it('should handle update user data errors', async () => {
        const { result } = renderHook(() => useAuthStore());
        const updates = { bio: 'New bio' };
        
        const mockFromValue = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Update failed'),
          }),
        };
        
        mockSupabaseClient.from.mockReturnValue(mockFromValue);

        await expect(async () => {
          await act(async () => {
            await result.current.updateUserDataService('test-user-id', updates);
          });
        }).rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockNotifications.error).toHaveBeenCalled();
      });
    });

    describe('updateEmail', () => {
      it('should update email successfully', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockSupabaseClient.auth.updateUser.mockResolvedValue({
          error: null,
        });

        await act(async () => {
          await result.current.updateEmail('newemail@example.com');
        });

        expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
          email: 'newemail@example.com',
        });
        expect(mockNotifications.success).toHaveBeenCalled();
      });

      it('should handle email update errors', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        const mockError = new Error('Email already in use');
        mockSupabaseClient.auth.updateUser.mockResolvedValue({
          error: mockError,
        });

        await expect(async () => {
          await act(async () => {
            await result.current.updateEmail('newemail@example.com');
          });
        }).rejects.toThrow('Email already in use');

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockNotifications.error).toHaveBeenCalled();
      });
    });

    describe('resetPassword', () => {
      it('should reset password successfully', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.resetPassword.mockResolvedValue({
          success: true,
          data: null,
          error: null,
        });

        let response: any;
        await act(async () => {
          response = await result.current.resetPassword('test@example.com');
        });

        expect(response).toEqual({ success: true });
        expect(result.current.error).toBe(null);
        expect(result.current.loading).toBe(false);
      });

      it('should handle reset password failure', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.resetPassword.mockResolvedValue({
          success: false,
          data: null,
          error: 'User not found',
        });

        let response: any;
        await act(async () => {
          response = await result.current.resetPassword('test@example.com');
        });

        expect(response).toEqual({ success: false, error: 'User not found' });
        expect(result.current.error).toBe('User not found');
      });

      it('should handle reset password exceptions', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockAuthService.resetPassword.mockRejectedValue(new Error('Network error'));

        let response: any;
        await act(async () => {
          response = await result.current.resetPassword('test@example.com');
        });

        expect(response).toEqual({ success: false, error: 'Network error' });
        expect(result.current.error).toBe('Network error');
        expect(result.current.loading).toBe(false);
      });
    });

    describe('resetPasswordForEmail', () => {
      it('should send reset password email successfully', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
          error: null,
        });

        let response: any;
        await act(async () => {
          response = await result.current.resetPasswordForEmail('test@example.com');
        });

        expect(response).toEqual({});
        expect(mockNotifications.success).toHaveBeenCalled();
      });

      it('should handle reset password email errors', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        const mockError = new Error('User not found');
        mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
          error: mockError,
        });

        let response: any;
        await act(async () => {
          response = await result.current.resetPasswordForEmail('test@example.com');
        });

        expect(response.error).toBe('User not found');
        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockNotifications.error).toHaveBeenCalled();
      });

      it('should handle reset password email exceptions', async () => {
        const { result } = renderHook(() => useAuthStore());
        
        mockSupabaseClient.auth.resetPasswordForEmail.mockRejectedValue(new Error('Network error'));

        let response: any;
        await act(async () => {
          response = await result.current.resetPasswordForEmail('test@example.com');
        });

        expect(response.error).toBe('Network error');
        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockNotifications.error).toHaveBeenCalled();
      });
    });

    describe('checkPasswordRequirements', () => {
      const { result } = renderHook(() => useAuthStore());

      it('should validate strong password', () => {
        const checks = result.current.checkPasswordRequirements('StrongP@ssw0rd');
        
        expect(checks).toEqual({
          uppercase: true,
          lowercase: true,
          number: true,
          special: true,
          length: true,
        });
      });

      it('should detect missing uppercase', () => {
        const checks = result.current.checkPasswordRequirements('weakp@ssw0rd');
        
        expect(checks.uppercase).toBe(false);
        expect(checks.lowercase).toBe(true);
      });

      it('should detect missing lowercase', () => {
        const checks = result.current.checkPasswordRequirements('WEAKP@SSW0RD');
        
        expect(checks.uppercase).toBe(true);
        expect(checks.lowercase).toBe(false);
      });

      it('should detect missing number', () => {
        const checks = result.current.checkPasswordRequirements('WeakP@ssword');
        
        expect(checks.number).toBe(false);
      });

      it('should detect missing special character', () => {
        const checks = result.current.checkPasswordRequirements('WeakPassw0rd');
        
        expect(checks.special).toBe(false);
      });

      it('should detect insufficient length', () => {
        const checks = result.current.checkPasswordRequirements('Sh0rt!');
        
        expect(checks.length).toBe(false);
      });
    });
  });

  describe('selectors', () => {
    it('should provide auth state through store', () => {
      const { result: storeResult } = renderHook(() => useAuthStore());

      act(() => {
        storeResult.current.setAuthUser(mockAuthUser);
        storeResult.current.setUserData(mockUserData);
        storeResult.current.setLoading(true);
        storeResult.current.setError('Test error');
      });

      expect(storeResult.current.authUser).toEqual(mockAuthUser);
      expect(storeResult.current.userData).toEqual(mockUserData);
      expect(storeResult.current.isAuthenticated).toBe(true);
      expect(storeResult.current.loading).toBe(true);
      expect(storeResult.current.error).toBe('Test error');
    });

    it('should provide individual state selectors', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.setAuthUser(mockAuthUser);
        result.current.setUserData(mockUserData);
      });

      const state = useAuthStore.getState();
      expect(state.authUser).toEqual(mockAuthUser);
      expect(state.userData).toEqual(mockUserData);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should provide auth state through useAuth hook', () => {
      const { result: storeResult } = renderHook(() => useAuthStore());
      const { result: authResult } = renderHook(() => useAuth());

      act(() => {
        storeResult.current.setAuthUser(mockAuthUser);
        storeResult.current.setUserData(mockUserData);
        storeResult.current.setLoading(true);
        storeResult.current.setError('Test error');
      });

      expect(authResult.current.authUser).toEqual(mockAuthUser);
      expect(authResult.current.userData).toEqual(mockUserData);
      expect(authResult.current.isAuthenticated).toBe(true);
      expect(authResult.current.loading).toBe(true);
      expect(authResult.current.error).toBe('Test error');
    });

    it('should provide auth actions through useAuthActions hook', () => {
      const { result } = renderHook(() => useAuthActions());

      expect(result.current.setLoading).toBeDefined();
      expect(result.current.setError).toBeDefined();
      expect(result.current.setAuthUser).toBeDefined();
      expect(result.current.setUserData).toBeDefined();
      expect(result.current.clearUser).toBeDefined();
      expect(result.current.updateUserData).toBeDefined();
      expect(result.current.initializeApp).toBeDefined();
      expect(result.current.setupAuthListener).toBeDefined();
      expect(result.current.signIn).toBeDefined();
      expect(result.current.signInWithOAuth).toBeDefined();
      expect(result.current.signUp).toBeDefined();
      expect(result.current.signOut).toBeDefined();
      expect(result.current.refreshUserData).toBeDefined();
      expect(result.current.updateUserDataService).toBeDefined();
      expect(result.current.updateEmail).toBeDefined();
      expect(result.current.updatePassword).toBeDefined();
      expect(result.current.resetPassword).toBeDefined();
      expect(result.current.resetPasswordForEmail).toBeDefined();
      expect(result.current.checkPasswordRequirements).toBeDefined();
    });

    it('should provide loading state through useAuthLoading hook', () => {
      const { result: storeResult } = renderHook(() => useAuthStore());
      const { result: loadingResult } = renderHook(() => useAuthLoading());

      expect(loadingResult.current).toBe(false);

      act(() => {
        storeResult.current.setLoading(true);
      });

      expect(loadingResult.current).toBe(true);
    });

    it('should provide auth user through useAuthUser hook', () => {
      const { result: storeResult } = renderHook(() => useAuthStore());
      const { result: authUserResult } = renderHook(() => useAuthUser());

      expect(authUserResult.current).toBe(null);

      act(() => {
        storeResult.current.setAuthUser(mockAuthUser);
      });

      expect(authUserResult.current).toEqual(mockAuthUser);
    });

    it('should provide authenticated state through useIsAuthenticated hook', () => {
      const { result: storeResult } = renderHook(() => useAuthStore());
      const { result: isAuthResult } = renderHook(() => useIsAuthenticated());

      expect(isAuthResult.current).toBe(false);

      act(() => {
        storeResult.current.setAuthUser(mockAuthUser);
      });

      expect(isAuthResult.current).toBe(true);
    });

    it('should provide error state through useAuthError hook', () => {
      const { result: storeResult } = renderHook(() => useAuthStore());
      const { result: errorResult } = renderHook(() => useAuthError());

      expect(errorResult.current).toBe(null);

      act(() => {
        storeResult.current.setError('Test error');
      });

      expect(errorResult.current).toBe('Test error');
    });

    it('should provide user data through useUserData hook', () => {
      const { result: storeResult } = renderHook(() => useAuthStore());
      const { result: userDataResult } = renderHook(() => useUserData());

      expect(userDataResult.current).toBe(null);

      act(() => {
        storeResult.current.setUserData(mockUserData);
      });

      expect(userDataResult.current).toEqual(mockUserData);
    });

    it('should provide auth status through useAuthStatus hook', () => {
      const { result: storeResult } = renderHook(() => useAuthStore());
      const { result: statusResult } = renderHook(() => useAuthStatus());

      expect(statusResult.current).toEqual({
        isAuthenticated: false,
        loading: false,
      });

      act(() => {
        storeResult.current.setAuthUser(mockAuthUser);
        storeResult.current.setLoading(true);
      });

      expect(statusResult.current).toEqual({
        isAuthenticated: true,
        loading: true,
      });
    });

    it('should provide user info through useAuthUserInfo hook', () => {
      const { result: storeResult } = renderHook(() => useAuthStore());
      const { result: userInfoResult } = renderHook(() => useAuthUserInfo());

      expect(userInfoResult.current).toEqual({
        authUser: null,
        userData: null,
      });

      act(() => {
        storeResult.current.setAuthUser(mockAuthUser);
        storeResult.current.setUserData(mockUserData);
      });

      expect(userInfoResult.current).toEqual({
        authUser: mockAuthUser,
        userData: mockUserData,
      });
    });
  });

  describe('persistence', () => {
    it('should persist isAuthenticated state to sessionStorage', () => {
      const { result } = renderHook(() => useAuthStore());
      
      act(() => {
        result.current.setAuthUser(mockAuthUser);
      });

      // Check that sessionStorage was called
      const storedData = JSON.parse(sessionStorage.getItem('auth-storage') || '{}');
      expect(storedData.state.isAuthenticated).toBe(true);
    });

    it('should not persist sensitive data', () => {
      const { result } = renderHook(() => useAuthStore());
      
      act(() => {
        result.current.setAuthUser(mockAuthUser);
        result.current.setUserData(mockUserData);
      });

      const storedData = JSON.parse(sessionStorage.getItem('auth-storage') || '{}');
      expect(storedData.state.authUser).toBeUndefined();
      expect(storedData.state.userData).toBeUndefined();
    });

    it('should handle storage errors gracefully', () => {
      const { result } = renderHook(() => useAuthStore());
      
      // Mock sessionStorage to throw error
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });

      // This should not throw
      act(() => {
        result.current.setAuthUser(mockAuthUser);
      });

      expect(result.current.authUser).toEqual(mockAuthUser);

      // Restore original function
      sessionStorage.setItem = originalSetItem;
    });
  });

  describe('edge cases', () => {
    it('should handle null values in transformDbUserToUserData', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      const dbUserWithNulls = {
        ...mockUserData,
        experience_points: null,
        created_at: null,
        achievements_visibility: null,
        profile_visibility: null,
        submissions_visibility: null,
      };

      const mockFromValue = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: dbUserWithNulls,
          error: null,
        }),
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockAuthUser.id } },
        error: null,
      });
      
      mockSupabaseClient.from.mockReturnValue(mockFromValue);

      await act(async () => {
        await result.current.refreshUserData();
      });

      // The transform function should apply defaults
      expect(result.current.userData?.experience_points).toBe(0);
      expect(result.current.userData?.achievements_visibility).toBe('public');
      expect(result.current.userData?.profile_visibility).toBe('public');
      expect(result.current.userData?.submissions_visibility).toBe('public');
    });

    it('should handle empty email in resetPasswordForEmail', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      await act(async () => {
        await result.current.resetPasswordForEmail('');
      });

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('', {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    });

    it('should handle concurrent state updates', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      // Simulate concurrent updates
      act(() => {
        result.current.setLoading(true);
        result.current.setError('Error 1');
        result.current.setLoading(false);
        result.current.setError('Error 2');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Error 2');
    });

    it('should handle auth state change callbacks', async () => {
      const { result } = renderHook(() => useAuthStore());
      let authCallback: any;
      
      mockAuthService.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { unsubscribe: jest.fn() };
      });

      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockAuthUser,
        error: null,
      });

      act(() => {
        result.current.setupAuthListener();
      });

      // Test INITIAL_SESSION event
      await act(async () => {
        await authCallback('INITIAL_SESSION', { user: mockAuthUser });
      });

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();

      // Test SIGNED_OUT event
      await act(async () => {
        await authCallback('SIGNED_OUT', null);
      });

      expect(result.current.authUser).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle missing user data in sign in response', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      mockAuthService.signIn.mockResolvedValue({
        success: true,
        data: null,
        error: null,
      });

      let response: any;
      await act(async () => {
        response = await result.current.signIn({ email: 'test@example.com', password: 'password' });
      });

      expect(response).toEqual({ success: true, data: null });
    });

    it('should handle already confirmed user in sign up', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      mockAuthService.signUp.mockResolvedValue({
        success: true,
        data: { user: mockAuthUser },
        error: null,
      });

      mockAuthService.getUserData.mockResolvedValue({
        success: true,
        data: mockUserData,
        error: null,
      });

      let response: any;
      await act(async () => {
        response = await result.current.signUp({
          email: 'test@example.com',
          password: 'password',
          username: 'testuser',
        });
      });

      expect(response.success).toBe(true);
      expect(result.current.authUser).toBeDefined();
      expect(result.current.userData).toBeDefined();
    });

    it('should handle non-Error exceptions in error handlers', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      mockAuthService.signIn.mockRejectedValue('String error');

      let response: any;
      await act(async () => {
        response = await result.current.signIn({ email: 'test@example.com', password: 'password' });
      });

      expect(response).toEqual({ success: false, error: 'Unknown error' });
      expect(result.current.error).toBe('Unknown error');
    });

    it('should handle database error in refreshUserData', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      const mockFromValue = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockAuthUser.id } },
        error: null,
      });
      
      mockSupabaseClient.from.mockReturnValue(mockFromValue);

      await expect(async () => {
        await act(async () => {
          await result.current.refreshUserData();
        });
      }).rejects.toThrow('Database error');
    });

    it('should handle non-Error object thrown in signOut', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      mockAuthService.signOut.mockRejectedValue({ message: 'Object error' });

      let response: any;
      await act(async () => {
        response = await result.current.signOut();
      });

      expect(response.error).toBe('Unknown error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle invalid JSON in sessionStorage', () => {
      sessionStorage.setItem('auth-storage', 'invalid json');

      // This should not throw
      const { result } = renderHook(() => useAuthStore());

      // Store should initialize with default state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authUser).toBe(null);
    });

    it('should handle getUserData failure in signUp', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      mockAuthService.signUp.mockResolvedValue({
        success: true,
        data: { user: mockAuthUser },
        error: null,
      });

      mockAuthService.getUserData.mockResolvedValue({
        success: false,
        data: null,
        error: 'Failed to fetch user data',
      });

      let response: any;
      await act(async () => {
        response = await result.current.signUp({
          email: 'test@example.com',
          password: 'password',
          username: 'testuser',
        });
      });

      expect(response.success).toBe(true);
      // When getUserData fails, authUser should still be set
      expect(result.current.authUser).toBeDefined();
      expect(result.current.userData).toBe(null); // Should still be null
    });

    it('should handle auth listener for SIGNED_IN event', async () => {
      const { result } = renderHook(() => useAuthStore());
      let authCallback: any;
      
      mockAuthService.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { unsubscribe: jest.fn() };
      });

      mockAuthService.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockAuthUser,
        error: null,
      });

      act(() => {
        result.current.setupAuthListener();
      });

      // Test SIGNED_IN event
      await act(async () => {
        await authCallback('SIGNED_IN', { user: mockAuthUser });
      });

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle concurrent sign in operations', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      mockAuthService.signIn.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { user: mockAuthUser },
          error: null,
        }), 100))
      );

      mockAuthService.getUserData.mockResolvedValue({
        success: true,
        data: mockUserData,
        error: null,
      });

      // Start multiple sign in operations
      const promises = await act(async () => {
        const p1 = result.current.signIn({ email: 'test1@example.com', password: 'password1' });
        const p2 = result.current.signIn({ email: 'test2@example.com', password: 'password2' });
        return Promise.all([p1, p2]);
      });

      expect(promises[0].success).toBe(true);
      expect(promises[1].success).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('should handle storage removal errors gracefully', () => {
      const { result } = renderHook(() => useAuthStore());
      
      // Mock sessionStorage.removeItem to throw
      const originalRemoveItem = sessionStorage.removeItem;
      sessionStorage.removeItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      // This should not throw
      act(() => {
        result.current.clearUser();
      });

      expect(result.current.authUser).toBe(null);

      // Restore original function
      sessionStorage.removeItem = originalRemoveItem;
    });

    it('should handle missing user in auth callback', async () => {
      const { result } = renderHook(() => useAuthStore());
      let authCallback: any;
      
      mockAuthService.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { unsubscribe: jest.fn() };
      });

      act(() => {
        result.current.setupAuthListener();
      });

      // Test INITIAL_SESSION event with no user
      await act(async () => {
        await authCallback('INITIAL_SESSION', { user: null });
      });

      expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should transform user data with all null optional fields', async () => {
      const { result } = renderHook(() => useAuthStore());
      
      const minimalUserData = {
        id: 'test-id',
        username: 'testuser',
        full_name: null,
        avatar_url: null,
        experience_points: null,
        land: null,
        region: null,
        city: null,
        bio: null,
        role: null,
        last_login_at: null,
        created_at: null,
        achievements_visibility: null,
        auth_id: null,
        profile_visibility: null,
        submissions_visibility: null,
        updated_at: null,
      };

      const mockFromValue = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: minimalUserData,
          error: null,
        }),
      };
      
      mockSupabaseClient.from.mockReturnValue(mockFromValue);

      await act(async () => {
        await result.current.updateUserDataService('test-user-id', { bio: 'New bio' });
      });

      // Check that defaults were applied
      const transformedData = result.current.userData;
      expect(transformedData?.experience_points).toBe(0);
      expect(transformedData?.achievements_visibility).toBe('public');
      expect(transformedData?.profile_visibility).toBe('public');
      expect(transformedData?.submissions_visibility).toBe('public');
    });
  });
});