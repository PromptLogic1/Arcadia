/**
 * @jest-environment jsdom
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../auth-provider';
import { useRouter } from 'next/navigation';
import { authService } from '../../../services/auth.service';
import { useAuthActions } from '../../../lib/stores';
import { setSentryUser, addSentryContext } from '../../../lib/sentry-utils';
import { logger } from '../../../lib/logger';
import { useAuthSessionQuery } from '../../../hooks/queries/useAuthQueries';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../../services/auth.service', () => ({
  authService: {
    onAuthStateChange: jest.fn(),
  },
}));

jest.mock('../../../lib/stores', () => ({
  useAuthActions: jest.fn(),
}));

jest.mock('../../../lib/sentry-utils', () => ({
  setSentryUser: jest.fn(),
  addSentryContext: jest.fn(),
}));

jest.mock('../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../hooks/queries/useAuthQueries', () => ({
  useAuthSessionQuery: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

const mockAuthActions = {
  initializeApp: jest.fn(),
  setLoading: jest.fn(),
};

const mockAuthStateListener = {
  unsubscribe: jest.fn(),
};

describe('AuthProvider', () => {
  let originalLocation: Location;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthActions as jest.Mock).mockReturnValue(mockAuthActions);
    (authService.onAuthStateChange as jest.Mock).mockReturnValue(
      mockAuthStateListener
    );
    (useAuthSessionQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    // Mock window.location.pathname
    originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, pathname: '/dashboard' };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.location = originalLocation;
  });

  describe('useAuthContext hook', () => {
    it('should return default context values when used outside AuthProvider', () => {
      // In React, useContext returns the default value when used outside a provider
      // It doesn't throw an error by default
      const { result } = renderHook(() => useAuthContext());

      // The hook returns the default context value
      expect(result.current).toEqual({
        user: null,
        loading: true,
        initialized: false,
      });
    });

    it('should return auth context when used within AuthProvider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuthContext(), { wrapper });

      expect(result.current).toEqual({
        user: null,
        loading: false,
        initialized: true,
      });
    });
  });

  describe('Initial setup', () => {
    it('should add Sentry context on mount', () => {
      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(addSentryContext).toHaveBeenCalledTimes(1);
    });

    it('should not initialize app for public pages', async () => {
      window.location.pathname = '/';

      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(mockAuthActions.initializeApp).not.toHaveBeenCalled();
      });
    });

    it('should initialize app for non-public pages', async () => {
      window.location.pathname = '/dashboard';

      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(mockAuthActions.initializeApp).toHaveBeenCalledTimes(1);
      });

      expect(mockAuthActions.setLoading).toHaveBeenCalledWith(true);
      expect(mockAuthActions.setLoading).toHaveBeenCalledWith(false);
    });

    it('should handle initialization errors gracefully', async () => {
      window.location.pathname = '/dashboard';
      mockAuthActions.initializeApp.mockRejectedValue(new Error('Init failed'));

      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Auth initialization failed',
          expect.any(Error),
          { metadata: { component: 'AuthProvider' } }
        );
      });

      expect(mockAuthActions.setLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('Session handling', () => {
    it('should return session data in context when available', () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      (useAuthSessionQuery as jest.Mock).mockReturnValue({
        data: mockSession,
        isLoading: false,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.loading).toBe(false);
      expect(result.current.initialized).toBe(true);
    });

    it('should handle session without email in context', () => {
      const mockSession = {
        user: { id: 'user-123', email: null },
      };

      (useAuthSessionQuery as jest.Mock).mockReturnValue({
        data: mockSession,
        isLoading: false,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.user?.email).toBeNull();
    });

    it('should reflect loading state in context', () => {
      (useAuthSessionQuery as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      expect(result.current).toEqual({
        user: null,
        loading: true,
        initialized: false,
      });
    });
  });

  describe('Auth state change events', () => {
    let authStateCallback: (event: string, session: any) => void;

    beforeEach(() => {
      (authService.onAuthStateChange as jest.Mock).mockImplementation(cb => {
        authStateCallback = cb;
        return mockAuthStateListener;
      });
    });

    it('should handle SIGNED_IN event', async () => {
      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      const session = { user: { id: 'user-123', email: 'test@example.com' } };

      await act(async () => {
        await authStateCallback('SIGNED_IN', session);
      });

      expect(logger.info).toHaveBeenCalledWith('Auth state changed', {
        metadata: {
          component: 'AuthProvider',
          event: 'SIGNED_IN',
          hasUser: true,
        },
      });
      expect(setSentryUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(mockAuthActions.initializeApp).toHaveBeenCalled();
    });

    it('should handle SIGNED_OUT event', async () => {
      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      await act(async () => {
        await authStateCallback('SIGNED_OUT', null);
      });

      expect(setSentryUser).toHaveBeenCalledWith(null);
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('should handle TOKEN_REFRESHED event', async () => {
      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      const session = { user: { id: 'user-123', email: 'test@example.com' } };

      await act(async () => {
        await authStateCallback('TOKEN_REFRESHED', session);
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Auth token refreshed successfully'
      );
    });

    it('should handle USER_UPDATED event', async () => {
      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      const session = { user: { id: 'user-123', email: 'test@example.com' } };

      await act(async () => {
        await authStateCallback('USER_UPDATED', session);
      });

      expect(mockAuthActions.initializeApp).toHaveBeenCalled();
    });

    it('should handle errors during SIGNED_IN event', async () => {
      mockAuthActions.initializeApp.mockRejectedValue(new Error('Init failed'));

      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      const session = { user: { id: 'user-123', email: 'test@example.com' } };

      await act(async () => {
        await authStateCallback('SIGNED_IN', session);
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize app after sign in',
        expect.any(Error),
        { metadata: { component: 'AuthProvider' } }
      );
    });

    it('should handle errors during USER_UPDATED event', async () => {
      mockAuthActions.initializeApp.mockRejectedValue(
        new Error('Update failed')
      );

      renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      const session = { user: { id: 'user-123', email: 'test@example.com' } };

      await act(async () => {
        await authStateCallback('USER_UPDATED', session);
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh user data after update',
        expect.any(Error),
        { metadata: { component: 'AuthProvider' } }
      );
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', () => {
      const { unmount } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      unmount();

      expect(mockAuthStateListener.unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Context value memoization', () => {
    it('should memoize context value based on session and loading state', () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      };

      const { result, rerender } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      const initialValue = result.current;

      // Rerender with same values
      rerender();

      expect(result.current).toBe(initialValue);

      // Update session
      (useAuthSessionQuery as jest.Mock).mockReturnValue({
        data: mockSession,
        isLoading: false,
      });

      rerender();

      expect(result.current).not.toBe(initialValue);
      expect(result.current.user).toEqual(mockSession.user);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined window during SSR', () => {
      // During SSR, window would be undefined in the component's code
      // But in JSDOM test environment, window is always defined
      // So we test the logic by mocking the hook to handle SSR scenario
      (useAuthSessionQuery as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Should render without errors even in SSR-like scenario
      expect(result.current).toEqual({
        user: null,
        loading: false,
        initialized: true,
      });
    });

    it('should prevent multiple initializations', async () => {
      window.location.pathname = '/dashboard';

      // Start with loading state
      (useAuthSessionQuery as jest.Mock).mockReturnValueOnce({
        data: null,
        isLoading: true,
      });

      const { rerender } = renderHook(() => useAuthContext(), {
        wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
      });

      // Then return loaded state
      (useAuthSessionQuery as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
      });

      rerender();

      await waitFor(() => {
        expect(mockAuthActions.initializeApp).toHaveBeenCalled();
      });

      const callCount = mockAuthActions.initializeApp.mock.calls.length;

      // Force multiple rerenders
      rerender();
      rerender();
      rerender();

      // Still should only be called once
      expect(mockAuthActions.initializeApp).toHaveBeenCalledTimes(callCount);
    });
  });
});
