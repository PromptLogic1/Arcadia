'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/stores';
import { useAuthContext } from './auth-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';
import type { UserRole } from '@/features/auth/types';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  requiredRole?: UserRole;
  fallback?: ReactNode;
  showLoginPrompt?: boolean;
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/auth/login',
  requiredRole,
  fallback,
  showLoginPrompt = true,
}: AuthGuardProps) {
  const router = useRouter();
  const {
    user: contextUser,
    loading: contextLoading,
    initialized,
  } = useAuthContext();
  const { userData, isAuthenticated, loading: storeLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const loading = !mounted || !initialized || contextLoading || storeLoading;
  const user = contextUser;
  const hasAuth = isAuthenticated && !!user;

  // Handle authentication redirection
  useEffect(() => {
    if (!loading && requireAuth && !hasAuth) {
      const currentPath = window.location.pathname;
      const redirectUrl = new URL(redirectTo, window.location.origin);

      // Preserve the intended destination
      if (currentPath !== '/' && currentPath !== redirectTo) {
        redirectUrl.searchParams.set('redirectedFrom', currentPath);
      }

      router.push(redirectUrl.toString());
    }
  }, [loading, requireAuth, hasAuth, redirectTo, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated state
  if (requireAuth && !hasAuth) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showLoginPrompt) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <Lock className="text-primary h-6 w-6" />
              </div>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                You need to be signed in to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => router.push(redirectTo)}
                className="w-full"
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return null;
  }

  // Handle role-based access control
  if (requiredRole && userData?.role) {
    const roleHierarchy: Record<UserRole, number> = {
      user: 1,
      premium: 2,
      moderator: 3,
      admin: 4,
    };

    const userLevel = roleHierarchy[userData.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <AlertTriangle className="text-destructive h-6 w-6" />
              </div>
              <CardTitle>Insufficient Permissions</CardTitle>
              <CardDescription>
                You don&apos;t have the required permissions to access this
                page. Required role: {requiredRole}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

// Convenience wrapper for pages that require authentication
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children'>
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// Hook for checking auth status within components
export function useAuthGuard() {
  const { user, loading, initialized } = useAuthContext();
  const { userData, isAuthenticated } = useAuth();

  return {
    user,
    userData,
    isAuthenticated: isAuthenticated && !!user,
    loading: loading || !initialized,
    hasRole: (role: UserRole) => {
      if (!userData?.role) return false;

      const roleHierarchy: Record<UserRole, number> = {
        user: 1,
        premium: 2,
        moderator: 3,
        admin: 4,
      };

      const userLevel = roleHierarchy[userData.role] || 0;
      const requiredLevel = roleHierarchy[role] || 0;

      return userLevel >= requiredLevel;
    },
  };
}
