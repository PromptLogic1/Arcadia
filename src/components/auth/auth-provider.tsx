'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuthActions } from '@/lib/stores';
import { authService } from '../../services/auth.service';
import { logger } from '@/lib/logger';
import { setSentryUser, addSentryContext } from '@/lib/sentry-utils';
import { toError } from '@/lib/error-guards';
import { useAuthSessionQuery } from '@/hooks/queries/useAuthQueries';

interface AuthUser {
  id: string;
  email?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialized: false,
});

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { initializeApp, setLoading: setStoreLoading } = useAuthActions();

  // Use TanStack Query for session data
  const isPublicPage =
    typeof window !== 'undefined' &&
    ['/', '/about', '/community'].includes(window.location.pathname);
  const { data: session, isLoading } = useAuthSessionQuery();

  // Use refs to avoid stale closures
  const routerRef = useRef(router);
  const initializeAppRef = useRef(initializeApp);
  const initializationCompleteRef = useRef(false);

  // Update refs when dependencies change
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    initializeAppRef.current = initializeApp;
  }, [initializeApp]);

  // Initialize Sentry context once
  useEffect(() => {
    addSentryContext();
  }, []);

  // Handle initial auth setup when session data is available
  useEffect(() => {
    if (!isLoading && !initializationCompleteRef.current) {
      const initialize = async () => {
        try {
          if (!isPublicPage) {
            setStoreLoading(true);
            await initializeAppRef.current();
          }

          if (session?.user) {
            setSentryUser({
              id: session.user.id,
              email: session.user.email || undefined,
            });
          }

          initializationCompleteRef.current = true;
        } catch (error) {
          logger.error('Auth initialization failed', toError(error), {
            metadata: { component: 'AuthProvider' },
          });
        } finally {
          setStoreLoading(false);
        }
      };

      initialize();
    }
  }, [isLoading, session, isPublicPage, setStoreLoading]);

  // Set up auth state change listener
  useEffect(() => {
    const authListener = authService.onAuthStateChange(
      async (
        event: string,
        session: { user: { id: string; email?: string | null } } | null
      ) => {
        logger.info('Auth state changed', {
          metadata: {
            component: 'AuthProvider',
            event,
            hasUser: !!session?.user,
          },
        });

        // Update Sentry user context on auth changes
        if (session?.user) {
          setSentryUser({
            id: session.user.id,
            email: session.user.email || undefined,
          });
        } else {
          setSentryUser(null);
        }

        // Handle auth events
        if (event === 'SIGNED_IN' && session?.user) {
          // Reinitialize app state with new user
          try {
            await initializeAppRef.current();
          } catch (error) {
            logger.error(
              'Failed to initialize app after sign in',
              toError(error),
              {
                metadata: { component: 'AuthProvider' },
              }
            );
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear user state and redirect to home
          setSentryUser(null);
          routerRef.current.push('/');
        } else if (event === 'TOKEN_REFRESHED') {
          // Session refreshed, no action needed
          logger.info('Auth token refreshed successfully');
        } else if (event === 'USER_UPDATED') {
          // User profile updated
          try {
            await initializeAppRef.current(); // Refresh user data
          } catch (error) {
            logger.error(
              'Failed to refresh user data after update',
              toError(error),
              {
                metadata: { component: 'AuthProvider' },
              }
            );
          }
        }
      }
    );

    return () => {
      authListener.unsubscribe();
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user: session?.user ?? null,
      loading: isLoading,
      initialized: !isLoading,
    }),
    [session?.user, isLoading]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
