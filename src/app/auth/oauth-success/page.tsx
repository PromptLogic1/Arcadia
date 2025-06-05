'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Check, User, Settings } from 'lucide-react';
import { log } from '@/lib/logger';
import { RouteErrorBoundary } from '@/components/error-boundaries';

function OAuthSuccessContent() {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }

        // Fetch the username from your users table
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('auth_id', session.user.id)
          .single();

        if (userData) {
          setUsername(userData.username);
        }
      } catch (error) {
        log.error('Error fetching user data after OAuth success', error, {
          metadata: { page: 'OAuthSuccessPage' },
        });
        router.push('/auth/login?error=oauth_failed');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-8 p-6 text-center">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-500/10 p-3">
          <Check className="h-12 w-12 text-green-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Welcome to Arcadia!
        </h1>
        <p className="text-gray-400">
          Your account has been successfully created
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-cyan-500/20 bg-gray-800/50 p-6">
        <div className="space-y-2">
          <p className="text-gray-300">Your username is:</p>
          <p className="text-xl font-semibold text-white">{username}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            You can customize your profile and change your username in the
            settings.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Button
          onClick={() => router.push('/user/user-page')}
          className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500"
        >
          <User className="h-4 w-4" />
          View Your Profile
        </Button>

        <Button
          onClick={() => router.push('/user/settings')}
          variant="outline"
          className="flex w-full items-center justify-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Customize Settings
        </Button>

        <Button
          onClick={() => router.push('/')}
          variant="ghost"
          className="w-full text-gray-400 hover:text-white"
        >
          Go to Homepage
        </Button>
      </div>
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <RouteErrorBoundary routeName="OAuthSuccess">
      <OAuthSuccessContent />
    </RouteErrorBoundary>
  );
}
