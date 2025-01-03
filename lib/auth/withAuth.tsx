'use client'

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { redirect } from 'next/navigation';
import { RootState } from '@/src/store';
import { setAuthUser, setDatabaseUser } from '@/src/store/slices/authSlice';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database.types';

export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuthComponent(props: P) {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const profile = useSelector((state: RootState) => state.user.profile);
    const supabase = createClientComponentClient<Database>();

    useEffect(() => {
      const checkUserSession = async () => {
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Error fetching user:', error);
          return;
        }

        if (supabaseUser) {
          // Setze den AuthUser im Redux-Store
          dispatch(setAuthUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            phone: supabaseUser.phone,
            display_name: supabaseUser.user_metadata?.display_name,
            provider: supabaseUser.provider,
          }));

          // Hier kannst du auch den Datenbankbenutzer setzen, falls erforderlich
          // dispatch(setDatabaseUser(userData)); // userData muss hier definiert werden
        }
      };

      checkUserSession();
    }, [dispatch, supabase]);

    // Überprüfe, ob der Benutzer authentifiziert ist
    if (!user || !profile) {
      redirect('/login');
      return null; // Rückgabe null, um sicherzustellen, dass nichts gerendert wird
    }

    // Rendere die Wrapped-Komponente mit den Props
    return <WrappedComponent {...props} />;
  }
} 