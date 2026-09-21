// ============================================================
// BarberQ — useAuth hook
// Initializes Supabase session on mount, syncs to Zustand.
// Fetches user profile from the `users` table after auth.
// ============================================================

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types';

export function useAuth() {
  const { session, user, role, isLoading, setSession, setUser, setLoading, signOut } =
    useAuthStore();

  useEffect(() => {
    // 1. Get existing session on app mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
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

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // User row doesn't exist yet — will be created after profile setup
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
