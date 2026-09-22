// ============================================================
// BarberQ — useAuth hook
// Initializes Supabase session on mount, syncs to Zustand.
// Fetches user profile from the `users` table after auth.
// Handles: initial load, OTP verification, token refresh, sign out.
// ============================================================

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types';

export function useAuth() {
  const { session, user, role, isLoading, setSession, setUser, setLoading, signOut } =
    useAuthStore();

  useEffect(() => {
    // 1. Check for an existing session on mount (persisted via AsyncStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth state changes:
    //    - SIGNED_IN: fired after OTP verify, token refresh
    //    - SIGNED_OUT: fired after sign out
    //    - TOKEN_REFRESHED: automatic refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Fetch the user's profile row from the `users` table.
   * Called after any auth event that provides a user ID.
   * If the row doesn't exist yet, the user will be sent to profile-setup.
   */
  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // No profile yet — profile-setup screen will create it
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(data as User);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    signOut();
  };

  return { session, user, role, isLoading, signOut: handleSignOut };
}
