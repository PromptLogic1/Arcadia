'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuthActions } from '@/lib/stores';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { setSentryUser, addSentryContext } from '@/lib/sentry-utils';

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const { initializeApp, setLoading: setStoreLoading } = useAuthActions();

  // Use refs to avoid stale closures
  const routerRef = useRef(router);
  const initializeAppRef = useRef(initializeApp);

  // Update refs when dependencies change
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    initializeAppRef.current = initializeApp;
  }, [initializeApp]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        setStoreLoading(true);

        // Initialize Sentry context (once per app load)
        addSentryContext();

        // Initialize the auth store first
        await initializeAppRef.current();

        // Get initial session
        const supabase = createClient();
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logger.error('Failed to get initial session', error, {
            metadata: { component: 'AuthProvider' },
          });
        }

        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
          setInitialized(true);
          setStoreLoading(false);

          // Set Sentry user context
          if (session?.user) {
            setSentryUser({
              id: session.user.id,
              email: session.user.email,
            });
          }
        }

        // Listen for auth changes - properly typed
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            logger.info('Auth state changed', {
              metadata: {
                component: 'AuthProvider',
                event,
                hasUser: !!session?.user,
              },
            });

            if (!mounted) return;

            setUser(session?.user ?? null);
            setLoading(false);

            // Update Sentry user context on auth changes
            if (session?.user) {
              setSentryUser({
                id: session.user.id,
                email: session.user.email,
              });
            } else {
              setSentryUser(null);
            }

            // Handle auth events
            if (event === 'SIGNED_IN') {
              // Reinitialize app state with new user
              try {
                await initializeAppRef.current();
              } catch (error) {
                logger.error(
                  'Failed to initialize app after sign in',
                  error as Error,
                  {
                    metadata: { component: 'AuthProvider' },
                  }
                );
              }
            } else if (event === 'SIGNED_OUT') {
              // Clear user state and redirect to home
              setUser(null);
              setSentryUser(null); // Clear Sentry user context
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
                  error as Error,
                  {
                    metadata: { component: 'AuthProvider' },
                  }
                );
              }
            }
          }
        );

        // Store unsubscribe function
        if (authListener?.subscription) {
          unsubscribe = () => authListener.subscription.unsubscribe();
        }
      } catch (error) {
        logger.error('Auth initialization failed', error as Error, {
          metadata: { component: 'AuthProvider' },
        });
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          setStoreLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [setStoreLoading]); // Only depend on stable setStoreLoading

  const contextValue: AuthContextType = {
    user,
    loading,
    initialized,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
