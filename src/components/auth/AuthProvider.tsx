'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuthActions } from '@/lib/stores';
import type { User } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

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
  const {
    initializeApp,
    setupAuthListener,
    setLoading: setStoreLoading,
  } = useAuthActions();

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        setStoreLoading(true);

        // Initialize the auth store first
        await initializeApp();

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
        }

        // Listen for auth changes
        authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
          logger.info('Auth state changed', {
            metadata: {
              component: 'AuthProvider',
              event,
              hasUser: !!session?.user,
            },
          });

          if (mounted) {
            setUser(session?.user ?? null);
            setLoading(false);
          }

          // Handle auth events
          if (event === 'SIGNED_IN') {
            // Reinitialize app state with new user
            try {
              await initializeApp();
            } catch (error) {
              logger.error('Failed to initialize app after sign in', error as Error, {
                metadata: { component: 'AuthProvider' },
              });
            }
          } else if (event === 'SIGNED_OUT') {
            // Clear user state and redirect to home
            setUser(null);
            router.push('/');
          } else if (event === 'TOKEN_REFRESHED') {
            // Session refreshed, no action needed
            logger.info('Auth token refreshed successfully');
          } else if (event === 'USER_UPDATED') {
            // User profile updated
            try {
              await initializeApp(); // Refresh user data
            } catch (error) {
              logger.error('Failed to refresh user data after update', error as Error, {
                metadata: { component: 'AuthProvider' },
              });
            }
          }
        });

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
      if (authSubscription?.data?.subscription) {
        authSubscription.data.subscription.unsubscribe();
      }
    };
  }, [initializeApp, setStoreLoading, router]);

  const contextValue: AuthContextType = {
    user,
    loading,
    initialized,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
